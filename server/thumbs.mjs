// A thumbnail per child: headless Chrome screenshots the live app once it's built.
import { spawn } from 'node:child_process'
import { access } from 'node:fs/promises'
import path from 'node:path'
import { config } from './config.mjs'
import { kidDir } from './store.mjs'

export async function snapThumb({ fid, n, url }) {
  const out = path.join(kidDir(fid, n), 'thumb.png')
  const args = [
    '--no-sandbox',
    '--hide-scrollbars',
    '--window-size=1024,768',
    '--virtual-time-budget=4000',
    `--screenshot=${out}`,
    url,
  ]
  const ok = await new Promise((resolve) => {
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
  return ok && (await access(out).then(() => true, () => false))
}
