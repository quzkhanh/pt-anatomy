import type { Motion } from '../motion'
import type { Vec } from '../pose'
import { DIM, clone, gripBar, key, legsAngles, stand } from './helpers'

const BAR_Y = 2.3
const BAR_Z = 0.06
const HALF_GRIP = 0.4
const UPRIGHT_X = 0.75
/** Hip joint to shoulder joint along an upright trunk. */
const TRUNK = DIM.pelvisToSpine + DIM.spineToChest + DIM.chestToShoulder
const ARM = DIM.upperArm + DIM.forearm + DIM.hand
/** Shoulder-to-grip distance in the hang as a share of arm length: elbows straight but not locked. */
const HANG_REACH = 0.995
/** Shoulder joints this far under the bar at the top, so the chin is level with the bar (ACE). */
const TOP_DROP = 0.09
/**
 * Elbows out to the sides and down towards the floor (ACE: 3 and 9 o'clock). The downward lean keeps the
 * arm's flexor side defined both overhead and with the elbows bent.
 */
const ELBOW_POLE: Vec = [0.3, -1, 0]
/** Shoulder blades held down and back (ACE), drawn further down and together as the body rises. */
const SCAPULA_HANG: [number, number] = [-0.01, 0]
const SCAPULA_TOP: [number, number] = [-0.025, -0.02]
/** Pronated grip, palms facing forward. */
const FOREARM = 110

/** Pull-up: from a dead hang (arms straight) until the chin is level with the bar. */
export function pullUp(): Motion {
  const bottom = legsAngles(stand(), { flex: 8, abd: 4, bend: 25 })
  bottom.scapula = { l: SCAPULA_HANG, r: SCAPULA_HANG }
  bottom.forearms = { l: FOREARM, r: FOREARM }
  const reach = Math.sqrt((ARM * HANG_REACH) ** 2 - (HALF_GRIP - DIM.shoulderHalfWidth) ** 2 - (BAR_Z + 0.04) ** 2)
  bottom.pelvis = [0, BAR_Y - reach - TRUNK - SCAPULA_HANG[0], -0.04]
  const top = clone(bottom)
  top.scapula = { l: SCAPULA_TOP, r: SCAPULA_TOP }
  top.pelvis = [0, BAR_Y - TOP_DROP - TRUNK - SCAPULA_TOP[0], -0.02]
  top.pelvisRot = [-6, 0, 0]
  for (const p of [bottom, top]) gripBar(p, [0, BAR_Y, BAR_Z], HALF_GRIP, ELBOW_POLE)
  return {
    keys: [key(0, bottom, 'Kéo lên'), key(0.4, top, 'Hạ xuống'), key(0.9, bottom, 'Treo')],
    props: [
      { kind: 'rod', from: [-UPRIGHT_X, BAR_Y, BAR_Z], to: [UPRIGHT_X, BAR_Y, BAR_Z], radius: 0.016 },
      { kind: 'rod', from: [-UPRIGHT_X, 0, BAR_Z], to: [-UPRIGHT_X, BAR_Y, BAR_Z], radius: 0.03 },
      { kind: 'rod', from: [UPRIGHT_X, 0, BAR_Z], to: [UPRIGHT_X, BAR_Y, BAR_Z], radius: 0.03 },
    ],
    seconds: 3.4,
  }
}
