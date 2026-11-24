// A litter: the breeder writes three briefs, three builders run at once, then thumbnails.
import { writeBriefs } from './breeder.mjs'
import { buildChild, fixChild } from './builder.mjs'
import { snapThumb } from './thumbs.mjs'
import { holdAwake } from './awake.mjs'
import { saveCheckpoint } from './checkpoints.mjs'
import { config } from './config.mjs'
import { readTree, updateTree, updateChild } from './store.mjs'

const LETTERS = ['A', 'B', 'C']
const PROGRESS_EVERY_MS = 1500

function labelsFor(tree, kind, parents) {
  if (kind === 'first') return LETTERS
  if (kind === 'breed') return [1, 2, 3].map((i) => `${parents[0].label}·${i}`)
  const crosses = tree.litters.filter((l) => l.kind === 'cross').length + 1
  const base = crosses === 1 ? 'X' : `X${crosses}`
  return [1, 2, 3].map((i) => `${base}·${i}`)
}

function nextNumber(tree) {
  const used = Object.values(tree.children).map((c) => c.n)
  return used.length ? Math.max(...used) + 1 : 1
}

// Adds the litter and its three children to the tree. Returns the new children.
async function addLitter(fid, { kind, parentIds, note, briefs }) {
  let created = []
  await updateTree(fid, (tree) => {
    const parents = parentIds.map((id) => tree.children[id])
    const gen = kind === 'first' ? 1 : Math.max(...parents.map((p) => p.gen)) + 1
    const labels = labelsFor(tree, kind, parents)
    const first = nextNumber(tree)
    const litterId = `l${tree.litters.length + 1}`
    created = briefs.map((b, i) => ({
      id: `${fid}-${first + i}`,
      n: first + i,
      label: labels[i],
      name: b.name,
      brief: b.brief,
      briefSource: b.source,
      gen,
      litter: litterId,
      parents: parentIds,
      status: 'queued',
      steps: 0,
      activity: '',
      createdAt: new Date().toISOString(),
    }))
    const now = new Date().toISOString()
    return {
      ...tree,
      updatedAt: now,
      litters: [...tree.litters, { id: litterId, kind, parents: parentIds, note, gen, children: created.map((c) => c.id), createdAt: now }],
      children: { ...tree.children, ...Object.fromEntries(created.map((c) => [c.id, c])) },
    }
  })
  return created
}

function throttle(fn, ms) {
  let last = 0
  let pending = null
  let timer = null
  return (value) => {
    pending = value
    const wait = last + ms - Date.now()
    if (wait <= 0) {
      last = Date.now()
      fn(pending)
    } else if (!timer) {
      timer = setTimeout(() => {
        timer = null
        last = Date.now()
        fn(pending)
      }, wait)
    }
  }
}

async function raiseOne({ fid, request, child, kind, parents }) {
  const startedAt = new Date().toISOString()
  await updateChild(fid, child.id, { status: 'building', startedAt })
  const report = throttle((p) => updateChild(fid, child.id, p).catch(() => {}), PROGRESS_EVERY_MS)
  const result = await buildChild({ fid, request, child, kind, parents, onProgress: report })
  const finishedAt = new Date().toISOString()
  if (!result.ok) {
    await updateChild(fid, child.id, { status: 'failed', finishedAt, steps: result.steps, summary: result.summary })
    return
  }
  await updateChild(fid, child.id, { status: 'thumbing', finishedAt, steps: result.steps, summary: result.summary })
  const url = `http://127.0.0.1:${config.port}/n/${child.id}/`
  const first = await snapThumb({ fid, n: child.n, url })
  if (!first.errors.length) {
    await updateChild(fid, child.id, { status: 'ready', thumb: first.thumb, activity: '', check: { errors: 0 } })
    return
  }
  // The browser found script errors: one repair round, then a fresh look.
  await updateChild(fid, child.id, { status: 'building', activity: 'Fixing a bug the browser found' })
  const fix = await fixChild({ fid, child, errors: first.errors, onProgress: report })
  const second = await snapThumb({ fid, n: child.n, url })
  await updateChild(fid, child.id, {
    status: 'ready',
    thumb: second.thumb,
    activity: '',
    finishedAt: new Date().toISOString(),
    steps: result.steps + fix.steps,
    check: { errors: first.errors.length, fixed: fix.ok && !second.errors.length, remaining: second.errors },
  })
}

const PLACEHOLDERS = [1, 2, 3].map(() => ({ name: '…', brief: '', source: 'pending' }))

async function fillBriefs(fid, children, briefs) {
  await updateTree(fid, (tree) => ({
    ...tree,
    children: {
      ...tree.children,
      ...Object.fromEntries(
        children.map((c, i) => [c.id, { ...tree.children[c.id], name: briefs[i].name, brief: briefs[i].brief, briefSource: briefs[i].source, activity: '' }]),
      ),
    },
  }))
  return children.map((c, i) => ({ ...c, name: briefs[i].name, brief: briefs[i].brief }))
}

// Starts a litter in the background. Resolves once the three (still unnamed) children are on the tree.
export async function startLitter({ fid, kind, parentIds = [], note = '' }) {
  const tree = await readTree(fid)
  const parents = parentIds.map((id) => tree.children[id])
  const placeholders = await addLitter(fid, { kind, parentIds, note, briefs: PLACEHOLDERS })
  await Promise.all(placeholders.map((c) => updateChild(fid, c.id, { status: 'briefing', activity: 'The breeder is writing its brief' })))
  const release = holdAwake(`litter-${fid}-${placeholders[0].litter}`)
  ;(async () => {
    const briefs = await writeBriefs({ tree, kind, parents, note })
    const children = await fillBriefs(fid, placeholders, briefs)
    await Promise.all(children.map((child) => raiseOne({ fid, request: tree.request, child, kind, parents })))
    const done = await readTree(fid)
    const kids = children.map((c) => done.children[c.id])
    await saveCheckpoint({ fid, gen: kids[0].gen, what: `Generation ${kids[0].gen}: ${kids.map((k) => `${k.label} ${k.name}`).join(', ')}` })
  })()
    .catch((err) => console.error(`litter in ${fid} failed:`, err))
    .finally(release)
  return placeholders
}

export async function startFamily({ fid, request }) {
  const now = new Date().toISOString()
  await updateTree(fid, () => ({
    id: fid,
    request,
    title: request.length > 48 ? `${request.slice(0, 45)}…` : request,
    createdAt: now,
    updatedAt: now,
    litters: [],
    children: {},
  }))
  return startLitter({ fid, kind: 'first' })
}
