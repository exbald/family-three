// Families live on the Sprite's disk: ~/families/<fid>/tree.json plus kids/<n>/ (the app code).
import { mkdir, readFile, writeFile, rename, readdir } from 'node:fs/promises'
import { randomBytes } from 'node:crypto'
import path from 'node:path'
import { config } from './config.mjs'

export const FAMILY_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
export const CHILD_ID = /^([a-z0-9]+(?:-[a-z0-9]+)*)-(\d{1,4})$/

export const familyDir = (fid) => path.join(config.familiesDir, fid)
export const kidDir = (fid, n) => path.join(familyDir(fid), 'kids', String(n))
export const logPath = (fid, n) => path.join(familyDir(fid), 'logs', `${n}.jsonl`)
const treePath = (fid) => path.join(familyDir(fid), 'tree.json')

export function parseChildId(cid) {
  const m = CHILD_ID.exec(cid ?? '')
  return m ? { fid: m[1], n: Number(m[2]) } : null
}

const STOP = new Set(['a', 'an', 'the', 'for', 'my', 'i', 'me', 'want', 'need', 'to', 'of', 'and', 'with', 'app', 'that', 'some', 'make'])

export function newFamilyId(request) {
  const words = request
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !STOP.has(w))
    .slice(0, 2)
  const slug = words.join('-').slice(0, 24) || 'family'
  return `${slug}-${randomBytes(3).toString('hex').slice(0, 4)}`
}

export async function readTree(fid) {
  if (!FAMILY_ID.test(fid)) return null
  try {
    return JSON.parse(await readFile(treePath(fid), 'utf8'))
  } catch (err) {
    if (err.code === 'ENOENT') return null
    throw err
  }
}

async function writeTree(fid, tree) {
  await mkdir(familyDir(fid), { recursive: true })
  const tmp = `${treePath(fid)}.${process.pid}.tmp`
  await writeFile(tmp, JSON.stringify(tree, null, 2))
  await rename(tmp, treePath(fid))
}

// One write queue per family, so three builders reporting at once never clobber each other.
const queues = new Map()

export function updateTree(fid, change) {
  const prev = queues.get(fid) ?? Promise.resolve()
  const next = prev.then(async () => {
    const current = await readTree(fid)
    const updated = change(current)
    await writeTree(fid, updated)
    return updated
  })
  queues.set(fid, next.catch(() => {}))
  return next
}

export function updateChild(fid, cid, patch) {
  return updateTree(fid, (tree) => ({
    ...tree,
    children: { ...tree.children, [cid]: { ...tree.children[cid], ...patch } },
  }))
}

// Archived families are hidden from lists, voting and Telegram; their pages still open by URL.
export async function listFamilies({ includeArchived = false } = {}) {
  let names = []
  try {
    names = await readdir(config.familiesDir)
  } catch (err) {
    if (err.code !== 'ENOENT') throw err
  }
  const trees = await Promise.all(names.filter((n) => FAMILY_ID.test(n)).map((n) => readTree(n)))
  return trees
    .filter((t) => t && (includeArchived || !t.archived))
    .map((t) => summarize(t))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

function summarize(tree) {
  const kids = Object.values(tree.children)
  const building = kids.filter((k) => ['briefing', 'queued', 'building', 'thumbing'].includes(k.status)).length
  return {
    id: tree.id,
    request: tree.request,
    title: tree.title,
    generations: Math.max(0, ...kids.map((k) => k.gen)),
    apps: kids.filter((k) => k.status === 'ready').length,
    adopted: kids.filter((k) => k.adopted).length,
    building,
    crowd: Boolean(tree.crowd),
    vote: tree.vote ? { status: tree.vote.status, total: tree.vote.total, threshold: tree.vote.threshold, paused: tree.vote.paused } : null,
    // Up to four pictures for the list: adopted ones first, then the newest.
    preview: kids
      .filter((k) => k.status === 'ready' && k.thumb)
      .sort((a, b) => Number(Boolean(b.adopted)) - Number(Boolean(a.adopted)) || b.n - a.n)
      .slice(0, 4)
      .map((k) => ({ id: k.id, label: k.label, name: k.name, adopted: Boolean(k.adopted), v: k.finishedAt ?? '' })),
    updatedAt: tree.updatedAt ?? tree.createdAt,
  }
}
