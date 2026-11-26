// Design kit: one Claude Code run reads an adopted app and writes DESIGN.md, tokens.css,
// tokens.json and design.html. The kit is served at /kit/<child>/, zipped, and committed
// to the app's repo under design/.
import { spawn } from 'node:child_process'
import { access, readFile, rm } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { runInFolder } from './builder.mjs'
import { pushRepoUpdate } from './adopt.mjs'
import { familyDir, kidDir, readTree, updateChild } from './store.mjs'
import { readTaste, tasteText, tastePathFor } from './taste.mjs'
import { config } from './config.mjs'

const PROMPT_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), 'prompts', 'kit.md')
export const KIT_FILES = ['DESIGN.md', 'tokens.css', 'tokens.json', 'design.html']

export const kitDir = (fid, n) => path.join(familyDir(fid), 'kits', String(n))
export const kitZip = (fid, n) => path.join(familyDir(fid), 'kits', `${n}.zip`)

const exists = (p) => access(p).then(() => true, () => false)

function zip(dir, out) {
  return new Promise((resolve) => {
    const proc = spawn('zip', ['-q', '-j', out, ...KIT_FILES.map((f) => path.join(dir, f))], { stdio: 'ignore' })
    proc.on('error', () => resolve(false))
    proc.on('close', (code) => resolve(code === 0))
  })
}

// Makes (or remakes) the kit for one child. Never throws.
// How many kits are being made right now: visitors may only start one when none is.
let working = 0
export const kitBusy = () => working > 0

export async function makeKit({ fid, cid }) {
  const tree = await readTree(fid)
  const kid = tree?.children[cid]
  if (!kid) return null
  await updateChild(fid, cid, { kit: { status: 'working' } })
  working += 1
  try {
    const dir = kitDir(fid, kid.n)
    await rm(dir, { recursive: true, force: true })
    await rm(kitZip(fid, kid.n), { force: true })
    const taste = await readTaste(tastePathFor(tree)).catch(() => null)
    const template = await readFile(PROMPT_PATH, 'utf8')
    const prompt = template
      .replaceAll('{{appDir}}', kidDir(fid, kid.n))
      .replaceAll('{{name}}', kid.name)
      .replaceAll('{{request}}', tree.request)
      .replaceAll('{{taste}}', taste ? tasteText(taste) : 'not known yet')
    const result = await runInFolder({
      dir,
      prompt,
      extraDirs: [kidDir(fid, kid.n)],
      logFile: path.join(familyDir(fid), 'logs', `kit-${kid.n}.jsonl`),
    })
    const present = []
    for (const f of KIT_FILES) if (await exists(path.join(dir, f))) present.push(f)
    if (!present.includes('DESIGN.md') || !present.includes('tokens.css')) {
      throw new Error(result.summary || 'The kit is missing DESIGN.md or tokens.css.')
    }
    // A run that stopped early still leaves a usable kit; describe it from its own mood line.
    const design = await readFile(path.join(dir, 'DESIGN.md'), 'utf8').catch(() => '')
    const mood = /## Mood\s+([^\n]+)/.exec(design)?.[1]?.trim()
    // The kit's own mood line, not the builder's report (which talks about file paths).
    const summary = (mood ?? 'A design kit made from this app: colours, type, spacing and components.').slice(0, 300)
    const zipped = present.length === KIT_FILES.length && config.builder !== 'stub' ? await zip(dir, kitZip(fid, kid.n)) : false
    let inRepo = false
    if (kid.adopted && kid.adoption?.repo) {
      await pushRepoUpdate({ fid, cid, message: `Design kit for ${kid.label} ${kid.name}\n\n${summary}`, sourceDir: dir, prefix: 'design/' })
      inRepo = true
    }
    const kit = { status: 'ready', files: present, zip: zipped, inRepo, summary, complete: present.length === KIT_FILES.length, at: new Date().toISOString() }
    await updateChild(fid, cid, { kit })
    return kit
  } catch (err) {
    console.error(`kit for ${cid} failed:`, err)
    await updateChild(fid, cid, { kit: { status: 'failed', error: err.message } })
    return null
  } finally {
    working -= 1
  }
}
