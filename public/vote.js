// The crowd vote panel: the current options with live tallies, progress to the threshold, and Vote buttons.

function statusLine(vote) {
  if (!vote) return 'Voting opens when the first kids are born.'
  if (vote.paused) return 'Voting is paused for a moment.'
  if (vote.restingUntil && Date.parse(vote.restingUntil) > Date.now()) return 'The greenhouse is resting. Voting reopens within the hour.'
  if (vote.status === 'breeding') return 'The crowd picked. New kids are being born; voting reopens when they arrive.'
  const ranked = vote.options.map((o) => ({ ...o, n: vote.counts[o.key] ?? 0 })).sort((a, b) => b.n - a.n)
  const [top, second] = ranked
  const lead = top ? top.n - (second?.n ?? 0) : 0
  const need = Math.max(0, vote.threshold - (top?.n ?? 0))
  if (!vote.total) return `First option to ${vote.threshold} votes (and 2 ahead) breeds.`
  return `${top.label === '×' ? 'Cross' : top.label} leads with ${top.n}${lead ? `, ${lead} ahead` : ' (tied)'}. ${need ? `${need} more to breed.` : 'Needs a 2-vote lead.'}`
}

export function voteHtml({ tree, esc, owner = false, compact = false }) {
  const vote = tree.vote
  const open = vote?.status === 'open' && !vote.paused && !(vote.restingUntil && Date.parse(vote.restingUntil) > Date.now())
  const max = Math.max(vote?.threshold ?? 1, ...Object.values(vote?.counts ?? {}))
  const mine = tree.myVote
  const options = (vote?.options ?? [])
    .map((o) => {
      const kid = tree.children[o.key]
      const n = vote.counts[o.key] ?? 0
      const pct = Math.round((n / max) * 100)
      const picked = mine === o.key
      const shot = kid?.thumb ? `<img src="/thumb/${esc(kid.id)}.png?v=${encodeURIComponent(kid.finishedAt ?? '')}" alt="">` : `<span class="vo-x">×</span>`
      return `
        <div class="vo${picked ? ' mine' : ''}${o.kind === 'cross' ? ' cross' : ''}">
          <span class="vo-shot">${shot}</span>
          <span class="vo-body">
            <span class="vo-name"><b>${esc(o.label)}</b> ${esc(o.name)}</span>
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
        <span class="mono-label">The crowd decides</span>
        <span class="vote-total">${vote?.total ?? 0} vote${vote?.total === 1 ? '' : 's'} this round</span>
      </div>
      <p class="vote-status">${esc(statusLine(vote))}</p>
      <div class="vote-options">${options}</div>
      <p class="muted small vote-rule">${mine ? 'Thanks. Your vote is in for this round.' : 'No account needed. One vote per round.'}</p>
      <p class="error vote-error" hidden></p>
      ${owner && vote ? `<button class="linkish" type="button" data-pause="${vote.paused ? '0' : '1'}">${vote.paused ? 'Resume voting' : 'Pause voting'}</button>` : ''}
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
  root.querySelector('[data-pause]')?.addEventListener('click', async (e) => {
    await api('/api/vote/pause', { method: 'POST', body: JSON.stringify({ family: fid, paused: e.currentTarget.dataset.pause === '1' }) }).catch(() => {})
    onChange()
  })
}
