# Family Three: agent notes

Hackathon project for Fly.io's Hacksgiving. Deadline: midnight PST, Sunday Nov 29, 2026. Read `PLAN.md` first: it holds the pitch, the demo script (the finish line), connectors, architecture, the day plan and the cut list.

## Pace over process (this project overrides the global rules)

- No test-first rule and no coverage target. The demo is the test. Add a quick check only for the risky parts: starting builders, crossing, the GitHub commit chain.
- No review loops, no specs folder, no ledger. One `PLAN.md`, kept current.
- Small, readable files still. Plain Node (ESM) on the server, plain HTML/CSS/JS in the pages. No framework unless it saves real time.
- Commit often with `<type>: <summary>` messages. Push to `main` is fine here: it's a solo hackathon repo.

## Never

- Never put a key in code, commits, logs or chat. Model, GitHub and Telegram calls go through Sprites connectors (`https://api.sprites.dev/v1/gateway/<provider>/<id>/<path>`); the Sprite never holds their keys. Keys the lead holds live in `~/.zshenv` (`ZAI_API_KEY`, `TELEGRAM_BOT_TOKEN`), read without printing.
- Never open a connector to all Sprites: access is by the name prefix `ft-`. GitHub's connector also gets an endpoint allow-list (create repo, `/repos/<user>/family-three-*`).
- Never touch anything in the `niko-lay` org: it is agentinico's production. Family Three has its own org, `family-three` (moved there 2026-11-26).
- Never give this repo a self-hosted CI runner. If it gets CI, GitHub's own runners only (it goes public).

## Tools

- Sprites CLI: `sprite`, logged in with two orgs. **Family Three lives only in its own org `family-three`**: Sprite `ft-family` (https://ft-family-b6ykp.sprites.app), and its connectors (Z.ai, GitHub, Telegram). Always pass `-o family-three`: `sprite exec -o family-three --no-stdin -s ft-family -- bash -c '…'`. The scripts default to it (`FT_ORG`).
- Org `niko-lay` is Nik's agentinico production (his bot SaaS). Never touch it. The only Family Three thing left there is an empty `ft-family` that 308-redirects the old address (https://ft-family-b4zbc.sprites.app, the link submitted in the form and posts) to the new one; leave it running.
- Screenshots and design checks: `bh-agent` (headless, never prompts), not Nik's own Chrome.
- Mockups: https://claude.ai/artifact/LJd9aN82M187JzhnH61Lix
- Shared memory: the project note is tagged `hacksgiving`. Update it when something is decided or shipped.
