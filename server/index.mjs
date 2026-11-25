// Family Three: one Node server on the Sprite. Serves the family pages, the API and every child app.
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from './config.mjs'
import { sendJson, sendError, readJson, sendFile } from './http.mjs'
import { FAMILY_ID, kidDir, listFamilies, newFamilyId, parseChildId, readTree, updateTree } from './store.mjs'
import { startFamily, startLitter } from './generation.mjs'
import { readTaste, tastePathFor } from './taste.mjs'
import { loadOwnerKey, isOwner, handleUnlock } from './owner.mjs'
import { adoptChild, readAdopted, SLUG } from './adopt.mjs'
import { listCheckpoints, restoreCheckpoint } from './checkpoints.mjs'
import { makeKit, kitDir } from './kit.mjs'
import { ensureCard } from './card.mjs'
import { castVote, VoteError, clientIp, hashIp, myVote, setPaused, resumeCrowdRounds } from './votes.mjs'
import { randomBytes, timingSafeEqual } from 'node:crypto'
import { startTelegram, handleUpdate, webhookSecret } from './telegram.mjs'
import { readFile } from 'node:fs/promises'

const PUBLIC_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public')
const UNFINISHED = new Set(['briefing', 'queued', 'building', 'thumbing'])

function cleanText(value, { min = 0, max }) {
  const text = typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : ''
  if (text.length < min || text.length > max) return null
  return text
}

async function findChild(cid) {
  const ids = parseChildId(cid)
  if (!ids) return null
  const tree = await readTree(ids.fid)
  const child = tree?.children[cid]
  return child ? { tree, child, ...ids } : null
}

function baseUrl(req) {
  if (config.publicUrl) return config.publicUrl.replace(/\/$/, '')
  const host = String(req.headers['x-forwarded-host'] ?? req.headers.host ?? 'localhost').split(',')[0].trim()
  const proto = String(req.headers['x-forwarded-proto'] ?? 'https').split(',')[0].trim()
  return `${proto}://${host}`
}

const VOTER_COOKIE = 'ft_voter'
const VOTER_ID = /^[A-Za-z0-9_-]{16,64}$/

function voterId(req) {
  const pair = (req.headers.cookie ?? '').split(/;\s*/).find((c) => c.startsWith(`${VOTER_COOKIE}=`))
  const id = pair ? decodeURIComponent(pair.slice(VOTER_COOKIE.length + 1)) : null
  return id && VOTER_ID.test(id) ? id : null
}

const api = {
  async listFamilies(req, res) {
    sendJson(res, 200, { success: true, data: await listFamilies() })
  },

  async getFamily(req, res, fid) {
    const tree = await readTree(fid)
    if (!tree) return sendError(res, 404, 'No family with that id.')
    const mine = tree.crowd ? await myVote(fid, voterId(req) && `web:${voterId(req)}`) : null
    sendJson(res, 200, { success: true, data: { ...tree, myVote: mine } })
  },

  async vote(req, res) {
    const body = await readJson(req)
    const fid = String(body.family ?? '')
    if (!FAMILY_ID.test(fid)) return sendError(res, 400, 'Bad family id.')
    let id = voterId(req)
    if (!id) {
      id = randomBytes(18).toString('base64url')
      res.setHeader('set-cookie', `${VOTER_COOKIE}=${id}; Path=/; Max-Age=${365 * 24 * 3600}; HttpOnly; Secure; SameSite=Lax`)
    }
    try {
      const data = await castVote({ fid, option: String(body.option ?? ''), voterKey: `web:${id}`, ipHash: await hashIp(clientIp(req)) })
      sendJson(res, 200, { success: true, data })
    } catch (err) {
      if (err instanceof VoteError) return sendError(res, err.status, err.message)
      throw err
    }
  },

  async pause(req, res) {
    const body = await readJson(req)
    const fid = String(body.family ?? '')
    if (!FAMILY_ID.test(fid)) return sendError(res, 400, 'Bad family id.')
    const vote = await setPaused(fid, Boolean(body.paused))
    sendJson(res, 200, { success: true, data: vote ?? null })
  },

  async createFamily(req, res) {
    const body = await readJson(req)
    const request = cleanText(body.request, { min: 3, max: 500 })
    if (!request) return sendError(res, 400, 'Say what you want in 3 to 500 characters.')
    const fid = newFamilyId(request)
    await startFamily({ fid, request, crowd: body.crowd === true })
    sendJson(res, 201, { success: true, data: { id: fid } })
  },

  async breed(req, res) {
    const body = await readJson(req)
    const note = cleanText(body.note ?? '', { max: 300 })
    const found = await findChild(body.parent)
    if (note === null) return sendError(res, 400, 'Keep the note under 300 characters.')
    if (!found) return sendError(res, 404, 'No child with that id.')
    if (found.child.status !== 'ready') return sendError(res, 409, 'That child is not ready yet.')
    const kids = await startLitter({ fid: found.fid, kind: 'breed', parentIds: [found.child.id], note })
    sendJson(res, 201, { success: true, data: { children: kids.map((k) => k.id) } })
  },

  async adopt(req, res) {
    const body = await readJson(req)
    const found = await findChild(body.child)
    if (!found) return sendError(res, 404, 'No child with that id.')
    if (found.child.status !== 'ready') return sendError(res, 409, 'Only a finished child can be adopted.')
    if (found.child.adopted || found.child.adoption?.status === 'working') return sendError(res, 409, 'That child is already adopted.')
    adoptChild({ fid: found.fid, cid: found.child.id, baseUrl: baseUrl(req) })
    sendJson(res, 202, { success: true, data: { child: found.child.id } })
  },

  async kit(req, res) {
    const body = await readJson(req)
    const found = await findChild(body.child)
    if (!found) return sendError(res, 404, 'No child with that id.')
    if (found.child.status !== 'ready') return sendError(res, 409, 'Only a finished child can have a design kit.')
    if (found.child.kit?.status === 'working' || found.child.adoption?.status === 'working') return sendError(res, 409, 'Already working on it.')
    makeKit({ fid: found.fid, cid: found.child.id })
    sendJson(res, 202, { success: true, data: { child: found.child.id } })
  },

  async checkpoints(req, res, url) {
    const fid = url.searchParams.get('family')
    if (fid && !FAMILY_ID.test(fid)) return sendError(res, 400, 'Bad family id.')
    const list = await listCheckpoints(fid).catch(() => [])
    sendJson(res, 200, { success: true, data: list })
  },

  async restore(req, res) {
    const body = await readJson(req)
    const id = String(body.id ?? '')
    const list = await listCheckpoints().catch(() => [])
    if (!list.some((c) => c.id === id)) return sendError(res, 404, 'No Family Three checkpoint with that id.')
    sendJson(res, 202, { success: true, data: { id } })
    // Answer first: the restore ends this process.
    setTimeout(() => restoreCheckpoint(id).catch((err) => console.error('restore failed:', err.message)), 300)
  },

  async cross(req, res) {
    const body = await readJson(req)
    const note = cleanText(body.note ?? '', { max: 300 })
    const [a, b] = await Promise.all([findChild(body.a), findChild(body.b)])
    if (note === null) return sendError(res, 400, 'Keep the note under 300 characters.')
    if (!a || !b) return sendError(res, 404, 'Pick two children that exist.')
    if (a.fid !== b.fid || a.child.id === b.child.id) return sendError(res, 400, 'Pick two different children from one family.')
    if (a.child.status !== 'ready' || b.child.status !== 'ready') return sendError(res, 409, 'Both children must be ready.')
    const kids = await startLitter({ fid: a.fid, kind: 'cross', parentIds: [a.child.id, b.child.id], note })
    sendJson(res, 201, { success: true, data: { children: kids.map((k) => k.id) } })
  },
}

const escAttr = (v) => String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

// The page shell, with link-preview tags for a family so a shared link shows its tree.
async function serveIndex(req, res, p) {
  let html = await readFile(path.join(PUBLIC_DIR, 'index.html'), 'utf8')
  const fid = /^\/f\/([^/]+)/.exec(p)?.[1]
  const tree = fid && FAMILY_ID.test(fid) ? await readTree(fid) : null
  const base = baseUrl(req)
  const title = tree ? `I raised “${tree.title}” in ${Math.max(1, ...Object.values(tree.children).map((k) => k.gen))} generations · Family Three` : 'Family Three: apps you raise, not prompt'
  const image = tree ? `${base}/card/${fid}.png` : null
  const meta = [
    `<meta property="og:title" content="${escAttr(title)}">`,
    '<meta property="og:description" content="Three working apps per generation, built at once on a Fly.io Sprite. Breed one, cross two, adopt the keeper.">',
    `<meta property="og:url" content="${escAttr(base + p)}">`,
    image ? `<meta property="og:image" content="${escAttr(image)}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">` : '',
    `<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}">`,
  ].join('\n')
  html = html.replace('</head>', `${meta}\n</head>`)
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache' })
  res.end(html)
}

const sameSecret = (a, b) => typeof a === 'string' && a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b))

// Telegram posts updates here; both the path and the header carry our secret.
async function telegramWebhook(req, res, pathSecret) {
  const s = await webhookSecret()
  if (!sameSecret(pathSecret, s) || !sameSecret(req.headers['x-telegram-bot-api-secret-token'], s)) return sendError(res, 404, 'Not found.')
  const update = await readJson(req)
  sendJson(res, 200, { ok: true })
  handleUpdate(update).catch((err) => console.error('telegram update failed:', err.message))
}

async function serveChild(req, res, cid, rest) {
  const ids = parseChildId(cid)
  if (!ids) return false
  if (rest === undefined) {
    res.writeHead(301, { location: `/n/${cid}/` })
    res.end()
    return true
  }
  return sendFile(res, kidDir(ids.fid, ids.n), rest || '')
}

async function route(req, res) {
  const url = new URL(req.url, 'http://localhost')
  const p = url.pathname
  const method = req.method

  if (p === '/' && handleUnlock(req, res, url)) return
  if (method === 'GET' && p === '/api/site') return sendJson(res, 200, { success: true, data: { telegramChannel: config.telegramChannel || null } })
  if (method === 'GET' && p === '/api/me') return sendJson(res, 200, { success: true, data: { owner: isOwner(req) } })
  if (method === 'POST' && p.startsWith('/tg/')) return telegramWebhook(req, res, p.slice(4))
  if (method === 'POST' && p === '/api/vote') return api.vote(req, res)
  if (method === 'POST' && p.startsWith('/api/') && !isOwner(req)) return sendError(res, 403, 'Only the owner can raise apps here. You can still look around.')
  if (method === 'POST' && p === '/api/vote/pause') return api.pause(req, res)
  if (method === 'GET' && p === '/api/families') return api.listFamilies(req, res)
  if (method === 'POST' && p === '/api/families') return api.createFamily(req, res)
  if (method === 'POST' && p === '/api/breed') return api.breed(req, res)
  if (method === 'POST' && p === '/api/cross') return api.cross(req, res)
  if (method === 'POST' && p === '/api/adopt') return api.adopt(req, res)
  if (method === 'POST' && p === '/api/restore') return api.restore(req, res)
  if (method === 'POST' && p === '/api/kit') return api.kit(req, res)
  if (method === 'GET' && p === '/api/checkpoints') return api.checkpoints(req, res, url)
  if (method === 'GET' && p === '/api/taste') {
    const fid = url.searchParams.get('family')
    const tree = fid && FAMILY_ID.test(fid) ? await readTree(fid) : null
    return sendJson(res, 200, { success: true, data: await readTaste(tastePathFor(tree)) })
  }
  const fam = /^\/api\/families\/([^/]+)$/.exec(p)
  if (method === 'GET' && fam && FAMILY_ID.test(fam[1])) return api.getFamily(req, res, fam[1])
  if (p.startsWith('/api/')) return sendError(res, 404, 'Unknown API route.')

  if (method !== 'GET' && method !== 'HEAD') return sendError(res, 405, 'Method not allowed.')

  const kid = /^\/n\/([^/]+)(?:\/(.*))?$/.exec(p)
  if (kid && (await serveChild(req, res, kid[1], kid[2]))) return
  const adopted = /^\/a\/([^/]+)(?:\/(.*))?$/.exec(p)
  if (adopted && SLUG.test(adopted[1])) {
    const cid = (await readAdopted())[adopted[1]]
    if (cid && adopted[2] === undefined) {
      res.writeHead(301, { location: `/a/${adopted[1]}/` })
      return res.end()
    }
    const ids = cid && parseChildId(cid)
    if (ids && (await sendFile(res, kidDir(ids.fid, ids.n), adopted[2] || ''))) return
  }
  const kitZipMatch = /^\/kit\/([^/]+)\.zip$/.exec(p)
  if (kitZipMatch) {
    const ids = parseChildId(kitZipMatch[1])
    if (ids) {
      res.setHeader('content-disposition', `attachment; filename="design-kit-${kitZipMatch[1]}.zip"`)
      if (await sendFile(res, path.join(kitDir(ids.fid, ids.n), '..'), `${ids.n}.zip`)) return
      res.removeHeader('content-disposition')
    }
  }
  const kitPage = /^\/kit\/([^/]+)\/(.*)$/.exec(p)
  if (kitPage) {
    const ids = parseChildId(kitPage[1])
    if (ids && (await sendFile(res, kitDir(ids.fid, ids.n), kitPage[2] || 'design.html'))) return
  }
  const thumb = /^\/thumb\/([^/]+)\.png$/.exec(p)
  if (thumb) {
    const ids = parseChildId(thumb[1])
    if (ids && (await sendFile(res, kidDir(ids.fid, ids.n), 'thumb.png'))) return
  }
  if (p === '/' || p === '/about' || /^\/f\/[^/]+(?:\/adopted\/[^/]+)?$/.test(p)) return serveIndex(req, res, p)
  const card = /^\/card\/([^/]+)\.png$/.exec(p)
  if (card && FAMILY_ID.test(card[1])) {
    const file = await ensureCard(card[1])
    if (file && (await sendFile(res, path.dirname(file), 'card.png'))) return
  }
  if (/^\/[\w.-]+$/.test(p) && (await sendFile(res, PUBLIC_DIR, p.slice(1)))) return

  res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
  res.end('Not found')
}

// A restart (or a checkpoint restore) ends every builder: mark their children as interrupted.
async function markInterrupted() {
  const families = await listFamilies()
  for (const fam of families.filter((f) => f.building > 0)) {
    await updateTree(fam.id, (tree) => ({
      ...tree,
      children: Object.fromEntries(
        Object.entries(tree.children).map(([id, c]) =>
          UNFINISHED.has(c.status) ? [id, { ...c, status: 'failed', summary: 'Interrupted: the server restarted.' }] : [id, c],
        ),
      ),
    }))
  }
}

const server = http.createServer((req, res) => {
  route(req, res).catch((err) => {
    console.error(`${req.method} ${req.url} failed:`, err)
    if (!res.headersSent) sendError(res, err.status ?? 500, err.status ? err.message : 'Something went wrong on the Sprite.')
    else res.end()
  })
})

await loadOwnerKey()
await markInterrupted()
await resumeCrowdRounds().catch((err) => console.error('resuming crowd rounds failed:', err.message))
server.listen(config.port, () => {
  startTelegram().catch((err) => console.error('telegram start failed:', err.message))
  console.log(`Family Three on :${config.port} (builder: ${config.builder}, home: ${config.home})`)
})
