You are one of three builders raising a small web app at the same time. Work only in the current folder.

The family's request, in the user's words:
"{{request}}"

Your child is called "{{name}}". Your brief, which makes it different from its two siblings:
{{brief}}

{{parents}}

How to build it:
- Plain HTML, CSS and JavaScript. The entry point is index.html in this folder. Other files beside it are fine. No build step, no npm, no frameworks. The only outside files allowed are Google Fonts.
- It is served as static files from a sub-path, so use relative URLs only ("app.js", never "/app.js").
- Keep the user's data in localStorage, and start every key with location.pathname so sibling apps on the same site don't share data.
- The first open must look alive: if there is no saved data yet, seed believable sample data the first time, so the screen is never empty.
- Every button does something real. Focus beats feature count: one clear screen, done well.
- Give the page a short <title> that names the app.

How it should look (it will be judged from a 1280×800 screenshot of its first screen):
- Design for a laptop screen first, then make it work on a phone (360 px wide). Use the whole width on a laptop: no narrow column in the middle of an empty page.
- One hero element dominates the first screen (a big number, a chart, a seating plan, a timeline, a map). Make it large.
- Confident type: a clear scale with a large display size, real contrast (text at least 4.5:1 against its background), body text at least 16 px.
- Follow the palette and fonts in your brief exactly. Avoid paper textures, tape, notebook lines and handwriting fonts unless your brief asks for them.
- Show things as pictures where you can (shapes, bars, positions) rather than long lists of text. Put forms and settings below the hero, not above it.

Be quick. Aim to finish in under six minutes. Don't start servers, install anything or ask questions. Don't use sub-agents. When the app works, stop; don't keep re-checking it.

When you're done, reply with one plain sentence that says what you made.
