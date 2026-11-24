// Only the owner may raise, breed or cross. Visitors can look at everything.
// The owner unlocks a browser once by opening /?key=<owner key>; the key lives in ~/.ft/owner-key.
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { randomBytes, timingSafeEqual } from 'node:crypto'
import path from 'node:path'
import { config } from './config.mjs'

const KEY_PATH = path.join(config.home, '.ft', 'owner-key')
const COOKIE = 'ft_owner'
const YEAR = 365 * 24 * 3600

let ownerKey = null

export async function loadOwnerKey() {
  try {
    ownerKey = (await readFile(KEY_PATH, 'utf8')).trim()
  } catch (err) {
    if (err.code !== 'ENOENT') throw err
    ownerKey = randomBytes(24).toString('base64url')
    await mkdir(path.dirname(KEY_PATH), { recursive: true })
    await writeFile(KEY_PATH, `${ownerKey}\n`, { mode: 0o600 })
  }
}

function matches(candidate) {
  if (!ownerKey || typeof candidate !== 'string') return false
  const a = Buffer.from(candidate)
  const b = Buffer.from(ownerKey)
  return a.length === b.length && timingSafeEqual(a, b)
}

function cookieValue(req) {
  const header = req.headers.cookie ?? ''
  const pair = header.split(/;\s*/).find((p) => p.startsWith(`${COOKIE}=`))
  return pair ? decodeURIComponent(pair.slice(COOKIE.length + 1)) : null
}

export function isOwner(req) {
  return matches(cookieValue(req))
}

// Handles /?key=…: sets the cookie and redirects to a clean URL. Returns true when it answered.
export function handleUnlock(req, res, url) {
  const key = url.searchParams.get('key')
  if (key === null) return false
  const ok = matches(key)
  const headers = { location: '/', 'cache-control': 'no-store' }
  if (ok) headers['set-cookie'] = `${COOKIE}=${encodeURIComponent(key)}; Path=/; Max-Age=${YEAR}; HttpOnly; Secure; SameSite=Strict`
  res.writeHead(302, headers)
  res.end()
  return true
}
