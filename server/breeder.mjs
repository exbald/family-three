// The breeder writes three briefs that differ on purpose and learns your taste from each pick.
// It is one GLM call per litter through the Z.ai connector; the built-in directions are the fallback.
import { askJson } from './llm.mjs'
import { readTaste, writeTaste, tasteText } from './taste.mjs'

const FIRST = [
  {
    name: 'Playful',
    brief:
      'Warm and friendly. Bright colours, rounded shapes, big touch targets, encouraging words. Celebrate progress when the user does something.',
  },
  {
    name: 'Quiet',
    brief:
      'Minimal and calm. Light background, lots of white space, strong typography. One key number or action front and centre; nothing extra.',
  },
  {
    name: 'Dashboard',
    brief:
      'Dense and dark. Everything important on one screen: big numbers, a chart drawn with SVG or canvas, a list. Monospace accents, a single bright accent colour.',
  },
]

const BREED = [
  {
    name: 'Refined',
    brief: 'Keep the look and the features. Polish rough edges and make the main interaction faster and more satisfying.',
  },
  {
    name: 'Rearranged',
    brief: 'Keep the mood and the features, but try a clearly different layout: move the main element, change the hierarchy.',
  },
  {
    name: 'Grown',
    brief: 'Keep everything that works and add the single most useful feature it is missing. Only one.',
  },
]

const CROSS = [
  {
    name: 'Blend',
    brief: "Keep parent 1's structure and features; restyle it completely in parent 2's look (colours, type, shapes, mood).",
  },
  {
    name: 'Graft',
    brief: "Keep parent 1's structure and look, and bring over parent 2's best feature, restyled to fit.",
  },
  {
    name: 'Hybrid',
    brief: "An even mix: parent 1's layout, parent 2's palette and type, and the best feature of each.",
  },
]

const SYSTEM = `You are the breeder in Family Three, an app where people raise small web apps instead of prompting them.
Each generation has three children, each built by a separate coding agent from one brief you write.
Your briefs must differ on purpose: one changes the layout, one the mood and look, one adds or sharpens a single feature.
Each brief is 1 to 3 plain sentences a builder can act on. Name each child in one or two words that describe its character.
When the user picked a child, you also learn their taste: what the picked child has that its siblings lacked, and what they passed over.
Reply with JSON only.`

const SHAPE = `{"briefs":[{"name":"...","brief":"..."},{"name":"...","brief":"..."},{"name":"...","brief":"..."}],
 "likes":["short taste phrases, at most 8, keep the old ones that still hold"],
 "avoid":["short phrases for what they passed over, at most 8"],
 "learned":"one sentence on what this pick taught you, addressed to the user, or empty for a first generation"}`

function describe(kid) {
  return `${kid.label} "${kid.name}": brief "${kid.brief}". Builder's summary: "${kid.summary ?? ''}"`
}

function userPrompt({ tree, kind, parents, note, taste }) {
  const lines = [`The family's request: "${tree.request}"`, `What we know about their taste: ${tasteText(taste)}`]
  if (kind === 'first') {
    lines.push('This is generation 1: write three very different first takes on the request, nudged by their taste.')
  } else {
    const picked = new Set(parents.map((p) => p.id))
    const siblings = parents.flatMap((p) => {
      const litter = tree.litters.find((l) => l.id === p.litter)
      return (litter?.children ?? []).filter((id) => !picked.has(id)).map((id) => tree.children[id])
    })
    lines.push(kind === 'breed' ? `They picked ${describe(parents[0])} to breed from.` : `They picked two to cross. Parent 1 (bones): ${describe(parents[0])}. Parent 2 (looks): ${describe(parents[1])}.`)
    if (siblings.length) lines.push(`They passed over: ${siblings.filter(Boolean).map(describe).join(' | ')}`)
    lines.push(kind === 'breed'
      ? 'Write three children of the picked app: each keeps what works and changes one thing.'
      : "Write three crosses: each keeps parent 1's structure and takes parent 2's look, blended differently.")
  }
  if (note) lines.push(`The user's note: "${note}"`)
  lines.push(`Reply in this shape: ${SHAPE}`)
  return lines.join('\n\n')
}

function builtIn(kind, note) {
  const base = kind === 'cross' ? CROSS : kind === 'breed' ? BREED : FIRST
  const suffix = note ? ` The user said: "${note}"` : ''
  return base.map((b) => ({ name: b.name, brief: b.brief + suffix, source: 'built-in' }))
}

function validBriefs(reply) {
  const briefs = Array.isArray(reply?.briefs) ? reply.briefs : []
  const ok = briefs
    .slice(0, 3)
    .map((b) => ({ name: String(b?.name ?? '').trim().slice(0, 24), brief: String(b?.brief ?? '').trim().slice(0, 600) }))
    .filter((b) => b.name && b.brief)
  return ok.length === 3 ? ok.map((b) => ({ ...b, source: 'breeder' })) : null
}

// Returns three briefs. For a breed or cross it also updates taste.md. Never throws.
export async function writeBriefs({ tree, kind, parents, note }) {
  const taste = await readTaste().catch(() => ({ picks: 0, likes: [], avoid: [], learned: '' }))
  try {
    const reply = await askJson({ system: SYSTEM, user: userPrompt({ tree, kind, parents, note, taste }) })
    const briefs = validBriefs(reply)
    if (!briefs) throw new Error('The breeder did not return three briefs.')
    if (kind !== 'first') {
      await writeTaste({ picks: taste.picks + 1, likes: reply.likes ?? taste.likes, avoid: reply.avoid ?? taste.avoid, learned: reply.learned })
    }
    return briefs
  } catch (err) {
    console.error('breeder fell back to built-in briefs:', err.message)
    if (kind !== 'first') await writeTaste({ ...taste, picks: taste.picks + 1 }).catch(() => {})
    return builtIn(kind, note)
  }
}
