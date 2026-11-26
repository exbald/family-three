// Grow it up: an adopted kid becomes a small full-stack app (Node server + SQLite) on its own Sprite,
// ft-app-<slug>, in Family Three's own Fly org. The key in ~/.ft/sprites-token is scoped by Fly to
// Sprites named ft-app- (max 10), so it can't touch ft-family or anything else.
import { spawn } from 'node:child_process'
import { access, cp, mkdir, readFile, rm } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from './config.mjs'
import { familyDir, kidDir, readTree, updateChild } from './store.mjs'
import { runInFolder } from './builder.mjs'
import { pushRepoUpdate } from './adopt.mjs'
import { snapThumb } from './thumbs.mjs'
import { holdAwake } from './awake.mjs'

const API = 'https://api.sprites.dev'
const PROMPT_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), 'prompts', 'growup.md')
const TOKEN_PATH = path.join(config.home, '.ft', 'sprites-token')
const NODE = '/.sprite/bin/node'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export const grownDir = (fid, n) => path.join(familyDir(fid), 'grown', String(n))
export const spriteNameFor = (slug) => `ft-app-${slug}`.slice(0, 60)

async function api(method, p, { json, body, query = [] } = {}) {
  const url = new URL(API + p)
  for (const [k, v] of query) url.searchParams.append(k, v)
  const token = (await readFile(TOKEN_PATH, 'utf8')).trim()
  const headers = { Authorization: `Bearer ${token}`, ...(json ? { 'content-type': 'application/json' } : {}) }
  const res = await fetch(url, { method, headers, body: json ? JSON.stringify(json) : body, signal: AbortSignal.timeout(180_000) })
  const text = await res.text()
  if (!res.ok) throw Object.assign(new Error(`Sprites API ${method} ${p} answered ${res.status}: ${text.slice(0, 160)}`), { status: res.status })
  try { return JSON.parse(text) } catch { return text }
}

const exec = (name, script) => api('POST', `/v1/sprites/${name}/exec`, { query: [['cmd', 'bash'], ['cmd', '-c'], ['cmd', script]] })

function tarFolder(dir) {
  return new Promise((resolve, reject) => {
    const chunks = []
    const proc = spawn('tar', ['czf', '-', '--exclude=data.db*', '--exclude=node_modules', '-C', dir, '.'])
    proc.stdout.on('data', (c) => chunks.push(c))
    proc.on('error', reject)
    proc.on('close', (code) => (code === 0 ? resolve(Buffer.concat(chunks)) : reject(new Error(`tar exited ${code}`))))
  })
}

// Runs the grown-up server here on a spare port and checks health, the page and one API call.
async function checkLocally(dir, port) {
  const proc = spawn('node', ['server.mjs'], { cwd: dir, env: { ...process.env, PORT: String(port) }, stdio: ['ignore', 'ignore', 'pipe'] })
  let stderr = ''
  proc.stderr.on('data', (c) => { if (stderr.length < 4000) stderr += c })
  try {
    for (let i = 0; i < 20; i++) {
      await sleep(500)
      const health = await fetch(`http://127.0.0.1:${port}/api/health`).then((r) => r.json()).catch(() => null)
      if (health?.ok) {
        const page = await fetch(`http://127.0.0.1:${port}/`)
        if (!page.ok) return `GET / answered ${page.status}`
        return ''
      }
    }
    return `the server never answered /api/health on port ${port}. ${stderr.trim().slice(0, 600)}`
  } finally {
    proc.kill('SIGTERM')
  }
}

// The local test leaves a database behind; the app's real data lives only on its own Sprite.
const dropTestData = (dir) => Promise.all(['data.db', 'data.db-wal', 'data.db-shm'].map((f) => rm(path.join(dir, f), { force: true })))

// A retry after a later step failed reuses a build that still passes its test.
async function reusableBuild(dir, port) {
  if (!(await access(path.join(dir, 'server.mjs')).then(() => true, () => false))) return false
  const problem = await checkLocally(dir, port)
  await dropTestData(dir)
  return !problem
}

async function build({ fid, kid, request, dir, port, step }) {
  await rm(dir, { recursive: true, force: true })
  await mkdir(dir, { recursive: true })
  await cp(kidDir(fid, kid.n), path.join(dir, 'public'), { recursive: true, filter: (src) => !/thumb\.png$|\/\.|node_modules/.test(src) })
  const prompt = (await readFile(PROMPT_PATH, 'utf8'))
    .replaceAll('{{name}}', kid.name).replaceAll('{{request}}', request).replaceAll('{{port}}', String(port))
  const logFile = path.join(familyDir(fid), 'logs', `grow-${kid.n}.jsonl`)
  await step('Writing its server and database')
  let result = await runInFolder({ dir, prompt, logFile })
  let problem = await checkLocally(dir, port)
  if (problem) {
    await step('Fixing what the test found')
    result = await runInFolder({ dir, prompt: `The grown-up server in this folder failed a check: ${problem}\nFix it, run the same round trip again on port ${port}, then stop.`, logFile })
    problem = await checkLocally(dir, port)
  }
  if (problem) throw new Error(`The grown-up server still fails: ${problem}`)
  await dropTestData(dir)
  return result
}

async function ship({ name, dir, step }) {
  await step('Creating its own Sprite')
  try {
    await api('POST', '/v1/sprites', { json: { name, url_settings: { auth: 'public' } } })
  } catch (err) {
    if (![400, 409].includes(err.status)) throw err // it exists already: a second grow-up replaces the app, keeping its data
  }
  await api('PUT', `/v1/sprites/${name}`, { json: { url_settings: { auth: 'public' } } })
  await step('Moving the app in')
  await api('PUT', '/v1/sprites/' + name + '/fs/write', { body: await tarFolder(dir), query: [['path', '/home/sprite/app.tgz'], ['mkdir', 'true']] })
  await exec(name, 'rm -rf ~/app.new && mkdir -p ~/app.new && tar xzf ~/app.tgz -C ~/app.new && rm ~/app.tgz && (cp ~/app/data.db* ~/app.new/ 2>/dev/null || true) && rm -rf ~/app && mv ~/app.new ~/app')
  await api('PUT', `/v1/sprites/${name}/services/app`, { json: { cmd: NODE, args: ['/home/sprite/app/server.mjs'], dir: '/home/sprite/app', env: { PORT: '8080' }, http_port: 8080 } })
  await api('POST', `/v1/sprites/${name}/services/app/restart`).catch(() => {})
  const info = await api('GET', `/v1/sprites/${name}`)
  return info.url
}

async function verifyLive(url, dir) {
  for (let i = 0; i < 24; i++) {
    const health = await fetch(new URL('api/health', url)).then((r) => r.json()).catch(() => null)
    if (health?.ok) {
      const check = await snapThumb({ url, out: path.join(dir, '..', `${path.basename(dir)}-thumb.png`) })
      return check.errors
    }
    await sleep(5000)
  }
  throw new Error(`${url} never answered /api/health`)
}

// Starts in the background; progress is in kid.growup, which the pages poll.
export async function growUp({ fid, cid }) {
  const tree = await readTree(fid)
  const kid = tree?.children[cid]
  if (!kid?.adopted || kid.adoption?.status !== 'done') throw new Error('Only an adopted app can grow up.')
  const name = spriteNameFor(kid.adoption.slug)
  const dir = grownDir(fid, kid.n)
  const port = 18000 + (kid.n % 1000)
  const step = (text) => updateChild(fid, cid, { growup: { status: 'working', step: text, sprite: name } })
  const release = holdAwake(`grow-${cid}`)
  await step('Starting')
  ;(async () => {
    try {
      await step('Checking for an earlier build')
      const result = (await reusableBuild(dir, port)) ? null : await build({ fid, kid, request: tree.request, dir, port, step })
      const url = await ship({ name, dir, step })
      await step('Checking it in a browser')
      const errors = await verifyLive(url, dir)
      await step('Committing it to its repo')
      const summary = (await readFile(path.join(dir, 'GROWN.md'), 'utf8').catch(() => '')).split('\n').find((l) => l.trim() && !l.startsWith('#'))?.trim() || 'Its data now lives in SQLite behind a small JSON API, shared by everyone who opens it.'
      await pushRepoUpdate({ fid, cid, message: `${kid.label} ${kid.name} grew up: its own Sprite, a server and a SQLite database\n\n${summary}`, sourceDir: dir, prefix: 'grown-up/' })
      await updateChild(fid, cid, { growup: { status: 'done', sprite: name, url, summary: summary.slice(0, 300), errors, steps: result?.steps ?? null, at: new Date().toISOString() } })
    } catch (err) {
      console.error(`grow-up for ${cid} failed:`, err)
      await updateChild(fid, cid, { growup: { status: 'failed', sprite: name, error: String(err.message ?? err).slice(0, 300) } })
    } finally {
      release()
    }
  })()
}
