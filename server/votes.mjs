// Crowd voting: anyone can vote, once per round per browser (and at most 3 per round per IP).
// When an option crosses the threshold, it breeds (or crosses the top two). Plain code, no model.
import { createHash, randomBytes } from 'node:crypto'
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises'
import path from 'node:path'
import { config } from './config.mjs'
import { bus, emitSafe } from './events.mjs'
import { familyDir, listFamilies, readTree, updateTree } from './store.mjs'
import { startLitter } from './generation.mjs'
import { askJson } from './llm.mjs'
import { readTaste, tasteText, crowdTastePath } from './taste.mjs'

const MIN_THRESHOLD = 5
const MAX_THRESHOLD = 50
const LEAD = 2
const PER_IP = 3
const IP_GAP_MS = 2000
const ROUND_MS = () => Math.max(1, Number(config.roundMinutes ?? 15)) * 60 * 1000
const REST_MS = 3600 * 1000
const OVERLOADED = /\b(529|429)\b|overloaded|rate.?limit|quota|temporarily unavailable/i
const CROSS = 'cross'

export class VoteError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

/* ---------- voter identity ---------- */

let salt = null
async function ipSalt() {
  if (salt) return salt
  const file = path.join(config.home, '.ft', 'vote-salt')
  try {
    salt = (await readFile(file, 'utf8')).trim()
  } catch {
    salt = randomBytes(16).toString('hex')
    await mkdir(path.dirname(file), { recursive: true })
    await writeFile(file, salt, { mode: 0o600 })
  }
  return salt
}

// The Sprite's proxy appends the visitor's address to X-Forwarded-For, then two hops of its own.
// Anything to the left of that is whatever the visitor sent, so it can't be trusted.
const PROXY_HOPS = () => Number(config.proxyHops ?? 2)

export function clientIp(req) {
  const hops = String(req.headers['x-forwarded-for'] ?? '').split(',').map((x) => x.trim()).filter(Boolean)
  const idx = hops.length - 1 - PROXY_HOPS()
  return (idx >= 0 ? hops[idx] : hops[0]) || req.socket.remoteAddress || 'unknown'
}

export async function hashIp(ip) {
  return createHash('sha256').update(`${await ipSalt()}|${ip}`).digest('hex').slice(0, 24)
}

/* ---------- per-round voter records, kept off the public tree ---------- */

const votesPath = (fid) => path.join(familyDir(fid), 'votes.json')
const locks = new Map()

function withLock(fid, fn) {
  const prev = locks.get(fid) ?? Promise.resolve()
  const next = prev.then(fn)
  locks.set(fid, next.catch(() => {}))
  return next
}

async function readVoters(fid) {
  try {
    return JSON.parse(await readFile(votesPath(fid), 'utf8'))
  } catch {
    return { round: null, voters: {}, ips: {} }
  }
}

async function writeVoters(fid, data) {
  const tmp = `${votesPath(fid)}.tmp`
  await writeFile(tmp, JSON.stringify(data))
  await rename(tmp, votesPath(fid))
}

export async function myVote(fid, voterKey) {
  if (!voterKey) return null
  const tree = await readTree(fid)
  const data = await readVoters(fid)
  return tree?.vote && data.round === tree.vote.round ? (data.voters[voterKey] ?? null) : null
}

/* ---------- rounds ---------- */

function thresholdFor(lastTotal) {
  return Math.min(MAX_THRESHOLD, Math.max(MIN_THRESHOLD, Math.ceil((lastTotal ?? 0) * 0.5)))
}

function optionsFor(tree, litterId) {
  const litter = tree.litters.find((l) => l.id === litterId)
  const ready = (litter?.children ?? []).map((id) => tree.children[id]).filter((k) => k?.status === 'ready')
  const options = ready.map((k) => ({ key: k.id, kind: 'breed', label: k.label, name: k.name }))
  if (ready.length >= 2) options.push({ key: CROSS, kind: 'cross', label: '×', name: 'Cross the top two' })
  return options
}

async function openRound(fid, litterId, { restingUntil = null } = {}) {
  const tree = await updateTree(fid, (t) => {
    const options = optionsFor(t, litterId)
    const usable = options.length ? options : t.vote?.options ?? []
    return {
      ...t,
      vote: {
        round: `${litterId}-${Date.now().toString(36)}`,
        litter: options.length ? litterId : t.vote?.litter,
        status: 'open',
        paused: t.vote?.paused ?? false,
        restingUntil,
        options: usable,
        counts: Object.fromEntries(usable.map((o) => [o.key, 0])),
        total: 0,
        threshold: thresholdFor(t.vote?.lastTotal),
        lastTotal: t.vote?.lastTotal ?? 0,
        lastWinner: t.vote?.lastWinner ?? null,
        openedAt: new Date().toISOString(),
        closesAt: null,
        autopilotAt: config.autopilotMinutes > 0 ? new Date(Date.now() + config.autopilotMinutes * 60000).toISOString() : null,
      },
    }
  })
  await withLock(fid, () => writeVoters(fid, { round: tree.vote.round, voters: {}, ips: {} }))
  emitSafe('vote-opened', { fid })
  return tree.vote
}

function ranked(vote) {
  return vote.options
    .map((o, i) => ({ ...o, count: vote.counts[o.key] ?? 0, order: i }))
    .sort((a, b) => b.count - a.count || a.order - b.order)
}

// Early win: enough votes and a clear lead. Otherwise the round's clock decides (see the timer below).
function winnerOf(vote) {
  const [top, second] = ranked(vote)
  if (!top || !top.count) return null
  const lead = top.count - (second?.count ?? 0)
  return top.count >= vote.threshold && lead >= LEAD ? top : null
}

async function closeAndBreed(fid, winner, { autopilot = null } = {}) {
  const tree = await readTree(fid)
  const vote = tree.vote
  const singles = ranked(vote).filter((o) => o.kind === 'breed')
  const busy = Object.values(tree.children).some((k) => ['briefing', 'queued', 'building', 'thumbing'].includes(k.status))
  if (busy) return null
  const parentIds = winner.kind === 'cross' ? singles.slice(0, 2).map((o) => o.key) : [winner.key]
  if (!parentIds.every((id) => tree.children[id]?.status === 'ready')) return null
  // Close only if this exact round is still open, so two closers can never both breed.
  let closed = false
  await updateTree(fid, (t) => {
    if (t.vote?.round !== vote.round || t.vote.status !== 'open') return t
    closed = true
    return { ...t, vote: { ...t.vote, status: 'breeding', lastTotal: t.vote.total, lastWinner: winner.key, closedAt: new Date().toISOString(), autopilot } }
  })
  if (!closed) return null
  const names = parentIds.map((id) => tree.children[id].label).join(' × ')
  const note = autopilot
    ? `Nobody voted, so the agent picked: ${autopilot.reason}`
    : `Chosen by ${vote.total} vote${vote.total === 1 ? '' : 's'}.`
  emitSafe('vote-closed', { fid, winner, parents: parentIds, counts: vote.counts, total: vote.total, names, autopilot })
  await startLitter({ fid, kind: parentIds.length === 2 ? 'cross' : 'breed', parentIds, note })
  return winner
}

/* ---------- casting ---------- */

const lastByIp = new Map()

export async function castVote({ fid, option, voterKey, ipHash }) {
  const tree = await readTree(fid)
  if (!tree?.crowd) throw new VoteError(404, 'Only the crowd family takes votes.')
  const vote = tree.vote
  if (!vote) throw new VoteError(409, 'Voting opens when the first kids are born.')
  if (vote.paused) throw new VoteError(409, 'Voting is paused for a moment.')
  if (vote.restingUntil && Date.parse(vote.restingUntil) > Date.now()) throw new VoteError(409, 'The greenhouse is resting. Voting reopens soon.')
  if (vote.status !== 'open') throw new VoteError(409, 'Voting reopens when the kids are born.')
  if (!vote.options.some((o) => o.key === option)) throw new VoteError(400, 'That is not one of the options.')
  const now = Date.now()
  if (ipHash && now - (lastByIp.get(ipHash) ?? 0) < IP_GAP_MS) throw new VoteError(429, 'One moment, then try again.')
  if (ipHash) lastByIp.set(ipHash, now)

  const result = await withLock(fid, async () => {
    const data = await readVoters(fid)
    const voters = data.round === vote.round ? data : { round: vote.round, voters: {}, ips: {} }
    if (voters.voters[voterKey]) throw new VoteError(409, 'You already voted this round.')
    if (ipHash && (voters.ips[ipHash] ?? 0) >= PER_IP) throw new VoteError(429, 'This network has used its votes for this round.')
    await writeVoters(fid, {
      round: vote.round,
      voters: { ...voters.voters, [voterKey]: option },
      ips: ipHash ? { ...voters.ips, [ipHash]: (voters.ips[ipHash] ?? 0) + 1 } : voters.ips,
    })
    const updated = await updateTree(fid, (t) => {
      if (t.vote?.round !== vote.round || t.vote.status !== 'open') return t
      const closesAt = t.vote.closesAt ?? new Date(Date.now() + ROUND_MS()).toISOString()
      return { ...t, vote: { ...t.vote, closesAt, counts: { ...t.vote.counts, [option]: (t.vote.counts[option] ?? 0) + 1 }, total: t.vote.total + 1 } }
    })
    return updated.vote
  })

  emitSafe('vote-counted', { fid })
  const winner = result.status === 'open' ? winnerOf(result) : null
  if (winner) await closeAndBreed(fid, winner)
  return { counts: result.counts, total: result.total, threshold: result.threshold, myVote: option }
}

// Owner override: close the round now and breed whoever leads (needs at least one vote).
export async function breedLeaderNow(fid) {
  const tree = await readTree(fid)
  const vote = tree?.crowd ? tree.vote : null
  if (!vote || vote.status !== 'open') throw new VoteError(409, 'There is no open round to close.')
  const [top] = ranked(vote)
  if (!top?.count) throw new VoteError(409, 'Nobody has voted yet, so there is no leader.')
  const winner = await closeAndBreed(fid, top)
  if (!winner) throw new VoteError(409, 'Kids are still building; try again when they are born.')
  return winner
}

export async function setPaused(fid, paused) {
  const tree = await updateTree(fid, (t) => (t.vote ? { ...t, vote: { ...t.vote, paused } } : t))
  emitSafe('vote-counted', { fid })
  return tree.vote
}

/* ---------- the loop ---------- */

// When a crowd litter finishes, the next round opens. If the model was overloaded, rest an hour first.
bus.on('litter-done', async ({ fid, kids }) => {
  const tree = await readTree(fid)
  if (!tree?.crowd) return
  const overloaded = kids.some((k) => k.status === 'failed' && OVERLOADED.test(k.summary ?? ''))
  const restingUntil = overloaded ? new Date(Date.now() + REST_MS).toISOString() : null
  await openRound(fid, kids[0].litter, { restingUntil })
})

// A lost kid that comes back (rescued or retried) joins its litter's open round with 0 votes.
bus.on('kid-ready', async ({ fid, kid }) => {
  await updateTree(fid, (t) => {
    const v = t.vote
    if (!t.crowd || !v || v.status !== 'open' || v.litter !== kid.litter || v.options.some((o) => o.key === kid.id)) return t
    const singles = v.options.filter((o) => o.kind === 'breed')
    const option = { key: kid.id, kind: 'breed', label: kid.label, name: kid.name }
    const others = v.options.filter((o) => o.kind !== 'breed')
    const cross = singles.length + 1 >= 2 && !others.some((o) => o.key === CROSS) ? [{ key: CROSS, kind: 'cross', label: '×', name: 'Cross the top two' }] : []
    const options = [...singles, option].sort((a, b) => a.label.localeCompare(b.label)).concat(others, cross)
    return { ...t, vote: { ...v, options, counts: { ...v.counts, [kid.id]: 0, ...(cross.length ? { [CROSS]: 0 } : {}) } } }
  })
  emitSafe('vote-counted', { fid })
})

// Autopilot: nobody voted, so the agent picks with the crowd's taste and says why.
async function autopilotPick(tree) {
  const vote = tree.vote
  const options = vote.options.map((o) => {
    const kid = tree.children[o.key]
    return o.kind === 'cross' ? `${o.key}: cross the two first kids` : `${o.key}: ${o.label} "${o.name}". Brief: ${kid?.brief ?? ''} Builder: ${kid?.summary ?? ''}`
  })
  const fallback = () => {
    const singles = vote.options.filter((o) => o.kind === 'breed')
    const pick = singles[Math.floor(Math.random() * singles.length)]
    return { winner: pick, reason: `${pick.label} ${pick.name}, at random (the agent couldn't decide).` }
  }
  if (config.builder === 'stub') return fallback()
  try {
    const taste = await readTaste(crowdTastePath())
    const reply = await askJson({
      system: 'You pick which child app breeds next in a family that strangers raise by voting. Nobody voted this round, so you pick for them. Follow the crowd\'s taste so far. Reply with JSON only.',
      user: [`The family's request: "${tree.request}"`, `The crowd's taste: ${tasteText(taste)}`, 'Options:', ...options, 'Reply as {"key":"<one option key>","reason":"<one short sentence for the public, naming the kid>"}'].join('\n'),
    })
    const winner = vote.options.find((o) => o.key === reply.key)
    return winner ? { winner, reason: String(reply.reason ?? '').slice(0, 200) || `${winner.label} ${winner.name}.` } : fallback()
  } catch {
    return fallback()
  }
}

// Every 15 s: a round whose clock has run out goes to its leader (ties go to the earlier option);
// a round nobody voted on goes to the agent's pick once its autopilot time comes.
// A family being closed is skipped until that finishes (the agent's pick can take longer than 15 s).
const closing = new Set()
setInterval(async () => {
  try {
    for (const fam of await listFamilies()) {
      if (!fam.crowd || closing.has(fam.id)) continue
      closing.add(fam.id)
      await checkRound(fam.id).finally(() => closing.delete(fam.id))
    }
  } catch (err) {
    console.error('round clock check failed:', err.message)
  }
}, 15 * 1000).unref()

async function checkRound(fid) {
  const tree = await readTree(fid)
  const vote = tree?.vote
  if (!vote || vote.status !== 'open' || vote.paused) return
  if (vote.restingUntil && Date.parse(vote.restingUntil) > Date.now()) return
  if (!vote.total && vote.autopilotAt && Date.parse(vote.autopilotAt) <= Date.now()) {
    const { winner, reason } = await autopilotPick(tree)
    await closeAndBreed(fid, winner, { autopilot: { reason } })
    return
  }
  if (!vote.closesAt || !vote.total || Date.parse(vote.closesAt) > Date.now()) return
  const [leader] = ranked(vote)
  if (leader?.count) await closeAndBreed(fid, leader)
}

// A crowd family's first round opens when generation 1 is born; restarts reopen a round that was mid-breed.
export async function resumeCrowdRounds() {
  for (const fam of await listFamilies()) {
    const tree = await readTree(fam.id)
    if (!tree?.crowd || !tree.litters.length) continue
    const busy = Object.values(tree.children).some((k) => ['briefing', 'queued', 'building', 'thumbing'].includes(k.status))
    if (!busy && (!tree.vote || tree.vote.status === 'breeding')) await openRound(fam.id, tree.litters.at(-1).id)
    else if (tree.vote?.status === 'open' && !tree.vote.total && !tree.vote.autopilotAt && config.autopilotMinutes > 0) {
      await updateTree(fam.id, (t) => ({ ...t, vote: { ...t.vote, autopilotAt: new Date(Date.now() + config.autopilotMinutes * 60000).toISOString() } }))
    }
    else if (tree.vote?.status === 'open' && tree.vote.total && !tree.vote.closesAt) {
      await updateTree(fam.id, (t) => ({ ...t, vote: { ...t.vote, closesAt: new Date(Date.now() + ROUND_MS()).toISOString() } }))
    }
  }
}
