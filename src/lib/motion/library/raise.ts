import type { Motion } from '../motion'
import { armsAngles, clone, key, stand } from './helpers'

/** Shoulder blades held down and back for the whole set (ACE). */
const SCAPULA: [number, number] = [-0.01, -0.01]

/** Dumbbell lateral raise: arms rise out to the side to shoulder height, elbows softly bent. */
export function dumbbellLateralRaise(): Motion {
  const down = armsAngles(stand(0.12), { flex: 0, abd: 12, bend: 10 })
  down.scapula = { l: SCAPULA, r: SCAPULA }
  const up = clone(down)
  armsAngles(up, { flex: 10, abd: 88, bend: 15 })
  // Neutral forearms: palms face the thighs at the bottom and the floor at the top, handles front-to-back.
  for (const p of [down, up]) p.forearms = { l: 90, r: 90 }
  return {
    keys: [key(0, down, 'Dang lên'), key(0.4, up, 'Hạ xuống'), key(0.9, down, 'Nghỉ')],
    props: [
      { kind: 'dumbbell', at: 'gripL' },
      { kind: 'dumbbell', at: 'gripR' },
    ],
    seconds: 3.2,
  }
}
