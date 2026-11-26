// Telegram: the crowd family's public channel. Each round posts the three kids and live vote buttons;
// a tap is a vote (one per Telegram account). The owner steers from a private chat with the bot.
// All Bot API calls go through the Sprites connector, which puts the token in the URL path.
import { randomBytes } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { config } from './config.mjs'
import { bus } from './events.mjs'
import { listFamilies, readTree, updateTree } from './store.mjs'
import { castVote, setPaused, VoteError } from './votes.mjs'
import { startFamily } from './generation.mjs'
import { seedOnce } from './seeder.mjs'
import { newFamilyId } from './store.mjs'

const EDIT_EVERY_MS = 2000
export const enabled = () => Boolean(config.telegramLive && config.telegramBaseUrl && config.telegramChannel)

async function tg(method, body) {
  const res = await fetch(`${config.telegramBaseUrl}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  })
  const data = await res.json().catch(() => ({}))
  if (!data.ok) throw new Error(`Telegram ${method}: ${data.description ?? res.status}`)
  return data.result
}

let secret = null
export async function webhookSecret() {
  if (secret) return secret
  const file = path.join(config.home, '.ft', 'tg-secret')
  try {
    secret = (await readFile(file, 'utf8')).trim()
  } catch {
    secret = randomBytes(24).toString('base64url')
    await mkdir(path.dirname(file), { recursive: true })
    await writeFile(file, secret, { mode: 0o600 })
  }
  return secret
}

const pageUrl = (fid) => `${config.publicUrl}/f/${fid}`
const thumbUrl = (kid) => `${config.publicUrl}/thumb/${kid.id}.png?v=${encodeURIComponent(kid.finishedAt ?? '')}`

function keyboard(tree) {
  const vote = tree.vote
  const open = vote.status === 'open' && !vote.paused
  const rows = vote.options.map((o, i) => [{
    text: `${o.kind === 'cross' ? '×' : o.label} ${o.name} · ${vote.counts[o.key] ?? 0}`,
    callback_data: open ? `v:${i}` : 'closed',
  }])
  rows.push([{ text: 'Open the tree', url: pageUrl(tree.id) }])
  return { inline_keyboard: rows }
}

function roundText(tree) {
  const vote = tree.vote
  const gen = Math.max(...vote.options.map((o) => tree.children[o.key]?.gen ?? 0))
  const lines = [
    `🌱 Generation ${gen} of “${tree.request}” is here.`,
    '',
    ...vote.options.filter((o) => o.kind === 'breed').map((o) => `${o.label} ${o.name}: ${config.publicUrl}/n/${o.key}/`),
    '',
    `Vote for the one that breeds next. The first vote starts a ${config.roundMinutes}-minute clock; when it runs out, the leader breeds (or sooner, if one gets ${vote.threshold} votes and leads by 2).`,
  ]
  return lines.join('\n')
}

/* ---------- posting ---------- */

async function postRound({ fid }) {
  const tree = await readTree(fid)
  if (!tree?.crowd || !tree.vote || tree.vote.status !== 'open') return
  const kids = tree.vote.options.filter((o) => o.kind === 'breed').map((o) => tree.children[o.key]).filter((k) => k?.thumb)
  if (kids.length) {
    await tg('sendMediaGroup', {
      chat_id: config.telegramChannel,
      media: kids.map((k, i) => ({ type: 'photo', media: thumbUrl(k), caption: i === 0 ? `Gen ${k.gen}: ${kids.map((x) => `${x.label} ${x.name}`).join(' · ')}` : undefined })),
    }).catch((err) => console.error(err.message))
  }
  const msg = await tg('sendMessage', { chat_id: config.telegramChannel, text: roundText(tree), reply_markup: keyboard(tree), link_preview_options: { is_disabled: true } })
  await updateTree(fid, (t) => (t.vote?.round === tree.vote.round ? { ...t, vote: { ...t.vote, tg: { messageId: msg.message_id } } } : t))
}

const lastEdit = new Map()
const pendingEdit = new Map()

async function refreshButtons({ fid }) {
  const wait = (lastEdit.get(fid) ?? 0) + EDIT_EVERY_MS - Date.now()
  if (wait > 0) {
    if (!pendingEdit.has(fid)) pendingEdit.set(fid, setTimeout(() => { pendingEdit.delete(fid); refreshButtons({ fid }) }, wait))
    return
  }
  lastEdit.set(fid, Date.now())
  const tree = await readTree(fid)
  const messageId = tree?.vote?.tg?.messageId
  if (!messageId) return
  await tg('editMessageReplyMarkup', { chat_id: config.telegramChannel, message_id: messageId, reply_markup: keyboard(tree) }).catch((err) => {
    if (!/not modified/i.test(err.message)) console.error(err.message)
  })
}

async function announceWinner({ fid, winner, total, names, autopilot }) {
  const tree = await readTree(fid)
  await refreshButtons({ fid })
  const what = winner.kind === 'cross' ? `Crossing ${names}` : `${winner.label} ${winner.name} wins`
  const text = autopilot
    ? `🤖 Nobody voted for two hours, so I picked. ${autopilot.reason} Three new kids are being born now; vote on them when they arrive.`
    : `🗳 ${what} with ${total} vote${total === 1 ? '' : 's'} this round. Three new kids are being born now; the next vote opens when they arrive.`
  await tg('sendMessage', {
    chat_id: config.telegramChannel,
    text,
    reply_markup: { inline_keyboard: [[{ text: 'Watch them grow', url: pageUrl(tree.id) }]] },
  })
}

/* ---------- incoming updates ---------- */

const isOwner = (user) => config.telegramOwner && user?.username?.toLowerCase() === config.telegramOwner.toLowerCase()

async function crowdFamilyForMessage(messageId) {
  for (const fam of await listFamilies()) {
    if (!fam.crowd) continue
    const tree = await readTree(fam.id)
    if (tree?.vote?.tg?.messageId === messageId) return tree
  }
  return null
}

async function onCallback(q) {
  const answer = (text) => tg('answerCallbackQuery', { callback_query_id: q.id, text, show_alert: false }).catch(() => {})
  const m = /^v:(\d+)$/.exec(q.data ?? '')
  if (!m) return answer('Voting for this round has closed.')
  const tree = await crowdFamilyForMessage(q.message?.message_id)
  const option = tree?.vote?.options[Number(m[1])]
  if (!option) return answer('This round has moved on. Look for the newest post.')
  try {
    await castVote({ fid: tree.id, option: option.key, voterKey: `tg:${q.from.id}`, ipHash: null })
    return answer(`Counted: ${option.kind === 'cross' ? 'cross the top two' : `${option.label} ${option.name}`}`)
  } catch (err) {
    return answer(err instanceof VoteError ? err.message : 'That did not work. Try again in a moment.')
  }
}

async function onOwnerCommand(msg) {
  const reply = (text) => tg('sendMessage', { chat_id: msg.chat.id, text })
  const crowd = (await listFamilies()).filter((f) => f.crowd)
  const text = (msg.text ?? '').trim()
  const cmd = text.split(/\s+/)[0].toLowerCase().replace(/@\w+$/, '')
  const base = (config.publicUrl || '').replace(/\/$/, '')
  if (cmd === '/new') {
    // "/new <sentence>" starts a private family; "/new crowd <sentence>" a crowd family.
    let rest = text.slice(text.indexOf(' ') + 1).trim()
    if (rest === text || !rest) return reply('Send /new followed by one sentence, e.g.\n/new A plant watering tracker: which plant, how often, what is overdue.\nAdd "crowd" first for a crowd family: /new crowd …')
    const crowdFamily = /^crowd\b/i.test(rest)
    if (crowdFamily) rest = rest.replace(/^crowd\b[:\s-]*/i, '')
    const request = rest.replace(/\s+/g, ' ').trim()
    if (request.length < 3 || request.length > 500) return reply('Keep it to one sentence, 3 to 500 characters.')
    if (crowdFamily && crowd.length >= config.maxCrowdFamilies) return reply(`There are already ${crowd.length} crowd families (the cap is ${config.maxCrowdFamilies}). Start it without "crowd", or archive one first.`)
    const fid = newFamilyId(request)
    await startFamily({ fid, request, crowd: crowdFamily })
    return reply(`Started ${crowdFamily ? 'a crowd family' : 'a private family'}: "${request}"\nThree kids are being built; they take a few minutes.${crowdFamily ? ' Its first vote round posts to the channel when they are born.' : ''}\n${base}/f/${fid}`)
  }
  if (cmd === '/seed') {
    const result = await seedOnce({ force: true })
    return reply(result.seeded ? `The agent started a crowd family: "${result.request}"\n${base}/f/${result.fid}` : `No new family: ${result.reason}.`)
  }
  if (cmd === '/pause' || cmd === '/resume') {
    for (const f of crowd) await setPaused(f.id, cmd === '/pause')
    return reply(cmd === '/pause' ? 'Voting paused.' : 'Voting is open again.')
  }
  const lines = await Promise.all(crowd.map(async (f) => {
    const t = await readTree(f.id)
    const v = t.vote
    return `${t.title}: gen ${f.generations}, ${f.apps} apps, vote ${v?.status ?? 'none'}${v?.paused ? ' (paused)' : ''}, ${v?.total ?? 0}/${v?.threshold ?? '?'} votes`
  }))
  const help = '/new <sentence> · /new crowd <sentence> · /seed · /pause · /resume'
  return reply(lines.length ? `Crowd families:\n${lines.join('\n')}\n\n${help}` : `No crowd family yet.\n\n${help}`)
}

export async function handleUpdate(update) {
  if (update.callback_query) return onCallback(update.callback_query)
  const msg = update.message
  if (msg?.chat?.type === 'private') {
    if (isOwner(msg.from)) return onOwnerCommand(msg)
    return tg('sendMessage', { chat_id: msg.chat.id, text: `Hi! Votes happen in ${config.telegramChannel}. Tap a button under the newest post.` })
  }
  return null
}

/* ---------- wiring ---------- */

export async function startTelegram() {
  if (!enabled()) return
  if (config.publicUrl) {
    const s = await webhookSecret()
    await tg('setWebhook', { url: `${config.publicUrl}/tg/${s}`, secret_token: s, allowed_updates: ['message', 'callback_query'] })
      .then(() => console.log('Telegram webhook set'))
      .catch((err) => console.error('Telegram webhook not set:', err.message))
  }
  // Rounds that opened before Telegram was switched on get their post now.
  for (const fam of await listFamilies()) {
    if (!fam.crowd) continue
    const tree = await readTree(fam.id)
    if (tree?.vote?.status === 'open' && !tree.vote.tg?.messageId) await postRound({ fid: fam.id }).catch((err) => console.error('telegram:', err.message))
  }
  const safe = (fn) => (payload) => fn(payload).catch((err) => console.error('telegram:', err.message))
  bus.on('vote-opened', safe(postRound))
  bus.on('vote-counted', safe(refreshButtons))
  bus.on('vote-closed', safe(announceWinner))
}
