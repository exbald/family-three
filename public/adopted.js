// The phone "adopted" screen: the app, its public link, its family line and what the pick taught.

// The line through the bones (first parents), with the looks parent shown as "× B" before each cross.
function familyLineChips(tree, kid, esc) {
  const chain = []
  for (let k = kid; k; k = tree.children[k.parents[0]]) chain.unshift(k)
  const parts = ['<span class="fl-req">request</span>']
  chain.forEach((k, i) => {
    const next = chain[i + 1]
    const isMe = k.id === kid.id
    parts.push('<span class="fl-sep">›</span>')
    parts.push(`<span class="${isMe ? 'fl-me' : 'fl'}">${esc(k.label)}</span>`)
    if (next && next.parents.length === 2) {
      parts.push(`<span class="fl-x">× ${esc(tree.children[next.parents[1]]?.label ?? '?')}</span>`)
    }
  })
  return parts.join('')
}

function progressHtml(kid, esc) {
  const a = kid.adoption
  if (a?.status === 'failed') return `<p class="error">Adopt failed: ${esc(a.error)}</p>`
  return `<div class="adopting-big"><div class="seed" aria-hidden="true"></div><p>${esc(a?.step ?? 'Adopting')}…</p><span class="muted">A public link, a GitHub repo with one commit per ancestor, and GitHub Pages.</span></div>`
}

export function adoptedHtml({ tree, kid, taste, esc }) {
  const a = kid.adoption
  const head = `
    <div class="ad-head">
      <span class="muted">${esc(tree.title)} · Generation ${kid.gen}</span>
      <h1><span>${esc(kid.label)}</span> ${kid.adopted ? 'is adopted' : 'is being adopted'}</h1>
    </div>`
  if (!kid.adopted || a?.status !== 'done') return `<section class="adopted-screen">${head}${progressHtml(kid, esc)}</section>`

  const others = Object.values(tree.children).filter((k) => k.status === 'ready' && k.id !== kid.id).length
  const shot = kid.thumb ? `<img src="/thumb/${esc(kid.id)}.png?v=${encodeURIComponent(kid.finishedAt ?? '')}" alt="Screenshot of ${esc(kid.name)}">` : ''
  const learned = taste?.learned
    ? `<div class="ad-learned"><svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/></svg><span>Learned: ${esc(taste.learned)}</span></div>`
    : ''
  return `
    <section class="adopted-screen">
      ${head}
      <a class="ad-shot" href="${esc(a.sprite)}" target="_blank" rel="noopener">${shot}<span class="ad-name">${esc(kid.name)}</span></a>
      <div class="ad-link">
        <span class="muted">Its own public link. Anyone can open it.</span>
        <div class="ad-url"><span class="mono">${esc(a.sprite.replace(/^https?:\/\//, ''))}</span><button class="btn btn-lime" type="button" data-copy-link="${esc(a.sprite)}">Copy</button></div>
        <div class="ad-buttons">
          <button class="btn btn-ghost" type="button" data-share="${esc(a.sprite)}" data-title="${esc(kid.name)}">Share</button>
          <button class="btn btn-ghost" type="button" data-homescreen>Add to home screen</button>
        </div>
        <p class="muted ad-hint" hidden>Open the link, then in your browser’s Share menu choose “Add to Home Screen”.</p>
      </div>
      <div class="familyline ad-line">
        <span class="mono-label">Family line</span>
        <div class="fl-row">${familyLineChips(tree, kid, esc)}</div>
        <span class="muted small">On GitHub too: <a href="${esc(a.repo)}" target="_blank" rel="noopener">${a.commits} commits, one per ancestor ›</a>${a.pages ? ` · <a href="${esc(a.pages)}" target="_blank" rel="noopener">Pages ›</a>` : ''}</span>
        <span class="muted small">Saved as a checkpoint. The other ${others} children are still on the tree if you change your mind.</span>
      </div>
      ${learned}
      <a class="btn btn-ghost ad-back" href="/f/${esc(tree.id)}" data-link>Back to the family</a>
    </section>`
}

export function wireAdopted(root) {
  root.querySelector('[data-copy-link]')?.addEventListener('click', (e) => {
    const btn = e.currentTarget
    navigator.clipboard?.writeText(btn.dataset.copyLink).then(() => { btn.textContent = 'Copied' }, () => {})
  })
  root.querySelector('[data-share]')?.addEventListener('click', async (e) => {
    const { share: url, title } = e.currentTarget.dataset
    if (navigator.share) {
      await navigator.share({ title, url }).catch(() => {})
    } else {
      await navigator.clipboard?.writeText(url).catch(() => {})
      e.currentTarget.textContent = 'Link copied'
    }
  })
  root.querySelector('[data-homescreen]')?.addEventListener('click', () => {
    const hint = root.querySelector('.ad-hint')
    if (hint) hint.hidden = false
  })
}
