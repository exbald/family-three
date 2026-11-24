// The breeder writes three briefs that differ on purpose.
// Today: built-in directions. Wednesday: an Ollama call through the gateway, with these as the fallback.

const FIRST = [
  {
    name: 'Playful',
    brief:
      'Warm and friendly. Bright colours, rounded shapes, big touch targets, encouraging words. Celebrate progress when the user does something.',
  },
  {
    name: 'Quiet',
    brief:
      'Minimal and calm. Light background, lots of white space, strong typography. One key number or action front and centre; nothing extra.',
  },
  {
    name: 'Dashboard',
    brief:
      'Dense and dark. Everything important on one screen: big numbers, a chart drawn with SVG or canvas, a list. Monospace accents, a single bright accent colour.',
  },
]

const BREED = [
  {
    name: 'Refined',
    brief: 'Keep the look and the features. Polish rough edges and make the main interaction faster and more satisfying.',
  },
  {
    name: 'Rearranged',
    brief: 'Keep the mood and the features, but try a clearly different layout: move the main element, change the hierarchy.',
  },
  {
    name: 'Grown',
    brief: 'Keep everything that works and add the single most useful feature it is missing. Only one.',
  },
]

const CROSS = [
  {
    name: 'Blend',
    brief: "Keep parent 1's structure and features; restyle it completely in parent 2's look (colours, type, shapes, mood).",
  },
  {
    name: 'Graft',
    brief: "Keep parent 1's structure and look, and bring over parent 2's best feature, restyled to fit.",
  },
  {
    name: 'Hybrid',
    brief: "An even mix: parent 1's layout, parent 2's palette and type, and the best feature of each.",
  },
]

export async function writeBriefs({ kind, note }) {
  const base = kind === 'cross' ? CROSS : kind === 'breed' ? BREED : FIRST
  const suffix = note ? ` The user said: "${note}"` : ''
  return base.map((b) => ({ name: b.name, brief: b.brief + suffix, source: 'built-in' }))
}
