import { Vector3 } from 'three'
import type { Motion } from '../motion'
import type { Pose, Vec } from '../pose'
import { DIM, clone, feetOnFloor, flatHands, gripEach, joints, key, stand, supine, throughKeys } from './helpers'

const LEG = DIM.thigh + DIM.shank
/** Ankle height when balancing on the toes with the foot pointing straight down (toe pitch ≈ 70°). */
const TOE_ANKLE_Y = 0.2
const TOE_PITCH = 70
const MAT = { size: [0.7, 0.01, 1.9] as [number, number, number] }

/**
 * Straight body pivoting on the toes: `angle` is the body's tilt from vertical (90 = parallel to the floor).
 * Ankles stay at `ankleZ`; the head points to +Z.
 */
export function plank(angle: number, ankleZ: number, ankleHalf = 0.09): Pose {
  const pose = stand()
  const r = (angle * Math.PI) / 180
  pose.pelvisRot = [angle, 0, 0]
  pose.pelvis = [0, TOE_ANKLE_Y + LEG * Math.cos(r), ankleZ + LEG * Math.sin(r)]
  for (const side of ['l', 'r'] as const) {
    const x = side === 'l' ? ankleHalf : -ankleHalf
    pose.legs[side] = { target: [x, TOE_ANKLE_Y, ankleZ], pole: [0, -1, 0.2] }
    pose.feet[side] = { fwd: [0, 0, 1], pitch: TOE_PITCH }
  }
  return pose
}

/** Body level with the floor: chest about a fist's height above the mat. */
const PUSH_UP_BOTTOM = 90
const PUSH_UP_HAND_X = 0.22
/** Wrist height with the hand flat on the mat. */
const PUSH_UP_WRIST_Y = 0.045
/** Fingers point forward, turned slightly out. */
const PUSH_UP_FINGERS_OUT = 0.15
/** Elbows flare out to the sides on the way down (ACE); the upward lean keeps the back of the arm facing up. */
const PUSH_UP_ELBOW_POLE: Vec = [0.5, 1, -0.3]
/** Top of the push-up: arms straight but elbows soft (ACE "fully extended", not locked). */
const PUSH_UP_REACH = 0.995 * (DIM.upperArm + DIM.forearm)

/** Body tilt at which a straight arm reaches from the shoulder down to a wrist directly below it. */
function pushUpTopAngle(ankleZ: number) {
  let lo = 45
  let hi = 89
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2
    const shoulder = joints(plank(mid, ankleZ)).l.shoulder
    const reach = Math.hypot(PUSH_UP_HAND_X - shoulder.x, shoulder.y - PUSH_UP_WRIST_Y)
    if (reach > PUSH_UP_REACH) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

/** Push-up: hands flat under the shoulders, body straight from head to heels, chest down near the floor. */
export function pushUp(): Motion {
  const ankleZ = -0.75
  const top = pushUpTopAngle(ankleZ)
  const handZ = joints(plank(top, ankleZ)).l.shoulder.z
  const wrist = (side: 'l' | 'r'): Vec => [side === 'l' ? PUSH_UP_HAND_X : -PUSH_UP_HAND_X, PUSH_UP_WRIST_Y, handZ]
  const fingers = (side: 'l' | 'r'): Vec => [side === 'l' ? PUSH_UP_FINGERS_OUT : -PUSH_UP_FINGERS_OUT, 0, 1]
  // Exact in-between keys keep the flat hands planted while the arms (joint angles) bend.
  const at = (s: number) => flatHands(plank(top + (PUSH_UP_BOTTOM - top) * s, ankleZ), wrist, PUSH_UP_ELBOW_POLE, fingers)
  return {
    keys: throughKeys(at, ['Hạ người', 'Đẩy lên', 'Giữ thẳng'], [0.5, 0.85]),
    props: [{ kind: 'block', center: [0, 0.005, -0.1], size: MAT.size }],
    seconds: 3,
  }
}

/** Fingertips lightly behind the ears (head frame), elbows held wide (ACE). */
const BEHIND_EAR: Vec = [0.12, 0, -0.04]
const CRUNCH_ELBOW_POLE: Vec = [1, 0.1, 0]

function headPoint(pose: Pose, [x, y, z]: Vec) {
  const j = joints(pose)
  return j.head.clone().add(new Vector3(x, y, z).applyQuaternion(j.headQ))
}

/** Crunch: knees bent, feet flat; the upper back curls off the floor while the low back stays down. */
export function crunch(): Motion {
  const down = feetOnFloor(supine(0, 0.25), 0.12, 0.72)
  const up = clone(down)
  up.spine = [38, 0, 0]
  up.neck = 8
  for (const p of [down, up]) gripEach(p, (side) => headPoint(p, [side === 'l' ? BEHIND_EAR[0] : -BEHIND_EAR[0], BEHIND_EAR[1], BEHIND_EAR[2]]), CRUNCH_ELBOW_POLE)
  return {
    keys: [key(0, down, 'Cuộn lên'), key(0.45, up, 'Hạ xuống'), key(0.85, down, 'Nghỉ')],
    props: [{ kind: 'block', center: [0, 0.005, 0.1], size: MAT.size }],
    seconds: 2.8,
  }
}
