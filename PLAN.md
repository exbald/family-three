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
| Ollama Cloud | The breeder: one call per generation that writes the three briefs and updates `taste.md`. A nod to a judge (Ollama). | Core, small |
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

- **Breeder** (Ollama): reads the parent(s), your pick and comment, and `taste.md`; writes three briefs that differ on purpose (layout / mood / one feature); updates `taste.md`.
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

1. GLM through the Custom API connector: the auth header, streaming, and three runs at once on the coding plan. Fallback: the key as an env var on the Sprite.
2. GitHub connector: create a repo and commit through the gateway; the endpoint allow-list holds.
3. Ollama connector: one chat call through the gateway; pick a fast model.
4. ~~Chromium installs on the Sprite.~~ Done.

## Setup only Nik can do

- [ ] Put the GLM key in `~/.zshenv` as `ZAI_API_KEY` (never in chat).
- [ ] Fly dashboard → Sprites → Connectors → Add → **GitHub**: sign in and approve.
- [ ] Ollama: make a key at ollama.com/settings/keys, then Fly dashboard → Connectors → Add → **Ollama**, paste it.
- [ ] Decide the repo name and make it public (needed for the submission).

## Status (Tue Nov 24, evening)

- Home Sprite: `ft-family` (https://ft-family-b4zbc.sprites.app, org-only URL for now). `ft-probe` stays the test box.
- Done: the server runs there as the `family-three` service on :8080. Ask → three children → breed (one parent) or cross (two) → each child served at `/n/<id>/` with a Chrome thumbnail. A keep-awake hold (`/v1/tasks`) covers each litter.
- Builders run in stub mode until the Z.ai key is in: `~/.ft/config.json` on the Sprite holds `builder` and `modelBaseUrl`.
- `scripts/deploy.sh` ships the code; `scripts/connect-zai.sh` creates the Z.ai connector (prefix `ft-`) and points the builders at it.
- Next: GLM check through the gateway, then the first real generation; Ollama breeder; the tree page.

## What we already know (test Sprite `ft-probe`)

- 8 CPUs, 15 GB memory, Claude Code 2.1.319, Node 24, Ubuntu 26.04, passwordless sudo. Chromium: `chrome-headless-shell` from `@puppeteer/browsers` in `~/.browsers/chrome` plus its apt libraries (done on `ft-family`).
- A Sprite calls a connector at `https://api.sprites.dev/v1/gateway/<provider>/<id>/<path>` with no key; the gateway attaches it.
- A Custom API connector can be created with the API (`POST /v1/oauth/connections/custom_api`), access policy by name prefix.
- A checkpoint restore ends every process on the Sprite.
- A Sprite pauses when idle. Hold it with the Tasks API: `PUT /v1/tasks/<name> {"expire":"5m"}` on `/.sprite/api.sock`, refreshed every minute, deleted when done (max 1 h per hold).
- Connector policy fields: `access_policy: { name_prefix, sprite_labels, allow_all, allowed_endpoints, blocked_endpoints }`.
