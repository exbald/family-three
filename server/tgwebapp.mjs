// Telegram Mini App sign-in without the bot token: Telegram signs the Mini App's init data with Ed25519,
// and anyone can check that signature with Telegram's public key and the bot's id. The token stays in
// the connector, as everywhere else.
import { createPublicKey, verify } from 'node:crypto'
import { config } from './config.mjs'

const TELEGRAM_KEY = 'e7bf03a2fa4602af4580703d88dda5bb59f32ed8b02a56c187fe7d34caed242d'
const SPKI_ED25519_PREFIX = '302a300506032b6570032100'
const MAX_AGE_S = 24 * 3600

const publicKey = createPublicKey({ key: Buffer.from(SPKI_ED25519_PREFIX + TELEGRAM_KEY, 'hex'), format: 'der', type: 'spki' })

let botIdPromise = null
function botId() {
  if (!botIdPromise) {
    botIdPromise = fetch(`${config.telegramBaseUrl}/getMe`, { signal: AbortSignal.timeout(15_000) })
      .then((r) => r.json())
      .then((j) => (j.ok ? String(j.result.id) : Promise.reject(new Error('getMe failed'))))
      .catch((err) => { botIdPromise = null; throw err })
  }
  return botIdPromise
}

// Returns { userId, firstName, startParam } for genuine, fresh init data, otherwise null.
export async function verifyInitData(raw) {
  if (!raw || typeof raw !== 'string' || raw.length > 4096 || !config.telegramBaseUrl) return null
  try {
    const params = new URLSearchParams(raw)
    const signature = params.get('signature')
    const authDate = Number(params.get('auth_date'))
    if (!signature || !authDate || Date.now() / 1000 - authDate > MAX_AGE_S) return null
    const lines = [...params.entries()]
      .filter(([k]) => k !== 'hash' && k !== 'signature')
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
    const data = Buffer.from(`${await botId()}:WebAppData\n${lines.join('\n')}`)
    if (!verify(null, data, publicKey, Buffer.from(signature, 'base64url'))) return null
    const user = JSON.parse(params.get('user') ?? 'null')
    if (!user?.id) return null
    return { userId: String(user.id), firstName: String(user.first_name ?? ''), startParam: params.get('start_param') ?? '' }
  } catch {
    return null
  }
}

// The Telegram voter behind a request, if the Mini App sent its init data.
export const telegramVoter = (req) => verifyInitData(req.headers['x-telegram-init-data'])
