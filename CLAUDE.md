# Family Three: agent notes

Hackathon project for Fly.io's Hacksgiving. Deadline: midnight PST, Sunday Nov 29, 2026. Read `PLAN.md` first: it holds the pitch, the demo script (the finish line), connectors, architecture, the day plan and the cut list.

## Pace over process (this project overrides the global rules)

- No test-first rule and no coverage target. The demo is the test. Add a quick check only for the risky parts: starting builders, crossing, the GitHub commit chain.
- No review loops, no specs folder, no ledger. One `PLAN.md`, kept current.
- Small, readable files still. Plain Node (ESM) on the server, plain HTML/CSS/JS in the pages. No framework unless it saves real time.
- Commit often with `<type>: <summary>` messages. Push to `main` is fine here: it's a solo hackathon repo.

## Never

- Never put a key in code, commits, logs or chat. Model, GitHub and Ollama calls go through Sprites connectors (`https://api.sprites.dev/v1/gateway/<provider>/<id>/<path>`); the Sprite never holds their keys. Keys the lead holds live in `~/.zshenv` (`ZAI_API_KEY`), read without printing.
- Never open a connector to all Sprites: access is by the name prefix `ft-`. GitHub's connector also gets an endpoint allow-list (create repo, `/repos/<user>/family-three-*`).
- Never touch Sprites that don't start with `ft-`: the same Fly organization runs agentinico's production bot computers (`bot-*`, `agentinico-*`).
- Never give this repo a self-hosted CI runner. If it gets CI, GitHub's own runners only (it goes public).

## Tools

- Sprites CLI: `sprite` (logged in, org `niko-lay`). Test Sprite: `ft-probe` (https://ft-probe-b4zbc.sprites.app). Use `sprite exec --no-stdin -s <name> -- bash -c '…'`.
- Screenshots and design checks: `bh-agent` (headless, never prompts), not Nik's own Chrome.
- Mockups: https://claude.ai/artifact/LJd9aN82M187JzhnH61Lix
- Shared memory: the project note is tagged `hacksgiving`. Update it when something is decided or shipped.
