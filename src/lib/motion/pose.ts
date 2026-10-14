import { Euler, MathUtils, Quaternion, Vector3 } from 'three'
import { solveTwoBone } from './ik'
import { DIM, SIDES, STANDING_PELVIS_Y, sideSign, type Side } from './skeleton'

export type Vec = [number, number, number]

/** End effector (grip centre or ankle) placed at a world point; the elbow/knee bends towards `pole`. */
export interface LimbTarget {
  target: Vec
  pole: Vec
}

/** Degrees in the parent frame (chest for arms, pelvis for legs). `bend` is elbow or knee flexion. */
export interface LimbAngles {
  flex: number
  abd: number
  rot?: number
  bend: number
}

export type Limb = LimbTarget | LimbAngles

/** World forward direction of the foot (horizontal) and its pitch; + pitch lifts the heel. */
export interface Foot {
  fwd: Vec
  pitch: number
}

export interface Pose {
  pelvis: Vec
  /** Degrees: [pitch (+ tips the trunk forward), yaw, roll]. */
  pelvisRot: Vec
  /** Degrees: [flexion (+ forward), side bend (+ towards the left/+X), twist (+ turns left)]. */
  spine: Vec
  neck: number
  arms: Record<Side, Limb>
  legs: Record<Side, Limb>
  /** Without a foot spec the ankle is neutral (foot square to the shank). */
  feet: Partial<Record<Side, Foot>>
  /**
   * Wrist flexion in degrees (+ bends the hand towards the palm/flexor side). The hand is otherwise in
   * line with the forearm; use it with arm angles, since IK targets the grip as if the wrist were straight.
   */
  wrists?: Partial<Record<Side, number>>
  /**
   * Forearm rotation in degrees: 0 = supinated (palm on the flexor side, as in a curl), 90 = neutral
   * (thumb up, palm facing the midline), 180 = pronated (palm facing the extensor side).
   */
  forearms?: Partial<Record<Side, number>>
  /** Shoulder girdle offset in metres in the chest frame: [elevation (+ up, shrug), protraction (+ forward)]. */
  scapula?: Partial<Record<Side, [number, number]>>
}

export interface LimbJoints {
  shoulder: Vector3
  elbow: Vector3
  wrist: Vector3
  grip: Vector3
  /** Unit vector on the flexor (front) side of the arm. */
  armFront: Vector3
  /** Unit normal of the palm, after forearm rotation. */
  palm: Vector3
  hip: Vector3
  knee: Vector3
  ankle: Vector3
  heel: Vector3
  toe: Vector3
  legFront: Vector3
}

export interface Joints extends Record<Side, LimbJoints> {
  pelvis: Vector3
  spine: Vector3
  chest: Vector3
  neck: Vector3
  head: Vector3
  pelvisQ: Quaternion
  lowerTrunkQ: Quaternion
  chestQ: Quaternion
  headQ: Quaternion
}

const UP = new Vector3(0, 1, 0)
const DOWN = new Vector3(0, -1, 0)
const FWD = new Vector3(0, 0, 1)
const rad = MathUtils.degToRad
const v3 = (v: Vec) => new Vector3(...v)
const isTarget = (limb: Limb): limb is LimbTarget => 'target' in limb

export function standing(): Pose {
  const leg = (side: Side): LimbTarget => ({
    target: [sideSign(side) * DIM.hipHalfWidth, DIM.ankleHeight, 0],
    pole: [0, 0, 1],
  })
  const arm: LimbAngles = { flex: 0, abd: 6, bend: 0 }
  return {
    pelvis: [0, STANDING_PELVIS_Y, 0],
    pelvisRot: [0, 0, 0],
    spine: [0, 0, 0],
    neck: 0,
    arms: { l: { ...arm }, r: { ...arm } },
    legs: { l: leg('l'), r: leg('r') },
    feet: { l: { fwd: [0, 0, 1], pitch: 0 }, r: { fwd: [0, 0, 1], pitch: 0 } },
  }
}

const halfSpine = ([flex, side, twist]: Vec) =>
  new Quaternion().setFromEuler(new Euler(rad(flex / 2), rad(twist / 2), rad(-side / 2), 'YXZ'))

/** Direction of a limb segment hanging down, rotated by flexion (+ forward) then abduction (+ outward). */
function swing(frame: Quaternion, side: Side, flex: number, abd: number, rot: number) {
  const q = new Quaternion()
    .setFromEuler(new Euler(-rad(flex), 0, 0))
    .multiply(new Quaternion().setFromEuler(new Euler(0, 0, sideSign(side) * rad(abd))))
  const dir = DOWN.clone().applyQuaternion(q).applyQuaternion(frame)
  const front = FWD.clone().applyQuaternion(q).applyQuaternion(frame).applyAxisAngle(dir, -sideSign(side) * rad(rot))
  return { dir, front }
}

function orthoFront(v: Vector3, axis: Vector3, fallback: Vector3) {
  const out = v.clone().addScaledVector(axis, -v.dot(axis))
  return out.lengthSq() < 1e-8 ? fallback.clone() : out.normalize()
}

/** Proximal joint → middle → end, from IK target or angles. `bendSign` +1: the distal segment folds to the front. */
function limb(root: Vector3, spec: Limb, frame: Quaternion, side: Side, a: number, b: number, bendSign: 1 | -1) {
  if (isTarget(spec)) {
    const { mid, end, bend } = solveTwoBone(root, v3(spec.target), v3(spec.pole), a, b)
    const upper = mid.clone().sub(root).normalize()
    // Use the bend the solver actually applied (not the raw pole): projecting the pole onto the upper
    // segment flips 180° when the two are nearly parallel, which jumped muscle colours to the wrong side.
    // Elbows fold to the front so their flexor side is opposite the bend; knees fold back so it faces it.
    const apex = orthoFront(bend, upper, FWD.clone().applyQuaternion(frame).multiplyScalar(-bendSign))
    return { mid, end, front: apex.multiplyScalar(-bendSign) }
  }
  const { dir, front } = swing(frame, side, spec.flex, spec.abd, spec.rot ?? 0)
  const mid = root.clone().addScaledVector(dir, a)
  const lower = dir.clone().multiplyScalar(Math.cos(rad(spec.bend))).addScaledVector(front, bendSign * Math.sin(rad(spec.bend)))
  return { mid, end: mid.clone().addScaledVector(lower, b), front }
}

function foot(ankle: Vector3, knee: Vector3, hip: Vector3, legFront: Vector3, spec: Foot | undefined) {
  const shank = ankle.clone().sub(knee).normalize()
  let fwd: Vector3
  let down: Vector3
  if (spec) {
    fwd = v3(spec.fwd).setY(0).normalize()
    const lateral = new Vector3().crossVectors(UP, fwd)
    fwd.applyAxisAngle(lateral, rad(spec.pitch))
    down = DOWN.clone().applyAxisAngle(lateral, rad(spec.pitch))
  } else {
    // Neutral ankle: toes point along the front of the shin, i.e. the thigh's front turned through the
    // knee angle. Deriving it from the pelvis instead flips the foot when the shin lines up with the pelvis.
    const thigh = knee.clone().sub(hip).normalize()
    const kneeAngle = thigh.angleTo(shank)
    fwd = orthoFront(legFront.clone().multiplyScalar(Math.cos(kneeAngle)).addScaledVector(thigh, Math.sin(kneeAngle)), shank, legFront)
    down = shank
  }
  return {
    heel: ankle.clone().addScaledVector(fwd, -DIM.heelBehindAnkle).addScaledVector(down, DIM.ankleHeight),
    toe: ankle.clone().addScaledVector(fwd, DIM.footLength - DIM.heelBehindAnkle).addScaledVector(down, DIM.ankleHeight),
  }
}

const WRIST_IK_PASSES = 8

type ArmSolve = { mid: Vector3; front: Vector3 }

/** Palm normal: the flexor side of the forearm (the arm's front rotated through the elbow angle), then forearm rotation. */
function palmNormal(shoulder: Vector3, arm: ArmSolve, forearm: Vector3, rotation: number, s: number) {
  const upper = arm.mid.clone().sub(shoulder).normalize()
  const elbowAngle = upper.angleTo(forearm)
  return orthoFront(arm.front.clone().multiplyScalar(Math.cos(elbowAngle)).addScaledVector(upper, -Math.sin(elbowAngle)), forearm, arm.front)
    .applyAxisAngle(forearm, s * rad(rotation))
}

function handDirection(shoulder: Vector3, arm: ArmSolve, forearm: Vector3, flexion: number, rotation: number, s: number) {
  const palm = palmNormal(shoulder, arm, forearm, rotation, s)
  return forearm.clone().multiplyScalar(Math.cos(flexion)).addScaledVector(palm, Math.sin(flexion))
}

export function solvePose(pose: Pose): Joints {
  const pelvis = v3(pose.pelvis)
  const [pitch, yaw, roll] = pose.pelvisRot
  const pelvisQ = new Quaternion().setFromEuler(new Euler(rad(pitch), rad(yaw), rad(roll), 'YXZ'))
  const lowerTrunkQ = pelvisQ.clone().multiply(halfSpine(pose.spine))
  const chestQ = lowerTrunkQ.clone().multiply(halfSpine(pose.spine))
  const headQ = chestQ.clone().multiply(new Quaternion().setFromEuler(new Euler(rad(pose.neck), 0, 0)))
  const spine = pelvis.clone().add(new Vector3(0, DIM.pelvisToSpine, 0).applyQuaternion(pelvisQ))
  const chest = spine.clone().add(new Vector3(0, DIM.spineToChest, 0).applyQuaternion(lowerTrunkQ))
  const neck = chest.clone().add(new Vector3(0, DIM.chestToNeck, 0).applyQuaternion(chestQ))
  const head = neck.clone().add(new Vector3(0, DIM.neckToHead, 0).applyQuaternion(headQ))

  const sides = Object.fromEntries(
    SIDES.map((side) => {
      const s = sideSign(side)
      const [elevation, protraction] = pose.scapula?.[side] ?? [0, 0]
      const shoulder = chest
        .clone()
        .add(new Vector3(s * DIM.shoulderHalfWidth, DIM.chestToShoulder + elevation, protraction).applyQuaternion(chestQ))
      const spec = pose.arms[side]
      const flexion = rad(pose.wrists?.[side] ?? 0)
      let arm = limb(shoulder, spec, chestQ, side, DIM.upperArm, DIM.forearm + DIM.hand, 1)
      let forearm = arm.end.clone().sub(arm.mid).normalize()
      let wrist = arm.mid.clone().addScaledVector(forearm, DIM.forearm)
      if (isTarget(spec) && flexion) {
        // A bent wrist moves the wrist off the grip line: re-aim the forearm at the wrist point a few times.
        for (let i = 0; i < WRIST_IK_PASSES; i++) {
          const hand = handDirection(shoulder, arm, forearm, flexion, pose.forearms?.[side] ?? 0, s)
          const target = v3(spec.target).addScaledVector(hand, -DIM.hand)
          arm = limb(shoulder, { target: [target.x, target.y, target.z], pole: spec.pole }, chestQ, side, DIM.upperArm, DIM.forearm, 1)
          forearm = arm.end.clone().sub(arm.mid).normalize()
          wrist = arm.end.clone()
        }
      }
      const palm = palmNormal(shoulder, arm, forearm, pose.forearms?.[side] ?? 0, s)
      const hand = forearm.clone().multiplyScalar(Math.cos(flexion)).addScaledVector(palm, Math.sin(flexion))
      const hip = pelvis.clone().add(new Vector3(s * DIM.hipHalfWidth, 0, 0).applyQuaternion(pelvisQ))
      const leg = limb(hip, pose.legs[side], pelvisQ, side, DIM.thigh, DIM.shank, -1)
      return [
        side,
        {
          shoulder,
          elbow: arm.mid,
          wrist,
          grip: flexion ? wrist.clone().addScaledVector(hand, DIM.hand) : arm.end,
          armFront: arm.front,
          palm,
          hip,
          knee: leg.mid,
          ankle: leg.end,
          legFront: leg.front,
          ...foot(leg.end, leg.mid, hip, leg.front, pose.feet[side]),
        } satisfies LimbJoints,
      ]
    }),
  ) as Record<Side, LimbJoints>

  return { pelvis, spine, chest, neck, head, pelvisQ, lowerTrunkQ, chestQ, headQ, ...sides }
}

const angle = (a: Vector3, b: Vector3) => MathUtils.radToDeg(a.angleTo(b))

/** Joint angles in degrees, for range-of-motion checks. */
export function jointAngles(j: Joints) {
  const out: Record<string, number> = {}
  const pelvisDown = DOWN.clone().applyQuaternion(j.pelvisQ)
  const pelvisFwd = FWD.clone().applyQuaternion(j.pelvisQ)
  const chestDown = DOWN.clone().applyQuaternion(j.chestQ)
  for (const side of SIDES) {
    const s = j[side]
    const S = side.toUpperCase()
    const upper = s.elbow.clone().sub(s.shoulder)
    const thigh = s.knee.clone().sub(s.hip)
    const shank = s.ankle.clone().sub(s.knee)
    out[`elbow${S}`] = angle(upper, s.wrist.clone().sub(s.elbow))
    out[`shoulder${S}`] = angle(upper, chestDown)
    out[`knee${S}`] = angle(thigh, shank)
    out[`hipFlex${S}`] = MathUtils.radToDeg(Math.atan2(thigh.dot(pelvisFwd), thigh.dot(pelvisDown)))
    out[`ankle${S}`] = angle(shank, s.toe.clone().sub(s.heel)) - 90
  }
  return out
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const lerpPair = ([a0, a1] = [0, 0], [b0, b1] = [0, 0], t: number): [number, number] => [lerp(a0, b0, t), lerp(a1, b1, t)]
const lerpVec = (a: Vec, b: Vec, t: number): Vec => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]

function lerpLimb(a: Limb, b: Limb, t: number): Limb {
  if (isTarget(a) && isTarget(b)) return { target: lerpVec(a.target, b.target, t), pole: lerpVec(a.pole, b.pole, t) }
  if (!isTarget(a) && !isTarget(b)) {
    return { flex: lerp(a.flex, b.flex, t), abd: lerp(a.abd, b.abd, t), rot: lerp(a.rot ?? 0, b.rot ?? 0, t), bend: lerp(a.bend, b.bend, t) }
  }
  return t < 0.5 ? a : b
}

export function lerpPose(a: Pose, b: Pose, t: number): Pose {
  const feet: Partial<Record<Side, Foot>> = {}
  for (const side of SIDES) {
    const fa = a.feet[side]
    const fb = b.feet[side]
    if (fa && fb) feet[side] = { fwd: lerpVec(fa.fwd, fb.fwd, t), pitch: lerp(fa.pitch, fb.pitch, t) }
    else if (t < 0.5 ? fa : fb) feet[side] = t < 0.5 ? fa : fb
  }
  return {
    pelvis: lerpVec(a.pelvis, b.pelvis, t),
    pelvisRot: lerpVec(a.pelvisRot, b.pelvisRot, t),
    spine: lerpVec(a.spine, b.spine, t),
    neck: lerp(a.neck, b.neck, t),
    arms: { l: lerpLimb(a.arms.l, b.arms.l, t), r: lerpLimb(a.arms.r, b.arms.r, t) },
    legs: { l: lerpLimb(a.legs.l, b.legs.l, t), r: lerpLimb(a.legs.r, b.legs.r, t) },
    feet,
    wrists: { l: lerp(a.wrists?.l ?? 0, b.wrists?.l ?? 0, t), r: lerp(a.wrists?.r ?? 0, b.wrists?.r ?? 0, t) },
    forearms: { l: lerp(a.forearms?.l ?? 0, b.forearms?.l ?? 0, t), r: lerp(a.forearms?.r ?? 0, b.forearms?.r ?? 0, t) },
    scapula: { l: lerpPair(a.scapula?.l, b.scapula?.l, t), r: lerpPair(a.scapula?.r, b.scapula?.r, t) },
  }
}
