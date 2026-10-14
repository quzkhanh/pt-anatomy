import { app } from './app-state.svelte'
import type { Viewer } from './viewer/viewer'

export type SkeletonState = 'off' | 'loading' | 'on' | 'error'

export const skeleton = $state<{ state: SkeletonState }>({ state: 'off' })

export async function toggleSkeleton(viewer: Viewer) {
  if (skeleton.state === 'on') {
    skeleton.state = 'off'
    // A bone's sheet has nothing to point at once the bones are hidden.
    if (app.selection?.kind === 'bone') app.selection = null
    await viewer.setSkeleton(false)
    return
  }
  skeleton.state = 'loading'
  try {
    await viewer.setSkeleton(true)
    skeleton.state = 'on'
  } catch (error) {
    console.error(error)
    skeleton.state = 'error'
  }
}

/** A viewer rebuilt after a lost context comes back in the mode the user left it in. */
export async function restoreSkeleton(viewer: Viewer) {
  if (skeleton.state === 'on') await viewer.setSkeleton(true).catch(() => (skeleton.state = 'error'))
}
