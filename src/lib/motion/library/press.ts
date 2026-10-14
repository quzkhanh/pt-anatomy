import type { Motion } from '../motion'
import { BENCH_HEIGHT, DIM, chestPoint, clone, feetOnFloor, gripBar, joints, key, supine } from './helpers'

const PELVIS_Z = 0.25
const BENCH = { length: 1.15, width: 0.3, centerZ: -0.1 }
const HALF_GRIP = 0.32
/** Shoulder-to-grip distance at lockout as a share of arm length: elbows straight but not snapped shut. */
const LOCKOUT_REACH = 0.995 * (DIM.upperArm + DIM.forearm + DIM.hand)
const BAR_OVER_SHOULDER = 0.04
const ELBOW_POLE: [number, number, number] = [0.7, -1, 0.45]
/** Shoulder blades pulled down and back into the bench, held for the whole set. */
const SCAPULA: [number, number] = [-0.015, -0.02]
/** Pronated grip: palms face the feet, knuckles to the ceiling. */
const FOREARM = 120

/** Flat barbell bench press: bar from lockout over the shoulders down to the lower chest. */
export function barbellBenchPress(): Motion {
  const top = feetOnFloor(supine(BENCH_HEIGHT, PELVIS_Z), 0.3, 0.78)
  top.scapula = { l: SCAPULA, r: SCAPULA }
  top.forearms = { l: FOREARM, r: FOREARM }
  const bottom = clone(top)
  const shoulder = joints(top).l.shoulder
  const across = HALF_GRIP - shoulder.x
  const rise = Math.sqrt(LOCKOUT_REACH ** 2 - across ** 2 - BAR_OVER_SHOULDER ** 2)
  gripBar(top, [0, shoulder.y + rise, shoulder.z + BAR_OVER_SHOULDER], HALF_GRIP, ELBOW_POLE)
  gripBar(bottom, chestPoint(bottom, [0, 0.03, 0.12]), HALF_GRIP, ELBOW_POLE)
  return {
    keys: [key(0, top, 'Hạ tạ'), key(0.5, bottom, 'Đẩy lên'), key(0.85, top, 'Nghỉ')],
    props: [
      { kind: 'block', center: [0, BENCH_HEIGHT / 2, BENCH.centerZ], size: [BENCH.width, BENCH_HEIGHT, BENCH.length] },
      { kind: 'barbell', at: 'grips' },
    ],
    seconds: 3.4,
  }
}
