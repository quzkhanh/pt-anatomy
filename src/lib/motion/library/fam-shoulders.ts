import type { Motion, PropSpec } from '../motion'
import type { LimbAngles } from '../pose'
import { sideSign } from '../skeleton'
import {
  armsAngles,
  BENCH_HEIGHT,
  clone,
  DIM,
  feetOnFloor,
  forearms,
  gripBar,
  gripEach,
  joints,
  key,
  stand,
  type Pose,
  type Vec,
} from './helpers'

/** Hip joint height above a seat (the pelvis sphere then rests on the seat top). */
const SEATED_PELVIS_LIFT = 0.08
const SEATED_FEET = { halfWidth: 0.2, z: 0.45, kneePole: [0, 0.5, 1] as Vec }
const SEAT = { width: 0.34, back: -0.17, front: 0.22 }
/** Trunk surface behind the joint line (mannequin torso half-depth), for back pads. */
const TRUNK_HALF_DEPTH = 0.105
const PAD_THICKNESS = 0.06
/** Fraction of the full arm length a straight arm reaches: about 7° of elbow bend, so IK stays solvable. */
const STRAIGHT_REACH = 0.998
const ARM = DIM.upperArm + DIM.forearm + DIM.hand

/**
 * Scapular retraction shown as the shoulder joint moving back 3 cm in the chest frame (estimate: the
 * model moves the shoulder only along the chest axes, not medially).
 */
const RETRACTION = -0.03

/** Forearm rotation: 90 = neutral (thumb up, palm towards the midline), 180 = pronated (overhand). */
const NEUTRAL = 90
const PRONATED = 180

/** Same scapula offset [elevation, protraction] in metres on both sides. */
function scapulae(pose: Pose, elevation: number, protraction: number): Pose {
  pose.scapula = { l: [elevation, protraction], r: [elevation, protraction] }
  return pose
}

/** Seated upright on a bench whose top is `BENCH_HEIGHT`, feet flat in front. */
function seated(): Pose {
  const pose = stand()
  pose.pelvis = [0, BENCH_HEIGHT + SEATED_PELVIS_LIFT, 0]
  return feetOnFloor(pose, SEATED_FEET.halfWidth, SEATED_FEET.z, SEATED_FEET.kneePole)
}

const seatBlock: PropSpec = {
  kind: 'block',
  center: [0, BENCH_HEIGHT / 2, (SEAT.back + SEAT.front) / 2],
  size: [SEAT.width, BENCH_HEIGHT, SEAT.front - SEAT.back],
}

/** Grip height above the shoulder joint for a near-straight arm, `out` and `fwd` metres off the shoulder. */
const overheadRise = (out: number, fwd: number) => Math.sqrt((ARM * STRAIGHT_REACH) ** 2 - out ** 2 - fwd ** 2)

const OHP_STANCE = 0.15
const OHP_HEAD_BACK = -12
/**
 * Arm angles fitted so both grips stay about 0.24 m from the midline. Overhand (pronated) grip; in the
 * front rack the wrist extends so the bar rests on the front of the shoulders.
 */
const OHP_RACK: LimbAngles = { flex: 27, abd: 12, rot: 21, bend: 137 }
const OHP_RACK_WRIST = -55
const OHP_FOREHEAD: LimbAngles = { flex: 78, abd: 13, rot: 8, bend: 128 }
const OHP_LOCKOUT: LimbAngles = { flex: 175, abd: 6, rot: -11, bend: 6 }

/**
 * Standing barbell overhead press: bar from the front of the shoulders straight up to lockout over the
 * shoulders. The head tilts back as the bar passes the face and comes through once it clears the forehead.
 * Arms use joint angles because the bar rests on the shoulders with the wrists bent back, which the
 * straight-wrist IK cannot reach.
 */
function standingBarbellOverheadPress(): Motion {
  const rack = forearms(armsAngles(stand(OHP_STANCE), OHP_RACK), PRONATED)
  rack.wrists = { l: OHP_RACK_WRIST, r: OHP_RACK_WRIST }
  const forehead = forearms(armsAngles(stand(OHP_STANCE), OHP_FOREHEAD), PRONATED)
  forehead.neck = OHP_HEAD_BACK
  const lockout = forearms(armsAngles(stand(OHP_STANCE), OHP_LOCKOUT), PRONATED)
  return {
    keys: [
      key(0, rack, 'Đẩy lên'),
      key(0.17, forehead, 'Đẩy lên'),
      key(0.36, lockout, 'Hạ xuống'),
      key(0.6, forehead, 'Hạ xuống'),
      key(0.82, rack, 'Nghỉ'),
    ],
    props: [{ kind: 'barbell', at: 'grips' }],
    seconds: 3.8,
  }
}

/** Upper arms in the scapular plane, about 30° in front of the frontal plane. */
const SCAPULAR_PLANE = (30 * Math.PI) / 180
/**
 * `lowTurn`/`topTurn`: forearm rotation that faces the palms forward (pronated grip) with the IK elbow
 * poles used below.
 */
const DB_PRESS = { lowReach: 0.245, lowRise: 0.15, topOut: 0.22, topFwd: 0.03, lowTurn: 118, topTurn: 107 }

/**
 * Seated dumbbell shoulder press against a vertical back rest (Campos et al. 2020 used a 90° bench):
 * dumbbells from shoulder level to lockout overhead, pronated grip (palms forward, ACE) with the elbows
 * in the scapular plane.
 */
function seatedDumbbellShoulderPress(): Motion {
  const low = seated()
  const shoulder = joints(low).l.shoulder
  const high = clone(low)
  const lowOut = shoulder.x + DB_PRESS.lowReach * Math.cos(SCAPULAR_PLANE)
  const lowFwd = shoulder.z + DB_PRESS.lowReach * Math.sin(SCAPULAR_PLANE)
  gripEach(low, (side) => [sideSign(side) * lowOut, shoulder.y + DB_PRESS.lowRise, lowFwd], [0.3, -1, 0.1])
  forearms(low, DB_PRESS.lowTurn)
  const rise = overheadRise(DB_PRESS.topOut - shoulder.x, DB_PRESS.topFwd)
  gripEach(high, (side) => [sideSign(side) * DB_PRESS.topOut, shoulder.y + rise, shoulder.z + DB_PRESS.topFwd], [1, -0.4, 0.3])
  forearms(high, DB_PRESS.topTurn)
  const padTop = joints(low).head.y + 0.08
  return {
    keys: [key(0, low, 'Đẩy lên'), key(0.38, high, 'Hạ xuống'), key(0.86, low, 'Nghỉ')],
    props: [
      seatBlock,
      {
        kind: 'block',
        center: [0, (BENCH_HEIGHT + padTop) / 2, -TRUNK_HALF_DEPTH - PAD_THICKNESS / 2],
        size: [SEAT.width, padTop - BENCH_HEIGHT, PAD_THICKNESS],
      },
      { kind: 'dumbbell', at: 'gripL' },
      { kind: 'dumbbell', at: 'gripR' },
    ],
    seconds: 3.4,
  }
}

const CABLE_COLUMN = { x: 0.5, z: 0.12, height: 2.0, pulleyY: 0.12 }

/** Single-arm cable lateral raise (right arm), low pulley on the left; the cable starts across the front of the hips. */
function cableLateralRaise(): Motion {
  const down = stand(0.12)
  down.arms.l = { target: [CABLE_COLUMN.x - 0.03, 1.1, CABLE_COLUMN.z], pole: [1, -0.4, -1] }
  down.forearms = { r: NEUTRAL }
  const up = clone(down)
  down.arms.r = { flex: 15, abd: -12, bend: 15 }
  up.arms.r = { flex: 12, abd: 88, bend: 15 }
  return {
    keys: [key(0, down, 'Dang lên'), key(0.4, up, 'Hạ xuống'), key(0.9, down, 'Nghỉ')],
    props: [
      { kind: 'rod', from: [CABLE_COLUMN.x, 0, CABLE_COLUMN.z], to: [CABLE_COLUMN.x, CABLE_COLUMN.height, CABLE_COLUMN.z], radius: 0.03 },
      { kind: 'cable', from: [CABLE_COLUMN.x - 0.04, CABLE_COLUMN.pulleyY, CABLE_COLUMN.z], to: 'gripR' },
    ],
    seconds: 3.2,
  }
}

/**
 * Dumbbell front raise, overhand grip (palms facing the thighs, ACE): both arms rise in front from the
 * fronts of the thighs to shoulder height with a soft elbow.
 */
function dumbbellFrontRaise(): Motion {
  const down = forearms(armsAngles(stand(0.15), { flex: 6, abd: 2, bend: 10 }), PRONATED)
  const up = clone(down)
  armsAngles(up, { flex: 90, abd: 2, bend: 10 })
  return {
    keys: [key(0, down, 'Nâng lên'), key(0.4, up, 'Hạ xuống'), key(0.9, down, 'Nghỉ')],
    props: [
      { kind: 'dumbbell', at: 'gripL' },
      { kind: 'dumbbell', at: 'gripR' },
    ],
    seconds: 3.2,
  }
}

const BENT_OVER = { pelvis: [0, 0.83, -0.26] as Vec, pitch: 75, spine: 5 }
/** Elbows point out (upper arm turned in) so the soft elbow bend folds the forearm towards the midline. */
const ELBOWS_OUT = -90

/**
 * Bent-over rear delt fly: trunk near parallel to the floor, arms hanging straight down, then raised out
 * to the sides in an arc until level with the shoulders; the shoulder blades retract as the weights rise
 * (Wikipedia, Rear delt raise).
 */
function bentOverRearDeltFly(): Motion {
  const down = stand(0.12)
  down.pelvis = BENT_OVER.pelvis
  down.pelvisRot = [BENT_OVER.pitch, 0, 0]
  down.spine = [BENT_OVER.spine, 0, 0]
  const hang = BENT_OVER.pitch + BENT_OVER.spine
  const up = clone(down)
  armsAngles(down, { flex: hang, abd: 6, rot: ELBOWS_OUT, bend: 15 })
  armsAngles(up, { flex: hang, abd: 88, rot: ELBOWS_OUT, bend: 15 })
  scapulae(up, 0, RETRACTION)
  return {
    keys: [key(0, down, 'Dang lên'), key(0.4, up, 'Hạ xuống'), key(0.9, down, 'Nghỉ')],
    props: [
      { kind: 'dumbbell', at: 'gripL' },
      { kind: 'dumbbell', at: 'gripR' },
    ],
    seconds: 3.2,
  }
}

const PEC_DECK = { pivotY: 1.45, columnZ: 0.78, padBottom: 0.66, padTop: 0.95, padWidth: 0.3 }

/**
 * Reverse pec deck: seated facing the chest pad, arms forward at shoulder height, then opened in the
 * horizontal plane until in line with the trunk, shoulder blades retracting. The machine arms pivot on
 * vertical axes above the shoulders.
 */
function reversePecDeck(): Motion {
  const front = seated()
  const back = clone(front)
  armsAngles(front, { flex: 90, abd: 5, rot: ELBOWS_OUT, bend: 15 })
  armsAngles(back, { flex: 90, abd: 88, rot: ELBOWS_OUT, bend: 15 })
  scapulae(back, 0, RETRACTION)
  const sx = joints(front).l.shoulder.x
  const padZ = TRUNK_HALF_DEPTH + PAD_THICKNESS / 2
  return {
    keys: [key(0, front, 'Mở tay ra'), key(0.4, back, 'Đưa về'), key(0.9, front, 'Nghỉ')],
    props: [
      seatBlock,
      {
        kind: 'block',
        center: [0, (PEC_DECK.padBottom + PEC_DECK.padTop) / 2, padZ],
        size: [PEC_DECK.padWidth, PEC_DECK.padTop - PEC_DECK.padBottom, PAD_THICKNESS],
      },
      { kind: 'rod', from: [0, 0, padZ], to: [0, PEC_DECK.padBottom, padZ], radius: 0.025 },
      { kind: 'rod', from: [0, 0, PEC_DECK.columnZ], to: [0, PEC_DECK.pivotY, PEC_DECK.columnZ], radius: 0.03 },
      { kind: 'rod', from: [0, PEC_DECK.pivotY, PEC_DECK.columnZ], to: [0, PEC_DECK.pivotY, 0], radius: 0.025 },
      { kind: 'rod', from: [-sx, PEC_DECK.pivotY, 0], to: [sx, PEC_DECK.pivotY, 0], radius: 0.025 },
      { kind: 'cable', from: [sx, PEC_DECK.pivotY, 0], to: 'gripL' },
      { kind: 'cable', from: [-sx, PEC_DECK.pivotY, 0], to: 'gripR' },
    ],
    seconds: 3.2,
  }
}

/** The rope is taken at arm's length with a soft elbow (about 16°). */
const FACE_PULL_REACH = 0.99
const FACE_PULL = { pulley: [0, 1.72, 1.15] as Vec, reachHalf: 0.08, reachY: 1.55, rowHalf: 0.12, rowY: 1.45, rowZ: 0.3, endHalf: 0.26, endY: 1.67, endZ: 0.08 }

/**
 * Face pull with a rope from a pulley just above face height: row to the face with the elbows flared
 * high, then rotate the shoulders out so the hands finish beside the head with the shoulder blades
 * pulled together.
 */
function facePull(): Motion {
  const reach = stand(0.15)
  const shoulder = joints(reach).l.shoulder
  const row = scapulae(clone(reach), 0, RETRACTION / 2)
  const open = scapulae(clone(reach), 0, RETRACTION)
  const reachZ = Math.sqrt((ARM * FACE_PULL_REACH) ** 2 - (shoulder.x - FACE_PULL.reachHalf) ** 2 - (FACE_PULL.reachY - shoulder.y) ** 2)
  gripBar(reach, [0, FACE_PULL.reachY, shoulder.z + reachZ], FACE_PULL.reachHalf, [1, -0.3, -0.3])
  gripBar(row, [0, FACE_PULL.rowY, FACE_PULL.rowZ], FACE_PULL.rowHalf, [1, 0.05, -0.5])
  gripBar(open, [0, FACE_PULL.endY, FACE_PULL.endZ], FACE_PULL.endHalf, [1, -0.1, -0.4])
  const [px, , pz] = FACE_PULL.pulley
  return {
    keys: [
      key(0, reach, 'Kéo về'),
      key(0.2, row, 'Xoay ngoài'),
      key(0.34, open, 'Trả về'),
      key(0.54, row, 'Duỗi tay ra'),
      key(0.8, reach, 'Nghỉ'),
    ],
    props: [
      { kind: 'rod', from: [px, 0, pz + 0.04], to: [px, 2.0, pz + 0.04], radius: 0.03 },
      { kind: 'cable', from: FACE_PULL.pulley, to: 'gripL' },
      { kind: 'cable', from: FACE_PULL.pulley, to: 'gripR' },
    ],
    seconds: 3.8,
  }
}

/** `turn`: forearm rotation that gives the overhand grip (palms towards the body) with the elbows-out poles. */
const UPRIGHT_ROW = { halfGrip: 0.22, lowZ: 0.12, highY: 1.25, highZ: 0.14, turn: 90 }

/** Barbell upright row, overhand grip about shoulder width: bar pulled close to the body up to chest level, elbows leading. */
function uprightRow(): Motion {
  const low = forearms(stand(0.15), UPRIGHT_ROW.turn)
  const shoulder = joints(low).l.shoulder
  const high = clone(low)
  const drop = Math.sqrt((ARM * STRAIGHT_REACH) ** 2 - (UPRIGHT_ROW.halfGrip - shoulder.x) ** 2 - UPRIGHT_ROW.lowZ ** 2)
  gripBar(low, [0, shoulder.y - drop, UPRIGHT_ROW.lowZ], UPRIGHT_ROW.halfGrip, [1, 0.6, -0.3])
  gripBar(high, [0, UPRIGHT_ROW.highY, UPRIGHT_ROW.highZ], UPRIGHT_ROW.halfGrip, [1, 0.6, -0.3])
  return {
    keys: [key(0, low, 'Kéo lên'), key(0.4, high, 'Hạ xuống'), key(0.88, low, 'Nghỉ')],
    props: [{ kind: 'barbell', at: 'grips' }],
    seconds: 3.2,
  }
}

/** Elbow at 90° tucked against the side; `rot` + turns the forearm out, − across the belly. */
const tuckedForearm = (rot: number): LimbAngles => ({ flex: 0, abd: 3, rot, bend: 90 })
const ROTATION = { inward: -40, outward: 45, pulleyY: 1.1, pulleyZ: 0.25, columnX: 0.8 }

/** Right-arm cable rotation with the machine on `machineSide`; the arm turns from `from` to `to` (degrees). */
function cableRotation(machineSide: 1 | -1, from: number, to: number, phase: string): Motion {
  const start = forearms(stand(0.15), NEUTRAL)
  const end = clone(start)
  start.arms.r = tuckedForearm(from)
  end.arms.r = tuckedForearm(to)
  const x = machineSide * ROTATION.columnX
  return {
    keys: [key(0, start, phase), key(0.3, end, 'Giữ'), key(0.55, clone(end), 'Trả về'), key(0.92, start, 'Nghỉ')],
    props: [
      { kind: 'rod', from: [x, 0, ROTATION.pulleyZ], to: [x, 2.0, ROTATION.pulleyZ], radius: 0.03 },
      { kind: 'cable', from: [x - machineSide * 0.04, ROTATION.pulleyY, ROTATION.pulleyZ], to: 'gripR' },
    ],
    seconds: 4,
  }
}

/** Working arm on the far side from the machine: the hand turns out against the cable. */
const cableExternalRotation = () => cableRotation(1, ROTATION.inward, ROTATION.outward, 'Xoay ra ngoài')
/** Working arm on the machine side: the hand turns in across the belly against the cable. */
const cableInternalRotation = () => cableRotation(-1, ROTATION.outward, ROTATION.inward, 'Xoay vào trong')

/**
 * Shoulder elevation in a loaded shrug. Estimate: under load the range is smaller than a free shrug
 * (Wikipedia, Shoulder shrug), so about half of the shoulder girdle's free elevation.
 */
const SHRUG_ELEVATION = 0.06
/** Slight knee bend for the barbell shrug: the hips drop this much from standing. */
const SOFT_KNEE_DROP = 0.015

/** Shrug from `bottom`: only the shoulder blades rise; arms hang straight and follow the shoulders. */
function shrug(bottom: Pose, props: PropSpec[]): Motion {
  const top = scapulae(clone(bottom), SHRUG_ELEVATION, 0)
  return {
    keys: [key(0, bottom, 'Nhún lên'), key(0.35, top, 'Hạ xuống'), key(0.85, bottom, 'Nghỉ')],
    props,
    seconds: 3,
  }
}

/** Barbell shrug: overhand grip about shoulder width, bar in front of the thighs, knees soft, back straight. */
function barbellShrug(): Motion {
  const bottom = forearms(armsAngles(stand(0.15), { flex: 9, abd: 3, bend: 4 }), PRONATED)
  bottom.pelvis = [0, bottom.pelvis[1] - SOFT_KNEE_DROP, 0]
  return shrug(bottom, [{ kind: 'barbell', at: 'grips' }])
}

/** Dumbbell shrug: dumbbells at the sides of the thighs, palms facing the body, elbows straight. */
function dumbbellShrug(): Motion {
  return shrug(forearms(armsAngles(stand(0.15), { flex: 0, abd: 8, bend: 3 }), NEUTRAL), [
    { kind: 'dumbbell', at: 'gripL' },
    { kind: 'dumbbell', at: 'gripR' },
  ])
}

export const motions: Record<string, () => Motion> = {
  'standing-barbell-overhead-press': standingBarbellOverheadPress,
  'seated-dumbbell-shoulder-press': seatedDumbbellShoulderPress,
  'cable-lateral-raise': cableLateralRaise,
  'dumbbell-front-raise': dumbbellFrontRaise,
  'bent-over-rear-delt-fly': bentOverRearDeltFly,
  'reverse-pec-deck': reversePecDeck,
  'face-pull': facePull,
  'upright-row': uprightRow,
  'cable-external-rotation': cableExternalRotation,
  'cable-internal-rotation': cableInternalRotation,
  'barbell-shrug': barbellShrug,
  'dumbbell-shrug': dumbbellShrug,
}
