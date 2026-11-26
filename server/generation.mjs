// A litter: the breeder writes three briefs, three builders run at once, then thumbnails.
import { writeBriefs } from './breeder.mjs'
import { buildChild, fixChild } from './builder.mjs'
import { snapThumb } from './thumbs.mjs'
import { holdAwake } from './awake.mjs'
import { saveCheckpoint } from './checkpoints.mjs'
import { config } from './config.mjs'
import { access } from 'node:fs/promises'
import path from 'node:path'
import { kidDir, readTree, updateTree, updateChild } from './store.mjs'
import { emitSafe } from './events.mjs'

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

const OVERLOADED = /\b(529|429)\b|overloaded|rate.?limit|quota|temporarily unavailable/i
const hasApp = (fid, n) => access(path.join(kidDir(fid, n), 'index.html')).then(() => true, () => false)

// Builds one child. A builder that runs out of time but left an app is rescued (the browser check decides);
// one that left nothing starts over once. Then headless Chrome checks it, with one repair round if needed.
async function raiseOne({ fid, request, child, kind, parents }) {
  const startedAt = new Date().toISOString()
  await updateChild(fid, child.id, { status: 'building', startedAt, summary: '', activity: '' })
  const report = throttle((p) => updateChild(fid, child.id, p).catch(() => {}), PROGRESS_EVERY_MS)
  let result = await buildChild({ fid, request, child, kind, parents, onProgress: report })
  if (!result.ok && !(await hasApp(fid, child.n)) && !OVERLOADED.test(result.summary ?? '')) {
    await updateChild(fid, child.id, { activity: 'Starting over: the first try left no app' })
    const second = await buildChild({ fid, request, child, kind, parents, onProgress: report })
    result = { ...second, steps: result.steps + second.steps }
  }
  const finishedAt = new Date().toISOString()
  if (!result.ok && !(await hasApp(fid, child.n))) {
    await updateChild(fid, child.id, { status: 'failed', finishedAt, steps: result.steps, summary: result.summary })
    return
  }
  const rescued = !result.ok
  const summary = rescued ? 'The builder ran out of time after writing the app; the browser check let it through.' : result.summary
  await updateChild(fid, child.id, { status: 'thumbing', finishedAt, steps: result.steps, summary, rescued })
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
  if (rescued && second.errors.length) {
    await updateChild(fid, child.id, { status: 'failed', finishedAt: new Date().toISOString(), summary: `Ran out of time, and the app still throws: ${second.errors[0]}` })
    return
  }
  await updateChild(fid, child.id, {
    status: 'ready',
    thumb: second.thumb,
    activity: '',
    finishedAt: new Date().toISOString(),
    steps: result.steps + fix.steps,
    check: { errors: first.errors.length, fixed: fix.ok && !second.errors.length, remaining: second.errors },
  })
}

// Owner's "Try again" on a lost child: rescue it if its app exists, otherwise build it from scratch.
export async function retryChild({ fid, cid }) {
  const tree = await readTree(fid)
  const child = tree.children[cid]
  const litter = tree.litters.find((l) => l.id === child.litter)
  const parents = child.parents.map((id) => tree.children[id])
  if (!child.brief) return rebriefLitter({ fid, tree, litter, parents })
  const release = holdAwake(`retry-${cid}`)
  ;(async () => {
    if (await hasApp(fid, child.n)) await rescueChild({ fid, child })
    else await raiseOne({ fid, request: tree.request, child, kind: litter.kind, parents })
    const done = (await readTree(fid)).children[cid]
    if (done.status === 'ready') emitSafe('kid-ready', { fid, kid: done })
  })()
    .catch((err) => console.error(`retry ${cid} failed:`, err))
    .finally(release)
}

// A restart can kill a litter while the breeder is still writing briefs, leaving nameless children.
// Write the briefs again (without counting the pick twice) and raise every child that lost its brief.
async function rebriefLitter({ fid, tree, litter, parents }) {
  const lost = litter.children.map((id) => tree.children[id]).filter((c) => !c.brief && c.status === 'failed')
  // Mark them before answering, so a second click on a sibling is refused instead of starting another breeder.
  await Promise.all(lost.map((c) => updateChild(fid, c.id, { status: 'briefing', activity: 'The breeder is writing its brief', summary: '' })))
  const release = holdAwake(`rebrief-${fid}-${litter.id}`)
  ;(async () => {
    const briefs = await writeBriefs({ tree, kind: litter.kind, parents, note: litter.note ?? '', countPick: false })
    const children = await fillBriefs(fid, lost, briefs.slice(0, lost.length))
    await Promise.all(children.map((child) => raiseOne({ fid, request: tree.request, child, kind: litter.kind, parents })))
    const done = await readTree(fid)
    for (const c of children) if (done.children[c.id].status === 'ready') emitSafe('kid-ready', { fid, kid: done.children[c.id] })
  })()
    .catch((err) => console.error(`re-briefing ${litter.id} in ${fid} failed:`, err))
    .finally(release)
}

// A lost child whose app exists: let the browser check decide, with one repair round.
async function rescueChild({ fid, child }) {
  await updateChild(fid, child.id, { status: 'thumbing', activity: 'Checking the app it left', summary: '' })
  const url = `http://127.0.0.1:${config.port}/n/${child.id}/`
  let check = await snapThumb({ fid, n: child.n, url })
  let steps = 0
  if (check.errors.length) {
    await updateChild(fid, child.id, { status: 'building', activity: 'Fixing a bug the browser found' })
    const fix = await fixChild({ fid, child, errors: check.errors, onProgress: () => {} })
    steps = fix.steps
    check = await snapThumb({ fid, n: child.n, url })
  }
  if (check.errors.length) {
    await updateChild(fid, child.id, { status: 'failed', activity: '', summary: `The app still throws: ${check.errors[0]}` })
    return
  }
  await updateChild(fid, child.id, {
    status: 'ready', thumb: check.thumb, activity: '', rescued: true, finishedAt: new Date().toISOString(),
    summary: 'Rescued: the builder ran out of time after writing the app, and the browser check let it through.',
    steps: (child.steps ?? 0) + steps,
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
  emitSafe('litter-started', { fid, litter: placeholders[0].litter, kind, parents, note })
  ;(async () => {
    const briefs = await writeBriefs({ tree, kind, parents, note })
    const children = await fillBriefs(fid, placeholders, briefs)
    await Promise.all(children.map((child) => raiseOne({ fid, request: tree.request, child, kind, parents })))
    const done = await readTree(fid)
    const kids = children.map((c) => done.children[c.id])
    await saveCheckpoint({ fid, gen: kids[0].gen, what: `Generation ${kids[0].gen}: ${kids.map((k) => `${k.label} ${k.name}`).join(', ')}` })
    emitSafe('litter-done', { fid, litter: kids[0].litter, kids })
  })()
    .catch((err) => console.error(`litter in ${fid} failed:`, err))
    .finally(release)
  return placeholders
}

export async function startFamily({ fid, request, crowd = false, seeded = false }) {
  const now = new Date().toISOString()
  await updateTree(fid, () => ({
    id: fid,
    request,
    crowd,
    ...(seeded ? { seeded: true } : {}),
    title: request.length > 48 ? `${request.slice(0, 45)}…` : request,
    createdAt: now,
    updatedAt: now,
    litters: [],
    children: {},
  }))
  return startLitter({ fid, kind: 'first' })
}
