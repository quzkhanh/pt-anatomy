import type { Motion } from '../motion'
import type { Vec } from '../pose'
import { SIDES, sideSign } from '../skeleton'
import { chestPoint, clone, gripBar, key, stand } from './helpers'

/** Feet a little wider than the shoulders, toes turned out (ACE). */
const STANCE = 0.23
const TOE_OUT = 20
const BAR_HALF_GRIP = 0.38
/** High bar on the upper trapezius, just above and behind the shoulder joints. */
const BAR_ON_BACK: Vec = [0, 0.19, -0.08]
/** Shoulder blades squeezed together under the bar. */
const SCAPULA: [number, number] = [0, -0.02]
/** Pronated grip: palms forward against the bar. */
const FOREARM = 70
/** Elbows down and back; the medial lean keeps the arm's flexor side well defined with the elbow deeply bent. */
const ELBOW_POLE: Vec = [-0.9, -1, -0.2]
/** Knees track the toes; the upward lean keeps the front of the thigh facing up near horizontal. */
const KNEE_POLE: Vec = [0.49, 0.6, 0.94]
/** Standing under the bar: hips a touch forward and trunk a touch inclined so the bar sits over mid-foot. */
const TOP = { drop: 0.012, z: 0.04, lean: 7 }
/** Hip joint about 4 cm under the knee joint, trunk ~40° forward, back straight. */
const BOTTOM = { pelvis: [0, 0.42, -0.22] as Vec, lean: 40 }

/** High-bar back squat just below parallel, bar over mid-foot the whole way. */
export function barbellBackSquat(): Motion {
  const top = stand(STANCE, TOE_OUT)
  for (const side of SIDES) {
    const leg = top.legs[side]
    if ('pole' in leg) leg.pole = [sideSign(side) * KNEE_POLE[0], KNEE_POLE[1], KNEE_POLE[2]]
  }
  top.pelvis = [0, top.pelvis[1] - TOP.drop, TOP.z]
  top.pelvisRot = [TOP.lean, 0, 0]
  top.scapula = { l: SCAPULA, r: SCAPULA }
  top.forearms = { l: FOREARM, r: FOREARM }
  const bottom = clone(top)
  bottom.pelvis = BOTTOM.pelvis
  bottom.pelvisRot = [BOTTOM.lean, 0, 0]
  for (const p of [top, bottom]) gripBar(p, chestPoint(p, BAR_ON_BACK), BAR_HALF_GRIP, ELBOW_POLE)
  return {
    keys: [key(0, top, 'Hạ xuống'), key(0.5, bottom, 'Đứng lên'), key(0.88, top, 'Nghỉ')],
    props: [{ kind: 'barbell', at: 'grips' }],
    seconds: 3.4,
  }
}
