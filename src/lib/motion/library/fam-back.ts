import { Vector3 } from 'three'
import type { Motion, PropSpec } from '../motion'
import type { LimbAngles } from '../pose'
import { sideSign, type Side } from '../skeleton'
import {
  armsAngles,
  BENCH_HEIGHT,
  chestPoint,
  clone,
  DIM,
  feetOnFloor,
  FLOOR_ANKLE_Y,
  forearms,
  gripBar,
  gripEach,
  joints,
  key,
  legsAngles,
  pelvisPoint,
  prone,
  rad,
  stand,
  type Pose,
  type Vec,
} from './helpers'

const ARM = DIM.upperArm + DIM.forearm + DIM.hand
const LEG = DIM.thigh + DIM.shank
/** Hip joint to shoulder joint along an upright trunk. */
const TRUNK = DIM.pelvisToSpine + DIM.spineToChest + DIM.chestToShoulder
/** A "straight" arm reaches this fraction of its length: elbow about 12° short of lockout. */
const STRAIGHT = 0.995

/** Shoulder girdle offsets, metres in the chest frame: [elevation, protraction]. */
const SCAPULA = {
  /** Pulled down and back, held through the set. */
  set: [-0.015, -0.015],
  /** Allowed to rise at the stretch of a pulldown. */
  raised: [0.02, 0],
  /** Drawn forward by a hanging load at the bottom of a row. */
  reached: [0, 0.025],
  /** Squeezed together at the top of a row. */
  squeezed: [-0.01, -0.03],
} satisfies Record<string, [number, number]>

function scapulae(pose: Pose, offset: [number, number]): Pose {
  pose.scapula = { l: [...offset], r: [...offset] }
  return pose
}
const toVec = (v: Vector3): Vec => [v.x, v.y, v.z]

/** Forearm rotation (Pose.forearms): overhand grip and thumb-up grip. */
const PRONATED = 180
const NEUTRAL = 90
/** Turn that faces the palm to the body for a dumbbell rowed with its elbow pole tipped back (handle along the body). */
const ROW_DUMBBELL_TURN = 60

/** Grip straight below (or above, `dir` 1) each shoulder at a straight arm's reach, hands `halfGrip` from the midline. */
function reachFromShoulders(pose: Pose, halfGrip: number, dir: 1 | -1 = -1, dz = 0) {
  const j = joints(pose)
  return (side: Side) => {
    const s = j[side].shoulder
    const dx = sideSign(side) * halfGrip - s.x
    return new Vector3(sideSign(side) * halfGrip, s.y + dir * Math.sqrt((ARM * STRAIGHT) ** 2 - dx * dx - dz * dz), s.z + dz)
  }
}

/* ---------- Hanging from a bar ---------- */

const PULL_BAR = { y: 2.3, z: 0.06, upright: 0.75 }
/** Shoulder joints this far below the bar put the chin level with it (ACE chin-up). */
const CHIN_OVER_BAR = 0.1

function pullUpFrame(): PropSpec[] {
  const { y, z, upright } = PULL_BAR
  return [
    { kind: 'rod', from: [-upright, y, z], to: [upright, y, z], radius: 0.016 },
    { kind: 'rod', from: [-upright, 0, z], to: [-upright, y, z], radius: 0.03 },
    { kind: 'rod', from: [upright, 0, z], to: [upright, y, z], radius: 0.03 },
  ]
}

/** Chin-up: palms facing the body, hands shoulder-width; elbows drive down in front of the trunk until the chin is level with the bar. */
function chinUp(): Motion {
  const half = 0.2
  const reach = Math.sqrt((ARM * STRAIGHT) ** 2 - (half - DIM.shoulderHalfWidth) ** 2)
  const bottom = scapulae(legsAngles(stand(), { flex: 8, abd: 4, bend: 25 }), SCAPULA.set)
  bottom.pelvis = [0, PULL_BAR.y - reach - TRUNK - SCAPULA.set[0], -0.03]
  const top = clone(bottom)
  top.pelvis = [0, PULL_BAR.y - CHIN_OVER_BAR - TRUNK, -0.02]
  top.pelvisRot = [-8, 0, 0]
  // The pole stays well off the upper arm at the top, where the elbow points down and back.
  for (const p of [bottom, top]) gripBar(p, [0, PULL_BAR.y, PULL_BAR.z], half, [0.3, -1, 0.5])
  return {
    keys: [key(0, bottom, 'Kéo lên'), key(0.4, top, 'Hạ xuống'), key(0.9, bottom, 'Treo')],
    props: pullUpFrame(),
    seconds: 3.4,
  }
}

/* ---------- Cable machines ---------- */

const PULLEY_Y = 2.3
const COLUMN_Z = 0.8

/** Upright column at `columnZ` in front of the person, its arm carrying the pulley the handle hangs from. */
function cableColumn(pulley: Vec, handle: number, columnZ = COLUMN_Z): PropSpec[] {
  return [
    { kind: 'handle', at: 'grips', length: handle },
    { kind: 'rod', from: [0, 0, columnZ], to: [0, pulley[1], columnZ], radius: 0.035 },
    { kind: 'rod', from: [0, pulley[1], columnZ], to: pulley, radius: 0.025 },
    { kind: 'cable', from: pulley, to: 'grips' },
  ]
}

const LAT_SEAT_Y = 0.46
/** Backward lean of the trunk on the lat machine, held constant through the pull (ACE: under 30°). */
const LAT_LEAN = -15

/**
 * Seated lat pulldown: thighs locked under the pad; from arms' length overhead the shoulder blades are drawn
 * down first, then the bar is pulled to the chest; on the way up they rise slightly at the stretch (ACE).
 * `poles` and `turn` (Pose.forearms) are for the overhead and bottom keys: the IK elbow plane decides what a
 * forearm angle means, so the turns are the ones that keep the palms facing the way the grip holds them.
 */
function latPulldown(halfGrip: number, handle: number, chestLocal: Vec, poles: [Vec, Vec], turn: [number, number]): Motion {
  const stretch = scapulae(forearms(feetOnFloor(stand(), 0.14, 0.42), turn[0]), SCAPULA.raised)
  stretch.pelvis = [0, LAT_SEAT_Y + 0.08, 0]
  stretch.pelvisRot = [LAT_LEAN, 0, 0]
  const set = scapulae(clone(stretch), SCAPULA.set)
  const bottom = forearms(clone(set), turn[1])
  const overhead = reachFromShoulders(stretch, halfGrip, 1, 0.08)('l')
  gripBar(stretch, [0, overhead.y, overhead.z], halfGrip, poles[0])
  const depressed = reachFromShoulders(set, halfGrip, 1, 0.08)('l')
  gripBar(set, [0, depressed.y, depressed.z], halfGrip, poles[0])
  gripBar(bottom, chestPoint(bottom, chestLocal), halfGrip, poles[1])
  const knee = joints(stretch).l.knee
  return {
    keys: [key(0, stretch, 'Hạ bả vai'), key(0.1, set, 'Kéo xuống'), key(0.45, bottom, 'Trả lên'), key(0.9, stretch, 'Nghỉ')],
    props: [
      { kind: 'block', center: [0, LAT_SEAT_Y / 2, -0.02], size: [0.4, LAT_SEAT_Y, 0.42] },
      { kind: 'block', center: [0, knee.y + 0.12, knee.z - 0.08], size: [0.5, 0.08, 0.12] },
      { kind: 'rod', from: [0, knee.y + 0.12, knee.z - 0.02], to: [0, knee.y + 0.12, COLUMN_Z], radius: 0.025 },
      ...cableColumn([0, PULLEY_Y, overhead.z], handle),
    ],
    seconds: 3.4,
  }
}

/** Wide overhand grip (about 1.5× shoulder width) on a 1.2 m bar, pulled to the upper chest, elbows down and out. */
const wideGripLatPulldown = () => latPulldown(0.36, 1.2, [0, 0.08, 0.17], [[0.15, -1, -0.25], [0.15, -1, -0.25]], [75, 135])
/** V-handle (drawn as its short grip bar), palms facing: pulled to the upper/mid chest with the elbows beside the trunk. */
const closeGripLatPulldown = () => latPulldown(0.06, 0.22, [0, 0.02, 0.18], [[0.6, -1, 0.1], [0.3, -1, -0.4]], [30, 105])

/** A step back from the column, so the cable runs down to the hands at the start. */
const STRAIGHT_ARM_PULLEY_Z = 1.15
/** Straight cable bar attachment (ACE straight-arm pressdown), hands about shoulder width on it. */
const STRAIGHT_BAR = 0.55

/** Straight-arm pulldown: tall stance, soft knees; straight arms sweep from chest height down to the front of the thighs. */
function straightArmPulldown(): Motion {
  const up = forearms(scapulae(stand(0.12), SCAPULA.set), PRONATED)
  up.pelvis = [0, up.pelvis[1] - 0.015, -0.02]
  const down = clone(up)
  const arm = (flex: number): LimbAngles => ({ flex, abd: 3, bend: 5 })
  armsAngles(up, arm(90))
  armsAngles(down, arm(12))
  return {
    keys: [key(0, up, 'Kéo xuống'), key(0.4, down, 'Trả lên'), key(0.9, up, 'Nghỉ')],
    props: cableColumn([0, PULLEY_Y, STRAIGHT_ARM_PULLEY_Z], STRAIGHT_BAR, STRAIGHT_ARM_PULLEY_Z + 0.06),
    seconds: 3.4,
  }
}

/* ---------- Bent-over rows ---------- */

/** Hips pushed back over vertical shins with the knees soft, so the hanging load stays close in front of the knees. */
const ROW_HIPS: Vec = [0, 0.88, -0.21]

/**
 * Hip hinge with a flat back and soft knees; the load hangs at straight arms under the shoulders and is
 * rowed to `pelvisLocal` (a point on the front of the abdomen in the pelvis frame) as the shoulder blades squeeze.
 */
function bentRow(pitch: number, halfGrip: number, pelvisLocal: Vec, elbowPole: Vec, turn: number) {
  const hang = forearms(scapulae(stand(0.14), SCAPULA.reached), turn)
  hang.pelvis = [...ROW_HIPS]
  hang.pelvisRot = [pitch, 0, 0]
  const row = scapulae(clone(hang), SCAPULA.squeezed)
  gripEach(hang, reachFromShoulders(hang, halfGrip), elbowPole)
  gripBar(row, pelvisPoint(row, pelvisLocal), halfGrip, elbowPole)
  return { hang, row }
}

/** Barbell bent-over row: trunk flexed about 45° at the hips (García-Jaén 2021), overhand grip, bar rowed to the stomach. */
function barbellBentOverRow(): Motion {
  const { hang, row } = bentRow(45, 0.28, [0, 0.2, 0.17], [0.45, 0.4, -1], 165)
  return {
    keys: [key(0, hang, 'Kéo lên'), key(0.4, row, 'Hạ xuống'), key(0.9, hang, 'Nghỉ')],
    props: [{ kind: 'barbell', at: 'grips' }],
    seconds: 3.4,
  }
}

/** Landmine pivot behind the lifter: the bar runs between the legs to the handle. */
const T_BAR_PIVOT: Vec = [0, 0.05, -1.3]

/** T-bar row: straddling the bar, hips at 45°, close neutral handle rowed towards the abdomen with elbows tucked. */
function tBarRow(): Motion {
  const { hang, row } = bentRow(45, 0.06, [0, 0.3, 0.17], [0.2, 0.4, -1], NEUTRAL)
  return {
    keys: [key(0, hang, 'Kéo lên'), key(0.4, row, 'Hạ xuống'), key(0.9, hang, 'Nghỉ')],
    // No plates: the prop's 45 cm discs sit 13 cm past the hands and would pass through the chest at the top.
    props: [{ kind: 'lever', pivot: T_BAR_PIVOT, at: 'grips' }],
    seconds: 3.4,
  }
}

/* ---------- One-arm dumbbell row ---------- */

const ROW_BENCH = { width: 0.3, centerX: 0.12 }
/** Knee joint centre above a surface it kneels on. */
const KNEE_LIFT = 0.05
/** Wrist joint above the bench with the palm flat. */
const PALM_WRIST_LIFT = 0.035

/**
 * One-arm dumbbell row (right arm working): left knee under the hip and left hand under the shoulder on a flat
 * bench, back flat; the dumbbell is pulled towards the hip with the arm close to the side (ACE single-arm row).
 */
function oneArmDumbbellRow(): Motion {
  const hipY = BENCH_HEIGHT + KNEE_LIFT + DIM.thigh
  const supportArm = DIM.upperArm + DIM.forearm
  // Trunk tilt that lets the straight support arm reach the bench with the palm flat.
  const pitch = 90 - (Math.asin((BENCH_HEIGHT + PALM_WRIST_LIFT + supportArm - hipY) / TRUNK) * 180) / Math.PI
  const hang = stand()
  hang.pelvis = [0, hipY, 0]
  hang.pelvisRot = [pitch, 0, 0]
  hang.legs.l = { target: [DIM.hipHalfWidth, BENCH_HEIGHT + KNEE_LIFT, -DIM.shank * 0.995], pole: [0, -1, 1] }
  hang.feet.l = { fwd: [0, 0, 1], pitch: 128 }
  hang.legs.r = { target: [-0.2, FLOOR_ANKLE_Y, 0], pole: [-0.2, 0.1, 1] }
  hang.feet.r = { fwd: [-0.15, 0, 1], pitch: 0 }
  hang.arms.l = { flex: pitch, abd: 2, bend: 0 }
  hang.forearms = { l: PRONATED, r: ROW_DUMBBELL_TURN }
  hang.wrists = { l: -85 }
  hang.scapula = { r: [...SCAPULA.set] }
  const row = clone(hang)
  const pole: Vec = [-0.2, 1, -0.3]
  hang.arms.r = { target: toVec(reachFromShoulders(hang, DIM.shoulderHalfWidth)('r')), pole }
  row.arms.r = { target: toVec(pelvisPoint(row, [-0.24, 0.12, 0.22])), pole }
  const benchBack = -DIM.shank + 0.02
  const benchFront = joints(hang).l.wrist.z + 0.25
  return {
    keys: [key(0, hang, 'Kéo lên'), key(0.4, row, 'Hạ xuống'), key(0.9, hang, 'Nghỉ')],
    props: [
      {
        kind: 'block',
        center: [ROW_BENCH.centerX, BENCH_HEIGHT / 2, (benchBack + benchFront) / 2],
        size: [ROW_BENCH.width, BENCH_HEIGHT, benchFront - benchBack],
      },
      { kind: 'dumbbell', at: 'gripR' },
    ],
    seconds: 3.4,
  }
}

/* ---------- Chest-supported row ---------- */

const INCLINE = 45
const CHEST_PAD = { width: 0.26, thickness: 0.08, from: -0.02, to: 0.45 }
/** Trunk axis to the pad surface (front of the chest). */
const CHEST_DEPTH = 0.1

/** Chest-supported dumbbell row: prone on a 45° incline bench, feet on the floor, dumbbells rowed with elbows close to the body. */
function chestSupportedDumbbellRow(): Motion {
  const hang = forearms(stand(), ROW_DUMBBELL_TURN)
  hang.pelvis = [0, 0.89, -0.12]
  hang.pelvisRot = [INCLINE, 0, 0]
  plantBack(scapulae(hang, SCAPULA.reached), 0.14, -0.32)
  const row = scapulae(clone(hang), SCAPULA.squeezed)
  const pole: Vec = [0.25, 1, -0.4]
  gripEach(hang, reachFromShoulders(hang, 0.22), pole)
  gripEach(row, (side) => chestPoint(row, [sideSign(side) * 0.22, -0.2, 0]), pole)
  const along = (CHEST_PAD.from + CHEST_PAD.to) / 2
  const padCenter = pelvisPoint(hang, [0, along, CHEST_DEPTH + CHEST_PAD.thickness / 2])
  return {
    keys: [key(0, hang, 'Kéo lên'), key(0.4, row, 'Hạ xuống'), key(0.9, hang, 'Nghỉ')],
    props: [
      {
        kind: 'block',
        center: toVec(padCenter),
        size: [CHEST_PAD.width, CHEST_PAD.thickness, CHEST_PAD.to - CHEST_PAD.from],
        rot: [-INCLINE, 0, 0],
      },
      { kind: 'rod', from: [0, 0, padCenter.z + 0.08], to: [0, padCenter.y - 0.06, padCenter.z + 0.08], radius: 0.035 },
      { kind: 'block', center: [0, 0.02, padCenter.z + 0.08], size: [0.4, 0.04, 0.5] },
      { kind: 'dumbbell', at: 'gripL' },
      { kind: 'dumbbell', at: 'gripR' },
    ],
    seconds: 3.4,
  }
}

/** Feet flat on the floor at ±halfWidth and `z`, knees bending forward. */
function plantBack(pose: Pose, halfWidth: number, z: number) {
  for (const side of ['l', 'r'] as const) {
    pose.legs[side] = { target: [sideSign(side) * halfWidth, FLOOR_ANKLE_Y, z], pole: [sideSign(side) * 0.1, 0, 1] }
    pose.feet[side] = { fwd: [0, 0, 1], pitch: 0 }
  }
}

/* ---------- Inverted row ---------- */

/** `turn` (Pose.forearms) faces the palms towards the feet on the bar: an overhand grip. */
const INV = { ankleZ: 0.7, ankleY: 0.096, heelHalf: 0.06, top: 42, bottom: 17.5, halfGrip: 0.27, upright: 0.7, turn: 150 }

/** Straight body pivoting on the heels, face up, head towards -Z, `incline` degrees above the floor. */
function heelPlank(incline: number): Pose {
  const pose = stand()
  const r = rad(incline)
  const reach = LEG * 0.999
  pose.pelvisRot = [-90 + incline, 0, 0]
  pose.pelvis = [0, INV.ankleY + reach * Math.sin(r), INV.ankleZ - reach * Math.cos(r)]
  for (const side of ['l', 'r'] as const) {
    pose.legs[side] = { target: [sideSign(side) * INV.heelHalf, INV.ankleY, INV.ankleZ], pole: [0, 1, 0] }
    pose.feet[side] = { fwd: [0, 0, 1], pitch: incline - 90 }
  }
  return pose
}

/** Inverted row: heels on the floor, body straight; chest pulled to a fixed bar with an overhand grip. */
function invertedRow(): Motion {
  const top = forearms(scapulae(heelPlank(INV.top), SCAPULA.squeezed), INV.turn)
  const bar = chestPoint(top, [0, 0.04, 0.13])
  const bottom = forearms(scapulae(heelPlank(INV.bottom), SCAPULA.reached), INV.turn)
  const pole: Vec = [0.6, -1, 0.1]
  for (const p of [top, bottom]) gripBar(p, bar, INV.halfGrip, pole)
  const { upright } = INV
  return {
    keys: [key(0, bottom, 'Kéo lên'), key(0.4, top, 'Hạ xuống'), key(0.9, bottom, 'Nghỉ')],
    props: [
      { kind: 'rod', from: [-upright, bar.y, bar.z], to: [upright, bar.y, bar.z], radius: 0.016 },
      { kind: 'rod', from: [-upright, 0, bar.z], to: [-upright, bar.y + 0.3, bar.z], radius: 0.03 },
      { kind: 'rod', from: [upright, 0, bar.z], to: [upright, bar.y + 0.3, bar.z], radius: 0.03 },
    ],
    seconds: 3.2,
  }
}

/* ---------- Back extensions ---------- */

/** Forearms folded across the chest, the right one in front. */
const CROSSED: Record<Side, LimbAngles> = {
  l: { flex: 50, abd: 5, rot: -80, bend: 125 },
  r: { flex: 55, abd: 5, rot: -80, bend: 120 },
}

const HYPER = { hipY: 1.0, padDepth: 0.17, padLength: 0.26 }

/**
 * 45° back extension: hips just above the pad, heels under the roller; the straight trunk folds at the hips
 * to about 90° of hip flexion and returns to a straight line from head to heels.
 */
function backExtension45(): Motion {
  const up = stand()
  up.pelvis = [0, HYPER.hipY, 0]
  up.pelvisRot = [INCLINE, 0, 0]
  const thighFront: Vec = [0, -Math.sin(rad(INCLINE)), Math.cos(rad(INCLINE))]
  for (const side of ['l', 'r'] as const) {
    up.legs[side] = { target: toVec(pelvisPoint(up, [sideSign(side) * 0.1, -LEG * 0.999, 0])), pole: thighFront }
  }
  up.feet = { l: { fwd: [0, 0, 1], pitch: INCLINE }, r: { fwd: [0, 0, 1], pitch: INCLINE } }
  up.arms = { l: { ...CROSSED.l }, r: { ...CROSSED.r } }
  const down = clone(up)
  down.pelvisRot = [INCLINE + 88, 0, 0]
  const pad = pelvisPoint(up, [0, -0.06 - HYPER.padLength / 2, HYPER.padDepth])
  const roller = pelvisPoint(up, [0, -LEG + 0.1, -0.09])
  const plate = pelvisPoint(up, [0, -LEG - DIM.ankleHeight - 0.02, 0.06])
  const frameLow = pelvisPoint(up, [0, -LEG - DIM.ankleHeight - 0.06, 0.3])
  const frameHigh = pelvisPoint(up, [0, -0.06 - HYPER.padLength / 2, HYPER.padDepth + 0.09])
  return {
    keys: [key(0, up, 'Gập xuống'), key(0.5, down, 'Ưỡn lên'), key(0.88, up, 'Giữ thẳng')],
    props: [
      { kind: 'block', center: toVec(pad), size: [0.4, 0.1, HYPER.padLength], rot: [-INCLINE, 0, 0] },
      { kind: 'rod', from: [-0.2, roller.y, roller.z], to: [0.2, roller.y, roller.z], radius: 0.05 },
      { kind: 'block', center: toVec(plate), size: [0.4, 0.03, 0.32], rot: [INCLINE, 0, 0] },
      { kind: 'rod', from: toVec(frameLow), to: toVec(frameHigh), radius: 0.035 },
      { kind: 'rod', from: [0, 0, frameLow.z], to: toVec(frameLow), radius: 0.035 },
      { kind: 'rod', from: [0, 0, frameHigh.z], to: toVec(frameHigh), radius: 0.035 },
    ],
    seconds: 3.6,
  }
}

const MAT: Vec = [0.7, 0.01, 2.3]

/** Feet pointed, resting on the insteps. */
function pointedFeet(pose: Pose, pitch: number): Pose {
  pose.feet = { l: { fwd: [0, 0, 1], pitch }, r: { fwd: [0, 0, 1], pitch } }
  return pose
}

/** Superman: prone, arms overhead with the palms down; arms and legs lift about 15 cm with the head neutral, hold, then lower. */
function superman(): Motion {
  const rest = forearms(prone(MAT[1], -0.1), PRONATED)
  pointedFeet(legsAngles(rest, { flex: 0, abd: 4, bend: 0 }), 128)
  armsAngles(rest, { flex: 174, abd: 8, bend: 3 })
  const lift = clone(rest)
  lift.spine = [-8, 0, 0]
  pointedFeet(legsAngles(lift, { flex: -8, abd: 4, bend: 0 }), 130)
  armsAngles(lift, { flex: 176, abd: 8, bend: 3 })
  const hold = clone(lift)
  hold.spine = [-7.5, 0, 0]
  return {
    keys: [key(0, rest, 'Nâng lên'), key(0.22, lift, 'Giữ'), key(0.62, hold, 'Hạ xuống'), key(0.88, rest, 'Nghỉ')],
    props: [{ kind: 'block', center: [0, MAT[1] / 2, -0.03], size: MAT }],
    seconds: 5.5,
  }
}

/* ---------- Rack pull ---------- */

const RACK = { pinX: 0.5, uprightX: 0.56, depth: 0.3, height: 1.9 }
const RACK_GRIP_ABD = 8
/** Bar depth over the midfoot, brushing the shins, at the start of the pull. */
const RACK_BAR_Z = 0.06
/** Bar depth resting against the front of the thighs at lockout. */
const LOCKOUT_BAR_Z = 0.1

/** Straight arms angled so the bar they hold hangs at world depth `z`. */
function hangBarAt(pose: Pose, z: number, abd: number): Pose {
  const trunk = pose.pelvisRot[0] + pose.spine[0]
  armsAngles(pose, { flex: trunk, abd, bend: 0 })
  const j = joints(pose)
  const reach = j.l.grip.clone().sub(j.l.shoulder)
  const swing = Math.asin((z - j.l.shoulder.z) / Math.hypot(reach.y, reach.z))
  return armsAngles(pose, { flex: trunk + (swing * 180) / Math.PI, abd, bend: 0 })
}

/** Rack pull: bar on the rack pins just below the knees; hips and knees extend to a tall lockout without leaning back. */
function rackPull(): Motion {
  const top = forearms(stand(0.15), PRONATED)
  top.pelvis = [0, top.pelvis[1] - 0.008, -0.01]
  const bottom = clone(top)
  bottom.pelvis = [0, 0.84, -0.28]
  bottom.pelvisRot = [55, 0, 0]
  hangBarAt(top, LOCKOUT_BAR_Z, RACK_GRIP_ABD)
  hangBarAt(bottom, RACK_BAR_Z, RACK_GRIP_ABD)
  const j = joints(bottom)
  const bar = j.l.grip.clone().lerp(j.r.grip, 0.5)
  const pinY = bar.y - 0.035
  const rack: PropSpec[] = []
  for (const s of [1, -1]) {
    rack.push({ kind: 'rod', from: [s * RACK.pinX, pinY, bar.z - RACK.depth], to: [s * RACK.pinX, pinY, bar.z + RACK.depth], radius: 0.02 })
    for (const dz of [-RACK.depth, RACK.depth]) {
      rack.push({ kind: 'rod', from: [s * RACK.uprightX, 0, bar.z + dz], to: [s * RACK.uprightX, RACK.height, bar.z + dz], radius: 0.03 })
    }
  }
  return {
    keys: [key(0, bottom, 'Kéo lên'), key(0.4, top, 'Hạ về giá'), key(0.88, bottom, 'Nghỉ')],
    props: [...rack, { kind: 'barbell', at: 'grips' }],
    seconds: 3.6,
  }
}

export const motions: Record<string, () => Motion> = {
  'chin-up': chinUp,
  'lat-pulldown': wideGripLatPulldown,
  'close-grip-lat-pulldown': closeGripLatPulldown,
  'straight-arm-cable-pulldown': straightArmPulldown,
  'barbell-bent-over-row': barbellBentOverRow,
  'one-arm-dumbbell-row': oneArmDumbbellRow,
  't-bar-row': tBarRow,
  'chest-supported-dumbbell-row': chestSupportedDumbbellRow,
  'inverted-row': invertedRow,
  '45-degree-back-extension': backExtension45,
  superman,
  'rack-pull': rackPull,
}
