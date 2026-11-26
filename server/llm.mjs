// One-shot JSON answers (the breeder's briefs, the autopilot's pick). The main path runs through Claude Code
// with no tools enabled, using the same model setup as the builders. If the Sprite has an Ollama connector
// (ollamaBaseUrl), Ollama Cloud is the backup when that call fails. The builders always use Claude Code:
// the Ollama connector doesn't offer the Claude-style endpoint they need.
import { spawn } from 'node:child_process'
import os from 'node:os'
import { config } from './config.mjs'
import { claudeEnv } from './builder.mjs'

const TIMEOUT_MS = 180_000

function extractJson(text) {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(text)
  const body = fenced ? fenced[1] : text
  const start = body.indexOf('{')
  const end = body.lastIndexOf('}')
  if (start < 0 || end <= start) throw new Error('The model reply held no JSON object.')
  return JSON.parse(body.slice(start, end + 1))
}

export async function askJson({ system, user }) {
  try {
    return await askViaClaude({ system, user })
  } catch (err) {
    if (!config.ollamaBaseUrl) throw err
    console.error(`main model failed (${err.message.slice(0, 120)}); asking Ollama instead`)
    return askViaOllama({ system, user })
  }
}

// Ollama's native chat API through the Sprites connector (the gateway adds the key). Needs Ollama credits.
export async function askViaOllama({ system, user, baseUrl = config.ollamaBaseUrl, model = config.ollamaModel }) {
  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/api/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ model, stream: false, format: 'json', messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  const body = await res.text()
  if (!res.ok) throw new Error(`Ollama answered ${res.status}: ${body.slice(0, 160)}`)
  return extractJson(JSON.parse(body).message?.content ?? '')
}

function askViaClaude({ system, user }) {
  const model = config.breederModel || config.model
  const fallback = config.fallbackModel && config.fallbackModel !== model ? ['--fallback-model', config.fallbackModel] : []
  const args = ['-p', user, '--system-prompt', system, '--tools', '', '--output-format', 'json', ...(model ? ['--model', model] : []), ...fallback]
  return new Promise((resolve, reject) => {
    // Short answers don't need long thinking; without a cap the breeder can think past its time limit.
    const proc = spawn(config.claudeBin, args, { cwd: os.tmpdir(), env: { ...claudeEnv(), MAX_THINKING_TOKENS: '0' }, stdio: ['ignore', 'pipe', 'pipe'] })
    let out = ''
    let err = ''
    proc.stdout.on('data', (c) => (out += c))
    proc.stderr.on('data', (c) => (err += c))
    const timer = setTimeout(() => proc.kill('SIGTERM'), TIMEOUT_MS)
    proc.on('error', (e) => {
      clearTimeout(timer)
      reject(e)
    })
    proc.on('close', (code) => {
      clearTimeout(timer)
      try {
        const reply = JSON.parse(out)
        if (reply.is_error) throw new Error(`Model call failed: ${String(reply.result).slice(0, 200)}`)
        resolve(extractJson(String(reply.result ?? '')))
      } catch (e) {
        reject(new Error(code === 0 ? e.message : `Claude Code exited ${code}: ${err.slice(0, 200)}`))
      }
    })
  })
}
