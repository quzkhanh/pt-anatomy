import type { Equipment, Exercise, Muscle, MusclePart } from './content-types'

export type Tab = 'body' | 'exercises' | 'favorites'
export type MuscleTab = 'exercises' | 'details'

/** Where in a muscle's sheet an exercise was opened, so the exercise header can lead back there. */
export interface MuscleOrigin {
  muscle: Muscle
  tab: MuscleTab
  equipment: Equipment | null
}

/** `navigate` marks a selection made from a list or link (not a tap on the model): the body tab
 * then turns the camera towards it and reveals its layer. */
export type Selection =
  | { kind: 'muscle'; muscle: Muscle; part: MusclePart | null; navigate: boolean; restore?: Omit<MuscleOrigin, 'muscle'> }
  | { kind: 'exercise'; exercise: Exercise; navigate: boolean; from?: MuscleOrigin }

export const app = $state<{ tab: Tab; selection: Selection | null; credits: boolean }>({
  tab: 'body',
  selection: null,
  credits: false,
})

export function openMuscle(muscle: Muscle) {
  app.selection = { kind: 'muscle', muscle, part: null, navigate: true }
  app.tab = 'body'
}

export function openExercise(exercise: Exercise, from?: MuscleOrigin) {
  app.selection = { kind: 'exercise', exercise, navigate: true, from }
  app.tab = 'body'
}

export function backToMuscle({ muscle, tab, equipment }: MuscleOrigin) {
  app.selection = { kind: 'muscle', muscle, part: null, navigate: false, restore: { tab, equipment } }
}
