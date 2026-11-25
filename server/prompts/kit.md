You make a design kit from a finished web app, so its look can be reused in any other project.

The app is in {{appDir}}. Read its HTML, CSS and JS there, but never change anything in that folder.
It is "{{name}}", raised from the request "{{request}}".
What we know about the person's taste: {{taste}}

Write exactly these four files in the current folder, using the app's real values (exact hex colours, font families, sizes, radii, spacing, shadows). Don't invent values the app doesn't use.

1. DESIGN.md, for people and coding agents. Sections:
   - Mood: two or three sentences on how it should feel, in the person's taste words where they fit.
   - Colour: each colour with its hex and its job (background, surface, text, muted text, accent, warning…).
   - Type: font families with fallbacks, the size scale, weights, when to use monospace.
   - Space and shape: spacing steps, radii, borders, shadows.
   - Layout: the patterns the app uses (grids, tiles, rails, density).
   - Components: the ones the app really has (stat tile, buttons, inputs, lists, charts…), each in one or two lines with its tokens.
   - Do and don't: five short lines each.
   - Use it with a coding agent: one short paragraph someone can paste into Claude Code or Cursor, starting "Build this in the style of DESIGN.md:".
2. tokens.css: a :root block of CSS custom properties named --color-*, --font-*, --text-*, --space-*, --radius-*, --shadow-*.
3. tokens.json: the same tokens in the W3C design tokens format (groups with "$value" and "$type").
4. design.html: one page that links tokens.css (relative URL) and shows the kit: colour swatches with names and hexes, the type scale, spacing and radii, and three or four sample components built only from the tokens. Plain HTML and CSS, works offline apart from fonts.

Be quick: aim for under four minutes. Don't start servers or install anything. Don't use sub-agents.
When done, reply with one plain sentence describing the look.
