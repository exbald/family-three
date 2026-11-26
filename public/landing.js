// The visitor home page: one real family read top to bottom, ending at its open vote,
// then the other crowd families, what you take home, how it runs, and how to raise your own.
import { heroTreeHtml, lineageRowsHtml, adoptionRowHtml } from './lineage.js'
import { familyCardsHtml } from './dashboard.js'

export const INSTALL = 'curl -fsSL https://raw.githubusercontent.com/exbald/family-three/main/scripts/install.sh | bash'
const REPO = 'https://github.com/exbald/family-three'
export const AGENT_LINE = 'Build this in the style of DESIGN.md: use tokens.css for every colour, font, space and radius.'

const UNDER_THE_HOOD = [
  ['One Sprite', 'A plain Node server, every family page and every kid app run on one Fly.io Sprite. It sleeps when nobody is around and saves a checkpoint after each generation.'],
  ['Three builders at once', 'Each kid is built by its own coding agent (Claude Code running GLM through the Z.ai connector) in its own folder, with its own brief from the agent. Headless Chrome opens every new app, and a builder gets one round to fix an error before anyone sees it.'],
  ['Keys stay off the Sprite', 'The model, GitHub and Telegram are reached through Sprites connectors, limited to Sprites named ft-. The Sprite never holds their keys. The one key it holds is for growing apps up, and Fly scopes it to Sprites named ft-app-.'],
  ['Grown-up apps move out', 'Grow it up gives an adopted app its own Sprite in Family Three\'s own Fly org. The agent adds a Node server and a SQLite database, tests a full round trip, moves the app in and checks it in a browser.'],
  ['The crowd, counted by plain code', 'One vote per browser per round on the web, one per account on Telegram. The first vote starts a 15-minute clock and the leader breeds. With no votes the agent picks, at most twice in a row.'],
  ['New families on a clock', 'Every two hours the agent invents a new crowd family, different from the others and right for the season, and raises it. It stops at ten active crowd families and never starts one while kids are being built.'],
]

function telegramUrl(telegram) {
  return telegram ? `https://t.me/${telegram.replace(/^@/, '')}` : ''
}

// Before the family loads: the same tree, drawn empty, so the first screen is never blank.
const TREE_OUTLINE = `
    <div class="ln-tree ln-hero-tree is-loading" aria-hidden="true">
      <span class="ln-request">&nbsp;</span>
      <div class="ln-connect"><svg class="ln-connector is-kept" viewBox="0 0 300 64" preserveAspectRatio="none"><path d="M150 0 V50 M50 50 H250 M50 50 V64 M150 50 V64 M250 50 V64"/></svg></div>
      <div class="ln-kids">${'<span class="ln-kid"><span class="ln-shot"></span><span class="ln-name">&nbsp;</span></span>'.repeat(3)}</div>
    </div>`

// What happens next, as a ticking line under the Vote button. app.js fills in the time every second.
function clockHtml(tree, nextGen, nextFamilyAt, esc) {
  const v = tree?.vote
  let main = ''
  if (v?.status === 'breeding') main = `<span class="lp2-clock-dot is-busy"></span><span>New kids are being born right now</span>`
  else if (v?.status === 'open' && v.total && v.closesAt) main = `<span class="lp2-clock-dot"></span><span>Generation ${nextGen} breeds in <b data-countdown="${esc(v.closesAt)}">…</b></span>`
  else if (v?.status === 'open') main = `<span class="lp2-clock-dot"></span><span>No votes yet: the first vote starts a 15-minute clock${v.autopilotAt ? `, or the agent picks in <b data-countdown="${esc(v.autopilotAt)}">…</b>` : ''}</span>`
  const seed = nextFamilyAt ? `<span class="lp2-clock-next">Next new family in <b data-countdown="${esc(nextFamilyAt)}">…</b></span>` : ''
  return main || seed ? `<div class="lp2-clock" role="status">${main ? `<span class="lp2-clock-main">${main}</span>` : ''}${seed}</div>` : ''
}

function heroHtml({ tree, esc, telegram, nextGen, nextFamilyAt, families = [] }) {
  const tg = telegramUrl(telegram)
  const gen = nextGen ? `generation ${nextGen}` : 'the next generation'
  const Gen = nextGen ? `Generation ${nextGen}` : 'Its next generation'
  return `
    <section class="lp2-hero ln-row" aria-labelledby="lp2-title" data-reveal>
      <div class="ln-text lp2-hero-text">
        <h1 id="lp2-title">Apps you raise, not prompt.</h1>
        <p class="lp2-lede">You say what you want in one sentence. Three AI coding agents on a Fly.io Sprite each build a different working app. Pick the one you like and it breeds three more; cross two and it mixes them.</p>
        <p class="lp2-lede lp2-lede-2">This page is one real family, as it happened${families.length > 1 ? `, and one of <a href="/families" data-link>${families.length} families</a> on this Sprite` : ''}. ${Gen} is up for a vote right now, and anyone can vote.</p>
        <div class="lp-ctas">
          <a class="btn btn-orange" href="#vote">Vote on ${gen}</a>
          ${tg ? `<a class="btn btn-ghost" href="${esc(tg)}" target="_blank" rel="noopener"><span class="lp2-long">Watch it on Telegram</span><span class="lp2-short">Telegram</span></a>` : ''}
        </div>
        ${clockHtml(tree, nextGen, nextFamilyAt, esc)}
        <button class="lp2-film-btn" type="button" data-film><span class="lp2-film-thumb"><img src="/family-three-film.jpg" alt="" width="96" height="54"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg></span><span><strong>Watch the 1-minute film</strong><small>64 seconds, with sound</small></span></button>
      </div>
      ${tree ? heroTreeHtml(tree, esc) : TREE_OUTLINE}
    </section>`
}

function voteSectionHtml({ tree, esc, telegram, nextGen }) {
  const tg = telegramUrl(telegram)
  return `
    <section class="ln-row lp2-vote" id="vote" aria-labelledby="vote-title">
      <div class="ln-text">
        <h2 id="vote-title">Pick who breeds generation ${nextGen}</h2>
        <p>Open the kids, then vote for one, or for crossing the top two. No account. The first vote starts a 15-minute clock; when it runs out, the leader breeds and three new apps are born a few minutes later.</p>
        ${tg ? `<p>Or vote with one tap in the Telegram channel, where every new generation is posted.</p><a class="btn btn-ghost" href="${esc(tg)}" target="_blank" rel="noopener">Open the Telegram channel</a>` : ''}
      </div>
      <div id="crowd-vote" class="lp2-vote-panel" data-family="${esc(tree.id)}"></div>
    </section>`
}

function takeHomeHtml(esc) {
  return `
    <section class="lp2-take" id="take-home" aria-labelledby="take-title">
      <h2 id="take-title">What you take home</h2>
      <div class="lp2-take-grid">
        <div class="lp2-take-kit">
          <h3>The look of any kid, as a design kit</h3>
          <p>Every finished app here has a Get its design kit button, for anyone. The agent reads the app's CSS and writes DESIGN.md, tokens.css, tokens.json and a preview page. Drop them into your project and give your coding agent one line:</p>
          <div class="urlrow"><span class="mono">${esc(AGENT_LINE)}</span><button class="linkish lime" type="button" data-copy-agent-line>Copy</button></div>
        </div>
        <div class="lp2-take-side">
          <div>
            <h3>An adopted app, as a template</h3>
            <p>Adopted apps live in public GitHub repos marked as templates. Fork one as the start of your own, with its family line in the history. The owner can also grow one up: it moves onto its own Fly.io Sprite with a Node server and a SQLite database, and the server code lands in the repo too.</p>
          </div>
          <div>
            <h3>A family of your own</h3>
            <p>Install Family Three on your own Sprite and raise apps from your own sentences. It learns your taste as you pick. <a href="#install">How to install</a></p>
          </div>
        </div>
      </div>
    </section>`
}

export function landingHtml({ tree, families, esc, crowds = [], telegram = '', nextFamilyAt = null, loading = false }) {
  const nextGen = tree ? tree.litters.length + 1 : null
  return `
    <article class="landing lp2">
      ${tree || loading ? heroHtml({ tree, esc, telegram, nextGen, nextFamilyAt, families }) : ''}
      ${tree ? `<div class="ln-spine">${lineageRowsHtml(tree, esc, { from: 1 })}${adoptionRowHtml(tree, esc)}</div>` : ''}
      ${tree?.crowd ? voteSectionHtml({ tree, esc, telegram, nextGen }) : loading ? '<section id="vote" class="lp2-vote-pending" aria-hidden="true"></section>' : ''}

      ${families.length > 1 ? `
      <section class="lp2-others" id="all-families" aria-labelledby="others-title">
        <div class="lp2-others-head">
          <div>
            <h2 id="others-title">${families.length} families, each from one sentence</h2>
            <p>Thanksgiving was only the start. Open any family to walk its tree, try every app and vote on the next kid. The agent starts a new crowd family every couple of hours.</p>
          </div>
          <a class="btn btn-lime" href="/families" data-link>See every family</a>
        </div>
        ${familyCardsHtml(families.filter((f) => f.id !== tree?.id).slice(0, 6), esc)}
      </section>` : ''}

      ${takeHomeHtml(esc)}

      <section class="lp2-runs" aria-labelledby="runs">
        <h2 id="runs">How it runs on Fly.io</h2>
        <dl class="lp2-hood">${UNDER_THE_HOOD.map(([t, d]) => `<div><dt>${esc(t)}</dt><dd>${esc(d)}</dd></div>`).join('')}</dl>
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
        <p class="muted">Want Adopt to make GitHub repos? Add a GitHub connector for your Sprites in the Fly dashboard first. Have Ollama credits? Add an Ollama connector too, and the breeder falls back to Ollama Cloud when the main model is busy. The installer finds both.</p>
      </section>

      <dialog class="lp2-film" aria-label="The Family Three film">
        <video src="/family-three-film.mp4" poster="/family-three-film.jpg" controls playsinline preload="none"></video>
        <button class="lp2-film-close" type="button" data-film-close aria-label="Close the film"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
      </dialog>

      <footer class="lp-foot">Built in a week for Fly.io's Hacksgiving 2026. <a href="${REPO}" target="_blank" rel="noopener">The code is on GitHub.</a></footer>
    </article>`
}
