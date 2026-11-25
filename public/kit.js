// The design kit block: make it, watch it being made, preview, download, or copy the agent line.
const AGENT_LINE = 'Build this in the style of DESIGN.md: use tokens.css for every colour, font, space and radius.'

export function kitHtml(kid, { owner, esc }) {
  const kit = kid.kit
  if (kit?.status === 'working') {
    return `<div class="kit"><span class="mono-label">Design kit</span><p class="muted adopting"><span class="seed small" aria-hidden="true"></span>Reading its CSS and writing the kit…</p></div>`
  }
  if (kit?.status === 'ready') {
    const repo = kid.adoption?.repo
    return `
      <div class="kit">
        <span class="mono-label">Design kit · take this look anywhere</span>
        <p class="kit-summary">${esc(kit.summary ?? '')}</p>
        <div class="adopt-links">
          <a href="/kit/${esc(kid.id)}/design.html" target="_blank" rel="noopener">Preview ›</a>
          ${kit.zip ? `<a href="/kit/${esc(kid.id)}.zip" download>Download .zip ›</a>` : ''}
          ${kit.inRepo && repo ? `<a href="${esc(repo)}/tree/main/design" target="_blank" rel="noopener">In the repo: design/ ›</a>` : ''}
        </div>
        <div class="urlrow"><span class="mono">${esc(AGENT_LINE)}</span><button class="linkish lime" type="button" data-copy-agent>Copy</button></div>
        <span class="muted small">Drop the kit into any project and paste that line into Claude Code or Cursor.</span>
      </div>`
  }
  if (!owner || kid.status !== 'ready') return ''
  const failed = kit?.status === 'failed' ? `<p class="error">The kit failed: ${esc(kit.error ?? '')}</p>` : ''
  return `<div class="kit">${failed}<button class="btn btn-ghost" type="button" data-make-kit="${esc(kid.id)}">Make its design kit</button></div>`
}

export function wireKit(root, { api, onStarted }) {
  root.querySelector('[data-copy-agent]')?.addEventListener('click', (e) => {
    const btn = e.currentTarget
    navigator.clipboard?.writeText(AGENT_LINE).then(() => { btn.textContent = 'Copied' }, () => {})
  })
  root.querySelector('[data-make-kit]')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget
    btn.disabled = true
    btn.textContent = 'Starting…'
    try {
      await api('/api/kit', { method: 'POST', body: JSON.stringify({ child: btn.dataset.makeKit }) })
      onStarted()
    } catch (err) {
      btn.disabled = false
      btn.textContent = err.message
    }
  })
}
