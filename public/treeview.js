// The laptop view of a family: the tree on the left, the selected child on the right.
import { layoutTree, lineage, treeLines, NODE_W, NODE_H, TOP, ROW_H, REQUEST_TOP } from './tree.js'
import { kitHtml } from './kit.js'

const BUSY = new Set(['briefing', 'queued', 'building', 'thumbing'])

function nodeStatus(kid) {
  if (kid.adopted) return { text: 'Adopted', cls: 'pill-live' }
  if (kid.status === 'ready') return { text: 'Live', cls: 'pill-quiet' }
  if (kid.status === 'failed') return { text: 'Lost', cls: 'pill-fail' }
  return { text: 'Growing', cls: 'pill-busy' }
}

function shot(kid, esc, { big = false } = {}) {
  if (kid.status === 'ready' && kid.thumb) {
    return `<img src="/thumb/${esc(kid.id)}.png?v=${encodeURIComponent(kid.finishedAt ?? '')}" alt="${big ? `Screenshot of ${esc(kid.label)} ${esc(kid.name)}` : ''}">`
  }
  if (BUSY.has(kid.status)) return `<div class="seed${big ? '' : ' small'}" aria-hidden="true"></div>`
  return ''
}

function treeNode(kid, pos, { selected, picked, kept, esc }) {
  const status = nodeStatus(kid)
  const pickIndex = picked.indexOf(kid.id)
  const classes = [
    'tnode',
    kid.id === selected ? 'selected' : '',
    kept.has(kid.id) ? 'kept' : '',
    pickIndex === 1 ? 'crossing' : '',
  ].join(' ')
  return `
    <button class="${classes}" type="button" data-select="${esc(kid.id)}" style="left:${pos.x}px;top:${pos.y}px;width:${NODE_W}px;height:${NODE_H}px"
      aria-label="${esc(kid.label)} ${esc(kid.name)}, ${status.text}" aria-pressed="${kid.id === selected}">
      <span class="tshot">${shot(kid, esc)}</span>
      <span class="trow">
        <span class="tname"><b>${esc(kid.label)}</b><span>${esc(kid.name)}</span></span>
        <span class="pill ${status.cls}">${status.text}</span>
      </span>
    </button>`
}

export function treeHtml(tree, { selected, picked, esc }) {
  const { nodes, width, height } = layoutTree(tree)
  const kept = selected ? lineage(tree, selected) : new Set()
  const lines = treeLines(tree, nodes, kept)
  const gens = [...new Set(tree.litters.map((l) => l.gen))].sort((a, b) => a - b)
  const first = tree.litters.find((l) => l.kind === 'first')
  const firstKids = first ? first.children.map((id) => nodes[id]).filter(Boolean) : []
  const requestX = firstKids.length ? (firstKids[0].x + firstKids[firstKids.length - 1].x + NODE_W) / 2 : width / 2
  const crossMarks = tree.litters
    .filter((l) => l.kind === 'cross' && nodes[l.children[0]])
    .map((l) => {
      const p = nodes[l.children[0]]
      const a = tree.children[l.parents[0]]?.label ?? '?'
      const b = tree.children[l.parents[1]]?.label ?? '?'
      return `<span class="xmark" style="left:${p.x - 34}px;top:${p.y - 56}px" aria-hidden="true">×</span><span class="xlabel" style="left:${p.x}px;top:${p.y - 62}px">${esc(a)} × ${esc(b)}</span>`
    })
    .join('')

  return `
    <div class="tree-scroll">
      <div class="tree" style="width:${width}px;height:${height}px">
        <svg class="tlines" width="${width}" height="${height}" aria-hidden="true">
          ${lines.map((l) => `<path class="${l.colour}" d="${l.d}"/>`).join('')}
        </svg>
        ${gens.map((g) => `<span class="genmark" style="top:${TOP + (g - 1) * ROW_H + NODE_H / 2 - 8}px">GEN ${g}</span>`).join('')}
        <span class="request" style="left:${requestX}px;top:${REQUEST_TOP}px">“${esc(tree.request)}”</span>
        ${crossMarks}
        ${Object.values(tree.children).filter((k) => nodes[k.id]).map((k) => treeNode(k, nodes[k.id], { selected, picked, kept, esc })).join('')}
      </div>
    </div>`
}

function parentsText(tree, kid) {
  if (!kid.parents.length) return 'your request'
  return kid.parents.map((id) => tree.children[id]?.label ?? '?').join(' × ')
}

export function panelHtml(tree, { selected, crossFrom, esc, duration, owner = false }) {
  const kid = tree.children[selected]
  if (!kid) return `<div class="panel"><p class="muted">Tap a child to see it. Breed from one, or cross two.</p></div>`
  const status = nodeStatus(kid)
  const ready = kid.status === 'ready'
  const url = `${location.origin}/n/${kid.id}/`
  const progress = BUSY.has(kid.status)
    ? `<p class="muted">Growing: ${kid.steps ?? 0} steps, ${duration(kid.startedAt)}. <span class="mono">${esc(kid.activity ?? '')}</span></p>`
    : kid.status === 'failed'
      ? `<p class="error">${esc(kid.summary ?? 'This one didn’t make it.')}</p>`
      : `<p class="muted">Born in ${duration(kid.startedAt, kid.finishedAt)}.</p>`
  const crossing = crossFrom
    ? `<p class="hint-x">Now tap the child to cross with <b>${esc(tree.children[crossFrom]?.label ?? '')}</b>. <button class="linkish" type="button" data-cancel-cross>Cancel</button></p>`
    : ''
  return `
    <div class="panel">
      <div class="panel-top"><span class="mono-label">Generation ${kid.gen}</span><span class="pill ${status.cls}">${status.text}</span></div>
      <a class="bigshot" href="${ready ? `/n/${esc(kid.id)}/` : '#'}" target="_blank" rel="noopener" ${ready ? '' : 'aria-disabled="true" tabindex="-1"'}>${shot(kid, esc, { big: true })}</a>
      <div>
        <h2 class="panel-title"><span>${esc(kid.label)}</span> ${esc(kid.name)}</h2>
        <p class="muted">Born from ${esc(parentsText(tree, kid))}</p>
      </div>
      ${progress}
      <div class="told">
        <span class="mono-label">What I told its builder</span>
        <p>${esc(kid.brief)}</p>
      </div>
      ${ready && !kid.adopted ? `<div class="urlrow"><span class="mono">${esc(url)}</span><a href="/n/${esc(kid.id)}/" target="_blank" rel="noopener">Open</a></div>` : ''}
      ${crossing}
      <div class="panel-actions"${owner ? '' : ' hidden'}>
        <button class="btn btn-lime" type="button" data-breed="${esc(kid.id)}" ${ready ? '' : 'disabled'}>Breed 3 more</button>
        <button class="btn btn-outline-x" type="button" data-cross-from="${esc(kid.id)}" ${ready ? '' : 'disabled'}>Cross with…</button>
      </div>
      ${adoptionHtml(tree, kid, { owner, esc })}
    </div>`
}

// "What I've learned about you": likes in lime, things you passed over struck through.
export function tasteHtml(taste, esc) {
  if (!taste || (!taste.picks && !taste.likes.length)) return ''
  const chips = (list, cls) => list.map((t) => `<span class="tchip ${cls}">${esc(t)}</span>`).join('')
  return `
    <section class="panel taste" aria-label="What I've learned about you">
      <div class="panel-top"><h2 class="taste-title">What I’ve learned about you</h2><span class="muted">from ${taste.picks} pick${taste.picks === 1 ? '' : 's'}</span></div>
      ${taste.likes.length ? `<div class="tchips">${chips(taste.likes, 'like')}</div>` : ''}
      ${taste.avoid.length ? `<div class="tchips">${chips(taste.avoid, 'avoid')}</div>` : ''}
      ${taste.learned ? `<p class="learned">${esc(taste.learned)}</p>` : ''}
      <p class="muted small">Every new family starts from this. Kept on the Sprite’s own disk, in taste.md.</p>
    </section>`
}

export function familyLineLabels(tree, id) {
  const out = []
  const seen = new Set()
  const walk = (cid) => {
    const k = tree.children[cid]
    if (!k || seen.has(cid)) return
    seen.add(cid)
    k.parents.forEach(walk)
    out.push(k)
  }
  walk(id)
  return out
}

// The Adopt button, its progress, or the adopted card (public link, repo, family line).
export function adoptionHtml(tree, kid, { owner, esc }) {
  const a = kid.adoption
  if (kid.adopted && a?.status === 'done') {
    const line = familyLineLabels(tree, kid.id)
      .map((k) => `<span class="${k.id === kid.id ? 'fl-me' : k.parents.length === 2 ? 'fl-x' : 'fl'}">${esc(k.label)}</span>`)
      .join('<span class="fl-sep">›</span>')
    return `
      <div class="adopted">
        <span class="mono-label">Adopted · its own public link</span>
        <div class="urlrow"><span class="mono">${esc(a.sprite)}</span><button class="linkish lime" type="button" data-copy="${esc(a.sprite)}">Copy</button><a href="${esc(a.sprite)}" target="_blank" rel="noopener">Open</a></div>
        <div class="adopt-links">
          <a href="${esc(a.repo)}" target="_blank" rel="noopener">GitHub repo · ${a.commits} commits ›</a>
          ${a.pages ? `<a href="${esc(a.pages)}" target="_blank" rel="noopener">GitHub Pages ›</a>` : ''}
          <a href="/f/${esc(tree.id)}/adopted/${esc(kid.id)}" data-link>Its adopted page ›</a>
        </div>
        <div class="familyline"><span class="mono-label">Family line</span><div class="fl-row"><span class="fl-req">request</span><span class="fl-sep">›</span>${line}</div></div>
        ${kitHtml(kid, { owner, esc })}
      </div>`
  }
  if (a?.status === 'working') return `<p class="muted adopting"><span class="seed small" aria-hidden="true"></span>${esc(a.step ?? 'Adopting')}…</p>`
  if (!owner || kid.status !== 'ready') return ''
  const failed = a?.status === 'failed' ? `<p class="error">Adopt failed: ${esc(a.error)}. Try again.</p>` : ''
  return `${failed}<button class="btn btn-ghost" type="button" data-adopt="${esc(kid.id)}">Adopt: give it a public link and a repo</button>`
}
