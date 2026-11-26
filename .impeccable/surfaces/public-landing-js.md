---
version: 1
slug: "public-landing-js"
primary_target: "public/landing.js"
related_targets: ["public/app.js","public/app.css"]
---

# Landing (visitor home)

Scope: the visitor home page at `/` (public/landing.js, public/app.js renderVisitorHome, public/app.css). Mode: persuade.
Audience: Hacksgiving judges first, then people from the launch posts, then builders. Job: understand in seconds that one sentence becomes three real apps on a Fly.io Sprite, see the real lineage, know what they can take home, and vote.
Action: vote on the featured family's open round (web, no account); second: Telegram. Proof: the real Thanksgiving family tree, its thumbnails, the adopted repo's commits (a cross is a merge commit), the design kit, the other crowd families.
Constraints: the existing vote API and panel (vote.js), crowd tabs, install command, families list, OG tags. No invented claims or numbers.
Unresolved: adopted repos as GitHub templates (being set now).

## Direction contract
THESIS: The landing is one real family's tree read top to bottom, ending at its open vote. It refuses the hero-plus-feature-cards page.
OWN-WORLD: Family Three's dark ground #0F1311 and panel #141916; lime #C6F432 lineage lines for the kid the crowd kept, orange #FF9B57 for crosses and the vote; real app thumbnails are the only imagery; Space Grotesk display, Inter body, JetBrains Mono generation labels.
STORY: A judge sees in one screen that one sentence became three working apps on a Fly.io Sprite, follows the real lineage through a cross and a breed, sees the adopted repo (merge commit) and design kit they can take, then votes on the next generation or joins on Telegram.
FIRST VIEWPORT: Left ~40%: kicker, h1 "Apps you raise, not prompt.", two-sentence story, orange "Vote on generation N" and Telegram buttons, lime/orange legend. Right ~60%: the request pill, lime lines down to generation 1's three real thumbnails, the orange A × C cross badge, generation 2 entering at the fold under a fade.
FORM: Read a real family, position 2 on my list, seed:a39eed2d7245e81d. Signature interaction: the lineage lines draw downward as you scroll and each generation lands as its line reaches it; motion grammar: one stroke-draw plus rise, reduced-motion shows everything static.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
