---
name: Family Three
description: Apps you raise, not prompt.
colors:
  kept-lime: "#C6F432"
  lime-bloom: "#E2FF8A"
  cross-orange: "#FF9B57"
  cross-ink: "#1A0E05"
  cross-note-text: "#F1DCCB"
  failure-coral: "#FF7A7A"
  night-ground: "#0F1311"
  panel: "#141916"
  card: "#1A201C"
  raised: "#1F2622"
  line: "#222A26"
  line-2: "#2C3530"
  line-3: "#3A4540"
  text: "#EEF2EC"
  text-2: "#DCE3DE"
  text-3: "#C9D2CC"
  muted: "#9AA69F"
typography:
  display:
    fontFamily: "'Space Grotesk', system-ui, sans-serif"
    fontSize: "clamp(48px, 6.4vw, 88px)"
    fontWeight: 700
    lineHeight: 0.96
    letterSpacing: "-0.038em"
  headline:
    fontFamily: "'Space Grotesk', system-ui, sans-serif"
    fontSize: "clamp(30px, 3.4vw, 40px)"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-0.025em"
  title-lg:
    fontFamily: "'Space Grotesk', system-ui, sans-serif"
    fontSize: "30px"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  title:
    fontFamily: "'Space Grotesk', system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.01em"
  wordmark:
    fontFamily: "'Space Grotesk', system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 700
    letterSpacing: "-0.01em"
  lede:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "19px"
    fontWeight: 400
    lineHeight: 1.55
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.45
  body-long:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.6
  button:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 700
  label:
    fontFamily: "'JetBrains Mono', ui-monospace, monospace"
    fontSize: "12px"
    fontWeight: 500
    letterSpacing: "0.06em"
  data:
    fontFamily: "'JetBrains Mono', ui-monospace, monospace"
    fontSize: "12px"
    fontWeight: 500
  kid-letter:
    fontFamily: "'JetBrains Mono', ui-monospace, monospace"
    fontSize: "13px"
    fontWeight: 700
rounded:
  thumb-sm: "6px"
  sm: "8px"
  md: "10px"
  control: "12px"
  lg: "14px"
  card: "16px"
  panel: "18px"
  section: "22px"
  pill: "999px"
spacing:
  tight: "8px"
  snug: "10px"
  base: "12px"
  comfy: "14px"
  roomy: "16px"
  gutter: "20px"
  block: "28px"
  column: "64px"
  tree-indent: "72px"
  section-mobile: "72px"
  section: "112px"
components:
  button-lime:
    backgroundColor: "{colors.kept-lime}"
    textColor: "{colors.night-ground}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "0 18px"
    height: "44px"
  button-lime-hover:
    backgroundColor: "{colors.lime-bloom}"
    textColor: "{colors.night-ground}"
  button-orange:
    backgroundColor: "{colors.cross-orange}"
    textColor: "{colors.cross-ink}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "0 18px"
    height: "44px"
  button-ghost:
    backgroundColor: "{colors.card}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    padding: "0 18px"
    height: "44px"
  button-cross-outline:
    backgroundColor: "transparent"
    textColor: "{colors.cross-orange}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "40px"
  button-hero:
    rounded: "{rounded.lg}"
    padding: "0 22px"
    height: "52px"
  chip:
    backgroundColor: "transparent"
    textColor: "{colors.text-2}"
    rounded: "{rounded.pill}"
    padding: "0 12px"
    height: "36px"
  chip-hover:
    textColor: "{colors.kept-lime}"
  pill-live:
    backgroundColor: "{colors.kept-lime}"
    textColor: "{colors.night-ground}"
    rounded: "{rounded.pill}"
    padding: "3px 8px"
  pill-busy:
    textColor: "{colors.kept-lime}"
    rounded: "{rounded.pill}"
    padding: "3px 8px"
  pill-cross:
    textColor: "{colors.cross-orange}"
    rounded: "{rounded.pill}"
    padding: "3px 8px"
  pill-fail:
    textColor: "{colors.failure-coral}"
    rounded: "{rounded.pill}"
    padding: "3px 8px"
  panel:
    backgroundColor: "{colors.panel}"
    rounded: "{rounded.panel}"
    padding: "20px"
  kid-card:
    backgroundColor: "{colors.panel}"
    rounded: "{rounded.panel}"
    padding: "8px 8px 12px"
  lineage-thumb:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.control}"
  request-pill:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.text-2}"
    rounded: "{rounded.pill}"
    padding: "14px 22px"
  cross-badge:
    backgroundColor: "{colors.cross-orange}"
    textColor: "{colors.cross-ink}"
    rounded: "{rounded.pill}"
    size: "30px"
  vote-panel:
    backgroundColor: "{colors.panel}"
    rounded: "{rounded.panel}"
    padding: "18px"
  vote-option:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.control}"
    padding: "8px"
  repo-history:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.text-2}"
    rounded: "{rounded.card}"
    padding: "18px 20px"
  input-ask:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.text}"
    rounded: "{rounded.lg}"
    padding: "14px"
  input-actionbar:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    padding: "0 14px"
    height: "48px"
  code-command:
    backgroundColor: "{colors.night-ground}"
    textColor: "{colors.kept-lime}"
    typography: "{typography.data}"
    rounded: "{rounded.md}"
    padding: "12px 14px"
---

# Design System: Family Three

## Overview

**Creative North Star: "The Living Family Tree"**

Family Three looks like a pedigree chart drawn at night. A dark, green-tinted ground holds real app screenshots, and two coloured lines join them: lime for the line you kept, orange for a cross. Every surface, from the landing to the owner's tree view to the vote panel, is built from the same few parts: a 16:10 thumbnail of a running app, a lime or orange connector, a short mono label saying which generation and which kid, and a quiet panel to hold it.

The system is dense where it shows a family (three thumbnails side by side, small mono labels, rings for state) and spacious where it explains one (the landing's 112px section rhythm, a 5:7 text-to-tree grid, 88px display type). Decoration is close to absent. The only pictures are screenshots of apps the builders made; depth comes from tonal panels and a few soft shadows under things that float. Motion follows the tree: lines draw downward and each generation rises into place.

The brand mark is a parent node over three child nodes, drawn as a stroked icon in lime (on the favicon, lime on a #0F1311 rounded tile). PRODUCT.md describes the mark as a plum or dark stroke with lime children; the shipped mark is all lime, and this file records what shipped.

**Key Characteristics:**
- Dark green-black ground (#0F1311) with tonal panels one or two steps lighter.
- Two meaningful accents: lime for the kept line, orange for a cross and the crowd vote.
- Real app thumbnails, 16:10 and anchored to the top, are the only imagery.
- Space Grotesk for display, Inter for reading, JetBrains Mono for anything a machine produced.
- State shown with rings and border colour; shadows only under floating things.
- One motion idea: a stroke draws down, then the kids rise in.

## Colors

A near-black green ground with a cool green-grey neutral ladder and two warm-and-acid accents that each carry one meaning.

### Primary
- **Kept-Line Lime** (#C6F432): the family line. Lineage connectors for the kid that was kept and bred, the border of a kept thumbnail, kid letters (A, B, C), the primary forward action (New family, Breed, Adopt, Copy), links, the focus ring, the "Adopted" tag and the live status pill. Text on lime is the ground colour (#0F1311).
- **Lime Bloom** (#E2FF8A): hover state of lime buttons, links and kept thumbnails only.

### Secondary
- **Cross Orange** (#FF9B57): a cross. Cross connectors and the round × badge, the second pick when crossing, the merge commit in a repo history, cross vote options, and the crowd vote itself (the "Vote on generation N" button, the vote section's border and wash, the "The crowd decides" label, other families' vote status).
- **Cross Ink** (#1A0E05): text and icon strokes on orange fills.
- **Cross Note Text** (#F1DCCB): warm body text inside the dashed orange note boxes (the agent's crossing hint, "what I learned" notes). It is hard-coded in four places, not yet a CSS variable.

### Tertiary
- **Failure Coral** (#FF7A7A): errors and failed builds only (error text, the fail pill).

### Neutral
- **Night Ground** (#0F1311): page background, text on lime, the inner ground of command code blocks and repo commit dots.
- **Panel** (#141916): panels, kid cards, the request pill, the vote section, repo and kit cards.
- **Card** (#1A201C): thumbnail backing, tree nodes, vote option rows, ghost buttons, the floating action bar.
- **Raised** (#1F2622): the tree's request pill, checkpoint buttons, menu item hover.
- **Line** (#222A26), **Line 2** (#2C3530), **Line 3** (#3A4540): hairline borders from quietest to strongest. Line 3 is also the colour of un-kept tree branches and loading outlines.
- **Text** (#EEF2EC): primary text and headlines.
- **Text 2** (#DCE3DE): ledes and secondary emphasis.
- **Text 3** (#C9D2CC): running paragraphs on the landing and card briefs.
- **Muted** (#9AA69F): captions, meta, mono labels, counts.

### Named Rules
**The Two Lines Rule.** Lime means the family line you kept; orange means a cross or the crowd vote. Every lime or orange mark on a screen must read as one of those. Neither is used as decoration.

**The Coral Is Only Failure Rule.** Failure Coral appears only when something failed. It is never a third accent.

**The Tinted Ground Rule.** Every neutral carries the ground's green tint (hue near 164°). There is no pure black and no pure white anywhere; the lightest text is #EEF2EC.

**The Tinted Border Rule.** A featured container gets its accent as a thin border at 35–45% alpha (lime for the kit, orange for the vote) over a Panel fill, sometimes with a 8–9% accent wash fading to transparent. Accents never fill a large container.

## Typography

**Display Font:** Space Grotesk (with system-ui, sans-serif), weights 500 and 700 loaded
**Body Font:** Inter (with system-ui, sans-serif), weights 400–700
**Label/Mono Font:** JetBrains Mono (with ui-monospace, monospace), weights 400, 500, 700

**Character:** Space Grotesk's quirky geometric caps give headlines a hand-built feel, tightened hard at large sizes. Inter does the plain reading. JetBrains Mono marks everything that is data: it tells you which generation, which kid, how many votes, which file.

### Hierarchy
- **Display** (700, clamp(48px, 6.4vw, 88px), 0.96, -0.038em): the landing's one h1, "Apps you raise, not prompt." Balanced wrapping.
- **Headline** (700, clamp(30px, 3.4vw, 40px), 1.05, -0.025em): landing section heads such as the vote ("Pick who breeds generation N"). Later sections use clamp(28px, 3vw, 36px) at 1.1.
- **Title Large** (700, 30px, 1.1, -0.02em): the heading beside each generation in the landing's lineage ("Crossed A × C").
- **Title** (700, 22px, 1.15, -0.01em): a kid's name in the side panel, a litter heading in the owner view. Smaller Space Grotesk titles run 17–21px for card heads.
- **Wordmark** (700, 20px, -0.01em): "Family Three" beside the mark.
- **Lede** (400, 19px, 1.55, Text 2): the landing's first paragraph. Max width about 34rem.
- **Body Long** (400, 16px, 1.6, Text 3): landing paragraphs. Max width 34rem.
- **Body** (400, 14px, 1.45): the app's base size. Captions and meta drop to 12–13px in Muted.
- **Button** (700, 14px; hero buttons 16px): every button label. Ghost buttons drop to 600.
- **Label** (500, 12px, 0.06em, uppercase, Muted): panel headers such as "Generation 3", "What I told its builder", "The crowd decides". Generation marks beside the tree use 0.08–0.12em.
- **Data** (500, 12px, Muted or Text 3): vote counts, commit messages, file names, URLs, legends, "Gen 1".
- **Kid Letter** (700, 12–13px, Kept-Line Lime; Cross Orange for a cross): the A/B/C in front of every kid's name.

### Named Rules
**The Mono Is Data Rule.** JetBrains Mono carries generation marks, kid letters, counts, commit messages, file names, URLs and commands: anything the machine produced or a person would copy. It never sets a headline or a reading paragraph.

**The Tight Display Rule.** Space Grotesk is always bold and always tracked tighter as it grows: -0.01em at 20px, -0.02em at 30px, -0.038em at 88px.

## Layout

The app sits in a 1280px column with a 20px gutter; the owner's tree view widens to 1560px, and on screens 1000px and wider it locks the page to the viewport so the tree and the side column (340px, sticky) scroll on their own. Litters are a three-column grid with 14px gaps; below 860px each kid becomes a row with a 140px thumbnail on the left.

The landing is a 1240px column built on one grid for every row: text on the left (5fr), the tree on the right (7fr), a 64px column gap. The tree column is indented 72px to make room for the mono "Gen N" mark, so the lineage runs unbroken from the request pill down through every generation to the adoption and the vote. Section rhythm is 112px between major blocks (72px below 960px), with the footer 96px below the last section. Inside rows, gaps step through 8, 10, 12, 14, 16 and 20px.

Below 960px the landing collapses to one column, the tree loses its indent and generation marks, and two-column groups (vote options, take-home, how it runs) stack. The first viewport is `min(760px, 100svh − 90px)` tall on desktop and natural height on phones.

Motion belongs to the tree. On the landing, a row arms only when JavaScript runs: its connector draws downward (stroke-dashoffset, 0.9s), the cross badge pops in (scale, 0.45s after a 0.45s delay), then the three kids rise 16px out of a 4px blur at 0.5, 0.6 and 0.7s. The hero rises 14px over 0.7s on load. Everything uses an expo-out curve, cubic-bezier(.16, 1, .3, 1). Thumbnails lift 2–3px on hover. With reduced motion, everything shows at rest and the spinner stops.

## Elevation & Depth

Depth is mostly tonal: the Night Ground, then Panel, Card and Raised, each a small step lighter, separated by hairlines from the Line ladder. Shadows are soft, dark and used only for things that sit above the page: lineage thumbnails, the floating action bar and menus, hovered tree nodes. State is never a shadow; it is a ring (`box-shadow: 0 0 0 Npx`) or a border colour change.

The landing adds atmosphere behind everything: two large radial glows (lime 7% at the top right, orange 5% at the left) and a 5% fractal-noise grain fixed over the page.

### Shadow Vocabulary
- **Thumbnail lift** (`box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35)`): lineage thumbnails on the landing.
- **Node hover** (`box-shadow: 0 0 0 1px #3A4540, 0 8px 24px rgba(0, 0, 0, 0.35)`): a tree node under the pointer.
- **Floating** (`box-shadow: 0 18px 50px rgba(0, 0, 0, 0.5)`): the fixed action bar and the checkpoint menu.
- **Cross glow** (`box-shadow: 0 6px 18px rgba(255, 155, 87, 0.35)`): the orange × badge on a cross connector, the one coloured shadow.
- **State rings** (`0 0 0 1px` Line at rest, `0 0 0 1.5px` lime for kept, `0 0 0 2px` lime picked / orange second pick, `0 0 0 3px` lime selected / orange crossing): selection and lineage state on kid cards and tree nodes.

### Named Rules
**The Ring Not Shadow Rule.** Selection, kept and crossing states are rings or borders in lime or orange. Drop shadows only mean "this floats".

## Shapes

Everything is rounded; nothing is sharp. Words that move or label (the request, chips, status pills, the "Adopted" tag, the merge-commit tag) are full pills (999px). Controls and thumbnails share a gently rounded 12px corner (buttons, lineage thumbnails, vote option rows, inputs). Containers grow with their size: 14px for list rows and menus, 16px for repo and kit cards, 18px for panels and kid cards, 20–24px for the largest landing blocks (take-home kit 20px, install and adopted shot 22px, vote section 24px). Small thumbnails inside rows drop to 6–8px.

Circles carry the tree's joints: the 30px orange × badge, 14px commit dots on the repo history (lime ring, solid orange for a merge), 26px pick checks. Connectors are 3px lines with round caps, drawn as right-angled elbows: down from the parent, across, down to each kid.

Borders are 1px hairlines at rest. 1.5–2px borders mean something: the lime outline of the ask box, a lime border on a kept thumbnail, the orange outline of the cross button. Dashed orange 1px borders mark notes written by the agent.

## Components

### Buttons
Solid, bold and plain: a colour block with a bold Inter label, no icons needed.
- **Shape:** gently rounded (12px), minimum 44px tall, 0 18px padding; landing hero buttons 52px tall, 14px radius, 16px label.
- **Lime (primary):** Kept-Line Lime fill, Night Ground text. For moving the family forward: new family, breed, adopt, copy, vote for a single kid.
- **Orange (vote):** Cross Orange fill, Cross Ink text. For the crowd vote call to action.
- **Hover / Focus:** lime brightens to Lime Bloom; focus is a 2px lime outline at 2px offset on every focusable element. Disabled buttons drop to 55% opacity with a not-allowed cursor.
- **Ghost:** Card fill, 1px Line 3 border, Text, weight 600. Secondary actions such as "Watch it on Telegram" and "Get its design kit".
- **Cross outline:** transparent with a 1.5px orange border and orange text; hover adds a 10% orange wash. Used for "cross" choices.
- **Link button:** unstyled text button, underlined, orange (or lime for copy actions), 13px.

### Chips and Pills
- **Chips:** 36px tall pills with a 1px Line 2 border and Text 2 at 13px; hover turns border and text lime. Used for example requests.
- **Status pills:** 11px, weight 600, 3px 8px. Live is a solid lime pill with dark text; building is a lime outline; failed is a coral outline; quiet is a Line 3 outline in Muted; a cross is an orange outline.
- **Taste chips:** liked traits in a lime outline; avoided traits in a Line 2 outline, Muted and struck through.

### Cards / Containers
- **Corner Style:** 18px for panels and kid cards, 16px for repo and kit cards, 14px for list rows.
- **Background:** Panel, with Card for nested blocks (the "what I told its builder" box, the family line, thumbnails).
- **Shadow Strategy:** none at rest; state rings per Elevation.
- **Border:** 1px Line or Line 2; Line 3 on hover. Featured cards use the Tinted Border Rule.
- **Internal Padding:** 20px for side panels, 18–20px for vote and repo cards, 8px around a kid card's thumbnail.

### Inputs / Fields
- **Ask box:** a textarea with a 1.5px lime border, 14px radius, Panel fill, 16px Inter, at least 120px tall. The lime border says "this is where a family starts".
- **Action bar input:** 48px tall, 12px radius, 1px Line 2 border, Panel fill, 15px Inter.
- **Command block:** JetBrains Mono 12.5px in lime on the Night Ground, 10px radius, 1px Line border, scrolls sideways; a lime Copy button sits beside it.
- **Focus:** the global 2px lime outline. **Error:** coral 13px text below the field.

### Navigation
A single top row: the lime mark with the "Family Three" wordmark on the left, then (in the app) the family name and a checkpoint pill, a lime "New family" button, and an "About" text link in Text 3 at 13px, 600, turning lime on hover. On the landing, a row of in-page links (Inter 500, 15px, Text 2 turning Text on hover, 24px apart) sits before About on desktop and is hidden on phones; it was being added while this file was written. On phones the app header wraps: the family name moves to its own line and the button shrinks to 40px.

### Lineage (signature component)
The landing's spine and the owner's tree share one grammar. A generation is: the request in a pill (Panel fill, 1px Line 3 border, Text 2) or a lime or orange connector from the parents above; three 16:10 thumbnails of the running apps in a three-column grid (16px gap), each with a 2px Line 2 border (lime if that kid was kept, "Adopted" lime tag in the corner); and under each, the kid letter in lime mono plus the app name in Inter 600. Connectors are 3px round-capped elbows: lime when one kid was kept and bred, orange with a 30px orange × badge at the junction when two were crossed. A mono "Gen N" mark sits to the left. In the owner's tree, un-kept branches are drawn in Line 3 at 2px.

### Vote Panel
A Panel block with an orange 1.5px border at 45% alpha (on the landing, a 24px-radius section with an orange wash instead). A header row with the orange mono label "The crowd decides" and the round's total in mono; a status sentence in Space Grotesk 600 15px; then one row per option: a 64px thumbnail (two halves and a small orange × for a cross), the kid letter and name, a 6px tally bar (lime, or orange for the cross option) on a Line track, the count in mono, an "Open" link and a Vote button (lime, or cross outline for the cross). Your own vote outlines its row in lime.

### Repo History and Kit
The adopted app's GitHub history drawn as a list: a Panel card (16px radius) with the repo name and a mono commit count, then each commit in mono 14px on a vertical Line 3 rail with a 14px lime-ringed dot. The merge commit gets a solid orange dot and an orange "merge commit" pill. The kit card beside it lists file names as small mono code tags on Card, with a lime 35% border.

### Family Card (dashboard and landing)
A Panel card with an 18px radius: a mosaic of real app screenshots on the page ground (one large on the left, two small stacked on the right, 4px gaps), then tags (Crowd in orange outline, Private in grey, "New · started by the agent" in lime), the family's sentence in display 17px clamped to two lines, a mono "Generation n · m apps" line, and one status pill: orange tint for an open vote (with a mono countdown), lime tint with a blinking dot while kids are being born. Lifts 3px on hover.

### Ballot Card (landing vote)
Four cards in a row (two on tablets, one on phones), each a 16:10 screenshot that opens the app, the label in mono lime and the name, one plain line on what makes it different, a vote bar and a "Vote for <name>" button. The voter's pick gets a lime border, a lime ring and a "Your vote" badge; the cross card is outlined in orange and shows the two parents with an orange × badge.

### Next-breed Clock
Under the hero's actions: an orange-outlined panel with a pulsing orange dot and "Generation n breeds in m:ss" in mono orange, plus a second line "Next new family in" with the time in mono lime.

### Grow-up Block
On an adopted kid (tree panel, adopted page): a card on `--card` with a `--line-2` border. Owner-only ghost button "Grow it up: its own Sprite, a server and a database"; while working, the seed spinner and the current step in muted text; when done, a lime-tinted border (`rgba(198,244,50,.45)`), the Sprite name in mono lime, and links to the grown-up app and its server code. On the landing's repo history the grow-up commit gets a filled lime dot and an "own Sprite" pill, the lime twin of the orange "merge commit" pill.

## Do's and Don'ts

### Do:
- **Do** use Kept-Line Lime (#C6F432) for the kept line, kid letters, forward actions, links and focus, and Cross Orange (#FF9B57) for crosses and the crowd vote.
- **Do** show apps only as real thumbnails: 16:10, `object-fit: cover`, anchored to the top, on a Card backing with a 12px radius.
- **Do** set generation marks, kid letters, counts, commit messages, file names, URLs and commands in JetBrains Mono.
- **Do** show state with rings and border colour (lime kept or picked, orange crossing) and keep drop shadows for floating things.
- **Do** keep the ground #0F1311 and build depth with the Panel, Card and Raised steps.
- **Do** draw connectors as 3px round-capped elbows, and let them draw downward before the kids rise in, using cubic-bezier(.16, 1, .3, 1).
- **Do** keep every animated reveal visible without JavaScript and static under `prefers-reduced-motion`.
- **Do** keep buttons at least 44px tall.

### Don't:
- **Don't** use lime or orange as decoration or as a large fill; a featured container gets a 35–45% alpha accent border instead.
- **Don't** introduce a third accent. Failure Coral (#FF7A7A) is only for failures.
- **Don't** use pure black or pure white; the neutrals are green-tinted.
- **Don't** use stock photos, illustrations or mock screenshots; the only imagery is real app thumbnails.
- **Don't** set headlines or paragraphs in JetBrains Mono, or data in Space Grotesk.
- **Don't** show a selected or kept state with a drop shadow.
