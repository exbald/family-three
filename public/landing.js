// The visitor home page: what this is, how it works, what you leave with, how it runs, and how to raise your own.
export const INSTALL = 'curl -fsSL https://raw.githubusercontent.com/exbald/family-three/main/scripts/install.sh | bash'
const REPO = 'https://github.com/exbald/family-three'

const STEPS = [
  ['Ask', 'One sentence, like "a tracker for my running". No spec, no settings.'],
  ['Three are born', 'Three Claude Code builders work at once, each on a different brief: one changes the layout, one the mood, one adds a feature. A few minutes later you have three apps to click through.'],
  ['Pick', 'Breed from the one you like, or cross two: one gives the structure, the other the look. Every pick teaches it your taste, and the next family starts from there.'],
  ['Adopt', 'The keeper gets a public link, its own GitHub repo where each commit is one ancestor, and a design kit you can reuse anywhere.'],
]

const OUTCOMES = [
  ['An app you picked', 'It runs on its own link and works on your phone. You chose it from things you could click, so you never had to describe it.'],
  ['A repo with its family line', 'Each ancestor is one commit with the brief its builder got. A cross is a merge commit with two parents.'],
  ['A design kit', 'DESIGN.md and tokens.css, taken from the app you adopted. Drop them into your next project and tell Claude Code or Cursor to build in that style.'],
  ['Taste that carries over', 'After a few picks it knows you like, say, dense dark screens and big numbers. Your next family starts there.'],
]

const UNDER_THE_HOOD = [
  'One Sprite runs everything: a plain Node server, the family pages and every child app.',
  'Three headless Claude Code builders run at once, each in its own folder. They reach the model through a Sprites connector, so the model key never sits on the Sprite.',
  'Adopt goes through a GitHub connector that can only create repos and write to family-three-* repos.',
  'Headless Chrome opens every new app. If it throws an error, the same builder gets one round to fix it before anyone sees it.',
  'The Sprite saves a checkpoint after every generation. Restore rewinds the whole computer in about eight seconds.',
  'The crowd family has no owner at the wheel. Votes come from the web (one per browser) and from Telegram buttons (one per account). Plain code counts them, and when one kid has enough votes and a lead of two, it breeds by itself.',
  'Telegram goes through the same kind of connector, so the bot token never sits on the Sprite either.',
]

// One tab per crowd family, so a visitor can hop between them and vote in each.
export function crowdTabsHtml(crowds, selectedId, esc) {
  if (crowds.length < 2) return ''
  return `<div class="lp-crowd-tabs" role="tablist" aria-label="Crowd families">${crowds.map((f) => {
    const thumb = f.preview?.[0]?.id ? `<img src="/thumb/${esc(f.preview[0].id)}.png" alt="" loading="eager">` : '<span class="lp-crowd-tab-blank"></span>'
    const open = f.vote?.status === 'open'
    return `<button type="button" role="tab" class="lp-crowd-tab" data-crowd="${esc(f.id)}" aria-selected="${f.id === selectedId}">${thumb}<span class="lp-crowd-tab-text"><strong>${esc(f.title || f.request)}</strong><small>${f.building ? 'kids being born' : open ? `vote open · ${f.vote.total ?? 0} so far` : `${f.apps} apps`}</small></span></button>`
  }).join('')}</div>`
}

export function crowdIntroHtml(crowd, esc) {
  return `<p class="lp-crowd-request">Started from “${esc(crowd.request)}” · <a href="/f/${esc(crowd.id)}" data-link>see its whole tree</a></p>`
}

export function landingHtml({ featured, families, esc, crowd = null, crowds = [], telegram = '' }) {
  const card = featured
    ? `<a class="lp-card" href="/f/${esc(featured.id)}" data-link aria-label="Open the family ${esc(featured.title)}"><img onerror="this.closest('.lp-card').remove()" src="/card/${esc(featured.id)}.png" alt="Family tree for ${esc(featured.title)}: ${featured.generations} generations, ${featured.apps} live apps"></a>`
    : ''
  return `
    <article class="landing">
      <section class="lp-hero">
        <div class="lp-hero-text">
          <p class="lp-kicker">A personal agent on a Fly.io Sprite</p>
          <h1>Apps you raise, not prompt.</h1>
          <p class="lp-sub">Say what you want. Three working apps come back, each on its own link. Pick the one you like and it breeds three more. Cross two to mix them. When one is right, adopt it.</p>
          <div class="lp-ctas">
            ${crowd ? '<a class="btn btn-orange" href="#crowd-title">Vote on the next kid</a>' : ''}
            ${featured ? `<a class="btn ${crowd ? 'btn-ghost' : 'btn-lime'}" href="/f/${esc(featured.id)}" data-link>See a real family</a>` : ''}
            ${crowd ? '' : '<a class="btn btn-ghost" href="#install">Raise your own</a>'}
          </div>
          <p class="muted lp-note">${crowd
            ? 'Vote for the kid that breeds next in the crowd\'s family. No account needed. To raise apps of your own, <a href="#install">install it on your Sprite</a>.'
            : 'This Sprite belongs to one person, so you can look around but not raise here. Every app on the tree is live.'}</p>
        </div>
        ${card}
      </section>

      <p class="lp-why">Most people can't describe the app they want. They know it when they see it. So Family Three shows you three and lets you choose.</p>

      ${crowd ? `
      <section class="lp-section lp-crowd" aria-labelledby="crowd-title">
        <div class="lp-crowd-head">
          <div>
            <p class="lp-kicker">Live now · raised by whoever shows up</p>
            <h2 id="crowd-title">Pick the next kid</h2>
            <p>${crowds.length > 1 ? `${crowds.length} families are raised by whoever shows up. Pick one, open its kids, and vote` : 'Open the kids and vote'} for the one that breeds next. When the clock runs out, three new kids are born from the winner a few minutes later.</p>
          </div>
          <div class="lp-ctas">
            ${telegram ? `<a class="btn btn-ghost" href="https://t.me/${esc(telegram.replace(/^@/, ''))}" target="_blank" rel="noopener">Watch it on Telegram</a>` : ''}
          </div>
        </div>
        ${crowdTabsHtml(crowds, crowd.id, esc)}
        <div id="crowd-intro">${crowdIntroHtml(crowd, esc)}</div>
        <div id="crowd-vote"></div>
      </section>` : ''}

      <section class="lp-section" aria-labelledby="how">
        <h2 id="how">How it works</h2>
        <ol class="lp-steps">${STEPS.map(([t, d], i) => `<li><span class="lp-num">${i + 1}</span><h3>${esc(t)}</h3><p>${esc(d)}</p></li>`).join('')}</ol>
      </section>

      <section class="lp-section" aria-labelledby="leave">
        <h2 id="leave">What you leave with</h2>
        <div class="lp-grid">${OUTCOMES.map(([t, d]) => `<div class="lp-item"><h3>${esc(t)}</h3><p>${esc(d)}</p></div>`).join('')}</div>
      </section>

      ${families.length ? `<section class="lp-section" aria-labelledby="families-title"><h2 id="families-title">Families on this Sprite</h2><div id="families"></div></section>` : ''}

      <section class="lp-section" aria-labelledby="runs">
        <h2 id="runs">How it runs</h2>
        <ul class="lp-hood">${UNDER_THE_HOOD.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
      </section>

      <section class="lp-section" id="install" aria-labelledby="own">
        <h2 id="own">Raise your own</h2>
        <p class="lp-lede">You need a Fly.io Sprite where Claude Code works, either logged in or pointed at a model through a connector.</p>
        <ol class="lp-install">
          <li>Make a Sprite and open it: <code>sprite create my-family</code>, then <code>sprite console</code>.</li>
          <li>Run the installer:
            <div class="install-row"><code>${esc(INSTALL)}</code><button class="btn btn-lime" type="button" data-copy-install>Copy</button></div>
          </li>
          <li>Open the link it prints, once, to unlock your browser. Then ask for your first app.</li>
        </ol>
        <p class="muted">Want Adopt to make GitHub repos? Add a GitHub connector for your Sprites in the Fly dashboard first. The installer finds it.</p>
      </section>

      <footer class="lp-foot">Built in a week for Fly.io's Hacksgiving 2026. <a href="${REPO}" target="_blank" rel="noopener">The code is on GitHub.</a></footer>
    </article>`
}
