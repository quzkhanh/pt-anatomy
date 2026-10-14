import type { Motion } from '../motion'
import type { Vec } from '../pose'
import { clone, gripBar, key, pelvisPoint, stand } from './helpers'

const SEAT_Y = 0.42
const CABLE_FROM: Vec = [0, 0.42, 1.3]
const HALF_GRIP = 0.07
const ELBOW_POLE: Vec = [0.15, -0.4, -1]
const ANKLE: Vec = [0.12, 0.38, 0.78]
/** Feet braced on the plates, toes up; the plates are tilted to the same angle so the soles sit flat on them. */
const FOOT_PITCH = -55
const PLATE = { size: [0.14, 0.32, 0.04] as Vec, center: [0.12, 0.381, 0.888] as Vec }
/** Machine base the plates hang from, with the low pulley on top. */
const BASE = { size: [0.4, 0.4, 0.4] as Vec, center: [0, 0.2, 1.15] as Vec }
/** Arms long at the front (shoulder blades let forward), handle on the stomach at the back. */
const REACH_GRIP: Vec = [0, 0.72, 0.632]
const ROW_GRIP: Vec = [0, 0.16, 0.17]
/** Scapulae [elevation, protraction] in metres: drawn forward at full reach, squeezed back at the finish. */
const SCAPULA_REACH: [number, number] = [0, 0.03]
const SCAPULA_ROW: [number, number] = [-0.01, -0.03]
/** Neutral grip on the narrow handle: palms face each other. */
const FOREARM = 90

/** Seated cable row: trunk fixed upright, handle pulled from arms' length to the stomach, elbows close to the ribs. */
export function seatedCableRow(): Motion {
  const reach = stand()
  reach.pelvis = [0, SEAT_Y + 0.08, 0]
  for (const side of ['l', 'r'] as const) {
    const s = side === 'l' ? 1 : -1
    reach.legs[side] = { target: [s * ANKLE[0], ANKLE[1], ANKLE[2]], pole: [0, 1, 0.2] }
    reach.feet[side] = { fwd: [0, 0, 1], pitch: FOOT_PITCH }
  }
  reach.scapula = { l: SCAPULA_REACH, r: SCAPULA_REACH }
  reach.forearms = { l: FOREARM, r: FOREARM }
  const row = clone(reach)
  row.scapula = { l: SCAPULA_ROW, r: SCAPULA_ROW }
  gripBar(reach, REACH_GRIP, HALF_GRIP, ELBOW_POLE)
  gripBar(row, pelvisPoint(row, ROW_GRIP), HALF_GRIP, ELBOW_POLE)
  const plateRot: Vec = [90 + FOOT_PITCH, 0, 0]
  return {
    keys: [key(0, reach, 'Kéo về'), key(0.25, row, 'Giữ'), key(0.5, row, 'Duỗi tay ra'), key(0.92, reach, 'Nghỉ')],
    props: [
      { kind: 'block', center: [0, SEAT_Y / 2, -0.1], size: [0.35, SEAT_Y, 0.6] },
      { kind: 'block', center: PLATE.center, size: PLATE.size, rot: plateRot },
      { kind: 'block', center: [-PLATE.center[0], PLATE.center[1], PLATE.center[2]], size: PLATE.size, rot: plateRot },
      { kind: 'block', center: BASE.center, size: BASE.size },
      { kind: 'cable', from: CABLE_FROM, to: 'grips' },
    ],
    seconds: 4,
  }
}
