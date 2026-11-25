// One-shot JSON answers from GLM. The call runs through Claude Code (a tool the Z.ai coding plan
// supports) with no tools enabled, using the same model setup as the builders.
import { spawn } from 'node:child_process'
import os from 'node:os'
import { config } from './config.mjs'
import { claudeEnv } from './builder.mjs'

const TIMEOUT_MS = 120_000

function extractJson(text) {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(text)
  const body = fenced ? fenced[1] : text
  const start = body.indexOf('{')
  const end = body.lastIndexOf('}')
  if (start < 0 || end <= start) throw new Error('The model reply held no JSON object.')
  return JSON.parse(body.slice(start, end + 1))
}

export function askJson({ system, user }) {
  const model = config.breederModel || config.model
  const fallback = config.fallbackModel && config.fallbackModel !== model ? ['--fallback-model', config.fallbackModel] : []
  const args = ['-p', user, '--system-prompt', system, '--tools', '', '--output-format', 'json', ...(model ? ['--model', model] : []), ...fallback]
  return new Promise((resolve, reject) => {
    const proc = spawn(config.claudeBin, args, { cwd: os.tmpdir(), env: claudeEnv(), stdio: ['ignore', 'pipe', 'pipe'] })
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
