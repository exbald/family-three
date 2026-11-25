// Small HTTP helpers: JSON in and out, and safe static files.
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import path from 'node:path'

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
  '.zip': 'application/zip',
}

const MAX_BODY = 16 * 1024

export function sendJson(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
  res.end(JSON.stringify(body))
}

export function sendError(res, status, message) {
  sendJson(res, status, { success: false, error: message })
}

export function readJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > MAX_BODY) {
        reject(Object.assign(new Error('Request body too large'), { status: 413 }))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      if (!chunks.length) return resolve({})
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')))
      } catch {
        reject(Object.assign(new Error('Body is not valid JSON'), { status: 400 }))
      }
    })
    req.on('error', reject)
  })
}

// Serves root/rel, refusing anything that escapes root. Directories serve their index.html.
export async function sendFile(res, root, rel, { cache = 'no-cache' } = {}) {
  const base = path.resolve(root)
  let file = path.resolve(base, `.${path.sep}${decodeURIComponent(rel)}`)
  if (file !== base && !file.startsWith(base + path.sep)) return false
  // No dotfiles or dot-folders (.claude, .git) from inside the served folder.
  if (path.relative(base, file).split(path.sep).some((part) => part.startsWith('.'))) return false
  let info = await stat(file).catch(() => null)
  if (info?.isDirectory()) {
    file = path.join(file, 'index.html')
    info = await stat(file).catch(() => null)
  }
  if (!info?.isFile()) return false
  res.writeHead(200, {
    'content-type': TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream',
    'content-length': info.size,
    'cache-control': cache,
  })
  createReadStream(file).pipe(res)
  return true
}
