// The crowd vote panel: the current options with live tallies, progress to the threshold, and Vote buttons.

function statusLine(vote) {
  if (!vote) return 'Voting opens when the first kids are born.'
  if (vote.paused) return 'Voting is paused for a moment.'
  if (vote.restingUntil && Date.parse(vote.restingUntil) > Date.now()) return 'The greenhouse is resting. Voting reopens within the hour.'
  if (vote.status === 'breeding') return vote.autopilot ? `Nobody voted, so the agent picked: ${vote.autopilot.reason} New kids are being born.` : 'The crowd picked. New kids are being born; voting reopens when they arrive.'
  const ranked = vote.options.map((o) => ({ ...o, n: vote.counts[o.key] ?? 0 })).sort((a, b) => b.n - a.n)
  const [top, second] = ranked
  const lead = top ? top.n - (second?.n ?? 0) : 0
  if (!vote.total) {
    const left = vote.autopilotAt ? Math.max(0, Date.parse(vote.autopilotAt) - Date.now()) : 0
    const auto = left ? ` If nobody votes, the agent picks in ${Math.floor(left / 3600000)}h ${String(Math.floor((left % 3600000) / 60000)).padStart(2, '0')}m.` : ''
    return `The first vote starts a 15-minute clock; when it runs out, the leader breeds.${auto}`
  }
  const leader = top.label === '×' ? 'Cross' : top.label
  const left = vote.closesAt ? Math.max(0, Date.parse(vote.closesAt) - Date.now()) : 0
  const clock = left ? `Closes in ${Math.floor(left / 60000)}:${String(Math.floor((left % 60000) / 1000)).padStart(2, '0')}` : 'Closing now'
  return `${leader} leads with ${top.n}${lead ? `, ${lead} ahead` : ' (tied)'}. ${clock}, then the leader breeds.`
}

// One readable line from a kid's brief: what makes it different. Briefs are written for builders,
// so drop colour codes and asides, and keep the idea up to the first comma after the colon.
function whatsDifferent(kid) {
  let line = (String(kid?.brief ?? '').split(/(?<=[.!?])\s/)[0] ?? '')
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/\s*#[0-9a-f]{3,8}\b/gi, '')
    .replace(/\s+([,.;:])/g, '$1')
    .trim()
  const colon = line.indexOf(':')
  if (colon > 0) {
    const comma = line.indexOf(',', colon)
    if (comma > 0) line = line.slice(0, comma)
  }
  line = line.replace(/[,;:\s]+$/, '')
  if (line.length > 125) line = `${line.slice(0, 122).replace(/\s+\S*$/, '')}…`
  return /[.!?…]$/.test(line) ? line : `${line}.`
}

// The landing's ballot: one big card per option, so you see exactly what you vote for.
function ballotCard({ o, kid, n, pct, picked, open, mine, pair, thumb, esc }) {
  const cross = o.kind === 'cross'
  const title = cross ? 'Cross the top two' : `<b>${esc(o.label)}</b> ${esc(o.name)}`
  const what = cross
    ? (pair.length === 2 ? `Right now that is ${esc(pair[0].label)} ${esc(pair[0].name)} × ${esc(pair[1].label)} ${esc(pair[1].name)}: one gives the layout, the other the look.` : 'The two leaders get mixed into three new kids.')
    : esc(whatsDifferent(kid))
  const shot = cross
    ? `<span class="vc-shot vc-pair">${pair.map((k) => `<span>${thumb(k)}</span>`).join('')}<i aria-hidden="true"><svg viewBox="0 0 12 12"><path d="M3 3l6 6M9 3l-6 6"/></svg></i></span>`
    : `<a class="vc-shot" href="/n/${esc(kid.id)}/" target="_blank" rel="noopener" aria-label="Open ${esc(o.label)} ${esc(o.name)} in a new tab">${thumb(kid)}<span class="vc-open">Open the app ↗</span></a>`
  const label = picked ? 'Your vote' : cross ? 'Vote to cross' : `Vote for ${esc(o.name)}`
  return `
    <div class="vc${picked ? ' mine' : ''}${cross ? ' cross' : ''}">
      ${shot}
      ${picked ? '<span class="vc-badge">Your vote</span>' : ''}
      <div class="vc-body">
        <span class="vc-name">${title}</span>
        <p class="vc-what">${what}</p>
        <span class="vo-bar"><span style="width:${pct}%"></span></span>
        <div class="vc-foot">
          <span class="vc-count">${n} vote${n === 1 ? '' : 's'}</span>
          <button class="btn ${cross ? 'btn-outline-x' : 'btn-lime'} vo-btn" type="button" data-vote="${esc(o.key)}" ${open && !mine ? '' : 'disabled'}>${label}</button>
        </div>
      </div>
    </div>`
}

export function voteHtml({ tree, esc, owner = false, compact = false }) {
  const vote = tree.vote
  const open = vote?.status === 'open' && !vote.paused && !(vote.restingUntil && Date.parse(vote.restingUntil) > Date.now())
  const max = Math.max(vote?.threshold ?? 1, ...Object.values(vote?.counts ?? {}))
  const mine = tree.myVote
  const mineOpt = (vote?.options ?? []).find((o) => o.key === mine)
  const mineName = mineOpt ? (mineOpt.kind === 'cross' ? 'crossing the top two' : `${mineOpt.label} ${mineOpt.name}`) : ''
  const thumb = (kid) => (kid?.thumb ? `<img src="/thumb/${esc(kid.id)}.png?v=${encodeURIComponent(kid.finishedAt ?? '')}" alt="">` : '')
  // The two kids a cross would use right now: the two leading single options (ties go to the earlier one).
  const pair = (vote?.options ?? [])
    .map((o, i) => ({ ...o, n: vote.counts[o.key] ?? 0, i }))
    .filter((o) => o.kind === 'breed')
    .sort((a, b) => b.n - a.n || a.i - b.i)
    .slice(0, 2)
    .map((o) => tree.children[o.key])
    .filter(Boolean)
  const options = (vote?.options ?? [])
    .map((o) => {
      const kid = tree.children[o.key]
      const n = vote.counts[o.key] ?? 0
      const pct = Math.round((n / max) * 100)
      const picked = mine === o.key
      const shot = o.kind === 'cross'
        ? `<span class="vo-pair">${pair.map((k) => `<span>${thumb(k)}</span>`).join('<b aria-hidden="true">×</b>')}</span>`
        : thumb(kid)
      const name = o.kind === 'cross' && pair.length === 2 ? `Cross the top two <span class="vo-sub">right now ${esc(pair[0].label)} × ${esc(pair[1].label)}</span>` : esc(o.name)
      if (compact) return ballotCard({ o, kid, n, pct, picked, open, mine, pair, thumb, esc })
      return `
        <div class="vo${picked ? ' mine' : ''}${o.kind === 'cross' ? ' cross' : ''}">
          <span class="vo-shot">${shot}</span>
          <span class="vo-body">
            <span class="vo-name">${o.kind === 'cross' ? '' : `<b>${esc(o.label)}</b> `}${name}</span>
            <span class="vo-bar"><span style="width:${pct}%"></span></span>
            <span class="vo-count">${n} vote${n === 1 ? '' : 's'}${picked ? ' · yours' : ''}</span>
          </span>
          ${kid ? `<a class="vo-open" href="/n/${esc(kid.id)}/" target="_blank" rel="noopener" aria-label="Open ${esc(o.label)} ${esc(o.name)}">Open</a>` : ''}
          <button class="btn ${o.kind === 'cross' ? 'btn-outline-x' : 'btn-lime'} vo-btn" type="button" data-vote="${esc(o.key)}" ${open && !mine ? '' : 'disabled'}>${picked ? 'Voted' : 'Vote'}</button>
        </div>`
    })
    .join('')
  return `
    <section class="vote-panel${compact ? ' compact' : ''}" aria-label="Crowd vote">
      <div class="vote-head">
        ${compact ? '' : '<span class="mono-label">The crowd decides</span>'}
        <span class="vote-total">${vote?.total ?? 0} vote${vote?.total === 1 ? '' : 's'} this round</span>
      </div>
      <p class="vote-status">${esc(statusLine(vote))}</p>
      <div class="vote-options">${options}</div>
      <p class="muted small vote-rule">${mine ? `Thanks. You voted for ${esc(mineName)} this round.` : 'No account needed. One vote per round.'}</p>
      <p class="error vote-error" hidden></p>
      ${owner && vote ? `<div class="vote-owner">
        ${vote.status === 'open' && vote.total ? '<button class="btn btn-ghost" type="button" data-close-round>Breed the leader now</button>' : ''}
        <button class="linkish" type="button" data-pause="${vote.paused ? '0' : '1'}">${vote.paused ? 'Resume voting' : 'Pause voting'}</button>
      </div>` : ''}
    </section>`
}

export function wireVote(root, { api, fid, onChange }) {
  root.querySelectorAll('[data-vote]').forEach((btn) =>
    btn.addEventListener('click', async () => {
      const panel = btn.closest('.vote-panel')
      const error = panel.querySelector('.vote-error')
      panel.querySelectorAll('[data-vote]').forEach((b) => (b.disabled = true))
      btn.textContent = 'Voting…'
      try {
        await api('/api/vote', { method: 'POST', body: JSON.stringify({ family: fid, option: btn.dataset.vote }) })
      } catch (err) {
        error.textContent = err.message
        error.hidden = false
      }
      onChange()
    }),
  )
  root.querySelector('[data-close-round]')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget
    btn.disabled = true
    btn.textContent = 'Closing the round…'
    try {
      await api('/api/vote/close', { method: 'POST', body: JSON.stringify({ family: fid }) })
    } catch (err) {
      btn.textContent = err.message
    }
    onChange()
  })
  root.querySelector('[data-pause]')?.addEventListener('click', async (e) => {
    await api('/api/vote/pause', { method: 'POST', body: JSON.stringify({ family: fid, paused: e.currentTarget.dataset.pause === '1' }) }).catch(() => {})
    onChange()
  })
}
