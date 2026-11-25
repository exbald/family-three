// Settings come from env vars, then ~/.ft/config.json (non-secret ids only).
import { readFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const home = process.env.FT_HOME ?? os.homedir()

function readFileConfig() {
  try {
    return JSON.parse(readFileSync(path.join(home, '.ft', 'config.json'), 'utf8'))
  } catch {
    return {}
  }
}

const file = readFileConfig()
const pick = (envName, key, fallback) => process.env[envName] ?? file[key] ?? fallback

export const config = Object.freeze({
  port: Number(pick('PORT', 'port', 8080)),
  home,
  familiesDir: path.join(home, 'families'),
  tastePath: path.join(home, 'taste.md'),
  // "claude" runs Claude Code; "stub" writes a placeholder app (for local work).
  builder: pick('FT_BUILDER', 'builder', 'claude'),
  claudeBin: pick('FT_CLAUDE_BIN', 'claudeBin', 'claude'),
  // Gateway URL of the Custom API connector for Z.ai's Anthropic endpoint.
  modelBaseUrl: pick('FT_MODEL_BASE_URL', 'modelBaseUrl', ''),
  model: pick('FT_MODEL', 'model', ''),
  breederModel: pick('FT_BREEDER_MODEL', 'breederModel', ''),
  fallbackModel: pick('FT_FALLBACK_MODEL', 'fallbackModel', ''),
  githubBaseUrl: pick('FT_GITHUB_BASE_URL', 'githubBaseUrl', ''),
  publicUrl: pick('FT_PUBLIC_URL', 'publicUrl', ''),
  telegramBaseUrl: pick('FT_TELEGRAM_BASE_URL', 'telegramBaseUrl', ''),
  telegramChannel: pick('FT_TELEGRAM_CHANNEL', 'telegramChannel', ''),
  telegramOwner: pick('FT_TELEGRAM_OWNER', 'telegramOwner', ''),
  // Telegram stays off until the site is public (the channel would show private links otherwise).
  telegramLive: ['1', 'true', true].includes(pick('FT_TELEGRAM_LIVE', 'telegramLive', false)),
  buildTimeoutMs: Number(pick('FT_BUILD_TIMEOUT_MS', 'buildTimeoutMs', 12 * 60 * 1000)),
  chromePath: pick('FT_CHROME', 'chromePath', path.join(home, '.browsers', 'chrome')),
  spriteSocket: '/.sprite/api.sock',
})
