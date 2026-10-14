import { Vector3 } from 'three'
import type { Motion, PropSpec } from '../motion'
import type { LimbAngles } from '../pose'
import { SIDES, sideSign, type Side } from '../skeleton'
import {
  armsAngles,
  BENCH_HEIGHT,
  clone,
  deg,
  DIM,
  feetOnFloor,
  FLOOR_ANKLE_Y,
  forearms,
  joints,
  key,
  LYING_PELVIS_LIFT,
  stand,
  supine,
  type Pose,
  type Vec,
} from './helpers'

type Block = Extract<PropSpec, { kind: 'block' }>
type ArmSwing = Omit<LimbAngles, 'bend'>

/** Forearm rotation (Pose.forearms): 0 supinated, 90 neutral (thumb up), 180 pronated. */
const NEUTRAL = 90
const PRONATED = 180

const STANCE = 0.12
/** Hip joint height above a seat, as in the seated cable row. */
const SEATED_PELVIS_LIFT = 0.08
/** Mannequin capsule radii (mannequin.ts), for pads that touch a limb. */
const UPPER_ARM_RADIUS = 0.042
const FOREARM_RADIUS = 0.034
const PAD_THICKNESS = 0.06

/**
 * Upper arm straight down the side (no abduction): the elbow then bends in a sagittal plane, so the hands
 * keep a rigid bar's width (the shoulder joints, 0.35 m) all the way up.
 */
const BAR_ARM: ArmSwing = { flex: 0, abd: 0 }
/** Dumbbells hang just outside the thighs. */
const DUMBBELL_ARM: ArmSwing = { flex: 0, abd: 10 }
/** Elbow bend with the bar resting on the front of the thighs (fully straight it would sink into them). */
const BAR_LOW_BEND = 15
const LOW_BEND = 5
/** Full elbow flexion, the load at the front of the shoulder (AAOS normal: 150°). */
const CURL_TOP_BEND = 140
const CURL_SECONDS = 3.2

const vec = (v: Vector3): Vec => [v.x, v.y, v.z]
const withArms = (pose: Pose, arm: ArmSwing, bend: number) => armsAngles(clone(pose), { ...arm, bend })
const dumbbells: PropSpec[] = [
  { kind: 'dumbbell', at: 'gripL' },
  { kind: 'dumbbell', at: 'gripR' },
]
const cables = (from: Vec): PropSpec[] => [
  { kind: 'cable', from, to: 'gripL' },
  { kind: 'cable', from, to: 'gripR' },
]

/** Share of the cycle for the concentric (lifting) phase; the eccentric phase gets 0.5, the pause 0.1. */
const CONCENTRIC = 0.4
const ECCENTRIC = 0.5

/** `lowerFirst`: start → end lowers the load (eccentric), so that phase gets the longer share. */
function cycle(start: Pose, end: Pose, phases: [string, string], props: PropSpec[], seconds = CURL_SECONDS, lowerFirst = false): Motion {
  return { keys: [key(0, start, phases[0]), key(lowerFirst ? ECCENTRIC : CONCENTRIC, end, phases[1]), key(0.9, start, 'Nghỉ')], props, seconds }
}

const curl = (down: Pose, up: Pose, props: PropSpec[]) => cycle(down, up, ['Cuốn lên', 'Hạ xuống'], props)
const armCurl = (base: Pose, arm: ArmSwing, low: number, high: number, props: PropSpec[]) =>
  curl(withArms(base, arm, low), withArms(base, arm, high), props)

/** Feet `stride` apart front to back, `front` foot ahead; the pelvis drops `drop` so both feet stay flat. */
function splitStance(front: Side, stride: number, drop: number): Pose {
  const pose = stand(STANCE)
  pose.pelvis = [0, pose.pelvis[1] - drop, 0]
  for (const side of SIDES) {
    const s = sideSign(side)
    pose.legs[side] = { target: [s * STANCE, FLOOR_ANKLE_Y, side === front ? stride / 2 : -stride / 2], pole: [s * 0.15, 0.1, 1] }
  }
  return pose
}

/** Seated on a seat of height `seatY`, trunk pitched `pitch`, feet flat in front. */
function seated(seatY: number, pitch: number, feetHalf: number, feetZ: number): Pose {
  const pose = feetOnFloor(stand(), feetHalf, feetZ)
  pose.pelvis = [0, seatY + SEATED_PELVIS_LIFT, 0]
  pose.pelvisRot = [pitch, 0, 0]
  return pose
}

/** Pad whose top face runs along `from`→`to` at `gap` from it; `normal` (in the YZ plane) points from the pad to the body. */
function pad(from: Vector3, to: Vector3, normal: Vector3, gap: number, width: number): Block {
  const center = from.clone().lerp(to, 0.5).addScaledVector(normal, -(gap + PAD_THICKNESS / 2))
  return {
    kind: 'block',
    center: [0, center.y, center.z],
    size: [width, PAD_THICKNESS, from.distanceTo(to)],
    rot: [deg(Math.atan2(normal.z, normal.y)), 0, 0],
  }
}

const barbellCurl = () => armCurl(stand(STANCE), BAR_ARM, BAR_LOW_BEND, CURL_TOP_BEND, [{ kind: 'barbell', at: 'grips' }])

/** Wikipedia: shoulder-width overhand (pronated) grip, elbows tucked, curled to the shoulders. */
const reverseGripBarbellCurl = () =>
  armCurl(forearms(stand(STANCE), PRONATED), BAR_ARM, BAR_LOW_BEND, CURL_TOP_BEND, [{ kind: 'barbell', at: 'grips' }])

const dumbbellCurl = () => armCurl(stand(STANCE), DUMBBELL_ARM, LOW_BEND, CURL_TOP_BEND, dumbbells)

/** ACE: split stance, neutral grip, curl until the dumbbells near the front of the shoulders. */
const HAMMER_TOP_BEND = 130
const hammerCurl = () => armCurl(forearms(splitStance('l', 0.3, 0.03), NEUTRAL), DUMBBELL_ARM, LOW_BEND, HAMMER_TOP_BEND, dumbbells)

/** Wikipedia: a bar on the lowest pulley, a step back from the machine; elbows at the sides. */
const LOW_PULLEY: Vec = [0, 0.1, 0.5]
const CABLE_BAR_LENGTH = 0.5
const cableCurl = () =>
  armCurl(stand(STANCE), BAR_ARM, BAR_LOW_BEND, CURL_TOP_BEND, [
    { kind: 'cable', from: LOW_PULLEY, to: 'grips' },
    { kind: 'handle', at: 'grips', length: CABLE_BAR_LENGTH },
  ])

/**
 * Preacher bench: trunk upright, the backs of the upper arms on a pad 45° below horizontal whose top edge sits
 * under the armpits; from almost straight (Wikipedia) to full flexion.
 */
const PREACHER = { seatY: 0.55, armAngle: 45, lowBend: 20, topBend: 130, padWidth: 0.5, padStart: 0.12, seatSize: 0.35 }
function preacherCurl(): Motion {
  const base = seated(PREACHER.seatY, 0, 0.15, 0.42)
  const arm = { flex: PREACHER.armAngle, abd: 0 }
  const down = withArms(base, arm, PREACHER.lowBend)
  const j = joints(down).l
  const along = j.elbow.clone().sub(j.shoulder).normalize()
  const armPad = pad(j.shoulder.clone().addScaledVector(along, PREACHER.padStart), j.elbow.clone().addScaledVector(along, 0.03), j.armFront, UPPER_ARM_RADIUS, PREACHER.padWidth)
  return curl(down, withArms(base, arm, PREACHER.topBend), [
    { kind: 'block', center: [0, PREACHER.seatY / 2, -0.05], size: [PREACHER.seatSize, PREACHER.seatY, PREACHER.seatSize] },
    armPad,
    { kind: 'rod', from: [0, 0, armPad.center[2]], to: armPad.center, radius: 0.03 },
    { kind: 'barbell', at: 'grips' },
  ])
}

/** Bench back at 45° (Wikipedia); the arms hang straight down behind the trunk line, elbows still. */
const INCLINE = { recline: 45, abd: 8, backrestWidth: 0.26, seatWidth: 0.3, seatLength: 0.4 }
function inclineDumbbellCurl(): Motion {
  const base = seated(BENCH_HEIGHT, -INCLINE.recline, 0.18, 0.45)
  const j = joints(base)
  const trunkUp = j.head.clone().sub(j.pelvis).normalize()
  const front = new Vector3(0, 0, 1).applyQuaternion(j.chestQ)
  const backrest = pad(j.pelvis.clone().addScaledVector(trunkUp, -0.05), j.head.clone().addScaledVector(trunkUp, 0.12), front, LYING_PELVIS_LIFT, INCLINE.backrestWidth)
  return armCurl(base, { flex: -INCLINE.recline, abd: INCLINE.abd }, LOW_BEND, CURL_TOP_BEND, [
    backrest,
    { kind: 'block', center: [0, BENCH_HEIGHT / 2, INCLINE.seatLength / 2 - 0.12], size: [INCLINE.seatWidth, BENCH_HEIGHT, INCLINE.seatLength] },
    ...dumbbells,
  ])
}

/**
 * Seated on the end of a bench, knees wide, trunk leaning forward. The right arm hangs with the back of the
 * upper arm (rotated in, so the curl heads for the chest) braced on the inside of the right thigh by the knee;
 * the left hand rests on the left knee.
 */
const CONCENTRATION = { pelvisPitch: 30, spineFlex: 25, feetHalf: 0.4, feetZ: 0.45, kneeOut: 0.5, abd: 14, rot: -80, neck: 15 }
function concentrationCurl(): Motion {
  const base = seated(BENCH_HEIGHT, CONCENTRATION.pelvisPitch, CONCENTRATION.feetHalf, CONCENTRATION.feetZ)
  base.spine = [CONCENTRATION.spineFlex, 0, 0]
  base.neck = CONCENTRATION.neck
  for (const side of SIDES) {
    base.legs[side] = { target: [sideSign(side) * CONCENTRATION.feetHalf, FLOOR_ANKLE_Y, CONCENTRATION.feetZ], pole: [sideSign(side) * CONCENTRATION.kneeOut, 1, 0.3] }
  }
  const knee = joints(base).l
  base.arms.l = { target: vec(knee.knee.clone().addScaledVector(knee.legFront, 0.09)), pole: [0.3, -0.5, -1] }
  const arm = { flex: CONCENTRATION.pelvisPitch + CONCENTRATION.spineFlex, abd: CONCENTRATION.abd, rot: CONCENTRATION.rot }
  const pose = (bend: number) => {
    const p = clone(base)
    p.arms.r = { ...arm, bend }
    return p
  }
  return curl(pose(LOW_BEND), pose(CURL_TOP_BEND), [
    { kind: 'block', center: [0, BENCH_HEIGHT / 2, -0.4], size: [0.3, BENCH_HEIGHT, 1] },
    { kind: 'dumbbell', at: 'gripR' },
  ])
}

/**
 * ACE: rope on a high pulley, elbows pinned to the sides; from about upper-chest level (forearms just above
 * horizontal) to full extension, neutral grip on the rope. The arms rotate in slightly so the rope ends meet at
 * the top and part at the bottom.
 */
const HIGH_PULLEY: Vec = [0, 2.05, 0.3]
const PUSHDOWN_ARM: ArmSwing = { flex: 0, abd: 6, rot: -22 }
/** Hands at upper-chest height with the elbows still at the sides. */
const PUSHDOWN_TOP_BEND = 125
function cableTricepsPushdown(): Motion {
  const base = forearms(stand(STANCE), NEUTRAL)
  return cycle(withArms(base, PUSHDOWN_ARM, PUSHDOWN_TOP_BEND), withArms(base, PUSHDOWN_ARM, 8), ['Đẩy xuống', 'Trả về'], cables(HIGH_PULLEY))
}

/**
 * ACE: split stance, both hands round one dumbbell overhead, the dumbbell hanging vertically, upper arms near
 * vertical with the elbows forward; the dumbbell drops behind the head to about 90° at the elbows. The arms tilt in slightly and rotate inward
 * so both hands stay on the handle along the whole interpolated path (angles found by a grid search).
 */
const OVERHEAD = { flex: 175, rot: -15, topAbd: -8, topBend: 15, bottomAbd: -6, bottomBend: 85 }
function overheadDumbbellTricepsExtension(): Motion {
  // Pronated so the palms face up under the top head behind the head (ACE: "palms facing upwards").
  const base = forearms(splitStance('l', 0.3, 0.03), PRONATED)
  const top = withArms(base, { flex: OVERHEAD.flex, abd: OVERHEAD.topAbd, rot: OVERHEAD.rot }, OVERHEAD.topBend)
  const bottom = withArms(base, { flex: OVERHEAD.flex, abd: OVERHEAD.bottomAbd, rot: OVERHEAD.rot }, OVERHEAD.bottomBend)
  return cycle(top, bottom, ['Hạ tạ', 'Duỗi lên'], [{ kind: 'dumbbell', at: 'grips', grip: 'upright' }], 3.4, true)
}

/** ACE skull crusher on a flat bench, pronated grip: upper arms vertical, bar from over the shoulders to just above the head. */
const LYING = { pelvisZ: 0.25, bench: { length: 1.15, width: 0.3, centerZ: -0.1 }, topBend: 5, bottomBend: 120 }
function lyingTricepsExtension(): Motion {
  const base = forearms(feetOnFloor(supine(BENCH_HEIGHT, LYING.pelvisZ), 0.3, 0.78), PRONATED)
  const arm = { flex: 90, abd: 0 }
  return cycle(withArms(base, arm, LYING.topBend), withArms(base, arm, LYING.bottomBend), ['Hạ thanh đòn', 'Duỗi lên'], [
    { kind: 'block', center: [0, BENCH_HEIGHT / 2, LYING.bench.centerZ], size: [LYING.bench.width, BENCH_HEIGHT, LYING.bench.length] },
    { kind: 'barbell', at: 'grips' },
  ], 3.4, true)
}

/**
 * ACE kickback, mirrored to the right arm: left leg forward, left hand on the left thigh, trunk leaning
 * forward, right upper arm along the trunk; the elbow straightens from 90° to full extension.
 */
const KICKBACK = { pelvisPitch: 52, spineFlex: 12, pelvisY: 0.86, pelvisZ: -0.06, stride: 0.6, abd: 6, startBend: 90, endBend: 3 }
function dumbbellTricepsKickback(): Motion {
  const base = splitStance('l', KICKBACK.stride, 0)
  // ACE gives no grip; neutral (palm towards the body) is the standard kickback grip.
  base.forearms = { r: NEUTRAL }
  base.pelvis = [0, KICKBACK.pelvisY, KICKBACK.pelvisZ]
  base.pelvisRot = [KICKBACK.pelvisPitch, 0, 0]
  base.spine = [KICKBACK.spineFlex, 0, 0]
  const leg = joints(base).l
  base.arms.l = { target: vec(leg.knee.clone().lerp(leg.hip, 0.25).addScaledVector(leg.legFront, 0.09)), pole: [1, 0.3, -0.3] }
  const pose = (bend: number) => {
    const p = clone(base)
    p.arms.r = { flex: 0, abd: KICKBACK.abd, bend }
    return p
  }
  return cycle(pose(KICKBACK.startBend), pose(KICKBACK.endBend), ['Duỗi tay', 'Hạ về'], [{ kind: 'dumbbell', at: 'gripR' }])
}

/**
 * ACE wrist curls: kneeling behind a flat bench, elbows bent about 90° with the forearms along the pad and the
 * hands off the far edge; the wrists drop from neutral and come back. Knees on the floor, toes tucked under.
 */
const KNEEL = { kneeY: 0.05, ankleY: 0.165, footPitch: 105, kneeHalf: 0.12, pelvisPitch: 42, spineFlex: 10, upperArmTilt: 5 }
const WRIST_BENCH = { width: 0.22, length: 1, elbowInset: 0.01 }
/** Wrist curl, palms up: the dumbbells drop into extension. */
const WRIST_EXTENSION = -60
/** Reverse wrist curl, palms down: the dumbbells drop into flexion (towards the palm, now facing the floor). */
const WRIST_FLEXION = 60
function kneelingWristCurl(rotation: number, drop: number): Motion {
  const pose = forearms(stand(), rotation)
  pose.pelvis = [0, KNEEL.kneeY + DIM.thigh, 0]
  pose.pelvisRot = [KNEEL.pelvisPitch, 0, 0]
  pose.spine = [KNEEL.spineFlex, 0, 0]
  const ankleZ = -Math.sqrt(DIM.shank ** 2 - (KNEEL.ankleY - KNEEL.kneeY) ** 2)
  for (const side of SIDES) {
    pose.legs[side] = { target: [sideSign(side) * KNEEL.kneeHalf, KNEEL.ankleY, ankleZ], pole: [0, -1, 1] }
    pose.feet[side] = { fwd: [0, 0, 1], pitch: KNEEL.footPitch }
  }
  armsAngles(pose, { flex: KNEEL.pelvisPitch + KNEEL.spineFlex + KNEEL.upperArmTilt, abd: 0, bend: 90 - KNEEL.upperArmTilt })
  const elbow = joints(pose).l.elbow
  const top = elbow.y - FOREARM_RADIUS
  const low = clone(pose)
  low.wrists = { l: drop, r: drop }
  return cycle(pose, low, ['Hạ tạ', 'Cuốn lên'], [
    { kind: 'block', center: [0, top / 2, elbow.z - WRIST_BENCH.elbowInset + WRIST_BENCH.width / 2], size: [WRIST_BENCH.length, top, WRIST_BENCH.width] },
    ...dumbbells,
  ], 3, true)
}

export const motions: Record<string, () => Motion> = {
  'barbell-curl': barbellCurl,
  'dumbbell-curl': dumbbellCurl,
  'hammer-curl': hammerCurl,
  'preacher-curl': preacherCurl,
  'incline-dumbbell-curl': inclineDumbbellCurl,
  'concentration-curl': concentrationCurl,
  'cable-curl': cableCurl,
  'reverse-grip-barbell-curl': reverseGripBarbellCurl,
  'cable-triceps-pushdown': cableTricepsPushdown,
  'overhead-dumbbell-triceps-extension': overheadDumbbellTricepsExtension,
  'lying-triceps-extension': lyingTricepsExtension,
  'dumbbell-triceps-kickback': dumbbellTricepsKickback,
  'wrist-curl': () => kneelingWristCurl(0, WRIST_EXTENSION),
  'reverse-wrist-curl': () => kneelingWristCurl(PRONATED, WRIST_FLEXION),
}
