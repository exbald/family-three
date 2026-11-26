# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
- **First: Hacksgiving judges** (Fly.io's hackathon, deadline Nov 29, 2026). They arrive from the submission form or a post and give it seconds. They need to get what it is, see real apps it made, and see that it really runs on a Fly.io Sprite with Sprites connectors.
- **Then: people from the launch posts** on X, Bluesky and LinkedIn. They come to look and to vote, with no account.
- **Then: builders** who might install Family Three on their own Sprite with the one-line installer.

## Product Purpose
Family Three is a personal agent on a Fly.io Sprite that raises apps instead of taking prompts. You ask once in one sentence. Three Claude Code builders on the Sprite each build a different working app at the same time, each on its own link. You breed the one you like (three more, varied from it) or cross two, and the agent learns your taste as you pick. When one is right you adopt it. Success: a person who can't describe the app they want ends up with one they chose, plus its look as a reusable kit.

## Positioning
Apps you raise, not prompt. People can't describe the app they want, but they know it when they see it, so Family Three shows three real, running apps and lets you choose, instead of a chat where you rewrite the prompt. Every kid is a live app; every family is a tree you can walk; a cross is a real merge commit in the adopted repo.

## Operating Context
- Runs on one Fly.io Sprite (`ft-family` in its own Fly org `family-three`, https://ft-family-b6ykp.sprites.app, public). Builders are headless Claude Code (GLM models via the Z.ai connector).
- Crowd families: anyone votes on which kid breeds next, on the web (no account, one vote per round per browser) or with buttons in the public Telegram channel t.me/familythreecrowd. The first vote starts a 15-minute clock; the leader breeds by itself. With no votes the agent picks after 2 hours, at most twice in a row.
- Current crowd families (Nov 26): Thanksgiving dinner for 8 (3 generations, the showcase), Thanksgiving leftovers, Black Friday wishlist, a family gratitude wall, a kids'-table game.
- The owner (Nik) raises private families, adopts, and makes kits; visitors look, vote and get kits.

## Capabilities and Constraints
- Ask → 3 kids per generation, built at once; breed one; cross two; family tree; taste file per family; checkpoints and restore; browser check that repairs or rescues a kid.
- Adopt (owner only): public link `/a/<slug>`, GitHub repo whose commits are the family line (a cross is a merge commit), GitHub Pages, and the design kit committed under `design/`.
- Grow it up (owner only, adopted apps): the app moves onto its own Sprite `ft-app-<name>` with a Node server and a SQLite database, so data is shared and saved; server code goes to the repo under `grown-up/`.
- Design kit (anyone can get one per kid): DESIGN.md, tokens.css, tokens.json and a design.html preview, as a zip. The agent writes it from the app's CSS in about two minutes.
- Takeaway for visitors: the kit, plus adopted apps forkable as GitHub template repos (template flag: planned, not yet set on the repos).
- Install your own: `curl -fsSL https://raw.githubusercontent.com/exbald/family-three/main/scripts/install.sh | bash` on a Sprite.
- Optional Ollama connector: Ollama Cloud backs up the breeder and the autopilot pick when the main model fails (needs Ollama credits). The owner's live Sprite runs on GLM only.
- No public generation from strangers' prompts (the Z.ai coding plan forbids multi-user use). Visitors choose among finished apps; they never type a request.
- Plain Node server, plain HTML/CSS/JS pages, no framework. Pages are rendered by `public/*.js` modules.

## Brand Commitments
- Name: Family Three. Tagline: "Apps you raise, not prompt."
- Mark: a parent node over three child nodes (plum/dark stroke, lime children).
- Colour meaning already in the product: lime = the line you kept, orange = a cross.
- Voice: plain, short, concrete; says what happens. No hype words.

## Evidence on Hand
- Real families and apps on the live Sprite: Thanksgiving dinner (9 apps across 3 generations, one cross), a running tracker (9 apps), and the new crowd families.
- Adopted apps: Double Down (exbald/family-three-double-down, 5 commits incl. a merge), Afterglow, Streakline.
- Screens: `docs/family-tree.png`, `docs/crowd-family.png`, `video/assets/screens/*` (tree, vote panel, Telegram post, GitHub history, kit page).
- The 64.5 s film: `video/renders/family-three-hacksgiving-final.mp4`.
- No testimonials, user counts or press. Don't invent them.

## Product Principles
1. Show, don't describe: real running apps and the real tree beat any explanation.
2. Choice over prompting: the visitor's job is to pick, never to write a better prompt.
3. Everything is live and checkable: every claim links to a running app, a repo or a commit.
4. The keeper leaves with you: a public link, a repo, and a kit you can take anywhere.
