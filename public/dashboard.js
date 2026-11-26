// The families dashboard (/families): every family on the Sprite as a card, with its newest apps and what's happening now.
const DAY = 24 * 60 * 60 * 1000

const FILTERS = [
  ['all', 'All'],
  ['crowd', 'Raised by the crowd'],
  ['private', 'Private'],
]

function statusHtml(f, esc) {
  if (f.building) return `<span class="dc-pill is-busy"><span class="dc-dot"></span>${f.building} kid${f.building === 1 ? '' : 's'} being born</span>`
  if (f.crowd && f.vote?.status === 'open') {
    const clock = f.vote.total && f.vote.closesAt ? ` · breeds in <b data-countdown="${esc(f.vote.closesAt)}">…</b>` : ''
    return `<span class="dc-pill is-vote">Vote open · ${f.vote.total} vote${f.vote.total === 1 ? '' : 's'}${clock}</span>`
  }
  if (f.adopted) return `<span class="dc-pill is-adopted">${f.adopted} adopted</span>`
  return ''
}

function cardHtml(f, esc) {
  const shots = (f.preview ?? []).slice(0, 3)
  const isNew = f.seeded && Date.now() - Date.parse(f.createdAt ?? 0) < DAY
  const pictures = shots.length
    ? shots.map((k, i) => `<span class="dc-shot${i === 0 ? ' is-main' : ''}"><img src="/thumb/${esc(k.id)}.png?v=${encodeURIComponent(k.v)}" alt="${i === 0 ? esc(`${k.label} ${k.name}`) : ''}" loading="lazy"></span>`).join('')
    : '<span class="dc-shot is-main is-empty"><span class="seed small" aria-hidden="true"></span>Kids being born</span>'
  const tags = [
    f.crowd ? '<span class="dc-tag is-crowd">Crowd</span>' : '<span class="dc-tag">Private</span>',
    isNew ? '<span class="dc-tag is-new">New · started by the agent</span>' : '',
  ].join('')
  return `
    <li>
      <a class="dc" href="/f/${esc(f.id)}" data-link>
        <span class="dc-shots${shots.length < 2 ? ' is-single' : ''}">${pictures}</span>
        <span class="dc-body">
          <span class="dc-tags">${tags}</span>
          <strong class="dc-title">${esc(f.request)}</strong>
          <span class="dc-meta">Generation ${f.generations || 1} · ${f.apps} app${f.apps === 1 ? '' : 's'}</span>
          ${statusHtml(f, esc)}
        </span>
      </a>
    </li>`
}

// Open votes with votes first, then families being born, then the rest by last activity.
function ordered(families) {
  const rank = (f) => (f.crowd && f.vote?.status === 'open' && f.vote.total ? 0 : f.building ? 1 : 2)
  return [...families].sort((a, b) => rank(a) - rank(b) || String(b.updatedAt).localeCompare(String(a.updatedAt)))
}

export function dashboardHtml({ families, filter = 'all', nextFamilyAt = null, esc }) {
  const crowd = families.filter((f) => f.crowd)
  const shown = ordered(filter === 'crowd' ? crowd : filter === 'private' ? families.filter((f) => !f.crowd) : families)
  const next = nextFamilyAt ? ` The agent starts a new one in <b data-countdown="${esc(nextFamilyAt)}">…</b>.` : ''
  return `
    <article class="dash">
      <header class="dash-head">
        <h1>Every family on this Sprite</h1>
        <p>${families.length} families, ${crowd.length} of them raised by whoever shows up. Each one started from a single sentence; open one to walk its tree, try its apps and vote.${next}</p>
        <div class="dash-filters" role="tablist" aria-label="Show">
          ${FILTERS.map(([key, label]) => `<button type="button" role="tab" class="dash-filter" data-filter="${key}" aria-selected="${key === filter}">${label}</button>`).join('')}
        </div>
      </header>
      ${shown.length ? `<ul class="dash-grid">${shown.map((f) => cardHtml(f, esc)).join('')}</ul>` : '<p class="empty">No families here yet.</p>'}
    </article>`
}

// A few cards for the landing, with the same look as the dashboard.
export function familyCardsHtml(families, esc) {
  return `<ul class="dash-grid">${ordered(families).map((f) => cardHtml(f, esc)).join('')}</ul>`
}
