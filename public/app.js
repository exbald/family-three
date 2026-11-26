// Family Three front end: the ask page and a family (tree on laptops, litters on phones). Plain JS, no build step.
import { treeHtml, panelHtml, tasteHtml } from './treeview.js'
import { drawCheckpoints, hideCheckpoints } from './checkpoints.js'
import { adoptedHtml, wireAdopted } from './adopted.js'
import { wireKit } from './kit.js'
import { wireGrow } from './growup.js'
import { dashboardHtml } from './dashboard.js'
import { landingHtml, INSTALL, AGENT_LINE } from './landing.js'
import { voteHtml, wireVote } from './vote.js'
const view = document.getElementById('view')
const familyHead = document.getElementById('family-head')
const newFamily = document.getElementById('new-family')
const actionbar = document.getElementById('actionbar')

const SUGGESTIONS = ['A tracker for my running', 'Where my money leaks', 'Thanksgiving dinner for 8', 'A page for my dog-walking gig']
const BUSY = new Set(['briefing', 'queued', 'building', 'thumbing'])

let state = { fid: null, tree: null, taste: null, picked: [], selected: null, crossFrom: null, pollTimer: null, sending: false }
const wide = window.matchMedia('(min-width: 1000px)')
let owner = false

const esc = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

async function api(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: { 'content-type': 'application/json', ...(options.headers ?? {}) },
  })
  const body = await res.json().catch(() => ({ success: false, error: 'The Sprite sent an unreadable reply.' }))
  if (!res.ok || !body.success) throw new Error(body.error ?? `Request failed (${res.status})`)
  return body.data
}

function duration(fromIso, toIso) {
  if (!fromIso) return ''
  const secs = Math.max(0, Math.round(((toIso ? Date.parse(toIso) : Date.now()) - Date.parse(fromIso)) / 1000))
  const m = Math.floor(secs / 60)
  return m ? `${m} min ${secs % 60} s` : `${secs} s`
}

/* ---------- Home: ask for an app ---------- */

async function renderHome() {
  document.title = 'Family Three'
  familyHead.hidden = true
  newFamily.hidden = true
  actionbar.hidden = true
  hideCheckpoints()
  if (!owner) return renderVisitorHome()
  view.innerHTML = `
    <section class="ask">
      <h1>What should I raise?</h1>
      <form id="ask-form">
        <label for="ask">Say it however you like. I’ll make three different children, each a working app.</label>
        <textarea id="ask" name="request" maxlength="500" required placeholder="A tracker for my running. Weekly distance, a streak, nothing cute."></textarea>
        <label class="crowd-check"><input type="checkbox" id="crowd"> Crowd family: anyone can vote on which kid breeds next</label>
      </form>
      <div class="row"><button class="btn btn-lime" type="submit" form="ask-form" id="raise">Raise 3 children</button></div>
      <p class="error" id="ask-error" hidden></p>
      <div>
        <p class="mono-label">Or try</p>
        <div class="chips">${SUGGESTIONS.map((s) => `<button class="chip" type="button" data-suggest="${esc(s)}">${esc(s)}</button>`).join('')}</div>
      </div>
      <div id="families"></div>
    </section>`

  const form = document.getElementById('ask-form')
  const textarea = document.getElementById('ask')
  view.querySelectorAll('[data-suggest]').forEach((btn) =>
    btn.addEventListener('click', () => {
      textarea.value = btn.dataset.suggest
      textarea.focus()
    }),
  )
  form.addEventListener('submit', onAsk)
  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) form.requestSubmit()
  })
  renderFamilyList()
}

function wireInstallCopy(root) {
  root.querySelector('[data-copy-install]')?.addEventListener('click', (e) => {
    const btn = e.currentTarget
    navigator.clipboard?.writeText(INSTALL).then(() => { btn.textContent = 'Copied' }, () => {})
  })
}

async function renderVisitorHome() {
  view.innerHTML = landingHtml({ tree: null, families: [], esc, loading: true })
  const families = await api('/api/families').catch(() => [])
  const byApps = [...families].sort((a, b) => b.apps - a.apps)
  // The showcase is the Thanksgiving family when there is one; otherwise the biggest family.
  const featured = byApps.find((f) => /thanksgiving/i.test(f.request) && f.apps) ?? byApps[0] ?? null
  const crowds = byApps.filter((f) => f.crowd && (f.apps || f.building))
  const [site, tree] = await Promise.all([
    api('/api/site').catch(() => ({})),
    featured ? api(`/api/families/${encodeURIComponent(featured.id)}`).catch(() => null) : null,
  ])
  view.innerHTML = landingHtml({ tree, families, esc, crowds, telegram: site.telegramChannel ?? '', nextFamilyAt: site.nextFamilyAt ?? null })
  startCountdowns()
  wireInstallCopy(view)
  view.querySelector('[data-copy-agent-line]')?.addEventListener('click', (e) => {
    const btn = e.currentTarget
    navigator.clipboard?.writeText(AGENT_LINE).then(() => { btn.textContent = 'Copied' }, () => {})
  })
  revealOnScroll(view)
  wireFilm(view)
  if (tree?.crowd) {
    state = { ...state, landingFid: tree.id }
    drawLandingVote(tree.id)
  }
  if (families.length) renderFamilyList()
  if (location.hash) document.querySelector(location.hash)?.scrollIntoView()
}

// The film opens in a dialog and plays; closing it (button, Escape or a click outside) stops it.
function wireFilm(root) {
  const dialog = root.querySelector('.lp2-film')
  const video = dialog?.querySelector('video')
  if (!dialog || !video) return
  root.querySelector('[data-film]')?.addEventListener('click', () => {
    dialog.showModal()
    video.play().catch(() => {})
  })
  dialog.querySelector('[data-film-close]')?.addEventListener('click', () => dialog.close())
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close() })
  dialog.addEventListener('close', () => video.pause())
}

// The families dashboard. It polls so new families and open votes show up on their own.
async function renderDashboard(filter = state.dashFilter ?? 'all') {
  state = { ...state, dashFilter: filter }
  if (!view.querySelector('.dash')) view.innerHTML = '<p class="empty">Gathering the families…</p>'
  const [families, site] = await Promise.all([api('/api/families').catch(() => []), api('/api/site').catch(() => ({}))])
  if (location.pathname !== '/families') return
  view.innerHTML = dashboardHtml({ families, filter, nextFamilyAt: site.nextFamilyAt ?? null, esc })
  for (const b of view.querySelectorAll('[data-filter]')) b.addEventListener('click', () => renderDashboard(b.dataset.filter))
  startCountdowns()
  clearTimeout(state.pollTimer)
  state = { ...state, pollTimer: setTimeout(() => location.pathname === '/families' && renderDashboard(), 20000) }
}

// Every [data-countdown] shows the time left until its ISO time, updated each second; done shows "any moment".
let countdownTimer = null
function startCountdowns() {
  clearInterval(countdownTimer)
  const tick = () => {
    const els = document.querySelectorAll('[data-countdown]')
    if (!els.length) return clearInterval(countdownTimer)
    for (const el of els) {
      const left = Math.max(0, Date.parse(el.dataset.countdown) - Date.now())
      const s = Math.floor(left / 1000)
      const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60
      el.textContent = left === 0 ? 'any moment' : h ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}:${String(sec).padStart(2, '0')}`
    }
  }
  tick()
  countdownTimer = setInterval(tick, 1000)
}

// Each generation's lines draw down as it scrolls into view. Without JS or with reduced motion, everything just shows.
function revealOnScroll(root) {
  if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const rows = [...root.querySelectorAll('[data-reveal]')]
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target) }
  }, { rootMargin: '0px 0px -15% 0px' })
  for (const row of rows) { row.classList.add('is-armed'); io.observe(row) }
}

async function drawLandingVote(fid) {
  const box = document.getElementById('crowd-vote')
  if (!box || !document.body.contains(box)) return
  try {
    const tree = await api(`/api/families/${encodeURIComponent(fid)}`)
    if (state.landingFid !== fid) return
    box.innerHTML = voteHtml({ tree, esc, compact: true })
    wireVote(box, { api, fid, onChange: () => drawLandingVote(fid) })
  } catch {
    box.innerHTML = ''
  }
  if (state.landingFid !== fid) return
  clearTimeout(state.pollTimer)
  state = { ...state, pollTimer: setTimeout(() => drawLandingVote(fid), 4000) }
}

async function onAsk(event) {
  event.preventDefault()
  const button = document.getElementById('raise')
  const error = document.getElementById('ask-error')
  const request = document.getElementById('ask').value.trim()
  error.hidden = true
  button.disabled = true
  button.textContent = 'Starting three builders…'
  try {
    const crowd = document.getElementById('crowd')?.checked === true
    const { id } = await api('/api/families', { method: 'POST', body: JSON.stringify({ request, crowd }) })
    navigate(`/f/${id}`)
  } catch (err) {
    error.textContent = err.message
    error.hidden = false
    button.disabled = false
    button.textContent = 'Raise 3 children'
  }
}

async function renderFamilyList() {
  const box = document.getElementById('families')
  if (!box) return
  try {
    const all = await api('/api/families')
    // On the landing, the crowd families already have their own section; list the owner's own families with apps.
    const families = box.closest('.landing') ? all.filter((f) => !f.crowd && f.apps) : all
    if (!families.length) return box.closest('section')?.remove()
    box.innerHTML = `
      ${box.closest('.landing') ? '' : `<p class="mono-label">${owner ? 'Your families' : 'Families on this Sprite'}</p>`}
      <div class="families">${families.map(familyRow).join('')}</div>`
  } catch (err) {
    box.innerHTML = `<p class="error">${esc(err.message)}</p>`
  }
}

function familyRow(f) {
  const status = f.crowd && f.vote?.status === 'open'
    ? `<span class="pill pill-x">Crowd · ${f.vote.total} vote${f.vote.total === 1 ? '' : 's'}</span>`
    : f.building
    ? `<span class="pill pill-busy">${f.building} growing</span>`
    : f.adopted
      ? `<span class="pill pill-live">${f.adopted} adopted</span>`
      : ''
  const shots = (f.preview ?? [])
    .map((k) => `<span class="fam-shot${k.adopted ? ' adopted' : ''}"><img src="/thumb/${esc(k.id)}.png?v=${encodeURIComponent(k.v)}" alt=""><span>${esc(k.label)} ${esc(k.name)}</span></span>`)
    .join('')
  return `
    <a class="fam${shots ? ' has-shots' : ''}" href="/f/${esc(f.id)}" data-link>
      <span class="fam-top">
        <span class="fam-badge">${f.apps}</span>
        <span class="fam-text"><strong>${esc(f.title)}</strong><span>Generation ${f.generations} · ${f.apps} apps</span></span>
        ${status}
      </span>
      ${shots ? `<span class="fam-shots">${shots}</span>` : ''}
    </a>`
}

/* ---------- Family: litters of three ---------- */

async function renderFamily(fid) {
  if (state.fid !== fid) state = { ...state, fid, tree: null, picked: [], selected: null, crossFrom: null }
  newFamily.hidden = !owner
  if (!state.tree) view.innerHTML = '<p class="empty">Waking the family…</p>'
  await refreshFamily()
}

async function refreshFamily() {
  clearTimeout(state.pollTimer)
  const fid = state.fid
  try {
    const [tree, taste, checkpoints] = await Promise.all([
      api(`/api/families/${encodeURIComponent(fid)}`),
      api(`/api/taste?family=${encodeURIComponent(fid)}`).catch(() => null),
      owner ? api(`/api/checkpoints?family=${encodeURIComponent(fid)}`).catch(() => []) : [],
    ])
    if (state.fid !== fid) return
    drawCheckpoints({ list: checkpoints, owner, esc, api })
    state = { ...state, tree, taste, picked: state.picked.filter((id) => tree.children[id]?.status === 'ready') }
    drawFamily()
  } catch (err) {
    view.innerHTML = `<p class="empty">${esc(err.message)} <a href="/" data-link>Start a family</a></p>`
    return
  }
  const busy = Object.values(state.tree.children).some((c) => BUSY.has(c.status) || c.adoption?.status === 'working' || c.kit?.status === 'working' || c.growup?.status === 'working')
  state.pollTimer = setTimeout(refreshFamily, busy ? 2000 : state.tree.crowd ? 3000 : 10000)
}

function visitorBanner() {
  if (state.tree?.crowd) return `<p class="visitor-note crowd-note">This family is raised by whoever shows up. Vote for the kid that breeds next: no account, one vote per round. The winner breeds by itself.</p>`
  return owner ? '' : `<p class="visitor-note">You’re looking at someone’s family. Every app is live. <a href="/" data-link>Raise your own in one command ›</a></p>`
}

function crowdPanel() {
  return state.tree?.crowd ? voteHtml({ tree: state.tree, esc, owner }) : ''
}

function drawFamily() {
  const { tree } = state
  const kids = Object.values(tree.children)
  const gens = Math.max(0, ...kids.map((k) => k.gen))
  const ready = kids.filter((k) => k.status === 'ready').length
  const growing = kids.filter((k) => BUSY.has(k.status)).length
  document.title = `${tree.title} · Family Three`
  familyHead.hidden = false
  familyHead.innerHTML = `<strong>${esc(tree.title)}</strong><span>Generation ${gens} · ${ready} apps${growing ? ` · ${growing} growing` : ''} · <a class="share-card" href="/card/${esc(tree.id)}.png" target="_blank" rel="noopener">Share card ›</a></span>`

  if (wide.matches) drawTreeView()
  else {
    view.innerHTML = visitorBanner() + crowdPanel() + tree.litters.map((litter) => litterSection(litter, tree)).reverse().join('') + tasteHtml(state.taste, esc)
    view.querySelectorAll('[data-pick]').forEach((btn) => btn.addEventListener('click', () => togglePick(btn.dataset.pick)))
  }
  if (tree.crowd) wireVote(view, { api, fid: tree.id, onChange: () => refreshFamily() })
  view.querySelectorAll('[data-retry]').forEach((btn) =>
    btn.addEventListener('click', async () => {
      btn.disabled = true
      btn.textContent = 'Trying again…'
      try {
        await api('/api/retry', { method: 'POST', body: JSON.stringify({ child: btn.dataset.retry }) })
        await refreshFamily()
      } catch (err) {
        btn.disabled = false
        btn.textContent = err.message
      }
    }),
  )
  drawActionbar()
}

function defaultSelection(tree) {
  const kids = Object.values(tree.children).sort((a, b) => b.n - a.n)
  return (kids.find((k) => k.status === 'ready') ?? kids[0])?.id ?? null
}

function drawTreeView() {
  const { tree } = state
  const selected = tree.children[state.selected] ? state.selected : defaultSelection(tree)
  state = { ...state, selected }
  const scroller = view.querySelector('.tree-scroll')
  const scroll = scroller ? { left: scroller.scrollLeft, top: scroller.scrollTop } : null
  const sideTop = view.querySelector('.side')?.scrollTop ?? 0
  view.innerHTML = `${visitorBanner()}
    <div class="treeview">
      <section class="tree-card" aria-label="Family tree">
        <div class="tree-legend">
          <span>Tap a child to see it. Breed from one, or cross two.</span>
          <span class="keys"><span><i class="k-kept"></i>the line you kept</span><span><i class="k-cross"></i>a cross</span></span>
        </div>
        ${treeHtml(tree, { selected, picked: state.picked, esc })}
      </section>
      <aside class="side">${crowdPanel()}${panelHtml(tree, { selected, crossFrom: state.crossFrom, esc, duration, owner })}${tasteHtml(state.taste, esc)}</aside>
    </div>`
  const next = view.querySelector('.tree-scroll')
  if (scroll && next) next.scrollTo(scroll.left, scroll.top)
  const side = view.querySelector('.side')
  if (side) side.scrollTop = sideTop
  view.querySelectorAll('[data-select]').forEach((b) => b.addEventListener('click', () => onSelect(b.dataset.select)))
  view.querySelector('[data-breed]')?.addEventListener('click', (e) => setPicks([e.currentTarget.dataset.breed]))
  view.querySelector('[data-cross-from]')?.addEventListener('click', (e) => {
    state = { ...state, crossFrom: e.currentTarget.dataset.crossFrom, picked: [] }
    drawFamily()
  })
  view.querySelector('[data-adopt]')?.addEventListener('click', (e) => onAdopt(e.currentTarget))
  wireKit(view, { api, onStarted: () => refreshFamily() })
  wireGrow(view, { api, onStarted: () => refreshFamily() })
  view.querySelector('[data-copy]')?.addEventListener('click', (e) => {
    const btn = e.currentTarget
    navigator.clipboard?.writeText(btn.dataset.copy).then(() => { btn.textContent = 'Copied' }, () => {})
  })
  view.querySelector('[data-cancel-cross]')?.addEventListener('click', () => {
    state = { ...state, crossFrom: null }
    drawFamily()
  })
}

async function onAdopt(button) {
  button.disabled = true
  button.textContent = 'Adopting…'
  try {
    await api('/api/adopt', { method: 'POST', body: JSON.stringify({ child: button.dataset.adopt }) })
    await refreshFamily()
  } catch (err) {
    button.disabled = false
    button.textContent = err.message
  }
}

function onSelect(id) {
  const { crossFrom, tree } = state
  if (crossFrom && id !== crossFrom && tree.children[id]?.status === 'ready') {
    state = { ...state, selected: id, crossFrom: null, picked: [crossFrom, id] }
  } else {
    state = { ...state, selected: id, picked: [] }
  }
  drawFamily()
}

function setPicks(picked) {
  state = { ...state, picked, crossFrom: null }
  drawFamily()
}

function litterSection(litter, tree) {
  const label = (id) => tree.children[id]?.label ?? '?'
  const from =
    litter.kind === 'first'
      ? `<span class="from">“${esc(tree.request)}”</span>`
      : litter.kind === 'breed'
        ? `<span class="from">bred from <b>${esc(label(litter.parents[0]))}</b></span>`
        : `<span class="from">crossed <b>${esc(label(litter.parents[0]))}</b> <b class="x">× ${esc(label(litter.parents[1]))}</b></span>`
  const note = litter.note ? `<span class="note">“${esc(litter.note)}”</span>` : ''
  return `
    <section class="litter" aria-label="Generation ${litter.gen}">
      <div class="litter-head"><h2>Generation ${litter.gen}</h2>${from}${note}</div>
      <div class="kids">${litter.children.map((id) => kidCard(tree.children[id])).join('')}</div>
    </section>`
}

function kidCard(kid) {
  const pickIndex = state.picked.indexOf(kid.id)
  const classes = ['kid', pickIndex >= 0 ? 'picked' : '', pickIndex === 1 ? 'second' : ''].join(' ')
  const ready = kid.status === 'ready'
  const shot = ready
    ? kid.thumb
      ? `<img src="/thumb/${esc(kid.id)}.png?v=${encodeURIComponent(kid.finishedAt ?? '')}" alt="Screenshot of ${esc(kid.label)} ${esc(kid.name)}">`
      : `<div class="growing">No picture yet. Open it to see.</div>`
    : kid.status === 'failed'
      ? `<div class="growing"><span class="pill pill-fail">Didn’t make it</span><span>${esc(kid.summary ?? '')}</span></div>`
      : `<div class="growing"><div class="seed" aria-hidden="true"></div><span>${kid.status === 'briefing' ? 'The breeder is writing its brief' : kid.status === 'thumbing' ? 'Taking its picture' : kid.status === 'queued' ? 'Waiting for a builder' : `Growing · ${kid.steps ?? 0} steps · ${duration(kid.startedAt)}`}</span><span class="act">${esc(kid.activity ?? '')}</span></div>`
  const meta = ready ? `born in ${duration(kid.startedAt, kid.finishedAt)}` : ''
  return `
    <article class="${classes}">
      <button class="kid-pick" type="button" data-pick="${esc(kid.id)}" aria-pressed="${pickIndex >= 0}" aria-label="Pick ${esc(kid.label)} ${esc(kid.name)}" ${ready && owner ? '' : 'disabled'}></button>
      <div class="shot">${shot}</div>
      <div class="kid-row">
        <span class="kid-name"><b>${esc(kid.label)}</b><span>${esc(kid.name)}</span></span>
        <span class="check" aria-hidden="true">${pickIndex >= 0 ? '✓' : ''}</span>
      </div>
      <p class="brief">${esc(kid.brief)}</p>
      <div class="kid-foot">
        ${ready ? `<a href="${esc(kid.adopted ? kid.adoption.sprite : `/n/${kid.id}/`)}" target="_blank" rel="noopener">${kid.adopted ? 'Adopted · open ›' : 'Open the live app ›'}</a>` : kid.status === 'failed' && owner ? `<button class="linkish lime retry-btn" type="button" data-retry="${esc(kid.id)}">Try again ›</button>` : '<span></span>'}
        <span class="meta">${meta}</span>
      </div>
    </article>`
}

function togglePick(id) {
  const has = state.picked.includes(id)
  const picked = has ? state.picked.filter((p) => p !== id) : [...state.picked, id].slice(-2)
  state = { ...state, picked }
  drawFamily()
}

function drawActionbar() {
  const { picked, tree } = state
  if (!picked.length || !owner) {
    actionbar.hidden = true
    actionbar.dataset.key = ''
    return
  }
  const key = picked.join('+')
  if (actionbar.dataset.key === key && !actionbar.hidden) return
  const [a, b] = picked.map((id) => tree.children[id])
  actionbar.dataset.key = key
  actionbar.hidden = false
  actionbar.innerHTML = b
    ? `<p>Cross <b>${esc(a.label)}</b> and <b>${esc(b.label)}</b>: ${esc(a.label)}’s bones, ${esc(b.label)}’s looks.</p>
       <div class="row"><input id="note" maxlength="300" placeholder="Anything to keep or change? (optional)" aria-label="Note for the builders">
       <button class="btn btn-orange" id="go" type="button">Cross ${esc(a.label)} × ${esc(b.label)}</button></div>`
    : `<p>Breed three new children from <b>${esc(a.label)}</b>. Pick one more to cross instead.</p>
       <div class="row"><input id="note" maxlength="300" placeholder="What do you like or want changed? (optional)" aria-label="Note for the builders">
       <button class="btn btn-lime" id="go" type="button">Breed from ${esc(a.label)}</button></div>
       ${a.adopted
         ? `<a class="btn btn-ghost" href="/f/${esc(tree.id)}/adopted/${esc(a.id)}" data-link>${esc(a.label)} is adopted: see its page</a>`
         : `<button class="btn btn-ghost" id="adopt-one" type="button">Adopt ${esc(a.label)}: a public link and a repo</button>`}`
  document.getElementById('go').addEventListener('click', onBreedOrCross)
  document.getElementById('adopt-one')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget
    btn.disabled = true
    try {
      await api('/api/adopt', { method: 'POST', body: JSON.stringify({ child: a.id }) })
      state = { ...state, picked: [] }
      actionbar.hidden = true
      navigate(`/f/${tree.id}/adopted/${a.id}`)
    } catch (err) {
      btn.disabled = false
      btn.textContent = err.message
    }
  })
}

async function onBreedOrCross() {
  if (state.sending) return
  const go = document.getElementById('go')
  const note = document.getElementById('note').value.trim()
  const [a, b] = state.picked
  state = { ...state, sending: true }
  go.disabled = true
  try {
    const body = b ? { a, b, note } : { parent: a, note }
    const { children } = await api(b ? '/api/cross' : '/api/breed', { method: 'POST', body: JSON.stringify(body) })
    state = { ...state, picked: [], sending: false, selected: children[0] ?? state.selected }
    actionbar.hidden = true
    await refreshFamily()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } catch (err) {
    state = { ...state, sending: false }
    go.disabled = false
    actionbar.querySelector('p').textContent = err.message
  }
}

/* ---------- Routing ---------- */

function navigate(path) {
  history.pushState({}, '', path)
  route()
}

async function renderAdoptedPage(fid, cid) {
  clearTimeout(state.pollTimer)
  newFamily.hidden = true
  actionbar.hidden = true
  hideCheckpoints()
  try {
    const [tree, taste] = await Promise.all([api(`/api/families/${encodeURIComponent(fid)}`), api('/api/taste').catch(() => null)])
    const kid = tree.children[cid]
    if (!kid) throw new Error('No child with that id in this family.')
    familyHead.hidden = true
    document.title = `${kid.label} ${kid.name} · Family Three`
    view.innerHTML = adoptedHtml({ tree, kid, taste, esc, owner })
    wireAdopted(view)
    wireKit(view, { api, onStarted: () => renderAdoptedPage(fid, cid) })
    wireGrow(view, { api, onStarted: () => renderAdoptedPage(fid, cid) })
    if (kid.adoption?.status === 'working' || kid.kit?.status === 'working' || kid.growup?.status === 'working') state = { ...state, pollTimer: setTimeout(() => renderAdoptedPage(fid, cid), 2000) }
  } catch (err) {
    view.innerHTML = `<p class="empty">${esc(err.message)} <a href="/" data-link>Home</a></p>`
  }
}

function route() {
  clearTimeout(state.pollTimer)
  for (const a of document.querySelectorAll('.site-nav a[data-link]')) a.toggleAttribute('aria-current', a.getAttribute('href') === location.pathname)
  if (location.pathname === '/families') {
    state = { ...state, fid: null, tree: null, picked: [] }
    familyHead.hidden = true
    newFamily.hidden = !owner
    actionbar.hidden = true
    hideCheckpoints()
    renderDashboard()
    return
  }
  if (location.pathname === '/about') {
    state = { ...state, fid: null, tree: null, picked: [] }
    familyHead.hidden = true
    newFamily.hidden = true
    actionbar.hidden = true
    hideCheckpoints()
    renderVisitorHome()
    return
  }
  const adopted = /^\/f\/([^/]+)\/adopted\/([^/]+)$/.exec(location.pathname)
  const match = /^\/f\/([^/]+)$/.exec(location.pathname)
  if (adopted) renderAdoptedPage(decodeURIComponent(adopted[1]), decodeURIComponent(adopted[2]))
  else if (match) renderFamily(decodeURIComponent(match[1]))
  else {
    state = { ...state, fid: null, tree: null, picked: [] }
    renderHome()
  }
}

document.addEventListener('click', (e) => {
  const link = e.target.closest('a[data-link], a#new-family, a.brand')
  if (!link || e.metaKey || e.ctrlKey || e.shiftKey) return
  e.preventDefault()
  navigate(link.getAttribute('href'))
})
window.addEventListener('popstate', route)
owner = await api('/api/me').then((me) => me.owner, () => false)
wide.addEventListener('change', () => state.tree && drawFamily())
route()
