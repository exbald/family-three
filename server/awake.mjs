// Keeps the Sprite from pausing while builders run (Tasks API on the Sprite socket).
import http from 'node:http'
import { existsSync } from 'node:fs'
import { config } from './config.mjs'

const HEARTBEAT_MS = 60_000

function call(method, path, body) {
  if (!existsSync(config.spriteSocket)) return Promise.resolve(null)
  return new Promise((resolve) => {
    const req = http.request(
      { socketPath: config.spriteSocket, host: 'sprite', path, method, headers: { 'content-type': 'application/json' } },
      (res) => {
        res.resume()
        res.on('end', () => resolve(res.statusCode))
      },
    )
    req.on('error', (err) => {
      console.error(`awake: ${method} ${path} failed:`, err.message)
      resolve(null)
    })
    req.end(body ? JSON.stringify(body) : undefined)
  })
}

// Returns a release function. The hold expires on its own if the server dies.
export function holdAwake(name) {
  const refresh = () => call('PUT', `/v1/tasks/${encodeURIComponent(name)}`, { expire: '5m' })
  refresh()
  const timer = setInterval(refresh, HEARTBEAT_MS)
  return () => {
    clearInterval(timer)
    return call('DELETE', `/v1/tasks/${encodeURIComponent(name)}`)
  }
}
