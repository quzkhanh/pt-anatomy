import { exerciseById } from './content'
import type { Exercise } from './content-types'
import { load, save } from './storage'

const KEY = 'pt-anatomy:favorites:v1'

const stored = load<unknown>(KEY, [])
let ids = $state<string[]>(Array.isArray(stored) ? stored.filter((id) => typeof id === 'string') : [])

export const favorites = {
  /** Saved exercises, newest first; ids no longer in exercises.json are skipped. */
  list: (): Exercise[] => ids.flatMap((id) => exerciseById(id) ?? []),
  has: (id: string) => ids.includes(id),
  toggle(id: string) {
    ids = ids.includes(id) ? ids.filter((x) => x !== id) : [id, ...ids]
    save(KEY, ids)
  },
}
