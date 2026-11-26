// Keeps the crowd side moving: every couple of hours the agent invents a new crowd family and raises it,
// up to a cap of active crowd families, and never while kids are being built.
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { config } from './config.mjs'
import { listFamilies, newFamilyId } from './store.mjs'
import { startFamily } from './generation.mjs'
import { askJson } from './llm.mjs'

const STATE_PATH = path.join(config.home, '.ft', 'seeder.json')
const CHECK_MS = 5 * 60 * 1000

// Used when the model can't answer: everyday, seasonal, and different from each other.
const BACKUP_IDEAS = [
  'A holiday gift tracker: who I am buying for, my budget for each person, and what I already bought.',
  'A cozy reading log for winter: what I am reading, how far I am, and a streak for reading every night.',
  'A secret Santa organizer for my friends: draw names, set a price limit, and keep wish lists.',
  'A packing list for holiday travel that checks off as I pack and remembers what I forgot last time.',
  'A cookie swap planner: who bakes what, how many dozen, and the recipes everyone wants.',
  'A winter walk tracker: daily steps, the weather each day, and a chart of the coldest walks.',
  'An advent calendar for my family with one small activity to do together each day of December.',
  'A New Year resolutions board where I set three goals and check in on them every week.',
]

const SYSTEM = `You invent the next family for Family Three, a site where AI agents build three different working web apps from one sentence and the crowd votes on which one breeds next.
Write ONE request, the way a regular person would type what they want: one or two plain sentences, concrete, naming what the app tracks or does, like "A tracker for my running: weekly distance, a streak, and my best times."
Rules:
- A small single-screen app that works in a browser and keeps its own data. No logins, no payments, no real-world integrations.
- Fits the moment (the date is given), and is clearly a different kind of app from every existing family listed.
- Wholesome and broadly useful or fun. No brands, real people, medical, legal, financial advice, politics or adult themes.
Answer with JSON only: {"request": "...", "why": "one short sentence on why it fits now"}.`

async function readState() {
  try {
    return JSON.parse(await readFile(STATE_PATH, 'utf8'))
  } catch {
    return {}
  }
}

async function writeState(state) {
  await mkdir(path.dirname(STATE_PATH), { recursive: true })
  await writeFile(STATE_PATH, JSON.stringify(state, null, 2))
}

const firstWords = (text) => text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean).slice(0, 4).join(' ')

async function inventIdea(existing) {
  const taken = new Set(existing.map(firstWords))
  try {
    const today = new Date().toUTCString().slice(0, 16)
    const reply = await askJson({ system: SYSTEM, user: `Today is ${today}.\nExisting families:\n${existing.map((r) => `- ${r}`).join('\n')}\nInvent the next one.` })
    const request = typeof reply.request === 'string' ? reply.request.replace(/\s+/g, ' ').trim() : ''
    if (request.length >= 20 && request.length <= 300 && !taken.has(firstWords(request))) return { request, source: 'agent' }
  } catch (err) {
    console.error('seeder: the model had no idea, using a backup:', err.message)
  }
  const backup = BACKUP_IDEAS.find((idea) => !taken.has(firstWords(idea)))
  return backup ? { request: backup, source: 'backup' } : null
}

// Raises one new crowd family now if the cap allows. Returns what happened, for the owner route and the log.
export async function seedOnce({ force = false } = {}) {
  const state = await readState()
  const all = await listFamilies({ includeArchived: true })
  const active = all.filter((f) => f.crowd && !f.archived)
  if (!force && all.some((f) => f.building)) return { seeded: false, reason: 'kids are being built; trying again later' }
  if (active.length >= config.maxCrowdFamilies) return { seeded: false, reason: `already ${active.length} crowd families (cap ${config.maxCrowdFamilies})` }
  const idea = await inventIdea(all.map((f) => f.request))
  if (!idea) return { seeded: false, reason: 'no fresh idea' }
  const fid = newFamilyId(idea.request)
  await startFamily({ fid, request: idea.request, crowd: true, seeded: true })
  await writeState({ ...state, lastSeedAt: new Date().toISOString(), last: { fid, request: idea.request, source: idea.source } })
  console.log(`seeder: started ${fid} (${idea.source}): ${idea.request}`)
  return { seeded: true, fid, request: idea.request, source: idea.source }
}

// When the next family is due, for the landing's clock (null when seeding is off or the cap is reached).
export async function nextFamilyAt() {
  if (!(config.seedEveryMinutes > 0)) return null
  const active = (await listFamilies()).filter((f) => f.crowd).length
  if (active >= config.maxCrowdFamilies) return null
  const { lastSeedAt } = await readState()
  const due = (lastSeedAt ? Date.parse(lastSeedAt) : Date.now()) + config.seedEveryMinutes * 60 * 1000
  return new Date(Math.max(due, Date.now() + CHECK_MS)).toISOString()
}

export function startSeeder() {
  if (!(config.seedEveryMinutes > 0)) return
  const every = config.seedEveryMinutes * 60 * 1000
  setInterval(async () => {
    try {
      const { lastSeedAt } = await readState()
      if (lastSeedAt && Date.now() - Date.parse(lastSeedAt) < every) return
      const result = await seedOnce()
      if (!result.seeded) console.log(`seeder: skipped (${result.reason})`)
    } catch (err) {
      console.error('seeder failed:', err.message)
    }
  }, CHECK_MS).unref()
}
