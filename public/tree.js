// Lays out a family as a tree: one row per generation, each litter of three under its parent(s).
// Lines: lime = the line you kept (ancestors of the selected child), orange = a cross, grey = the rest.

export const NODE_W = 190
export const NODE_H = 142
const GAP = 18
const LITTER_GAP = 44
const ROW_H = 250
const TOP = 96
const LEFT = 56
// The request bubble sits above generation 1; its bottom edge is where the first line starts.
export const REQUEST_TOP = 8
export const REQUEST_BOTTOM = 52

const centerX = (pos) => pos.x + NODE_W / 2

// Returns { nodes: {id: {x, y}}, width, height }.
export function layoutTree(tree) {
  const pos = {}
  const litterWidth = 3 * NODE_W + 2 * GAP
  const byGen = new Map()
  for (const litter of tree.litters) {
    byGen.set(litter.gen, [...(byGen.get(litter.gen) ?? []), litter])
  }
  let width = LEFT + litterWidth
  for (const gen of [...byGen.keys()].sort((a, b) => a - b)) {
    const litters = byGen.get(gen)
      .map((l) => {
        const parentXs = l.parents.map((id) => pos[id]).filter(Boolean).map(centerX)
        const want = parentXs.length ? parentXs.reduce((a, b) => a + b, 0) / parentXs.length : LEFT + litterWidth / 2
        return { litter: l, want }
      })
      .sort((a, b) => a.want - b.want)
    let cursor = LEFT
    for (const { litter, want } of litters) {
      const x = Math.max(cursor, want - litterWidth / 2)
      litter.children.forEach((id, i) => {
        pos[id] = { x: x + i * (NODE_W + GAP), y: TOP + (gen - 1) * ROW_H }
      })
      cursor = x + litterWidth + LITTER_GAP
      width = Math.max(width, x + litterWidth)
    }
  }
  const gens = Math.max(1, ...tree.litters.map((l) => l.gen))
  return { nodes: pos, width: width + 24, height: TOP + gens * ROW_H - (ROW_H - NODE_H) + 24 }
}

// Every ancestor of the child, including itself.
export function lineage(tree, id) {
  const seen = new Set()
  const walk = (cid) => {
    if (!cid || seen.has(cid)) return
    seen.add(cid)
    for (const p of tree.children[cid]?.parents ?? []) walk(p)
  }
  walk(id)
  return seen
}

// SVG paths joining each litter to its parent(s): down from the parent, along a bar, down to each child.
export function treeLines(tree, nodes, keptIds) {
  const lines = []
  for (const litter of tree.litters) {
    const kids = litter.children.map((id) => ({ id, p: nodes[id] })).filter((k) => k.p)
    if (!kids.length) continue
    const barY = kids[0].p.y - 36
    const isCross = litter.kind === 'cross'
    const middle = (kids[0].p.x + kids[kids.length - 1].p.x) / 2
    const sources = litter.parents.length
      ? litter.parents.map((id) => ({ id, p: nodes[id] })).filter((s) => s.p)
      : [{ id: null, p: { x: middle, y: 0 } }]
    for (const [i, s] of sources.entries()) {
      const kept = s.id ? keptIds.has(s.id) : true
      const colour = isCross && i === 1 ? 'cross' : kept ? 'kept' : 'rest'
      const fromY = s.id ? s.p.y + NODE_H : REQUEST_BOTTOM
      const x = centerX(s.p)
      lines.push({ d: `M${x} ${fromY} V${barY}`, colour })
    }
    const xs = [...kids.map((k) => centerX(k.p)), ...sources.map((s) => centerX(s.p))]
    lines.push({ d: `M${Math.min(...xs)} ${barY} H${Math.max(...xs)}`, colour: isCross ? 'cross' : 'rest' })
    for (const k of kids) {
      lines.push({ d: `M${centerX(k.p)} ${barY} V${k.p.y}`, colour: keptIds.has(k.id) ? 'kept' : 'rest' })
    }
  }
  // Draw grey first so lime and orange sit on top.
  const order = { rest: 0, cross: 1, kept: 2 }
  return lines.sort((a, b) => order[a.colour] - order[b.colour])
}

export { TOP, ROW_H, LEFT }
