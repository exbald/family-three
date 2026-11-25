// Adopt: a public path on the Sprite, a public GitHub repo whose history is the family line,
// and a GitHub Pages link. Each ancestor is one commit (its code, its brief as the message);
// a cross is a merge commit with both parents.
import { readFile, writeFile, readdir, rename } from 'node:fs/promises'
import path from 'node:path'
import { config } from './config.mjs'
import { gh, createRepo } from './github.mjs'
import { kidDir, readTree, updateChild } from './store.mjs'
import { saveCheckpoint } from './checkpoints.mjs'

const ADOPTED_PATH = path.join(config.home, 'adopted.json')
const SKIP = new Set(['thumb.png', 'node_modules'])
const MAX_FILE = 1024 * 1024

export const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export async function readAdopted() {
  try {
    return JSON.parse(await readFile(ADOPTED_PATH, 'utf8'))
  } catch (err) {
    if (err.code === 'ENOENT') return {}
    throw err
  }
}

async function saveAdopted(slug, childId) {
  const current = await readAdopted()
  const tmp = `${ADOPTED_PATH}.tmp`
  await writeFile(tmp, JSON.stringify({ ...current, [slug]: childId }, null, 2))
  await rename(tmp, ADOPTED_PATH)
}

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30) || 'app'
}

async function uniqueSlug(base) {
  const taken = await readAdopted()
  for (let i = 1; ; i += 1) {
    const slug = i === 1 ? base : `${base}-${i}`
    if (!taken[slug]) return slug
  }
}

async function listFiles(root, rel = '') {
  const entries = await readdir(path.join(root, rel), { withFileTypes: true })
  const nested = await Promise.all(
    entries
      .filter((e) => !e.name.startsWith('.') && !SKIP.has(e.name))
      .map((e) => {
        const relPath = rel ? `${rel}/${e.name}` : e.name
        return e.isDirectory() ? listFiles(root, relPath) : e.isFile() ? [relPath] : []
      }),
  )
  return nested.flat()
}

function familyLine(tree, childId) {
  const order = []
  const seen = new Set()
  const walk = (id) => {
    if (seen.has(id) || !tree.children[id]) return
    seen.add(id)
    for (const p of tree.children[id].parents) walk(p)
    order.push(tree.children[id])
  }
  walk(childId)
  return order
}

function readme({ tree, kid, line, links }) {
  const steps = line.map((k) => `- **${k.label} ${k.name}**${k.parents.length ? ` (from ${k.parents.map((p) => tree.children[p]?.label).join(' × ')})` : ''}: ${k.brief}`)
  return [
    `# ${kid.name}`,
    '',
    `Raised with [Family Three](https://github.com/exbald/family-three) on a Fly.io Sprite, not prompted.`,
    '',
    `It started as: “${tree.request}”`,
    '',
    `Live: ${links.join(' · ')}`,
    '',
    '## Family line',
    '',
    'Each commit in this repo is one ancestor. Its message is the brief its builder got. A cross is a merge commit.',
    '',
    ...steps,
    '',
  ].join('\n')
}

async function commitFor({ repo, tree, kid, parentShas, extraFiles = {}, blobCache }) {
  const dir = kidDir(tree.id, kid.n)
  const files = await listFiles(dir)
  const entries = []
  for (const rel of files) {
    const buf = await readFile(path.join(dir, rel))
    if (buf.length > MAX_FILE) continue
    const content = buf.toString('base64')
    let sha = blobCache.get(content)
    if (!sha) {
      sha = (await gh('POST', `/repos/${repo}/git/blobs`, { content, encoding: 'base64' })).sha
      blobCache.set(content, sha)
    }
    entries.push({ path: rel, mode: '100644', type: 'blob', sha })
  }
  for (const [rel, text] of Object.entries(extraFiles)) {
    entries.push({ path: rel, mode: '100644', type: 'blob', content: text })
  }
  const treeSha = (await gh('POST', `/repos/${repo}/git/trees`, { tree: entries })).sha
  const parentLabels = kid.parents.map((p) => tree.children[p]?.label)
  const how = kid.parents.length === 0 ? 'born from the request' : parentLabels.length === 2 ? `crossed ${parentLabels.join(' × ')}` : `bred from ${parentLabels[0]}`
  const when = kid.finishedAt ?? kid.createdAt
  const author = { name: `${kid.label} ${kid.name} (Family Three)`, email: 'family-three@users.noreply.github.com', date: when }
  const message = `${kid.label} ${kid.name}: ${how}\n\n${kid.brief}\n\n${kid.summary ?? ''}`.trim()
  return (await gh('POST', `/repos/${repo}/git/commits`, { message, tree: treeSha, parents: parentShas, author })).sha
}

async function pushFamilyLine({ repo, tree, kid, links }) {
  const line = familyLine(tree, kid.id)
  const shas = new Map()
  const blobCache = new Map()
  for (const ancestor of line) {
    const isLast = ancestor.id === kid.id
    const sha = await commitFor({
      repo,
      tree,
      kid: ancestor,
      parentShas: ancestor.parents.map((p) => shas.get(p)).filter(Boolean),
      extraFiles: isLast ? { 'README.md': readme({ tree, kid, line, links }) } : {},
      blobCache,
    })
    shas.set(ancestor.id, sha)
  }
  // Replace the auto-init commit with the family line.
  await gh('PATCH', `/repos/${repo}/git/refs/heads/main`, { sha: shas.get(kid.id), force: true })
  return line.length
}

async function enablePages(repo) {
  try {
    const pages = await gh('POST', `/repos/${repo}/pages`, { source: { branch: 'main', path: '/' } })
    return pages.html_url ?? null
  } catch (err) {
    console.error(`pages for ${repo}:`, err.message)
    return null
  }
}

export async function adoptChild({ fid, cid, baseUrl }) {
  const tree = await readTree(fid)
  const kid = tree.children[cid]
  const slug = await uniqueSlug(slugify(kid.name))
  const sprite = `${baseUrl}/a/${slug}/`
  await updateChild(fid, cid, { adoption: { status: 'working', step: 'Making its GitHub repo', slug, sprite } })
  try {
    const repoInfo = await createRepo({ name: `family-three-${slug}`, description: `${kid.name}: raised with Family Three from “${tree.request}”`.slice(0, 340), homepage: sprite })
    const repo = repoInfo.full_name
    await updateChild(fid, cid, { adoption: { status: 'working', step: 'Writing its family line', slug, sprite, repo: repoInfo.html_url } })
    const pagesGuess = `https://${repoInfo.owner.login.toLowerCase()}.github.io/${repoInfo.name}/`
    const commits = await pushFamilyLine({ repo, tree, kid, links: [sprite, pagesGuess] })
    const pages = (await enablePages(repo)) ?? null
    await saveAdopted(slug, cid)
    const adoption = { status: 'done', slug, sprite, repo: repoInfo.html_url, pages, commits, at: new Date().toISOString() }
    await updateChild(fid, cid, { adopted: true, adoption })
    const { makeKit } = await import('./kit.mjs')
    await makeKit({ fid, cid })
    await saveCheckpoint({ fid, gen: kid.gen, what: `Adopted ${kid.label} ${kid.name}` })
    return adoption
  } catch (err) {
    console.error(`adopt ${cid} failed:`, err)
    await updateChild(fid, cid, { adoption: { status: 'failed', slug, error: err.message } })
    return null
  }
}

// Adds or replaces files in an adopted repo as one more commit on main (files not listed stay).
// sourceDir defaults to the child's code; prefix puts the files in a folder (e.g. "design/").
export async function pushRepoUpdate({ fid, cid, message, sourceDir, prefix = '' }) {
  const tree = await readTree(fid)
  const kid = tree.children[cid]
  const repo = kid?.adoption?.repo?.replace('https://github.com/', '')
  if (!repo) throw new Error('That child is not adopted.')
  const head = (await gh('GET', `/repos/${repo}/git/ref/heads/main`)).object.sha
  const baseTree = (await gh('GET', `/repos/${repo}/git/commits/${head}`)).tree.sha
  const dir = sourceDir ?? kidDir(fid, kid.n)
  const entries = []
  for (const rel of await listFiles(dir)) {
    const buf = await readFile(path.join(dir, rel))
    if (buf.length > MAX_FILE) continue
    const sha = (await gh('POST', `/repos/${repo}/git/blobs`, { content: buf.toString('base64'), encoding: 'base64' })).sha
    entries.push({ path: `${prefix}${rel}`, mode: '100644', type: 'blob', sha })
  }
  const treeSha = (await gh('POST', `/repos/${repo}/git/trees`, { base_tree: baseTree, tree: entries })).sha
  const author = { name: `${kid.label} ${kid.name} (Family Three)`, email: 'family-three@users.noreply.github.com', date: new Date().toISOString() }
  const sha = (await gh('POST', `/repos/${repo}/git/commits`, { message, tree: treeSha, parents: [head], author })).sha
  await gh('PATCH', `/repos/${repo}/git/refs/heads/main`, { sha })
  const fresh = (await readTree(fid)).children[cid]
  await updateChild(fid, cid, { adoption: { ...fresh.adoption, commits: (fresh.adoption.commits ?? 0) + 1 } })
  return sha
}
