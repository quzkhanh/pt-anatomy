import type { Motion } from '../motion'
import { motions as arms } from './fam-arms'
import { motions as back } from './fam-back'
import { motions as chest } from './fam-chest'
import { motions as core } from './fam-core'
import { motions as legsA } from './fam-legs-a'
import { motions as legsB } from './fam-legs-b'
import { motions as shoulders } from './fam-shoulders'
import { crunch, pushUp } from './floor'
import { pullUp } from './hang'
import { romanianDeadlift } from './hinge'
import { barbellBenchPress } from './press'
import { seatedCableRow } from './pull'
import { dumbbellLateralRaise } from './raise'
import { barbellBackSquat } from './squat'

/** Exercise id → motion builder. Built lazily: only the exercise on screen pays for its poses. */
export const MOTIONS: Partial<Record<string, () => Motion>> = {
  'barbell-back-squat': barbellBackSquat,
  'barbell-bench-press': barbellBenchPress,
  'pull-up': pullUp,
  'push-up': pushUp,
  crunch,
  'seated-cable-row': seatedCableRow,
  'dumbbell-lateral-raise': dumbbellLateralRaise,
  'romanian-deadlift': romanianDeadlift,
  ...chest,
  ...shoulders,
  ...back,
  ...arms,
  ...core,
  ...legsA,
  ...legsB,
}
