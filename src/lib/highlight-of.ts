import type { Selection } from './app-state.svelte'
import { isSuperficial, muscles } from './content'
import { refCovers } from './refs'
import { NO_HIGHLIGHT, type Highlight } from './viewer/highlight'

export function highlightOf(selection: Selection | null): Highlight {
  if (!selection) return NO_HIGHLIGHT
  if (selection.kind === 'muscle') return { primary: [selection.muscle.id], secondary: [] }
  return { primary: selection.exercise.primary, secondary: selection.exercise.secondary }
}

/** Which layer setting shows the parts named by `refs`; null when they are mixed. */
export function layerFor(refs: string[]): 'deep' | 'shallow' | null {
  const parts = muscles.flatMap((muscle) =>
    muscle.parts.filter((part) => refs.some((r) => refCovers(r, muscle.id, part.id))).map((part) => ({ muscle, part })),
  )
  if (parts.every((p) => !isSuperficial(p))) return 'deep'
  if (parts.every((p) => isSuperficial(p))) return 'shallow'
  return null
}
