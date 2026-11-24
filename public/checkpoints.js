// The checkpoint pill in the family header: the latest save for this family, and restore.
const pill = document.getElementById('checkpoint')
const rewind = document.getElementById('rewind')
let open = false

function ago(iso) {
  const mins = Math.round((Date.now() - Date.parse(iso)) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const h = Math.round(mins / 60)
  return h < 24 ? `${h} h ago` : new Date(iso).toLocaleDateString()
}

async function waitForSprite() {
  rewind.hidden = false
  const started = Date.now()
  let wentDown = false
  while (Date.now() - started < 90_000) {
    await new Promise((r) => setTimeout(r, 1500))
    const up = await fetch('/api/me', { cache: 'no-store' }).then((r) => r.ok, () => false)
    if (!up) wentDown = true
    if (up && (wentDown || Date.now() - started > 8000)) break
  }
  location.reload()
}

async function restore(api, id, what) {
  if (!window.confirm(`Rewind the whole Sprite to “${what}”?\n\nEverything made after it goes away. Adopted repos on GitHub stay.`)) return
  try {
    await api('/api/restore', { method: 'POST', body: JSON.stringify({ id }) })
    await waitForSprite()
  } catch (err) {
    window.alert(err.message)
  }
}

export function drawCheckpoints({ list, owner, esc, api }) {
  if (!owner || !list?.length) {
    pill.hidden = true
    return
  }
  const latest = list[0]
  pill.hidden = false
  pill.innerHTML = `
    <span class="cp-text">Checkpoint · gen ${latest.gen} · ${esc(ago(latest.at))}</span>
    <button type="button" class="cp-btn" aria-expanded="${open}" aria-controls="cp-menu">
      <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>Restore
    </button>
    <div id="cp-menu" class="cp-menu" ${open ? '' : 'hidden'}>
      <p class="mono-label">Rewind the Sprite to</p>
      ${list.map((c) => `<button type="button" class="cp-item" data-cp="${esc(c.id)}" data-what="${esc(c.what)}"><span>${esc(c.what)}</span><span class="muted">${esc(ago(c.at))}</span></button>`).join('')}
    </div>`
  pill.querySelector('.cp-btn').addEventListener('click', () => {
    open = !open
    drawCheckpoints({ list, owner, esc, api })
  })
  pill.querySelectorAll('[data-cp]').forEach((b) => b.addEventListener('click', () => restore(api, b.dataset.cp, b.dataset.what)))
}

export function hideCheckpoints() {
  pill.hidden = true
  open = false
}
