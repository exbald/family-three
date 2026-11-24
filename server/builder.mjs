// One builder = one headless Claude Code run in the child's own folder.
import { spawn } from 'node:child_process'
import { createWriteStream } from 'node:fs'
import { cp, mkdir, readFile, writeFile, rm, access } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from './config.mjs'
import { kidDir, logPath } from './store.mjs'

const PROMPT_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), 'prompts', 'builder.md')
const NOT_COPIED = new Set(['thumb.png'])

function fill(template, values) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => values[key] ?? '')
}

function parentsText(kind, parents) {
  if (kind === 'breed') {
    return `This folder already holds a copy of your parent app, ${parents[0].label} "${parents[0].name}". Keep what works and change it as your brief says.`
  }
  if (kind === 'cross') {
    return [
      `This folder already holds a copy of parent 1, ${parents[0].label} "${parents[0].name}". It gives the bones.`,
      `Parent 2, ${parents[1].label} "${parents[1].name}", is in ${parents[1].dir} (read it, never change it). It gives the looks.`,
    ].join('\n')
  }
  return 'There is no parent: this is the first generation. Start from an empty folder.'
}

async function prepareFolder({ fid, child, kind, parents }) {
  const dir = kidDir(fid, child.n)
  await rm(dir, { recursive: true, force: true })
  await mkdir(dir, { recursive: true })
  if (kind !== 'first') {
    await cp(kidDir(fid, parents[0].n), dir, {
      recursive: true,
      filter: (src) => !NOT_COPIED.has(path.basename(src)),
    })
  }
  return dir
}

function describeTool(block) {
  const input = block.input ?? {}
  const target = input.file_path ?? input.path ?? input.command ?? input.pattern ?? ''
  const short = String(target).split('/').pop().slice(0, 60)
  return short ? `${block.name} ${short}` : block.name
}

function claudeArgs(prompt, extraDirs, { continueSession = false } = {}) {
  const args = [
    ...(continueSession ? ['--continue'] : []),
    '-p', prompt,
    '--output-format', 'stream-json',
    '--verbose',
    '--dangerously-skip-permissions',
    '--disallowedTools', 'Task', 'Agent', 'WebFetch', 'WebSearch',
  ]
  for (const d of extraDirs) args.push('--add-dir', d)
  if (config.model) args.push('--model', config.model)
  return args
}

function claudeEnv() {
  const env = {
    ...process.env,
    CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
    DISABLE_AUTOUPDATER: '1',
  }
  if (config.modelBaseUrl) {
    // The Sprites gateway attaches the real key; this placeholder only satisfies Claude Code.
    return { ...env, ANTHROPIC_BASE_URL: config.modelBaseUrl, ANTHROPIC_AUTH_TOKEN: 'sprites-gateway' }
  }
  return env
}

function runClaude({ dir, prompt, extraDirs, log, onProgress, continueSession = false }) {
  return new Promise((resolve) => {
    const proc = spawn(config.claudeBin, claudeArgs(prompt, extraDirs, { continueSession }), { cwd: dir, env: claudeEnv(), stdio: ['ignore', 'pipe', 'pipe'] })
    let buffer = ''
    let steps = 0
    let summary = ''
    let isError = false
    const timer = setTimeout(() => {
      isError = true
      summary = 'Ran out of time.'
      proc.kill('SIGTERM')
    }, config.buildTimeoutMs)

    proc.stdout.on('data', (chunk) => {
      log.write(chunk)
      buffer += chunk
      const lines = buffer.split('\n')
      buffer = lines.pop()
      for (const line of lines) {
        let event
        try {
          event = JSON.parse(line)
        } catch {
          continue
        }
        if (event.type === 'assistant') {
          for (const block of event.message?.content ?? []) {
            if (block.type === 'tool_use') {
              steps += 1
              onProgress({ steps, activity: describeTool(block) })
            }
          }
        } else if (event.type === 'result') {
          summary = String(event.result ?? '').slice(0, 400)
          isError = Boolean(event.is_error)
        }
      }
    })
    proc.stderr.on('data', (chunk) => log.write(chunk))
    proc.on('error', (err) => {
      clearTimeout(timer)
      resolve({ ok: false, steps, summary: `Could not start the builder: ${err.message}` })
    })
    proc.on('close', (code) => {
      clearTimeout(timer)
      resolve({ ok: code === 0 && !isError, steps, summary })
    })
  })
}

async function runStub({ dir, child, request }) {
  await new Promise((r) => setTimeout(r, 1500 + Math.random() * 2500))
  const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>${child.name}</title><body style="margin:0;font:16px system-ui;background:#141916;color:#EEF2EC;display:grid;place-items:center;min-height:100vh">
<main style="max-width:30rem;padding:2rem"><p style="color:#C6F432;font-weight:700">${child.label} · ${child.name}</p>
<h1>${request.replace(/</g, '&lt;')}</h1><p>${child.brief.replace(/</g, '&lt;')}</p></main>`
  await writeFile(path.join(dir, 'index.html'), html)
  return { ok: true, steps: 1, summary: 'A stub app (builder is in stub mode).' }
}

// Builds one child. Calls onProgress({steps, activity}) as it works. Never throws.
export async function buildChild({ fid, request, child, kind, parents, onProgress }) {
  try {
    const dir = await prepareFolder({ fid, child, kind, parents })
    if (config.builder === 'stub') return await runStub({ dir, child, request })

    const template = await readFile(PROMPT_PATH, 'utf8')
    const parentInfo = parents.map((p) => ({ ...p, dir: kidDir(fid, p.n) }))
    const prompt = fill(template, {
      request,
      name: child.name,
      brief: child.brief,
      parents: parentsText(kind, parentInfo),
    })
    await mkdir(path.dirname(logPath(fid, child.n)), { recursive: true })
    const log = createWriteStream(logPath(fid, child.n))
    const extraDirs = kind === 'cross' ? [parentInfo[1].dir] : []
    const result = await runClaude({ dir, prompt, extraDirs, log, onProgress })
    log.end()

    const hasEntry = await access(path.join(dir, 'index.html')).then(() => true, () => false)
    if (!hasEntry) return { ...result, ok: false, summary: result.summary || 'No index.html was written.' }
    return result
  } catch (err) {
    console.error(`builder ${fid}-${child.n} failed:`, err)
    return { ok: false, steps: 0, summary: `Builder crashed: ${err.message}` }
  }
}

// One repair round: the same builder session gets the errors a real browser reported. Never throws.
export async function fixChild({ fid, child, errors, onProgress }) {
  if (config.builder === 'stub') return { ok: true, steps: 0, summary: '' }
  try {
    const dir = kidDir(fid, child.n)
    const prompt = [
      'I opened your app in a real browser (headless Chrome) and it reported these script errors:',
      ...errors.map((e) => `- ${e}`),
      'Fix them so the whole app works, without changing its design or features. Check the code path that runs on first load with no saved data, and with the sample data.',
      'When done, reply with one plain sentence saying what you fixed.',
    ].join('\n')
    const log = createWriteStream(logPath(fid, child.n), { flags: 'a' })
    const result = await runClaude({ dir, prompt, extraDirs: [], log, onProgress, continueSession: true })
    log.end()
    return result
  } catch (err) {
    console.error(`fixer ${fid}-${child.n} failed:`, err)
    return { ok: false, steps: 0, summary: `Fixer crashed: ${err.message}` }
  }
}
