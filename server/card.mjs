// The share card: headless Chrome screenshots /card.html for a family into ~/families/<fid>/card.png.
// It is redrawn when the family has changed since the last picture.
import { spawn } from 'node:child_process'
import { stat } from 'node:fs/promises'
import path from 'node:path'
import { config } from './config.mjs'
import { familyDir } from './store.mjs'

const pending = new Map()

async function mtime(p) {
  return (await stat(p).catch(() => null))?.mtimeMs ?? 0
}

function snap(fid, out) {
  const url = `http://127.0.0.1:${config.port}/card.html?family=${encodeURIComponent(fid)}`
  const args = ['--no-sandbox', '--hide-scrollbars', '--window-size=1200,630', '--virtual-time-budget=8000', `--screenshot=${out}`, url]
  return new Promise((resolve) => {
    const proc = spawn(config.chromePath, args, { stdio: 'ignore' })
    const timer = setTimeout(() => proc.kill('SIGKILL'), 45_000)
    proc.on('error', () => {
      clearTimeout(timer)
      resolve(false)
    })
    proc.on('close', (code) => {
      clearTimeout(timer)
      resolve(code === 0)
    })
  })
}

// Returns the card's path, drawing it first if it's missing or out of date. Null if it can't be made.
export async function ensureCard(fid) {
  const out = path.join(familyDir(fid), 'card.png')
  const [cardTime, treeTime] = await Promise.all([mtime(out), mtime(path.join(familyDir(fid), 'tree.json'))])
  if (!treeTime) return null
  if (cardTime >= treeTime) return out
  if (!pending.has(fid)) {
    pending.set(fid, snap(fid, out).finally(() => pending.delete(fid)))
  }
  const ok = await pending.get(fid)
  return ok || cardTime ? out : null
}
