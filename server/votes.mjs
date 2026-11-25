// Crowd voting: anyone can vote, once per round per browser (and at most 3 per round per IP).
// When an option crosses the threshold, it breeds (or crosses the top two). Plain code, no model.
import { createHash, randomBytes } from 'node:crypto'
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises'
import path from 'node:path'
import { config } from './config.mjs'
import { bus, emitSafe } from './events.mjs'
import { familyDir, listFamilies, readTree, updateTree } from './store.mjs'
import { startLitter } from './generation.mjs'

const MIN_THRESHOLD = 5
const MAX_THRESHOLD = 50
const LEAD = 2
const PER_IP = 3
const IP_GAP_MS = 2000
const FALLBACK_AFTER_MS = 6 * 3600 * 1000
const FALLBACK_QUORUM = 3
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

export function clientIp(req) {
  const h = req.headers
  const forwarded = String(h['fly-client-ip'] ?? h['x-real-ip'] ?? String(h['x-forwarded-for'] ?? '').split(',')[0] ?? '').trim()
  return forwarded || req.socket.remoteAddress || 'unknown'
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

function winnerOf(vote, { fallback = false } = {}) {
  const [top, second] = ranked(vote)
  if (!top || !top.count) return null
  const lead = top.count - (second?.count ?? 0)
  if (top.count >= vote.threshold && lead >= LEAD) return top
  if (fallback && vote.total >= FALLBACK_QUORUM && lead > 0) return top
  return null
}

async function closeAndBreed(fid, winner) {
  const tree = await readTree(fid)
  const vote = tree.vote
  const singles = ranked(vote).filter((o) => o.kind === 'breed')
  const busy = Object.values(tree.children).some((k) => ['briefing', 'queued', 'building', 'thumbing'].includes(k.status))
  if (busy) return null
  const parentIds = winner.kind === 'cross' ? singles.slice(0, 2).map((o) => o.key) : [winner.key]
  if (!parentIds.every((id) => tree.children[id]?.status === 'ready')) return null
  await updateTree(fid, (t) => ({
    ...t,
    vote: { ...t.vote, status: 'breeding', lastTotal: t.vote.total, lastWinner: winner.key, closedAt: new Date().toISOString() },
  }))
  const names = parentIds.map((id) => tree.children[id].label).join(' × ')
  const note = `Chosen by ${vote.total} vote${vote.total === 1 ? '' : 's'}.`
  emitSafe('vote-closed', { fid, winner, parents: parentIds, counts: vote.counts, total: vote.total, names })
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
      return { ...t, vote: { ...t.vote, counts: { ...t.vote.counts, [option]: (t.vote.counts[option] ?? 0) + 1 }, total: t.vote.total + 1 } }
    })
    return updated.vote
  })

  emitSafe('vote-counted', { fid })
  const winner = result.status === 'open' ? winnerOf(result) : null
  if (winner) await closeAndBreed(fid, winner)
  return { counts: result.counts, total: result.total, threshold: result.threshold, myVote: option }
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

// Every few minutes: a round open for 6 hours with a few votes goes to its leader.
setInterval(async () => {
  try {
    for (const fam of await listFamilies()) {
      const tree = await readTree(fam.id)
      const vote = tree?.crowd ? tree.vote : null
      if (!vote || vote.status !== 'open' || vote.paused) continue
      if (Date.now() - Date.parse(vote.openedAt) < FALLBACK_AFTER_MS) continue
      const winner = winnerOf(vote, { fallback: true })
      if (winner) await closeAndBreed(fam.id, winner)
    }
  } catch (err) {
    console.error('vote fallback check failed:', err.message)
  }
}, 5 * 60 * 1000).unref()

// A crowd family's first round opens when generation 1 is born; restarts reopen a round that was mid-breed.
export async function resumeCrowdRounds() {
  for (const fam of await listFamilies()) {
    const tree = await readTree(fam.id)
    if (!tree?.crowd || !tree.litters.length) continue
    const busy = Object.values(tree.children).some((k) => ['briefing', 'queued', 'building', 'thumbing'].includes(k.status))
    if (!busy && (!tree.vote || tree.vote.status === 'breeding')) await openRound(fam.id, tree.litters.at(-1).id)
  }
}
