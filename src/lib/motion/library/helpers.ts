import { Vector3 } from 'three'
import { solveTwoBone } from '../ik'
import type { Key } from '../motion'
import { solvePose, standing, type Joints, type LimbAngles, type Pose, type Vec } from '../pose'
import { DIM, SIDES, sideSign, type Side } from '../skeleton'

export { DIM, STANDING_PELVIS_Y } from '../skeleton'
export type { Pose, Vec } from '../pose'

export const FLOOR_ANKLE_Y = DIM.ankleHeight
export const BENCH_HEIGHT = 0.43
/** Pelvis joint height above a surface the person lies on (half the trunk thickness). */
export const LYING_PELVIS_LIFT = 0.1
/** Shoulder joint height above a surface the person lies on. */
export const LYING_SHOULDER_LIFT = 0.08

export const clone = (p: Pose): Pose => structuredClone(p)
export const key = (t: number, pose: Pose, phase: string): Key => ({ t, pose, phase })
const toVec = (v: Vector3): Vec => [v.x, v.y, v.z]
export const rad = (d: number) => (d * Math.PI) / 180
export const deg = (r: number) => (r * 180) / Math.PI

/** Standing start: feet `halfWidth` from the midline, toes turned out `toeOut` degrees. */
export function stand(halfWidth = DIM.hipHalfWidth, toeOut = 0): Pose {
  const pose = standing()
  return plantFeet(pose, halfWidth, toeOut)
}

/** Ankles on the floor (feet flat) at ±halfWidth, `z` forward offset; knees track the toes. */
export function plantFeet(pose: Pose, halfWidth: number, toeOut = 0, z = 0): Pose {
  for (const side of SIDES) {
    const s = sideSign(side)
    const fwd: Vec = [s * Math.sin(rad(toeOut)), 0, Math.cos(rad(toeOut))]
    pose.legs[side] = { target: [s * halfWidth, FLOOR_ANKLE_Y, z], pole: [fwd[0] + s * 0.15, 0.1, fwd[2]] }
    pose.feet[side] = { fwd, pitch: 0 }
  }
  return pose
}

export const joints = (pose: Pose): Joints => solvePose(pose)

/** Point in the chest frame (x to the left, y up, z front) of the pose, in world space. */
export function chestPoint(pose: Pose, local: Vec): Vector3 {
  const j = solvePose(pose)
  return j.chest.clone().add(new Vector3(...local).applyQuaternion(j.chestQ))
}

/** Point in the pelvis frame, in world space. */
export function pelvisPoint(pose: Pose, local: Vec): Vector3 {
  const j = solvePose(pose)
  return j.pelvis.clone().add(new Vector3(...local).applyQuaternion(j.pelvisQ))
}

/** Direction in the chest frame, in world space. */
export function chestDir(pose: Pose, local: Vec): Vec {
  return toVec(new Vector3(...local).applyQuaternion(solvePose(pose).chestQ))
}

/** Both hands on a bar centred at `center` along world X, `halfGrip` from the centre; elbows towards `pole`. */
export function gripBar(pose: Pose, center: Vector3 | Vec, halfGrip: number, pole: Vec): Pose {
  const c = Array.isArray(center) ? new Vector3(...center) : center
  for (const side of SIDES) {
    pose.arms[side] = { target: [c.x + sideSign(side) * halfGrip, c.y, c.z], pole: [sideSign(side) * pole[0], pole[1], pole[2]] }
  }
  return pose
}

/** Each hand at its own world point, elbow pole mirrored for the right side. */
export function gripEach(pose: Pose, at: (side: Side) => Vector3 | Vec, pole: Vec): Pose {
  for (const side of SIDES) {
    const p = at(side)
    pose.arms[side] = { target: Array.isArray(p) ? p : toVec(p), pole: [sideSign(side) * pole[0], pole[1], pole[2]] }
  }
  return pose
}

/** Same joint angles for both arms (or legs). */
export function armsAngles(pose: Pose, angles: LimbAngles): Pose {
  pose.arms = { l: { ...angles }, r: { ...angles } }
  return pose
}

export function legsAngles(pose: Pose, angles: LimbAngles): Pose {
  pose.legs = { l: { ...angles }, r: { ...angles } }
  pose.feet = {}
  return pose
}

/**
 * Supine on a surface whose top is at `surfaceY`, head towards -Z, pelvis at `pelvisZ`.
 * `incline` raises the head end (degrees).
 */
export function supine(surfaceY: number, pelvisZ: number, incline = 0): Pose {
  const pose = standing()
  pose.pelvisRot = [-90 + incline, 0, 0]
  pose.pelvis = [0, surfaceY + LYING_PELVIS_LIFT, pelvisZ]
  return pose
}

/** Prone (face down), head towards +Z. */
export function prone(surfaceY: number, pelvisZ: number): Pose {
  const pose = standing()
  pose.pelvisRot = [90, 0, 0]
  pose.pelvis = [0, surfaceY + LYING_PELVIS_LIFT, pelvisZ]
  return pose
}

/** Feet flat on the floor for a lying or seated pose: ankles at ±halfWidth, `z`, feet pointing +Z. */
export function feetOnFloor(pose: Pose, halfWidth: number, z: number, kneePole: Vec = [0, 1, 0.3]): Pose {
  for (const side of SIDES) {
    pose.legs[side] = { target: [sideSign(side) * halfWidth, FLOOR_ANKLE_Y, z], pole: kneePole }
    pose.feet[side] = { fwd: [0, 0, 1], pitch: 0 }
  }
  return pose
}

/** Same forearm rotation on both sides (0 supinated, 90 neutral, 180 pronated). */
export function forearms(pose: Pose, rotation: number): Pose {
  pose.forearms = { l: rotation, r: rotation }
  return pose
}

/** Sets Pose.forearms so each palm faces `dir` (world; only its part across the forearm counts). */
export function turnPalms(pose: Pose, dir: (side: Side, j: Joints) => Vector3 | Vec): Pose {
  pose.forearms = {}
  const j = solvePose(pose)
  for (const side of SIDES) {
    const { grip, wrist, palm } = j[side]
    const axis = grip.clone().sub(wrist).normalize()
    const d = dir(side, j)
    const target = (Array.isArray(d) ? new Vector3(...d) : d.clone()).projectOnPlane(axis).normalize()
    const turn = sideSign(side) * deg(Math.atan2(axis.dot(palm.clone().cross(target)), palm.dot(target)))
    // Kept in (-90°, 270°] so keys never blend between +180° and -180° through a full forearm spin.
    pose.forearms[side] = turn <= -90 ? turn + 360 : turn
  }
  return pose
}

/**
 * Hands resting palm down on a support: each wrist at `wrist(side)`, the hand pointing along `fingers(side)`
 * (horizontal for a flat hand). Arms become joint angles (the wrist bend needs them); the elbow bends towards `pole`.
 */
export function flatHands(pose: Pose, wrist: (side: Side) => Vec, pole: Vec, fingers: (side: Side) => Vec): Pose {
  pose.wrists = {}
  const j = solvePose(pose)
  const toChest = j.chestQ.clone().invert()
  for (const side of SIDES) {
    const s = sideSign(side)
    const shoulder = j[side].shoulder
    const w = new Vector3(...wrist(side))
    const { mid: elbow } = solveTwoBone(shoulder, w, new Vector3(s * pole[0], pole[1], pole[2]), DIM.upperArm, DIM.forearm)
    const upper = elbow.clone().sub(shoulder).normalize().applyQuaternion(toChest)
    const fore = w.clone().sub(elbow).normalize().applyQuaternion(toChest)
    const flex = Math.atan2(upper.z, -upper.y)
    const unturned = new Vector3(0, Math.sin(flex), Math.cos(flex))
    const front = fore.clone().addScaledVector(upper, -fore.dot(upper)).normalize()
    const turn = Math.atan2(upper.dot(unturned.clone().cross(front)), unturned.dot(front))
    pose.arms[side] = { flex: deg(flex), abd: deg(Math.asin(s * upper.x)), rot: -s * deg(turn), bend: deg(upper.angleTo(fore)) }
  }
  turnPalms(pose, (side) => new Vector3(...fingers(side)).negate())
  const k = solvePose(pose)
  for (const side of SIDES) {
    const fore = k[side].grip.clone().sub(k[side].wrist).normalize()
    const hand = new Vector3(...fingers(side)).normalize()
    pose.wrists[side] = deg(Math.atan2(hand.dot(k[side].palm), hand.dot(fore)))
  }
  return pose
}

/** Keys for a movement built by `at(s)`, s from 0 to 1 and back, with exact in-between keys of the same phase. */
export function throughKeys(at: (s: number) => Pose, phases: [string, string, string], times: [number, number], steps = 3): Key[] {
  const [down, up] = times
  const keys: Key[] = []
  for (let i = 0; i < steps; i++) keys.push(key((down * i) / steps, at(i / steps), phases[0]))
  for (let i = 0; i < steps; i++) keys.push(key(down + ((up - down) * i) / steps, at(1 - i / steps), phases[1]))
  keys.push(key(up, at(0), phases[2]))
  return keys
}
