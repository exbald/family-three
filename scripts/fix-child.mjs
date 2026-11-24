// Repairs one finished child: opens it in headless Chrome, gives its builder one fix round for any
// script errors, takes a fresh screenshot, and (if adopted) pushes the fix to its repo.
// Usage on the Sprite: node scripts/fix-child.mjs <child-id>
import { config } from '../server/config.mjs'
import { parseChildId, readTree, updateChild } from '../server/store.mjs'
import { snapThumb } from '../server/thumbs.mjs'
import { fixChild } from '../server/builder.mjs'
import { pushRepoUpdate } from '../server/adopt.mjs'

const cid = process.argv[2]
const ids = parseChildId(cid)
const tree = ids && (await readTree(ids.fid))
const child = tree?.children[cid]
if (!child) {
  console.error(`No child ${cid}`)
  process.exit(1)
}
const url = `http://127.0.0.1:${config.port}/n/${cid}/`
const before = await snapThumb({ fid: ids.fid, n: ids.n, url })
console.log('errors before:', before.errors)
if (!before.errors.length) process.exit(0)
const fix = await fixChild({ fid: ids.fid, child, errors: before.errors, onProgress: () => {} })
console.log('fixer:', fix.ok, fix.summary)
const after = await snapThumb({ fid: ids.fid, n: ids.n, url })
console.log('errors after:', after.errors)
await updateChild(ids.fid, cid, { thumb: after.thumb, finishedAt: new Date().toISOString(), check: { errors: before.errors.length, fixed: fix.ok && !after.errors.length, remaining: after.errors } })
if (child.adopted && !after.errors.length) {
  const sha = await pushRepoUpdate({ fid: ids.fid, cid, message: `${child.label} ${child.name}: fixed a bug the browser found\n\n${before.errors.join('\n')}\n\n${fix.summary}` })
  console.log('pushed fix commit', sha.slice(0, 7))
}
