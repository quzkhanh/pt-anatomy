import { Vector3 } from 'three'
import type { Motion, PropSpec } from '../motion'
import type { Joints, LimbAngles } from '../pose'
import { sideSign, type Side } from '../skeleton'
import { plank } from './floor'
import {
  armsAngles,
  BENCH_HEIGHT,
  chestDir,
  chestPoint,
  clone,
  DIM,
  feetOnFloor,
  FLOOR_ANKLE_Y,
  gripBar,
  gripEach,
  joints,
  key,
  legsAngles,
  LYING_SHOULDER_LIFT,
  pelvisPoint,
  plantFeet,
  rad,
  stand,
  supine,
  turnPalms,
  type Pose,
  type Vec,
} from './helpers'

const toVec = (v: Vector3): Vec => [v.x, v.y, v.z]
const midShoulders = (j: Joints) => j.l.shoulder.clone().lerp(j.r.shoulder, 0.5)

/** Hip joint to shoulder joint along a straight trunk. */
const TRUNK = DIM.pelvisToSpine + DIM.spineToChest + DIM.chestToShoulder
const ARM = DIM.upperArm + DIM.forearm + DIM.hand
/** Grip-to-shoulder distance with the elbow almost straight. */
const ARM_REACH = ARM * 0.99
/** Arms 50° out from the trunk, dipping from the shoulder to the mat when lying on the back. */
const ARMS_ON_FLOOR: LimbAngles = { flex: -10, abd: 50, bend: 0 }
const PALM_DOWN: Vec = [0, -1, 0]
/** Thumbs up: palms face each other (Pose.forearms). */
const NEUTRAL_FOREARMS = { l: 90, r: 90 }
/** Knees over hips, knees bent 90°. */
const TABLETOP: LimbAngles = { flex: 90, abd: 3, bend: 90 }
const MAT = { thickness: 0.01, length: 1.9, width: 0.7 }
/** Elbow and forearm resting on the mat (forearm radius). */
const FOREARM_ON_FLOOR_Y = 0.04
const FOREARM = DIM.forearm + DIM.hand
const KNEE_ON_FLOOR_Y = 0.06
/** Shank rising behind a kneeling knee so the tucked toes reach the mat with the ankle at 90°. */
const KNEELING_SHANK_RISE = 16
const SUPINE_PELVIS_Z = 0.25
const HIP_WIDTH = 0.1

/** Shifts the whole body so the point picked by `at` lands on `target`. Limb IK targets stay put. */
function moveTo(pose: Pose, at: (j: Joints) => Vector3, target: Vector3 | Vec): Pose {
  const t = Array.isArray(target) ? new Vector3(...target) : target
  const d = t.sub(at(joints(pose)))
  pose.pelvis = [pose.pelvis[0] + d.x, pose.pelvis[1] + d.y, pose.pelvis[2] + d.z]
  return pose
}

function mat(center: [number, number], alongX = false): PropSpec {
  const { thickness: t, length, width } = MAT
  return { kind: 'block', center: [center[0], t / 2, center[1]], size: alongX ? [length, t, width] : [width, t, length] }
}

/** Point in the head frame (x left, y up, z face) in world space. */
function headPoint(pose: Pose, local: Vec): Vector3 {
  const j = joints(pose)
  return j.head.clone().add(new Vector3(...local).applyQuaternion(j.headQ))
}

const palmsDown = (pose: Pose) => turnPalms(pose, () => PALM_DOWN)
/** Palms towards the midline (both hands on one handle). */
const palmsIn = (pose: Pose) => turnPalms(pose, (side) => [-sideSign(side), 0, 0])

/** Kneeling: shank rising behind the knee by KNEELING_SHANK_RISE, so `bend` follows the thigh. */
function kneelingBend(pose: Pose, hipFlex: number) {
  return 90 + KNEELING_SHANK_RISE + hipFlex - pose.pelvisRot[0]
}

// ---------------------------------------------------------------- Lying on the back

/** Reverse crunch: from knees over hips (90°), the pelvis curls towards the ribs and lifts off the mat. */
function reverseCrunch(): Motion {
  const CURL = 35
  const down = palmsDown(armsAngles(legsAngles(supine(0, SUPINE_PELVIS_Z), TABLETOP), ARMS_ON_FLOOR))
  const up = clone(down)
  up.pelvisRot = [-90 - CURL, 0, 0]
  up.spine = [CURL, 0, 0]
  moveTo(up, (j) => j.chest, joints(down).chest)
  return {
    keys: [key(0, down, 'Cuộn hông lên'), key(0.35, up, 'Giữ'), key(0.45, up, 'Hạ xuống chậm'), key(0.92, down, 'Nghỉ')],
    props: [mat([0, 0])],
    seconds: 3.4,
  }
}

/** Dead bug: tabletop legs, arms straight above the shoulders; opposite arm and leg lower to just over the mat. */
function deadBug(): Motion {
  const start = armsAngles(legsAngles(supine(0, SUPINE_PELVIS_Z), TABLETOP), { flex: 90, abd: 0, bend: 0 })
  start.forearms = NEUTRAL_FOREARMS
  const reach = (arm: Side): Pose => {
    const p = clone(start)
    p.arms[arm] = { flex: 178, abd: 4, bend: 4 }
    p.legs[arm === 'r' ? 'l' : 'r'] = { flex: 1, abd: 3, bend: 0 }
    return p
  }
  return {
    keys: [
      key(0, start, 'Hạ tay phải, chân trái'),
      key(0.3, reach('r'), 'Đưa về'),
      key(0.5, start, 'Hạ tay trái, chân phải'),
      key(0.8, reach('l'), 'Đưa về'),
    ],
    props: [mat([0, 0])],
    seconds: 6.4,
  }
}

/** Elbow directions in the chest frame (left arm; mirrored for the right): out to the sides, or forwards towards the knees. */
const ELBOWS_WIDE: Vec = [0.8, 0, 0.6]
const ELBOWS_FORWARD: Vec = [0.4, -0.8, 0.4]

/** Hands laced behind the head; `elbows` is the left elbow's direction in the chest frame. */
function handsBehindHead(pose: Pose, elbows: Vec): Pose {
  for (const side of ['l', 'r'] as const) {
    const s = sideSign(side)
    pose.arms[side] = { target: toVec(headPoint(pose, [s * 0.08, 0.02, -0.07])), pole: chestDir(pose, [s * elbows[0], elbows[1], elbows[2]]) }
  }
  return turnPalms(pose, (side, j) => j.head.clone().sub(j[side].grip))
}

/** Bicycle crunch: one knee drives to the chest as the other leg extends; the trunk curls and turns the opposite elbow to it. */
function bicycleCrunch(): Motion {
  const CURL = 35
  const TWIST = 40
  const start = handsBehindHead(legsAngles(supine(0, SUPINE_PELVIS_Z), TABLETOP), ELBOWS_WIDE)
  const toKnee = (knee: Side): Pose => {
    const p = clone(start)
    p.spine = [CURL, 0, sideSign(knee) * TWIST]
    p.neck = 10
    p.legs[knee] = { flex: 125, abd: 3, bend: 120 }
    p.legs[knee === 'r' ? 'l' : 'r'] = { flex: 40, abd: 3, bend: 12 }
    return handsBehindHead(p, ELBOWS_FORWARD)
  }
  const right = toKnee('r')
  const left = toKnee('l')
  return {
    keys: [
      key(0, start, 'Khuỷu trái về gối phải'),
      key(0.15, right, 'Giữ'),
      key(0.3, right, 'Về giữa'),
      key(0.5, start, 'Khuỷu phải về gối trái'),
      key(0.65, left, 'Giữ'),
      key(0.8, left, 'Về giữa'),
    ],
    props: [mat([0, 0])],
    seconds: 8,
  }
}

/** Hands flat on the mat beside the hips, palms down. */
function handsBesideHips(pose: Pose, shoulderZ: number): Pose {
  return palmsDown(gripEach(pose, (side) => [sideSign(side) * 0.26, 0.03, shoulderZ + 0.64], [1, 0.4, 0]))
}

/**
 * Glute bridge: knees bent, feet flat hip-width; hips press up until shoulders, hips and knees line up
 * (hip at 0°, not higher), the upper back staying on the mat.
 */
function gluteBridge(): Motion {
  const LIFT = 22
  const down = supine(0, SUPINE_PELVIS_Z)
  const shoulders = midShoulders(joints(down))
  const up = clone(down)
  up.pelvisRot = [-90 - LIFT, 0, 0]
  up.neck = LIFT
  moveTo(up, midShoulders, shoulders.clone())
  const knee = pelvisPoint(up, [0, -DIM.thigh, 0])
  const ankleZ = knee.z + DIM.shank * Math.sin(rad(LIFT))
  for (const p of [down, up]) handsBesideHips(feetOnFloor(p, HIP_WIDTH, ankleZ, [0, 1, 0.4]), shoulders.z)
  return {
    keys: [key(0, down, 'Đẩy hông lên'), key(0.4, up, 'Hạ xuống chậm'), key(0.9, down, 'Nghỉ')],
    props: [mat([0, 0.1])],
    seconds: 3.4,
  }
}

/**
 * Barbell hip thrust: upper back on the bench edge, bar over the hip crease. Hips rise from near the
 * floor to full extension, where the trunk is level and the knees are at about 90°.
 */
function barbellHipThrust(): Motion {
  const BENCH = { depth: 0.4, width: 1.2, edgeZ: -0.15 }
  /** Trunk angle below level at the bottom: the bar (0.225 m plates) comes down to just above the floor. */
  const DROP = 50
  /** The bench edge sits under the lower shoulder blades, this far from the shoulder joints along the trunk. */
  const EDGE_BELOW_SHOULDERS = 0.1
  /** The trunk pivots on the bench edge: the same spot of the back stays on it as the hips rise and fall. */
  const onEdge = (pose: Pose) => {
    const edge = new Vector3(0, BENCH_HEIGHT, BENCH.edgeZ)
    return moveTo(pose, midShoulders, edge.clone().add(new Vector3(0, EDGE_BELOW_SHOULDERS, LYING_SHOULDER_LIFT).applyQuaternion(joints(pose).chestQ)))
  }
  const top = supine(0, 0)
  top.neck = 20
  onEdge(top)
  const bottom = clone(top)
  bottom.pelvisRot = [-90 + DROP, 0, 0]
  bottom.neck = 5
  onEdge(bottom)
  const ankleZ = top.pelvis[2] + DIM.thigh
  for (const p of [top, bottom]) {
    feetOnFloor(p, HIP_WIDTH + 0.02, ankleZ, [0, 1, 0.4])
    palmsDown(gripBar(p, pelvisPoint(p, [0, 0, 0.12]), 0.3, [0.5, 1, 0]))
  }
  return {
    keys: [key(0, bottom, 'Đẩy hông lên'), key(0.4, top, 'Hạ xuống chậm'), key(0.9, bottom, 'Nghỉ')],
    props: [
      { kind: 'block', center: [0, BENCH_HEIGHT / 2, BENCH.edgeZ - BENCH.depth / 2], size: [BENCH.width, BENCH_HEIGHT, BENCH.depth] },
      { kind: 'barbell', at: 'hips' },
    ],
    seconds: 3.4,
  }
}

// ---------------------------------------------------------------- Prone, kneeling, hanging

/** Forearm plank: elbows under the shoulders, forearms parallel, body straight from head to heels on the toes. */
function forearmPlank(): Motion {
  const shoulderY = FOREARM_ON_FLOOR_Y + DIM.upperArm
  const shoulderAt = (angle: number) => joints(plank(angle, 0)).l.shoulder.y
  const flat = shoulderAt(90)
  const angle = (Math.acos((shoulderY - flat) / (shoulderAt(0) - flat)) * 180) / Math.PI
  const ANKLE_Z = -0.8
  const hold = plank(angle, ANKLE_Z)
  const shoulder = joints(hold).l.shoulder
  const breathe = plank(angle - 0.4, ANKLE_Z)
  for (const p of [hold, breathe]) {
    palmsDown(gripEach(p, (side) => [sideSign(side) * shoulder.x, FOREARM_ON_FLOOR_Y, shoulder.z + FOREARM], [0, -1, -0.3]))
  }
  return {
    keys: [key(0, hold, 'Giữ'), key(0.5, breathe, 'Giữ')],
    props: [mat([0, (ANKLE_Z + shoulder.z + FOREARM) / 2])],
    seconds: 4,
  }
}

/**
 * Bird dog: hands under the shoulders, knees under the hips, toes tucked; the opposite arm and leg
 * extend to about level with the floor, hips and shoulders square.
 */
function birdDog(): Motion {
  const WRIST_Y = 0.04
  const hipY = KNEE_ON_FLOOR_Y + DIM.thigh
  const shoulderY = WRIST_Y + DIM.upperArm + DIM.forearm
  const pitch = (Math.acos((shoulderY - hipY) / TRUNK) * 180) / Math.PI
  const quad = stand()
  quad.pelvis = [0, hipY, 0]
  quad.pelvisRot = [pitch, 0, 0]
  legsAngles(quad, { flex: pitch, abd: 0, bend: kneelingBend(quad, pitch) })
  armsAngles(quad, { flex: pitch, abd: 0, bend: 0 })
  quad.forearms = { l: 180, r: 180 }
  // Hands flat on the mat. Just short of 90°: at exactly 90° the hand lies along the palm normal and the
  // mannequin cannot orient (flatten) the hand.
  quad.wrists = { l: -88, r: -88 }
  const reach = (arm: Side): Pose => {
    const p = clone(quad)
    const leg = arm === 'r' ? 'l' : 'r'
    p.arms[arm] = { flex: pitch + 90, abd: 0, bend: 0 }
    p.wrists = { ...p.wrists, [arm]: 0 }
    p.forearms = { ...p.forearms, [arm]: 90 }
    p.legs[leg] = { flex: pitch - 90, abd: 0, bend: 0 }
    return p
  }
  return {
    keys: [
      key(0, quad, 'Duỗi tay phải, chân trái'),
      key(0.17, reach('r'), 'Giữ'),
      key(0.27, reach('r'), 'Hạ về chậm'),
      key(0.5, quad, 'Duỗi tay trái, chân phải'),
      key(0.67, reach('l'), 'Giữ'),
      key(0.77, reach('l'), 'Hạ về chậm'),
    ],
    props: [mat([0, 0.1])],
    seconds: 7,
  }
}

/**
 * Ab wheel rollout from the knees: hips pressed forward so knees, hips and shoulders stay in line while
 * the wheel rolls from under the shoulders to arms overhead, then is pulled back.
 */
function abWheelRollout(): Motion {
  const WHEEL_Y = 0.1
  const HALF_GRIP = 0.15
  const knees: Vec = [0, KNEE_ON_FLOOR_Y, 0]
  const pose = (lean: number, hipFlex: number) => {
    const p = stand()
    p.pelvisRot = [lean, 0, 0]
    legsAngles(p, { flex: hipFlex, abd: 2, bend: 0 })
    for (const side of ['l', 'r'] as const) (p.legs[side] as LimbAngles).bend = kneelingBend(p, hipFlex)
    moveTo(p, (j) => j.l.knee.clone().lerp(j.r.knee, 0.5), knees)
    const shoulder = midShoulders(joints(p))
    const dy = shoulder.y - WHEEL_Y
    const dx = DIM.shoulderHalfWidth - HALF_GRIP
    const wheelZ = shoulder.z + Math.sqrt(ARM_REACH ** 2 - dy ** 2 - dx ** 2)
    return palmsDown(gripBar(p, [0, WHEEL_Y, wheelZ], HALF_GRIP, [0.6, 0.2, -1]))
  }
  const start = pose(50, 8)
  const out = pose(72, 0)
  return {
    keys: [key(0, start, 'Lăn ra'), key(0.5, out, 'Kéo về'), key(0.9, start, 'Nghỉ')],
    props: [mat([0, 0.4]), { kind: 'wheel', at: 'grips' }],
    seconds: 4,
  }
}

const BAR = { y: 2.3, z: 0.06, halfGrip: 0.4, uprightX: 0.75 }

/**
 * Hanging straight-leg raise: from a dead hang the straight legs rise to just above level with the
 * pelvis tilting back; the body swings back a little so the centre of mass stays under the bar.
 */
function hangingLegRaise(): Motion {
  const below = Math.sqrt(ARM_REACH ** 2 - (BAR.halfGrip - DIM.shoulderHalfWidth) ** 2)
  const hang = legsAngles(stand(), { flex: 4, abd: 3, bend: 4 })
  const raised = clone(hang)
  raised.pelvisRot = [-22, 0, 0]
  raised.spine = [16, 0, 0]
  legsAngles(raised, { flex: 78, abd: 3, bend: 0 })
  /** Arms swing back by this much at the top: balances the centre of mass under the bar. */
  const SWING = 16
  moveTo(hang, midShoulders, [0, BAR.y - below, BAR.z])
  moveTo(raised, midShoulders, [0, BAR.y - below * Math.cos(rad(SWING)), BAR.z - below * Math.sin(rad(SWING))])
  // Overhand grip: palms face forward.
  for (const p of [hang, raised]) turnPalms(gripBar(p, [0, BAR.y, BAR.z], BAR.halfGrip, [1, -0.6, 0.15]), () => [0, 0, 1])
  return {
    keys: [key(0, hang, 'Nâng chân'), key(0.4, raised, 'Hạ chân'), key(0.9, hang, 'Treo')],
    props: [
      { kind: 'rod', from: [-BAR.uprightX, BAR.y, BAR.z], to: [BAR.uprightX, BAR.y, BAR.z], radius: 0.016 },
      { kind: 'rod', from: [-BAR.uprightX, 0, BAR.z], to: [-BAR.uprightX, BAR.y, BAR.z], radius: 0.03 },
      { kind: 'rod', from: [BAR.uprightX, 0, BAR.z], to: [BAR.uprightX, BAR.y, BAR.z], radius: 0.03 },
    ],
    seconds: 3.6,
  }
}

// ---------------------------------------------------------------- Lying on the side

/** Bottom hip joint above the mat when lying on the side (thigh radius). */
const SIDE_HIP_Y = 0.075
/** Shoulders are wider than hips, so lying on the side the trunk rises towards the head by this much. */
const SIDE_LYING_TILT = 9

/** Side-lying work faces the default 3/4 camera: the body runs across the view instead of away from it. */
const SIDE_LYING_YAW = -45

const turnVec = (v: Vec, deg: number): Vec => toVec(new Vector3(...v).applyAxisAngle(new Vector3(0, 1, 0), rad(deg)))

/** The whole motion turned about the vertical axis through the origin (+ turns the face from +Z towards +X). */
function turned(motion: Motion, deg: number): Motion {
  const turnPose = (pose: Pose): Pose => {
    const p = clone(pose)
    p.pelvis = turnVec(p.pelvis, deg)
    p.pelvisRot = [p.pelvisRot[0], p.pelvisRot[1] + deg, p.pelvisRot[2]]
    for (const side of ['l', 'r'] as const) {
      for (const limbs of [p.arms, p.legs]) {
        const limb = limbs[side]
        if ('target' in limb) limbs[side] = { target: turnVec(limb.target, deg), pole: turnVec(limb.pole, deg) }
      }
      const foot = p.feet[side]
      if (foot) p.feet[side] = { ...foot, fwd: turnVec(foot.fwd, deg) }
    }
    return p
  }
  const turnProp = (prop: PropSpec): PropSpec => {
    switch (prop.kind) {
      case 'block':
        return { ...prop, center: turnVec(prop.center, deg), rot: [0, deg, 0] }
      case 'rod':
        return { ...prop, from: turnVec(prop.from, deg), to: turnVec(prop.to, deg) }
      case 'cable':
        return { ...prop, from: turnVec(prop.from, deg) }
      default:
        return prop
    }
  }
  return { ...motion, keys: motion.keys.map((k) => ({ ...k, pose: turnPose(k.pose) })), props: motion.props.map(turnProp) }
}

/** Lying on the `down` side facing +Z, head towards ∓X; `tilt` raises the head end (degrees). */
function sideLying(down: Side, tilt: number): Pose {
  const pose = stand()
  pose.pelvisRot = [0, 0, -sideSign(down) * (90 - tilt)]
  pose.feet = {}
  return pose
}

/** Lower hand under the head (elbow in front of the face), upper hand resting on the upper hip. */
function sideLyingArms(pose: Pose, down: Side): Pose {
  const up = down === 'l' ? 'r' : 'l'
  const s = sideSign(down)
  pose.arms[down] = { target: toVec(headPoint(pose, [s * 0.11, 0.02, 0.02])), pole: [0, 0, 1] }
  pose.arms[up] = { target: toVec(pelvisPoint(pose, [-s * 0.19, -0.04, 0.03])), pole: [0, 0.3, -1] }
  return turnPalms(pose, (side, j) => (side === down ? j.head.clone().sub(j[side].grip) : PALM_DOWN))
}

/** Side-lying hip abduction: straight legs, feet neutral; the top leg rises to about 30° without rolling the hips. */
function sideLyingHipAbduction(): Motion {
  const rest = sideLying('l', SIDE_LYING_TILT)
  rest.legs.l = { flex: 0, abd: -7.5, bend: 0 }
  rest.legs.r = { flex: 0, abd: 1, bend: 0 }
  moveTo(rest, (j) => j.l.hip, [0, SIDE_HIP_Y, 0])
  sideLyingArms(rest, 'l')
  const up = clone(rest)
  up.legs.r = { flex: 0, abd: 35, bend: 0 }
  return {
    keys: [key(0, rest, 'Nâng chân'), key(0.4, up, 'Hạ chân chậm'), key(0.9, rest, 'Nghỉ')],
    props: [mat([-0.2, 0], true)],
    seconds: 3.2,
  }
}

/** Clamshell: hips flexed 30°, knees bent so the heels line up with the hips; heels together, the top knee opens. */
function clamshell(): Motion {
  const HIP_FLEX = 30
  const OPEN = 45
  const closed = sideLying('l', SIDE_LYING_TILT)
  const knees = 2 * HIP_FLEX
  closed.legs.l = { flex: HIP_FLEX, abd: -8, bend: knees }
  closed.legs.r = { flex: HIP_FLEX, abd: 0, bend: knees }
  moveTo(closed, (j) => j.l.hip, [0, SIDE_HIP_Y, 0])
  sideLyingArms(closed, 'l')
  const j = joints(closed).r
  const axis = j.ankle.clone().sub(j.hip).normalize()
  const pole = j.knee.clone().sub(j.hip).projectOnPlane(axis).normalize()
  const open = clone(closed)
  closed.legs.r = { target: toVec(j.ankle), pole: toVec(pole) }
  open.legs.r = { target: toVec(j.ankle), pole: toVec(pole.clone().applyAxisAngle(axis, rad(OPEN))) }
  return {
    keys: [key(0, closed, 'Mở gối'), key(0.4, open, 'Khép về chậm'), key(0.9, closed, 'Nghỉ')],
    props: [mat([-0.2, 0], true)],
    seconds: 3.2,
  }
}

/**
 * Body straight on the side, held up on the `down` forearm (elbow under the shoulder, forearm pointing
 * forward). `tilt` raises the head end of the pelvis; legs are joint angles in the pelvis frame. The
 * down shoulder sits at `shoulderX` (default: wherever the tilt puts it over the pelvis).
 */
function sidePlankPose(down: Side, tilt: number, legs: Record<Side, LimbAngles>, shoulderX?: number): Pose {
  const p = sideLying(down, tilt)
  p.legs = { l: { ...legs.l }, r: { ...legs.r } }
  const x = shoulderX ?? joints(p)[down].shoulder.x - p.pelvis[0]
  moveTo(p, (j) => j[down].shoulder, [x, FOREARM_ON_FLOOR_Y + DIM.upperArm, 0])
  const shoulder = joints(p)[down].shoulder
  p.arms[down] = { target: [shoulder.x, FOREARM_ON_FLOOR_Y, shoulder.z + FOREARM], pole: [0, -1, -0.3] }
  const up = down === 'l' ? 'r' : 'l'
  p.arms[up] = { target: toVec(pelvisPoint(p, [-sideSign(down) * 0.19, -0.04, 0.03])), pole: [0, 0.3, -1] }
  return palmsDown(p)
}

/** Legs fixed where they are: angle legs become IK targets at the current ankles, knees facing forward. */
function pinLegs(pose: Pose, sides: Side[] = ['l', 'r']): Pose {
  const j = joints(pose)
  for (const side of sides) pose.legs[side] = { target: toVec(j[side].ankle), pole: [0, 0, 1] }
  return pose
}

/** Side plank on the right forearm: feet stacked, body straight from head to feet, hips up. */
function sidePlank(): Motion {
  const STACK = -3
  const hold = pinLegs(sidePlankPose('r', 19, { l: { flex: 0, abd: STACK, bend: 0 }, r: { flex: 0, abd: STACK, bend: 0 } }))
  const breathe = clone(hold)
  breathe.pelvis = [hold.pelvis[0], hold.pelvis[1] + 0.006, hold.pelvis[2]]
  return {
    keys: [key(0, hold, 'Giữ'), key(0.5, breathe, 'Giữ')],
    props: [mat([0.2, 0.1], true)],
    seconds: 4,
  }
}

/**
 * Copenhagen plank on the left forearm, top (right) leg on a bench at the ankle. Lowering: the trunk stays
 * straight and tips down from the shoulder, so the pelvis drops into abduction on the supported leg while the
 * free leg goes down to the floor; the top leg's adductors then lift the body back into one line.
 */
function copenhagenPlank(): Motion {
  const LEG_REACH = (DIM.thigh + DIM.shank) * 0.999
  const BOTTOM_TILT = 20
  /** The free (lower) leg hangs in line with the tipped body; drawn in this much, its foot just reaches the floor. */
  const FREE_ABD = -5
  const straight: LimbAngles = { flex: 0, abd: 0, bend: 0 }
  const top = pinLegs(sidePlankPose('l', 6, { l: straight, r: straight }), ['r'])
  const ankle = joints(top).r.ankle
  const bottom = sidePlankPose('l', BOTTOM_TILT, { l: { ...straight, abd: FREE_ABD }, r: straight }, joints(top).l.shoulder.x)
  // With the shoulder and the bench both fixed, the bend at the hip shortens the body: the ankle slides a little along the pad.
  const hip = joints(bottom).r.hip
  const along = Math.sqrt(LEG_REACH ** 2 - (ankle.y - hip.y) ** 2 - (ankle.z - hip.z) ** 2)
  bottom.legs.r = { target: [hip.x - along, ankle.y, ankle.z], pole: [0, 0, 1] }
  /** Open bench (pad on four legs): the free leg drops under the pad and comes up to touch it. */
  const BENCH = { length: 0.4, width: 0.45, pad: 0.05 }
  const benchTop = ankle.y - DIM.ankleHeight
  const benchX = ankle.x - 0.05
  const benchLegs = [-1, 1].flatMap((i) =>
    [-1, 1].map((k): PropSpec => {
      const at: Vec = [benchX + (i * BENCH.length) / 2, 0, ankle.z + (k * BENCH.width) / 2]
      return { kind: 'rod', from: at, to: [at[0], benchTop - BENCH.pad, at[2]], radius: 0.02 }
    }),
  )
  return {
    keys: [key(0, top, 'Hạ hông'), key(0.5, bottom, 'Nâng hông'), key(0.88, top, 'Giữ')],
    props: [
      mat([ankle.x * 0.5, 0.1], true),
      { kind: 'block', center: [benchX, benchTop - BENCH.pad / 2, ankle.z], size: [BENCH.length, BENCH.pad, BENCH.width] },
      ...benchLegs,
    ],
    seconds: 3.6,
  }
}

// ---------------------------------------------------------------- Standing and seated

/** Pallof press: side-on to a chest-high cable on the right; hands press straight out, hold, return to the sternum. */
function pallofPress(): Motion {
  const HALF_GRIP = 0.025
  const chest = stand(HIP_WIDTH + 0.01)
  chest.pelvis = [0, chest.pelvis[1] - 0.02, -0.02]
  chest.pelvisRot = [3, 0, 0]
  chest.spine = [-3, 0, 0]
  const pressed = clone(chest)
  const shoulder = midShoulders(joints(chest))
  const handY = shoulder.y - 0.09
  const pressZ = shoulder.z + Math.sqrt(ARM_REACH ** 2 - (DIM.shoulderHalfWidth - HALF_GRIP) ** 2 - (shoulder.y - handY) ** 2)
  palmsIn(gripBar(chest, chestPoint(chest, [0, 0.1, 0.18]), HALF_GRIP, [0.25, -1, -0.5]))
  palmsIn(gripBar(pressed, [0, handY, pressZ], HALF_GRIP, [0.4, -1, 0]))
  const PULLEY: Vec = [-0.9, handY, pressZ]
  return {
    keys: [key(0, chest, 'Đẩy ra'), key(0.2, pressed, 'Giữ'), key(0.65, pressed, 'Thu về'), key(0.92, chest, 'Nghỉ')],
    props: [
      { kind: 'rod', from: [PULLEY[0], 0, PULLEY[2]], to: [PULLEY[0], 2.1, PULLEY[2]], radius: 0.03 },
      { kind: 'cable', from: PULLEY, to: 'grips' },
    ],
    seconds: 5,
  }
}

/** Lateral band walk: half-squat (hips and knees ~30°), band at the ankles; two steps right, two steps back left. */
function bandedLateralWalk(): Motion {
  const HALF = 0.18
  const STEP = 0.22
  const LIFT = 0.05
  const KNEE_FLEX = 30
  const span = Math.sqrt(DIM.thigh ** 2 + DIM.shank ** 2 + 2 * DIM.thigh * DIM.shank * Math.cos(rad(KNEE_FLEX)))
  const pose = (lx: number, rx: number, lifted?: Side): Pose => {
    const p = plantFeet(stand(), HALF)
    const px = (lx + rx) / 2
    const lateral = (lx - rx) / 2 - DIM.hipHalfWidth
    p.pelvis = [px, FLOOR_ANKLE_Y + Math.sqrt(span ** 2 - lateral ** 2), 0]
    p.pelvisRot = [KNEE_FLEX / 2, 0, 0]
    for (const side of ['l', 'r'] as const) {
      const leg = p.legs[side] as { target: Vec; pole: Vec }
      leg.target = [side === 'l' ? lx : rx, FLOOR_ANKLE_Y + (side === lifted ? LIFT : 0), 0]
    }
    gripEach(p, (side) => pelvisPoint(p, [sideSign(side) * 0.17, 0.12, 0.02]), [1, 0, -0.4])
    // Hands on the hips, palms down on the iliac crests (just short of full pronation).
    p.forearms = { l: 170, r: 170 }
    return p
  }
  const narrowL = HALF
  const wideR = -HALF - STEP
  return {
    keys: [
      key(0, pose(narrowL, -HALF), 'Bước chân phải sang phải'),
      key(0.125, pose(narrowL, -HALF - STEP / 2, 'r'), 'Bước chân phải sang phải'),
      key(0.25, pose(narrowL, wideR), 'Chân trái bước theo'),
      key(0.375, pose(narrowL - STEP / 2, wideR, 'l'), 'Chân trái bước theo'),
      key(0.5, pose(narrowL - STEP, wideR), 'Bước chân trái sang trái'),
      key(0.625, pose(narrowL - STEP / 2, wideR, 'l'), 'Bước chân trái sang trái'),
      key(0.75, pose(narrowL, wideR), 'Chân phải bước theo'),
      key(0.875, pose(narrowL, -HALF - STEP / 2, 'r'), 'Chân phải bước theo'),
    ],
    props: [{ kind: 'band', a: 'ankleL', b: 'ankleR' }],
    seconds: 4.8,
  }
}

/** Cable glute kickback (right leg): facing a low pulley, torso upright, the heel drives back to end-range hip extension. */
function cableGluteKickback(): Motion {
  const MACHINE_Z = 0.5
  const HANDLE = { y: 1.0, z: 0.48, half: 0.22 }
  const start = stand(HIP_WIDTH)
  start.pelvis = [0, start.pelvis[1] - 0.02, 0]
  start.pelvisRot = [3, 0, 0]
  start.legs.r = { flex: 8, abd: 2, bend: 30 }
  const back = clone(start)
  back.legs.r = { flex: -22, abd: 2, bend: 12 }
  // Ankle near neutral at the end: the toes point down instead of the sole staying level as if on a step.
  back.feet.r = { fwd: [0, 0, 1], pitch: 20 }
  for (const p of [start, back]) palmsDown(gripBar(p, [0, HANDLE.y, HANDLE.z], HANDLE.half, [0.4, -1, -0.2]))
  return {
    keys: [key(0, start, 'Đá chân ra sau'), key(0.4, back, 'Hạ về chậm'), key(0.9, start, 'Nghỉ')],
    props: [
      { kind: 'rod', from: [-HANDLE.half - 0.08, 0, MACHINE_Z], to: [-HANDLE.half - 0.08, 2.1, MACHINE_Z], radius: 0.03 },
      { kind: 'rod', from: [HANDLE.half + 0.08, 0, MACHINE_Z], to: [HANDLE.half + 0.08, 2.1, MACHINE_Z], radius: 0.03 },
      { kind: 'rod', from: [-HANDLE.half - 0.08, HANDLE.y, HANDLE.z], to: [HANDLE.half + 0.08, HANDLE.y, HANDLE.z], radius: 0.016 },
      { kind: 'cable', from: [-HIP_WIDTH, 0.08, MACHINE_Z], to: 'ankleR' },
    ],
    seconds: 3.2,
  }
}

/**
 * Seated hip abduction machine: back against the reclined pad, hips flexed ~80°, knees 90° with the feet on
 * the footrests of the moving arms; the thighs push the pads on the outside of the knees apart, then return.
 */
function seatedMachineHipAbduction(): Motion {
  /** Seat high enough for the feet to rest on the arms' footrests above the floor. */
  const SEAT = { y: 0.56, depth: 0.46, width: 0.42, z: 0.08 }
  const RECLINE = 10
  const closed = stand()
  closed.pelvis = [0, SEAT.y + 0.08, 0]
  closed.pelvisRot = [-RECLINE, 0, 0]
  legsAngles(closed, { flex: 90 - RECLINE, abd: 2, bend: 90 })
  const open = clone(closed)
  legsAngles(open, { flex: 90 - RECLINE, abd: 40, bend: 90 })
  /** Side grips run across the hand (left-right) beside the seat; the forearm reaches down and forward to them. */
  const HANDLE = { x: 0.3, y: SEAT.y + 0.06, half: 0.06 }
  for (const p of [closed, open]) palmsDown(gripEach(p, (side) => [sideSign(side) * HANDLE.x, HANDLE.y, 0.02], [0.3, 0, -1]))
  const back = pelvisPoint(closed, [0, 0.38, -0.14])
  return {
    keys: [key(0, closed, 'Mở đùi'), key(0.4, open, 'Khép về chậm'), key(0.9, closed, 'Nghỉ')],
    props: [
      { kind: 'block', center: [0, SEAT.y / 2, SEAT.z], size: [SEAT.width, SEAT.y, SEAT.depth] },
      { kind: 'block', center: toVec(back), size: [SEAT.width, 0.6, 0.06], rot: [-RECLINE, 0, 0] },
      ...(['l', 'r'] as const).map(
        (side): PropSpec => ({
          kind: 'rod',
          from: [sideSign(side) * (HANDLE.x - HANDLE.half), HANDLE.y, 0.02],
          to: [sideSign(side) * (HANDLE.x + HANDLE.half), HANDLE.y, 0.02],
          radius: 0.016,
        }),
      ),
      { kind: 'roller', at: 'kneeL', face: 'outside' },
      { kind: 'roller', at: 'kneeR', face: 'outside' },
      // The thigh is level, so its back side points down: a 'back' roller at the ankle is a footrest under the foot.
      { kind: 'roller', at: 'ankleL', face: 'back' },
      { kind: 'roller', at: 'ankleR', face: 'back' },
    ],
    seconds: 3.2,
  }
}

export const motions: Record<string, () => Motion> = {
  'reverse-crunch': reverseCrunch,
  'hanging-leg-raise': hangingLegRaise,
  plank: forearmPlank,
  'side-plank': () => turned(sidePlank(), SIDE_LYING_YAW),
  'dead-bug': deadBug,
  'bird-dog': birdDog,
  'pallof-press': pallofPress,
  'ab-wheel-rollout': abWheelRollout,
  'bicycle-crunch': bicycleCrunch,
  'barbell-hip-thrust': barbellHipThrust,
  'glute-bridge': gluteBridge,
  'side-lying-hip-abduction': () => turned(sideLyingHipAbduction(), SIDE_LYING_YAW),
  clamshell: () => turned(clamshell(), SIDE_LYING_YAW),
  'banded-lateral-walk': bandedLateralWalk,
  'cable-glute-kickback': cableGluteKickback,
  'seated-machine-hip-abduction': seatedMachineHipAbduction,
  'copenhagen-plank': () => turned(copenhagenPlank(), SIDE_LYING_YAW),
}
