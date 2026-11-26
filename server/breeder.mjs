// The breeder writes three briefs that differ on purpose and learns your taste from each pick.
// It is one GLM call per litter through the Z.ai connector; the built-in directions are the fallback.
import { askJson } from './llm.mjs'
import { config } from './config.mjs'
import { readTaste, writeTaste, tasteText, tastePathFor } from './taste.mjs'

const FIRST = [
  {
    name: 'Playful',
    brief:
      'A bright, friendly board: warm coral #FF6B4A and sunny #FFD23F on cream #FFF8EE, Fredoka and Nunito. Big rounded tiles across the full width, one giant headline number, and a small celebration when the user does something.',
  },
  {
    name: 'Quiet',
    brief:
      'Minimal and editorial: ink #111 on white with one accent #2F6BFF, Fraunces and Inter. A wide two-column layout; one key answer set huge on the left, the details as a calm list on the right.',
  },
  {
    name: 'Dashboard',
    brief:
      'Dense and dark: #0B0F14 with lime #C6F432, Space Grotesk and JetBrains Mono. A full-screen grid of stat tiles and a chart drawn with SVG, everything visible at once.',
  },
]

const BREED = [
  {
    name: 'Refined',
    brief: 'Keep the look and the features, but make it bolder: a bigger hero element, stronger contrast, and a faster main interaction.',
  },
  {
    name: 'Rearranged',
    brief: 'Same job and features, but a clearly different layout and a different main interaction; change the palette to a new one of your choice.',
  },
  {
    name: 'Wild card',
    brief: 'A completely different visual concept for the same job: a new metaphor, a new palette and a new layout. Keep only what the app is for.',
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
The three must look and work clearly differently, so the person has a real choice:
- Child 1, the refinement: keeps what the person picked and makes it better and bolder.
- Child 2, the bold change: same job, a different layout and a different main interaction.
- Child 3, the wild card: a completely different visual concept for the same job (a different metaphor, palette and layout). It ignores the taste notes on purpose.
For a first generation, write three different concepts for the request (for example a visual board, a timeline, a single big answer), not three moods of one design.
Every brief names its own palette (2–3 colours with hex), its type (font families from Google Fonts), its main layout and its one hero element. No two siblings may share a palette, a layout or a hero element.
Avoid skeuomorphic paper, tape, notebook and handwritten looks unless the person asked for them.
Each brief is 2 to 4 plain sentences a builder can act on. Name each child in one or two words that describe its character.
When the person picked a child, you also learn their taste: what the picked child has that its siblings lacked, and what they passed over.
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
    lines.push('This is generation 1: write three different concepts for the request (different metaphors, layouts and palettes), lightly nudged by their taste.')
  } else {
    const picked = new Set(parents.map((p) => p.id))
    const siblings = parents.flatMap((p) => {
      const litter = tree.litters.find((l) => l.id === p.litter)
      return (litter?.children ?? []).filter((id) => !picked.has(id)).map((id) => tree.children[id])
    })
    lines.push(kind === 'breed' ? `They picked ${describe(parents[0])} to breed from.` : `They picked two to cross. Parent 1 (bones): ${describe(parents[0])}. Parent 2 (looks): ${describe(parents[1])}.`)
    if (siblings.length) lines.push(`They passed over: ${siblings.filter(Boolean).map(describe).join(' | ')}`)
    lines.push(kind === 'breed'
      ? 'Write three children of the picked app: the refinement, the bold change and the wild card, as described.'
      : "Write three crosses: 1) parent 1's structure in parent 2's look; 2) parent 2's best idea grafted onto parent 1, in a fresh palette; 3) the wild card, a new concept that merges what each parent does best.")
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
// countPick is false when re-writing briefs a restart lost: the pick was already counted.
export async function writeBriefs({ tree, kind, parents, note, countPick = true }) {
  const tastePath = tastePathFor(tree)
  const taste = await readTaste(tastePath).catch(() => ({ picks: 0, likes: [], avoid: [], learned: '' }))
  try {
    if (config.builder === 'stub') throw new Error('stub mode: no model calls')
    const reply = await askJson({ system: SYSTEM, user: userPrompt({ tree, kind, parents, note, taste }) })
    const briefs = validBriefs(reply)
    if (!briefs) throw new Error('The breeder did not return three briefs.')
    if (kind !== 'first' && countPick) {
      await writeTaste({ picks: taste.picks + 1, likes: reply.likes ?? taste.likes, avoid: reply.avoid ?? taste.avoid, learned: reply.learned }, tastePath)
    }
    return briefs
  } catch (err) {
    console.error('breeder fell back to built-in briefs:', err.message)
    if (kind !== 'first' && countPick) await writeTaste({ ...taste, picks: taste.picks + 1 }, tastePath).catch(() => {})
    return builtIn(kind, note)
  }
}
