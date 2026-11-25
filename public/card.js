// Renders one family as a 1200×630 share card. The server screenshots it with headless Chrome.
import { treeHtml } from './treeview.js'
import { layoutTree } from './tree.js'

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
const fid = new URLSearchParams(location.search).get('family')

async function getJson(url) {
  const body = await (await fetch(url)).json()
  if (!body.success) throw new Error(body.error)
  return body.data
}

function imagesLoaded(root) {
  return Promise.all([...root.querySelectorAll('img')].map((img) => (img.complete ? null : new Promise((r) => { img.onload = r; img.onerror = r }))))
}

async function render() {
  const [tree, taste] = await Promise.all([getJson(`/api/families/${encodeURIComponent(fid)}`), getJson('/api/taste').catch(() => null)])
  const kids = Object.values(tree.children)
  const gens = Math.max(1, ...kids.map((k) => k.gen))
  const apps = kids.filter((k) => k.status === 'ready').length
  const adopted = kids.filter((k) => k.adopted)
  document.getElementById('title').textContent = `“${tree.request}”`
  document.getElementById('stats').innerHTML = `<b>${gens}</b> generation${gens === 1 ? '' : 's'} · <b>${apps}</b> live apps${adopted.length ? ` · <b>${adopted.length}</b> adopted` : ''}`
  document.getElementById('likes').innerHTML = (taste?.likes ?? []).slice(0, 4).map((t) => `<span class="tchip like">${esc(t)}</span>`).join('')

  // Highlight the line to the newest adopted child (or the newest child).
  const keep = [...adopted].sort((a, b) => (b.adoption?.at ?? '').localeCompare(a.adoption?.at ?? ''))[0] ?? [...kids].sort((a, b) => b.n - a.n)[0]
  const box = document.getElementById('tree')
  box.innerHTML = treeHtml(tree, { selected: keep?.id, picked: [], esc })
  const { width, height } = layoutTree(tree)
  const area = document.querySelector('.card-right').getBoundingClientRect()
  const scale = Math.min((area.width - 32) / width, (area.height - 32) / height, 1)
  box.style.width = `${width}px`
  box.style.height = `${height}px`
  box.style.transform = `translate(-50%, -50%) scale(${scale})`
  await imagesLoaded(box)
  await document.fonts.ready
  document.body.dataset.ready = 'yes'
}

render().catch((err) => {
  document.getElementById('title').textContent = err.message
  document.body.dataset.ready = 'yes'
})
