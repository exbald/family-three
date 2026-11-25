// A tiny in-process event bus, so voting and Telegram can react to litters without generation knowing about them.
// Events: 'litter-started' {fid, litter, kind, parents, note}, 'litter-done' {fid, litter, kids},
//         'vote-opened' {fid}, 'vote-counted' {fid}, 'vote-closed' {fid, winner, counts, total}
import { EventEmitter } from 'node:events'

export const bus = new EventEmitter()

export function emitSafe(event, payload) {
  for (const listener of bus.listeners(event)) {
    Promise.resolve()
      .then(() => listener(payload))
      .catch((err) => console.error(`listener for ${event} failed:`, err))
  }
}
