You are growing up a finished web app so it can live on its own Fly.io Sprite as a small full-stack app.

The app is "{{name}}", raised from this request: "{{request}}".
It is in ./public: plain HTML, CSS and JavaScript that keeps all its data in the browser (localStorage).

Make it a real full-stack app, in this folder:

1. ./server.mjs: plain Node 24, no npm packages, no build step.
   - Serve ./public as static files, with index.html for "/".
   - Keep the app's data in SQLite with the built-in module: `import { DatabaseSync } from 'node:sqlite'`, database file ./data.db. Create the tables on start.
   - A JSON API under /api/ for everything the app used to keep in localStorage. Model it as real tables (not one JSON blob), with routes to list, create, update and delete what the app manages.
   - GET /api/health returns {"ok":true}.
   - Listen on process.env.PORT or 8080.
   - Validate every input (types, lengths), cap request bodies at 64 KB, answer bad input with a 400 and a JSON error. Never crash on bad input.
2. Change the front end in ./public to load and save through the API with fetch, using relative URLs ("api/..."), so everyone who opens the app sees and edits the same data, on any device. Seed the database with the same starting data the app showed before, so it never opens empty. Keep localStorage only for purely local view settings, if any.
3. Keep the look and the main interaction exactly as they are. This is the same app, grown up, not a redesign.
4. Write ./GROWN.md: what changed, the tables, and each API route with an example, in plain words.

Then test it yourself:
- Start it on port {{port}} in the background (`PORT={{port}} node server.mjs &`).
- curl /api/health, then do a full round trip through the API (create, read it back, update, delete).
- Stop the server you started.

Be quick: aim to finish in under ten minutes. Don't install anything, don't use sub-agents, don't ask questions. Stay in this folder. When the round trip works, stop.
