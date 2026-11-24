// A Sprite checkpoint after every generation (and every adoption), and restore from the page.
// Checkpoints are whole-disk snapshots taken through the Sprite's own API socket.
import http from 'node:http'
import { existsSync } from 'node:fs'
import { config } from './config.mjs'

const PREFIX = 'ft|'
const CHECKPOINT_ID = /^v\d{1,6}$/

function spriteApi(method, path, body) {
  if (!existsSync(config.spriteSocket)) return Promise.reject(new Error('Not running on a Sprite.'))
  return new Promise((resolve, reject) => {
    const req = http.request(
      { socketPath: config.spriteSocket, host: 'sprite', path, method, headers: { 'content-type': 'application/json' } },
      (res) => {
        let text = ''
        res.on('data', (c) => (text += c))
        res.on('end', () => (res.statusCode < 300 ? resolve(text) : reject(new Error(`Sprite API ${method} ${path}: ${res.statusCode} ${text.slice(0, 200)}`))))
      },
    )
    req.on('error', reject)
    req.setTimeout(60_000, () => req.destroy(new Error('Sprite API timed out')))
    req.end(body ? JSON.stringify(body) : undefined)
  })
}

// comment: "ft|<family id>|<gen>|<what happened>"
export async function saveCheckpoint({ fid, gen, what }) {
  try {
    const clean = String(what).replace(/[|\n]/g, ' ').slice(0, 120)
    const out = await spriteApi('POST', '/v1/checkpoint', { comment: `${PREFIX}${fid}|${gen}|${clean}` })
    return /ID: (v\d+)/.exec(out)?.[1] ?? null
  } catch (err) {
    console.error('checkpoint failed:', err.message)
    return null
  }
}

export async function listCheckpoints(fid) {
  const all = JSON.parse(await spriteApi('GET', '/v1/checkpoints'))
  return all
    .filter((c) => typeof c.comment === 'string' && c.comment.startsWith(PREFIX))
    .map((c) => {
      const [, family, gen, what] = c.comment.split('|')
      return { id: c.id, at: c.create_time, family, gen: Number(gen), what }
    })
    .filter((c) => !fid || c.family === fid)
    .sort((a, b) => b.at.localeCompare(a.at))
}

// The Sprite restarts right after this: every process ends, the service comes back on the old disk.
export async function restoreCheckpoint(id) {
  if (!CHECKPOINT_ID.test(id)) throw Object.assign(new Error('Not a checkpoint id.'), { status: 400 })
  const known = await listCheckpoints()
  if (!known.some((c) => c.id === id)) throw Object.assign(new Error('No Family Three checkpoint with that id.'), { status: 404 })
  return spriteApi('POST', `/v1/checkpoints/${id}/restore`)
}
