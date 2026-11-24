// One-shot JSON calls to GLM through the Z.ai connector (Anthropic Messages API, key added by the gateway).
import { config } from './config.mjs'

const TIMEOUT_MS = 90_000

function extractJson(text) {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(text)
  const body = fenced ? fenced[1] : text
  const start = body.indexOf('{')
  const end = body.lastIndexOf('}')
  if (start < 0 || end <= start) throw new Error('The model reply held no JSON object.')
  return JSON.parse(body.slice(start, end + 1))
}

export async function askJson({ system, user, maxTokens = 2000 }) {
  if (!config.modelBaseUrl) throw new Error('No model connector is configured.')
  const res = await fetch(`${config.modelBaseUrl}/v1/messages`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: config.breederModel,
      max_tokens: maxTokens,
      thinking: { type: 'disabled' },
      system,
      messages: [{ role: 'user', content: user }],
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!res.ok) throw new Error(`Model call failed with HTTP ${res.status}.`)
  const reply = await res.json()
  const text = (reply.content ?? [])
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
  return extractJson(text)
}
