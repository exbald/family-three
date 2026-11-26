// The landing's spine: one real family read top to bottom, generation by generation,
// with the lines that joined them (lime: the kid that was kept and bred, orange: a cross).
import { familyLineLabels } from './treeview.js'

const COLS = [50, 150, 250]

const KIND_TITLE = {
  first: () => 'Born from one sentence',
  breed: (labels) => `Bred from ${labels[0]}`,
  cross: (labels) => `Crossed ${labels.join(' × ')}`,
}

function kept(tree, id) {
  return tree.litters.some((l) => l.parents.includes(id))
}

// Lines from the parents' columns in the row above down to this row's three kids.
function connectorSvg(prev, litter, tree) {
  if (!prev) return ''
  const from = litter.parents.map((id) => prev.children.indexOf(id)).filter((i) => i >= 0).map((i) => COLS[i])
  if (!from.length) return ''
  const cross = litter.kind === 'cross'
  const mid = 34
  const minX = Math.min(...from, ...COLS)
  const maxX = Math.max(...from, ...COLS)
  const down = from.map((x) => `M${x} 0 V${mid}`).join(' ')
  const spread = `M${minX} ${mid} H${maxX} ${COLS.map((x) => `M${x} ${mid} V64`).join(' ')}`
  const center = (from[0] + from[from.length - 1]) / 2
  const badge = cross
    ? `<span class="ln-x" style="left:${(center / 3).toFixed(2)}%" aria-hidden="true"><svg viewBox="0 0 12 12"><path d="M3 3l6 6M9 3l-6 6"/></svg></span><span class="ln-x-label" style="left:calc(${(center / 3).toFixed(2)}% + 24px)">${litter.parents.map((id) => tree.children[id]?.label ?? '').join(' × ')}</span>`
    : ''
  return `<div class="ln-connect"><svg class="ln-connector ${cross ? 'is-cross' : 'is-kept'}" viewBox="0 0 300 64" preserveAspectRatio="none" aria-hidden="true">
      <path pathLength="1" d="${down} ${spread}"/>
    </svg>${badge}</div>`
}

function kidHtml(tree, id, esc) {
  const k = tree.children[id]
  if (!k) return ''
  const ready = k.status === 'ready'
  const cls = ['ln-kid', kept(tree, id) ? 'is-kept' : '', k.adopted ? 'is-adopted' : ''].filter(Boolean).join(' ')
  const img = ready && k.thumb
    ? `<img src="/thumb/${esc(k.id)}.png" alt="${esc(k.name)}, a working app from generation ${k.gen}" loading="eager" decoding="async">`
    : `<span class="ln-kid-blank">${ready ? '' : 'being born'}</span>`
  const tag = k.adopted ? '<span class="ln-tag">Adopted</span>' : ''
  const inner = `<span class="ln-shot">${img}${tag}</span><span class="ln-name"><b>${esc(k.label)}</b> ${esc(k.name)}</span>`
  return ready
    ? `<a class="${cls}" href="/n/${esc(k.id)}/" target="_blank" rel="noopener" aria-label="Open ${esc(k.label)} ${esc(k.name)}, a live app">${inner}</a>`
    : `<span class="${cls}">${inner}</span>`
}

function litterText(tree, litter, esc) {
  const labels = litter.parents.map((id) => tree.children[id]?.label ?? '?')
  const title = KIND_TITLE[litter.kind]?.(labels) ?? 'A new generation'
  const why = litter.kind === 'first'
    ? `Three Claude Code builders, each with a different brief from the agent, built these at the same time.`
    : litter.kind === 'cross'
      ? `One parent gave the layout, the other the look. ${litter.note ? `The agent's note: “${esc(litter.note)}”` : ''}`
      : `Three new takes on the kid that won. ${litter.note ? esc(litter.note) : ''}`
  return `<div class="ln-text"><h3>${esc(title)}</h3><p>${why}</p></div>`
}

// Under generation 1, the lines of the kids that were picked keep going down into generation 2.
function tailHtml(tree) {
  const [first, next] = tree.litters
  if (!next) return ''
  const xs = next.parents.map((id) => first.children.indexOf(id)).filter((i) => i >= 0).map((i) => COLS[i])
  if (!xs.length) return ''
  return `<div class="ln-tail"><svg class="ln-connector ${next.kind === 'cross' ? 'is-cross' : 'is-kept'}" viewBox="0 0 300 64" preserveAspectRatio="none" aria-hidden="true"><path pathLength="1" d="${xs.map((x) => `M${x} 0 V64`).join(' ')}"/></svg></div>`
}

// The request and generation 1, for the first viewport.
export function heroTreeHtml(tree, esc) {
  const first = tree.litters[0]
  if (!first) return ''
  return `
    <div class="ln-tree ln-hero-tree">
      <a class="ln-request" href="/f/${esc(tree.id)}" data-link title="See this family's whole tree">“${esc(tree.request)}”</a>
      <div class="ln-connect"><svg class="ln-connector is-kept" viewBox="0 0 300 64" preserveAspectRatio="none" aria-hidden="true"><path pathLength="1" d="M150 0 V50 M50 50 H250 M50 50 V64 M150 50 V64 M250 50 V64"/></svg></div>
      <div class="ln-kids"><span class="ln-gen">Gen 1</span>${first.children.map((id) => kidHtml(tree, id, esc)).join('')}</div>
      ${tailHtml(tree)}
    </div>`
}

export function lineageRowsHtml(tree, esc, { from = 0 } = {}) {
  return tree.litters.map((litter, i) => {
    if (i < from) return ''
    const prev = tree.litters[i - 1]
    return `
      <div class="ln-row" data-reveal>
        ${litterText(tree, litter, esc)}
        <div class="ln-tree">
          ${connectorSvg(prev, litter, tree)}
          <div class="ln-kids"><span class="ln-gen">Gen ${litter.gen}</span>${litter.children.map((id) => kidHtml(tree, id, esc)).join('')}</div>
        </div>
      </div>`
  }).join('')
}

// The adopted kid's repo history, drawn from its real family line: one commit per ancestor, a cross is a merge.
export function adoptionRowHtml(tree, esc) {
  const kid = Object.values(tree.children).find((k) => k.adopted && k.adoption?.status === 'done')
  if (!kid) return ''
  const a = kid.adoption
  const line = familyLineLabels(tree, kid.id)
  const grown = kid.growup?.status === 'done' ? kid.growup : null
  const commits = [
    ...(grown ? [{ msg: `${kid.label} ${kid.name} grew up: its own Sprite, a server and a SQLite database`, cls: 'is-grow' }] : []),
    ...(kid.kit?.inRepo ? [{ msg: `Design kit for ${kid.label} ${kid.name}`, cls: '' }] : []),
    ...[...line.filter((k) => k.parents.length).reverse(), ...line.filter((k) => !k.parents.length)].map((k) => ({
      msg: k.parents.length === 2
        ? `${k.label} ${k.name}: crossed ${k.parents.map((p) => tree.children[p]?.label).join(' × ')}`
        : k.parents.length === 1 ? `${k.label} ${k.name}: bred from ${tree.children[k.parents[0]]?.label}` : `${k.label} ${k.name}: born from the request`,
      cls: k.parents.length === 2 ? 'is-merge' : '',
    })),
  ]
  const repoName = a.repo.replace(/^https:\/\/github\.com\//, '')
  return `
    <div class="ln-row ln-adopt" data-reveal>
      <div class="ln-text">
        <h3>Adopted: ${esc(kid.name)} left home with everything</h3>
        <p>A public link that works on a phone, a GitHub repo whose history is its family line, where the cross is a real merge commit, and a design kit written from its CSS.</p>
        ${grown ? `<p>Then it grew up: it moved onto its own Fly.io Sprite, <code>${esc(grown.sprite)}</code>, with a Node server and a SQLite database, so everyone who opens it sees the same data.</p>` : ''}
        <div class="ln-links">
          <a class="btn btn-lime" href="${esc(grown ? grown.url : a.sprite)}" target="_blank" rel="noopener">Open ${esc(kid.name)}${grown ? ' on its own Sprite' : ''}</a>
          <a class="btn btn-ghost" href="${esc(a.repo)}/generate" target="_blank" rel="noopener">Use it as a template</a>
        </div>
      </div>
      <div class="ln-takeaway">
        <a class="ln-repo" href="${esc(a.repo)}/commits/main" target="_blank" rel="noopener" aria-label="Commit history of ${esc(repoName)} on GitHub">
          <span class="ln-repo-head"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 0a8 8 0 0 0-2.53 15.59c.4.07.55-.17.55-.38v-1.33c-2.23.48-2.7-1.07-2.7-1.07-.36-.92-.89-1.17-.89-1.17-.73-.5.06-.49.06-.49.8.06 1.23.83 1.23.83.72 1.22 1.88.87 2.33.66.07-.52.28-.87.5-1.07-1.78-.2-3.65-.89-3.65-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.28.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48v2.2c0 .21.15.46.55.38A8 8 0 0 0 8 0Z"/></svg>${esc(repoName)} <small>${a.commits} commits</small></span>
          <ol>${commits.map((c) => `<li class="${c.cls}"><i aria-hidden="true"></i>${esc(c.msg)}</li>`).join('')}</ol>
        </a>
        ${kid.kit?.status === 'ready' ? `
        <div class="ln-kit">
          <span class="ln-kit-files">${(kid.kit.files ?? []).map((f) => `<code>${esc(f)}</code>`).join('')}</span>
          <span class="ln-links">
            <a href="/kit/${esc(kid.id)}/design.html" target="_blank" rel="noopener">See the design kit</a>
            ${kid.kit.zip ? `<a href="/kit/${esc(kid.id)}.zip" download>Download .zip</a>` : ''}
          </span>
        </div>` : ''}
      </div>
    </div>`
}

// The other crowd families, each as its newest three kids and a way in.
export function otherFamiliesHtml(crowds, featuredId, esc) {
  const others = crowds.filter((f) => f.id !== featuredId)
  if (!others.length) return ''
  return `<ul class="ln-others">${others.map((f) => {
    const shots = (f.preview ?? []).slice(0, 3)
    const status = f.building ? 'Kids being born now' : f.vote?.status === 'open' ? `Vote open · ${f.vote.total ?? 0} so far` : `${f.apps} apps`
    return `<li><a href="/f/${esc(f.id)}" data-link>
      <span class="ln-others-shots">${shots.length ? shots.map((k) => `<img src="/thumb/${esc(k.id)}.png" alt="" loading="eager">`).join('') : '<span class="ln-kid-blank">being born</span>'}</span>
      <strong>${esc(f.title || f.request)}</strong>
      <small>${esc(status)}</small>
    </a></li>`
  }).join('')}</ul>`
}
