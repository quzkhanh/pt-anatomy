import type { Exercise, Muscle, MusclePart } from './content-types'

export type Tab = 'body' | 'exercises' | 'favorites'

/** `navigate` marks a selection made from a list or link (not a tap on the model): the body tab
 * then turns the camera towards it and reveals its layer. */
export type Selection =
  | { kind: 'muscle'; muscle: Muscle; part: MusclePart | null; navigate: boolean }
  | { kind: 'exercise'; exercise: Exercise; navigate: boolean }

export const app = $state<{ tab: Tab; selection: Selection | null; credits: boolean }>({
  tab: 'body',
  selection: null,
  credits: false,
})

export function openMuscle(muscle: Muscle) {
  app.selection = { kind: 'muscle', muscle, part: null, navigate: true }
  app.tab = 'body'
}

export function openExercise(exercise: Exercise) {
  app.selection = { kind: 'exercise', exercise, navigate: true }
  app.tab = 'body'
}
