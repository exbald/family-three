# SPEC: Family Three, "Dinner for eight" (Hacksgiving film)

GOAL: a stranger gets "you don't describe an app, you pick it out of a litter of three, and anyone can vote on the crowd's family", and wants to open the link or run the installer.
OUTPUT: HyperFrames, 1920 x 1080, 30 fps.
TIME: ~58 s x 30 = ~1740 frames. Narrated: the voice is the clock; each beat starts on its anchor word.

## Voice-over script (MiniMax Speech 2.8 HD, warm expressive narrator, ~150 words)

| # | Time | Line (spoken) | Picture |
|---|------|---------------|---------|
| 1 | 0–4 s | Thanksgiving. Eight guests. Zero plan. | Lavender crayon-grain table; the real "Eight at the table." app on a laptop lid, place cards for 8 |
| 2 | 4–9 s | You could write the perfect prompt for a dinner app. Then rewrite it. And rewrite it again. | A prompt box fills with spec text, strikes through, fills again, overflows off the frame |
| 3 | 9–12 s | Or you could raise one. | The overflowing text collapses into one line; title "Family Three" |
| 4 | 12–20 s | Say it once. Three Claude Code builders get to work at the same time, on a Fly.io Sprite. A few minutes later: three real apps. | The real ask box with the real request → the tree with three "growing" seeds → Feast Board, Eight at the table, Dinner for 8 land like dishes |
| 5 | 20–28 s | Like one? Breed it. Like two? Cross them: one brings the bones, the other the looks. | Feast Board × Dinner for 8 on the tree, the orange cross line draws, the cross kids are born |
| 6 | 28–37 s | Or let the whole table decide. Anyone can vote, on the web or in Telegram. When the clock runs out, the winner breeds. | The real Telegram post with vote buttons, counts tick up; the web vote panel's clock; the winner breeds |
| 7 | 37–45 s | Every pick teaches it your taste, and every node on the tree is a live app. | Pull back across the whole tree; the taste chips fill in |
| 8 | 45–52 s | Keep the one you love. It gets a public link, a GitHub repo whose commits are its family line, and a design kit to take anywhere. | The phone "is adopted" screen → the GitHub history with the merge commit → the design kit page |
| 9 | 52–58 s | Apps you raise, not prompt. Raise your own on a Sprite, in one command. | End card: Family Three mark carried in, the install command, the live URL, "Runs on Fly.io Sprites" |

## LOOK (from the Hacksgiving page + the product)
- World 1 (the table): periwinkle ground #9AA9F0 → #B9C3F7, risograph grain 6%, crayon-edged shapes in plum #4B2A6A, pie-pink #E7A3D0 and coral #FF6E5A; nothing copied from Fly's illustrations, only their palette and grain.
- World 2 (the product): the real dark greenhouse UI (#0F1311, lime #C6F432 = kept line, orange #FF9B57 = cross), shown at 1.6–2x on the lavender ground, with a 24 px radius and a 0 18 50 rgba(20,10,40,0.35) shadow.
- Type: display Bricolage Grotesque 800 at 96–140 px, tracking -2%; one serif italic word per title in Fraunces 600 italic (the Hacksgiving "*Hacksgiving*" move), underlined with a hand-drawn stroke; body Bricolage 500 at 34 px.
- Accent ration: lime only on the kept line and the end-card command; coral only on the call to action.

## MOTION
- Camera moves 0.45–0.6 s on power3.inOut with 6-frame motion blur; holds while the UI acts.
- Things arrive the way dishes are set down: a 12-frame drop with spring damping 0.55 on y and scale (never on opacity).
- Text arrives word by word on the voice (soft tick), never fades and slides up.
- Transitions (4 kinds): the laptop lid opens into the app; the overflowing prompt collapses into the title; a tree node is zoomed through into its live app; the phone screen pulls back into the GitHub page.

## SOUND
- Bed: warm acoustic folk, ~100 bpm, quiet under lines 1–3, opening up on "Or you could raise one", one riser into the tree pull-back (line 7), out on a bar line under the end card.
- Effects: a plate-set "pop" on each kid landing (3 takes rotated), a click on each Telegram vote, a whoosh on the two big transitions, one riser into the payoff.
- Levels: music 0.14 under the voice; mix at about -14 LUFS.

## REAL SCREENS TO CAPTURE (all from the live product)
landing hero; owner ask box with the request; tree while generation 1 is growing; tree with generation 1 born; the three apps full-size; the cross on the tree; the Telegram round post (t.me/familythreecrowd) before and after votes; the web vote panel with its clock; the whole tree after 3–4 generations; taste card; phone adopted screen; GitHub history with the merge commit; design kit page; install command.

## BANNED
dark void with floating UI; glow, particles, glass cards; everything fading and sliding up; three cards in a row; a title over a dimmed screenshot; the logo docked in a corner; typing into a prompt box as the opener; invented dashboards (every product screen is a real capture); Fly's own illustrations or logo used as decoration.

## QA
frame 0 reads as a thumbnail (the table + "Eight guests"); 12 s: three real apps visible and legible; 24 s: the cross line drawn; 33 s: Telegram buttons with counts; 42 s: whole tree, every node a real screenshot; 50 s: GitHub merge commit legible; last 2 s: install command legible for 2 s.
