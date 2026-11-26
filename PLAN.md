# Family Three: plan

Entry for Fly.io's Hacksgiving (Nov 23–29, 2026). Submit by midnight PST, Sunday Nov 29.
Rules: a personal agent that runs on a Sprite and uses at least one Sprites connector, built this week; submit a code link, a demo and a short description.

## The pitch

**Apps you raise, not prompt.** Say what you want. Three children are born: three working apps, each with its own live link. Pick one and it breeds three more from it, or pick two and it crosses them. Every generation grows a family tree. Keep the one you love: Adopt gives it a public link and its own GitHub repo, whose history is its family line. Over time it learns your taste.

Every family has three kids.

Mockups: https://claude.ai/artifact/LJd9aN82M187JzhnH61Lix (the tree on a laptop, then ask, three children, adopted on a phone).

## The 60-second demo (this is the finish line)

1. 0–5 s: "I don't write prompts. I raise apps."
2. 5–20 s: "A tracker for my running" → three live apps appear (sped up).
3. 20–35 s: tap one → three children → cross two → the child has both parents' traits.
4. 35–45 s: zoom out: a ten-node family tree, every node a working app.
5. 45–52 s: the taste card fills in: "you like dark, dense, big numbers".
6. 52–60 s: Adopt → public link and a GitHub repo whose commits are its ancestors → open it on a phone. "Runs on a Sprite. Install it on yours in one command."

## Connectors

| Connector | Used for | Priority |
|---|---|---|
| Custom API → Z.ai (GLM coding plan) | The builders (Claude Code) write the apps: `ANTHROPIC_BASE_URL` = the gateway URL for `https://api.z.ai/api/anthropic` | Core |
| GitHub | Adopt: create `family-three-<name>`, one commit per ancestor (message = that builder's brief), optional GitHub Pages link | Core |
| ~~Ollama Cloud~~ | Dropped Nov 24: needs a paid plan. The breeder runs on GLM instead. | — |
| Pushover | "Your three kids are ready" | Optional |

Every connector is limited to Sprites named `ft-*`. GitHub also gets an endpoint allow-list: create a repo, and write only to `/repos/<user>/family-three-*`. The agent can't touch anything else in the account, and the write-up says so.

The Fly.io Machines connector (Sprites starting Sprites) isn't offered in our organization yet. Three Sprites per generation is a Friday upgrade through a narrow Sprites token, only if the core is done.

## How it runs

One Sprite (`ft-…`). A Node server on :8080, run as a `sprite-env` service so it comes back after a checkpoint restore.

```
Sprite URL ──► Node server :8080
                ├─ /                 the family tree
                ├─ /n/<id>/          serves any child app
                ├─ POST /families    new request → generation 1
                ├─ POST /breed/<id>  three children from one parent
                ├─ POST /cross/<a>/<b>  three children from two parents
                ├─ POST /adopt/<id>  public path + GitHub repo
                │
                ├─ ~/families/<family>/<id>/   one folder per child: code, brief.md, thumb.png
                ├─ ~/families/<family>/tree.json
                └─ ~/taste.md                  what you picked and why
```

- **Breeder** (GLM via the Z.ai connector): reads the parent(s), your pick and comment, and `taste.md`; writes three briefs that differ on purpose (layout / mood / one feature); updates `taste.md`.
- **Builders** (Claude Code ×3 at once, headless, Task subagents off): each gets its parent folder(s) plus one brief, writes plain HTML/CSS/JS into its own folder. No build step, no servers per child.
- **Thumbnails**: headless Chromium screenshots each child once it's built.
- **Checkpoints**: one per generation. The video ends with "I wrecked it, restore".
- **Installer**: `curl … | bash` on any Sprite sets everything up.

No eve: plain Node is enough, and eve's database would be rewound under it by a restore.

## Five days

| Day | Ship |
|---|---|
| Tue 24 | Checks (below). Server, one generation of three children served live. |
| Wed 25 | Breeding from a pick, the tree page with thumbnails, `taste.md`, the Ollama breeder |
| Thu 26 | Crossing, Adopt (public path + GitHub repo with the family line), checkpoint per generation, installer |
| Fri 27 | Make the tree beautiful, record the video. Upgrade to three Sprites only if all else is done. |
| Sat 28 | README with a GIF, post on X, Bluesky and LinkedIn tagging @flydotio, submit the form. Sunday is spare. |

Cut first if short: voice requests, then Pushover, then GitHub Pages, then crossing. Breeding, the tree and Adopt are the core.

## Open checks

1. ~~GLM through the Custom API connector.~~ Passed Nov 24.
2. GitHub connector: create a repo and commit through the gateway; the endpoint allow-list holds.
3. Ollama connector: one chat call through the gateway; pick a fast model.
4. ~~Chromium installs on the Sprite.~~ Done.

## Setup only Nik can do

- [ ] Put the GLM key in `~/.zshenv` as `ZAI_API_KEY` (never in chat).
- [ ] Fly dashboard → Sprites → Connectors → Add → **GitHub**: sign in and approve.
- [ ] Ollama: make a key at ollama.com/settings/keys, then Fly dashboard → Connectors → Add → **Ollama**, paste it.
- [ ] Decide the repo name and make it public (needed for the submission).

## Live (Thu Nov 26)

- Public: https://ft-family-b6ykp.sprites.app, in its own Fly org `family-three` since 2026-11-26 (the old https://ft-family-b4zbc.sprites.app in `niko-lay` 308-redirects there, so the submitted links keep working), repo https://github.com/exbald/family-three public with README, Telegram @familythreecrowd live (webhook set, rounds post with vote buttons). Vote limits use the address the Sprite proxy appends to X-Forwarded-For (3rd from the right); the first entry is spoofable.
- Landing: rebuilt with impeccable as one real family read top to bottom (the Thanksgiving tree, its adoption with the merge commit and kit, then its open vote), then the other crowd families, what you take home, how it runs, install. PRODUCT.md, DESIGN.md and `.impeccable/surfaces/public-landing-js.md` hold the brief and contract. Finish review: ship.
- Crowd families: Thanksgiving dinner (thanksgiving-dinner-2b58, gen 3; b468 archived), leftovers, Black Friday wishlist, gratitude wall, kids' table game. Autopilot picks after 2 h with no votes, at most twice in a row, then waits for a real vote.
- Telegram Mini App (2026-11-26): t.me/FamilyThreeCrowdBot/app (BotFather short name `app`, config telegramAppName), menu button, /start button, Open in the app on channel posts; init data checked with Telegram's Ed25519 key (server/tgwebapp.mjs).
- 2026-11-26 evening: families dashboard (`/families`, linked in the header everywhere), landing families gallery, big-card ballot (each option: screenshot, open link, what's different, Vote for <name>), next-breed clock, and a seeder that starts a new crowd family every 2 h up to 10 active.
- Grow it up (2026-11-26): an adopted app gets its own Sprite `ft-app-<slug>` in the family-three org, with a Node server and SQLite written and tested by the agent. The key for it (~/.ft/sprites-token on ft-family) is a Fly Sprites token scoped to name prefix `ft-app-`, max 10, expiring 2026-12-15. Double Down was the first.
- Anyone can get a kid's design kit (one per kid, one at a time, one start per visitor per 10 min). Adopted repos are GitHub templates.
- Deploys refuse to restart while kids are building (FORCE=1 overrides): a restart mid-brief is what emptied "Where my money leaks". Try again now re-writes lost briefs.
- Film: `video/` (HyperFrames), rendered to `video/renders/family-three-hacksgiving-final.mp4` (64.5 s, -14.6 LUFS).
- Submitted 2026-11-26 06:59 UTC: the Hacksgiving form (connectors: Z.ai, GitHub, Telegram; Ollama connected but unused, so not listed). Launch post on X with the film: https://x.com/exbald/status/2125846615319621881. LinkedIn post scheduled for 09:37 NY Nov 26 (mixpost-social, nl-hacksgiving).
- Left: Z.ai key rotation.

## Status (Tue Nov 24, evening)

- Home Sprite: `ft-family` (https://ft-family-b4zbc.sprites.app, org-only URL for now). `ft-probe` stays the test box.
- Done: the server runs there as the `family-three` service on :8080. Ask → three children → breed (one parent) or cross (two) → each child served at `/n/<id>/` with a Chrome thumbnail. A keep-awake hold (`/v1/tasks`) covers each litter.
- GLM check passed (Nov 24): the Custom API connector `ft-zai-anthropic` (prefix `ft-`) swaps Claude Code's placeholder auth for the real key, streaming works, three builders at once are accepted. First real family: three working running trackers in 33 s, 7 min and 9 min. `~/.ft/config.json` on the Sprite holds `builder` and `modelBaseUrl`.
- The laptop family page is now the tree (lime = kept line, orange = cross) with a side panel; phones keep the litter rows.
- `scripts/deploy.sh` ships the code; `scripts/connect-zai.sh` creates the Z.ai connector (prefix `ft-`) and points the builders at it.
- Connectors (Nov 24): GitHub `0Jz4SkLP6tNY7lzgA1LY5w` (account exbald, scope public_repo, prefix `ft-`, allowed `/user/repos` and `/repos/exbald/family-three-*`; checked: the main repo, `/user` and other repos get 403). Ollama `dHT9xYZmRLUHQrXnAAb1Bw` (prefix `ft-`): model list works, chat answers 402 until the account has credits or a plan.
- Adopt works (Nov 24): one button makes a public repo `family-three-<name>` whose history is the family line (one commit per ancestor, a cross = a merge commit, author dates = birth times, README with the line), GitHub Pages on it, and a short Sprite path `/a/<name>/`. First adoption: https://github.com/exbald/family-three-streakline.
- Every build is now checked in headless Chrome: script errors get one repair round from the same builder session, then a fresh screenshot. `scripts/fix-child.mjs <id>` repairs an existing child and pushes the fix to its repo if adopted.
- Owner lock: only the owner's browser (unlocked once with `/?key=…`, link saved on Nik's Mac in `~/.config/family-three/owner-link`) can raise, breed, cross or adopt.
- Crossing works for real (Nov 25, GLM-5.4): C·3 Nightops × A Playful gave Duskrail, Afterglow, Heartbeat, each visibly with both parents; taste learned "playful heart under a dark shell". The model is set per Sprite in `~/.ft/config.json` (`glm-5.4[1m]` on ours).
- Phone adopted screen (Nov 25) at `/f/<family>/adopted/<child>`, as in the mockup; picking one child on a phone offers Adopt. Second adoption: X·2 Afterglow (a cross) → https://github.com/exbald/family-three-afterglow, whose history is a real merge commit of two roots (A and C).
- Design kit + share card (Nov 25): adopting a child also writes `DESIGN.md`, `tokens.css`, `tokens.json`, `design.html` (served at `/kit/<id>/`, zipped, committed under `design/`). Each family has a share card at `/card/<family>.png`, used as the link preview.
- Models (Nov 25): GLM-5.4 was overloaded on its launch day (529s), so the Sprite runs `glm-5.3` with `glm-5.3-flash` as Claude Code's fallback; runs that die from an overload retry twice. Flip back to `glm-5.4[1m]` in `~/.ft/config.json` once it's steady.
- Installer (Nov 25): `scripts/install.sh`, tested on `ft-probe`. Needs the repo public for the curl line. Visitors see an intro, the families, and the install command.
- Checkpoints (Nov 24): a Sprite checkpoint after every finished generation and every adoption (comment `ft|<family>|<gen>|<what>`, ~0.25 s, processes keep running). The family header shows the latest one; Restore lists them and rewinds the whole Sprite (~8 s; the service comes back by itself, the page waits and reloads). A restore also rewinds the app code on the Sprite, so only restore to checkpoints made after the last deploy.
- Crowd family (Nov 25): anyone votes, no login (one vote per round per browser, max 3 per IP). The first vote starts a 15-minute clock (`roundMinutes`); when it runs out the leader breeds, or sooner if one option reaches the threshold with a 2-vote lead. No daily cap. Owner can pause, or "Breed the leader now". Telegram (@familythreecrowd via @FamilyThreeCrowdBot, Custom API connector with the token in the URL path) posts rounds with vote buttons once `telegramLive` is on. Builds that time out after writing an app are rescued by the browser check; empty ones retry once; owner can "Try again".
- Decided (Nov 25): no public guest generation. Z.ai's coding plan forbids multi-user access and allows only supported tools (Claude Code), and Nik chose not to pay for a separate guest model. The public site is a look-don't-touch showcase of Nik's families; anyone who wants to raise apps installs it on their own Sprite with their own model. The breeder also runs through `claude -p` (no tools) so all model use goes through Claude Code.
- Decided (Nov 24): the breeder runs on GLM through the Z.ai connector, not Ollama (no paid Ollama plan). Ollama stays connected but unused, and the write-up won't claim it. Breeder = one call per litter: three named briefs (layout / mood / feature) + taste.md update (likes, avoid, last thing learned). Children show at once as "briefing", then build. Next: make the URL public (Nik's OK), README, video.

## What we already know (test Sprite `ft-probe`)

- 8 CPUs, 15 GB memory, Claude Code 2.1.319, Node 24, Ubuntu 26.04, passwordless sudo. Chromium: `chrome-headless-shell` from `@puppeteer/browsers` in `~/.browsers/chrome` plus its apt libraries (done on `ft-family`).
- A Sprite calls a connector at `https://api.sprites.dev/v1/gateway/<provider>/<id>/<path>` with no key; the gateway attaches it.
- A Custom API connector can be created with the API (`POST /v1/oauth/connections/custom_api`), access policy by name prefix.
- A checkpoint restore ends every process on the Sprite.
- A Sprite pauses when idle. Hold it with the Tasks API: `PUT /v1/tasks/<name> {"expire":"5m"}` on `/.sprite/api.sock`, refreshed every minute, deleted when done (max 1 h per hold).
- Connector policy fields: `access_policy: { name_prefix, sprite_labels, allow_all, allowed_endpoints, blocked_endpoints }`.
