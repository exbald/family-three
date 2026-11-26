// The grow-up block on an adopted kid: the owner's button, the progress, and the grown-up app's own Sprite.
export function growupHtml(kid, { owner, esc }) {
  const g = kid.growup
  if (g?.status === 'working') {
    return `<div class="growup"><span class="mono-label">Growing up · its own Sprite</span><p class="muted adopting"><span class="seed small" aria-hidden="true"></span>${esc(g.step ?? 'Working')}…</p></div>`
  }
  if (g?.status === 'done') {
    return `
      <div class="growup is-done">
        <span class="mono-label">Grown up · its own Sprite</span>
        <p>A real full-stack app now: a Node server and a SQLite database on its own Fly.io Sprite, <code>${esc(g.sprite)}</code>. Everyone who opens it sees the same data, on any device.</p>
        ${g.summary ? `<p class="muted small">${esc(g.summary)}</p>` : ''}
        <div class="adopt-links">
          <a href="${esc(g.url)}" target="_blank" rel="noopener">Open the grown-up app ›</a>
          ${kid.adoption?.repo ? `<a href="${esc(kid.adoption.repo)}/tree/main/grown-up" target="_blank" rel="noopener">Its server code ›</a>` : ''}
        </div>
      </div>`
  }
  if (!owner || !kid.adopted) return ''
  const failed = g?.status === 'failed' ? `<p class="error">Growing up failed: ${esc(g.error ?? '')}</p>` : ''
  return `<div class="growup">${failed}<button class="btn btn-ghost" type="button" data-grow="${esc(kid.id)}">Grow it up: its own Sprite, a server and a database</button></div>`
}

export function wireGrow(root, { api, onStarted }) {
  root.querySelector('[data-grow]')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget
    btn.disabled = true
    btn.textContent = 'Starting…'
    try {
      await api('/api/grow', { method: 'POST', body: JSON.stringify({ child: btn.dataset.grow }) })
      onStarted()
    } catch (err) {
      btn.disabled = false
      btn.textContent = err.message
    }
  })
}
