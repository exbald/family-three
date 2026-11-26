// Headless Chrome opens each finished child once: it takes the thumbnail and reports script errors.
import { spawn } from 'node:child_process'
import { access } from 'node:fs/promises'
import path from 'node:path'
import { config } from './config.mjs'
import { kidDir } from './store.mjs'

const CONSOLE_LINE = /INFO:CONSOLE[^\]]*\]\s*"(.*)", source: (\S+) \((\d+)\)/

function scriptErrors(stderr) {
  const errors = []
  for (const line of stderr.split('\n')) {
    const m = CONSOLE_LINE.exec(line)
    if (!m) continue
    const [, message, source, lineNo] = m
    if (!/^Uncaught|Error\b|error\b/.test(message)) continue
    errors.push(`${message} (${source.split('/').pop()}:${lineNo})`)
  }
  return [...new Set(errors)].slice(0, 8)
}

// Returns { thumb: boolean, errors: string[] }.
export async function snapThumb({ fid, n, url }) {
  const out = path.join(kidDir(fid, n), 'thumb.png')
  const args = [
    '--no-sandbox',
    '--hide-scrollbars',
    '--enable-logging=stderr',
    '--v=0',
    '--window-size=1280,800',
    '--virtual-time-budget=4000',
    `--screenshot=${out}`,
    url,
  ]
  const { ok, stderr } = await new Promise((resolve) => {
    let err = ''
    const proc = spawn(config.chromePath, args, { stdio: ['ignore', 'ignore', 'pipe'] })
    proc.stderr.on('data', (chunk) => {
      if (err.length < 200_000) err += chunk
    })
    const timer = setTimeout(() => proc.kill('SIGKILL'), 45_000)
    proc.on('error', () => {
      clearTimeout(timer)
      resolve({ ok: false, stderr: err })
    })
    proc.on('close', (code) => {
      clearTimeout(timer)
      resolve({ ok: code === 0, stderr: err })
    })
  })
  const thumb = ok && (await access(out).then(() => true, () => false))
  return { thumb, errors: scriptErrors(stderr) }
}
