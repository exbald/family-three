// Family Three: one Node server on the Sprite. Serves the family pages, the API and every child app.
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from './config.mjs'
import { sendJson, sendError, readJson, sendFile } from './http.mjs'
import { FAMILY_ID, kidDir, listFamilies, newFamilyId, parseChildId, readTree, updateTree } from './store.mjs'
import { startFamily, startLitter } from './generation.mjs'
import { readTaste } from './taste.mjs'
import { loadOwnerKey, isOwner, handleUnlock } from './owner.mjs'
import { adoptChild, readAdopted, SLUG } from './adopt.mjs'
import { listCheckpoints, restoreCheckpoint } from './checkpoints.mjs'

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

const api = {
  async listFamilies(req, res) {
    sendJson(res, 200, { success: true, data: await listFamilies() })
  },

  async getFamily(req, res, fid) {
    const tree = await readTree(fid)
    if (!tree) return sendError(res, 404, 'No family with that id.')
    sendJson(res, 200, { success: true, data: tree })
  },

  async createFamily(req, res) {
    const body = await readJson(req)
    const request = cleanText(body.request, { min: 3, max: 500 })
    if (!request) return sendError(res, 400, 'Say what you want in 3 to 500 characters.')
    const fid = newFamilyId(request)
    await startFamily({ fid, request })
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
  if (method === 'GET' && p === '/api/me') return sendJson(res, 200, { success: true, data: { owner: isOwner(req) } })
  if (method === 'POST' && p.startsWith('/api/') && !isOwner(req)) return sendError(res, 403, 'Only the owner can raise apps here. You can still look around.')
  if (method === 'GET' && p === '/api/families') return api.listFamilies(req, res)
  if (method === 'POST' && p === '/api/families') return api.createFamily(req, res)
  if (method === 'POST' && p === '/api/breed') return api.breed(req, res)
  if (method === 'POST' && p === '/api/cross') return api.cross(req, res)
  if (method === 'POST' && p === '/api/adopt') return api.adopt(req, res)
  if (method === 'POST' && p === '/api/restore') return api.restore(req, res)
  if (method === 'GET' && p === '/api/checkpoints') return api.checkpoints(req, res, url)
  if (method === 'GET' && p === '/api/taste') return sendJson(res, 200, { success: true, data: await readTaste() })
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
  const thumb = /^\/thumb\/([^/]+)\.png$/.exec(p)
  if (thumb) {
    const ids = parseChildId(thumb[1])
    if (ids && (await sendFile(res, kidDir(ids.fid, ids.n), 'thumb.png'))) return
  }
  if (p === '/' || /^\/f\/[^/]+$/.test(p)) {
    if (await sendFile(res, PUBLIC_DIR, 'index.html')) return
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
server.listen(config.port, () => {
  console.log(`Family Three on :${config.port} (builder: ${config.builder}, home: ${config.home})`)
})
