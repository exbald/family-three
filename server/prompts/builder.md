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
- It must work on a phone (360 px wide) and on a laptop.
- Every button does something real. Focus beats feature count: one clear screen, done well.
- Give the page a short <title> that names the app.
- Be quick. Aim to finish in under five minutes. Don't start servers, install anything or ask questions. Don't use sub-agents.

When you're done, reply with one plain sentence that says what you made.
