// What Family Three has learned about you, kept on the Sprite's disk in ~/taste.md.
import { readFile, writeFile, rename } from 'node:fs/promises'
import { config } from './config.mjs'

const EMPTY = Object.freeze({ picks: 0, likes: [], avoid: [], learned: '' })
const MAX_ITEMS = 8

function section(md, title) {
  const m = new RegExp(`## ${title}\\n([\\s\\S]*?)(?=\\n## |$)`).exec(md)
  if (!m) return []
  return m[1]
    .split('\n')
    .map((l) => l.replace(/^[-*]\s*/, '').trim())
    .filter(Boolean)
}

export async function readTaste() {
  let md
  try {
    md = await readFile(config.tastePath, 'utf8')
  } catch (err) {
    if (err.code === 'ENOENT') return EMPTY
    throw err
  }
  const picks = Number(/Picks:\s*(\d+)/.exec(md)?.[1] ?? 0)
  const learned = section(md, 'Last thing learned')[0] ?? ''
  return { picks, likes: section(md, 'Likes'), avoid: section(md, 'Avoid'), learned }
}

function clean(list) {
  const seen = new Set()
  return (Array.isArray(list) ? list : [])
    .map((s) => String(s).replace(/\s+/g, ' ').trim().slice(0, 40))
    .filter((s) => s && !seen.has(s.toLowerCase()) && seen.add(s.toLowerCase()))
    .slice(0, MAX_ITEMS)
}

export async function writeTaste(taste) {
  const next = {
    picks: taste.picks,
    likes: clean(taste.likes),
    avoid: clean(taste.avoid),
    learned: String(taste.learned ?? '').replace(/\s+/g, ' ').trim().slice(0, 200),
  }
  const md = [
    '# Your taste',
    '',
    'Family Three keeps this from your picks. Every new family starts from it. Edit it freely.',
    '',
    `Picks: ${next.picks}`,
    '',
    '## Likes',
    ...next.likes.map((s) => `- ${s}`),
    '',
    '## Avoid',
    ...next.avoid.map((s) => `- ${s}`),
    '',
    '## Last thing learned',
    next.learned ? `- ${next.learned}` : '',
    '',
  ].join('\n')
  const tmp = `${config.tastePath}.${process.pid}.tmp`
  await writeFile(tmp, md)
  await rename(tmp, config.tastePath)
  return next
}

export function tasteText(taste) {
  if (!taste.picks && !taste.likes.length) return 'Nothing yet: this is their first family.'
  return [
    `From ${taste.picks} picks so far.`,
    taste.likes.length ? `They like: ${taste.likes.join(', ')}.` : '',
    taste.avoid.length ? `They avoid: ${taste.avoid.join(', ')}.` : '',
  ]
    .filter(Boolean)
    .join(' ')
}
