import { Vector3 } from 'three'
import type { Motion, PropSpec } from '../motion'
import type { LimbAngles } from '../pose'
import { SIDES, sideSign, type Side } from '../skeleton'
import { plank } from './floor'
import {
  armsAngles,
  BENCH_HEIGHT,
  chestDir,
  chestPoint,
  clone,
  DIM,
  feetOnFloor,
  flatHands,
  FLOOR_ANKLE_Y,
  gripBar,
  gripEach,
  joints,
  key,
  legsAngles,
  LYING_PELVIS_LIFT,
  LYING_SHOULDER_LIFT,
  rad,
  stand,
  supine,
  throughKeys,
  turnPalms,
  type Pose,
  type Vec,
} from './helpers'

const ARM_REACH = DIM.upperArm + DIM.forearm + DIM.hand
/** Grip distance from the shoulder at lockout: elbows about 7° short of straight, not locked. */
const LOCKOUT = 0.998 * ARM_REACH

/** Pronated grip on a press: palms face the feet (chest frame), knuckles towards the head. */
const palmsToFeet = (pose: Pose) => turnPalms(pose, () => chestDir(pose, [0, -1, 0]))
const palmsIn = (pose: Pose) => turnPalms(pose, (side) => chestDir(pose, [-sideSign(side), 0, 0]))

const PELVIS_Z = 0.25
const FLAT_BENCH = { length: 1.15, width: 0.3, centerZ: -0.1 }
const FEET = { half: 0.3, z: 0.78 }
const PAD = { width: 0.3, thickness: 0.06 }
const BENCH_LEG_RADIUS = 0.03
/** Elbows out to the side and below the bar, as in press.ts. */
const PRESS_POLE: Vec = [0.7, -1, 0.45]
const DUMBBELL_ELBOW = { flare: 40, drop: 25 }
/** Dumbbells at lockout sit over the chin/eyes rather than the shoulders (ACE chest press). */
const DUMBBELL_TOP_HEADWARD = 0.08

const flatBench = (): PropSpec => ({
  kind: 'block',
  center: [0, BENCH_HEIGHT / 2, FLAT_BENCH.centerZ],
  size: [FLAT_BENCH.width, BENCH_HEIGHT, FLAT_BENCH.length],
})

const lyingFlat = () => feetOnFloor(supine(BENCH_HEIGHT, PELVIS_Z), FEET.half, FEET.z)

/**
 * Shoulder blades set down and back ("siết bả vai về sau và xuống"), held for the whole set. Lying, this also
 * brings the shoulders from the pelvis lift down to LYING_SHOULDER_LIFT above the pad.
 */
const SET_SCAPULA: [number, number] = [-0.015, -(LYING_PELVIS_LIFT - LYING_SHOULDER_LIFT)]
function setScapulae(pose: Pose): Pose {
  pose.scapula = { l: [...SET_SCAPULA], r: [...SET_SCAPULA] }
  return pose
}

/** Point `along` metres from the pelvis on the trunk axis of a pose lying on its back, offset `out` along the chest's normal. */
function trunkPoint(pose: Pose, along: number, out: number): Vec {
  const tilt = rad(pose.pelvisRot[0] + 90)
  const [x, y, z] = pose.pelvis
  return [x, y + along * Math.sin(tilt) + out * Math.cos(tilt), z - along * Math.cos(tilt) + out * Math.sin(tilt)]
}

/** Back pad of a reclined (or declined) bench under a supine trunk, from `from` to `to` metres along the body. */
function backPad(pose: Pose, from: number, to: number): PropSpec {
  return {
    kind: 'block',
    center: trunkPoint(pose, (from + to) / 2, -LYING_PELVIS_LIFT - PAD.thickness / 2),
    size: [PAD.width, PAD.thickness, to - from],
    rot: [pose.pelvisRot[0] + 90, 0, 0],
  }
}

/** Vertical bench leg from the floor up to the underside of the back pad at `along`. */
function padLeg(pose: Pose, along: number): PropSpec {
  const top = trunkPoint(pose, along, -LYING_PELVIS_LIFT - PAD.thickness)
  return { kind: 'rod', from: [0, 0, top[2]], to: top, radius: BENCH_LEG_RADIUS }
}

/** Grip `distance` from the left shoulder, `halfGrip` from the midline, straight above it (world up), shifted `dz`. */
function overShoulder(pose: Pose, halfGrip: number, distance: number, dz = 0): Vec {
  const shoulder = joints(pose).l.shoulder
  const dx = halfGrip - shoulder.x
  return [0, shoulder.y + Math.sqrt(distance ** 2 - dx * dx - dz * dz), shoulder.z + dz]
}

function barbellPress(base: Pose, halfGrip: number, touch: Vec, pole: Vec, props: PropSpec[]): Motion {
  const top = clone(base)
  const bottom = clone(base)
  gripBar(top, overShoulder(top, halfGrip, LOCKOUT), halfGrip, pole)
  gripBar(bottom, chestPoint(bottom, touch), halfGrip, pole)
  for (const p of [top, bottom]) palmsToFeet(p)
  return {
    keys: [key(0, top, 'Hạ tạ'), key(0.5, bottom, 'Đẩy lên'), key(0.85, top, 'Nghỉ')],
    props: [...props, { kind: 'barbell', at: 'grips' }],
    seconds: 3.4,
  }
}

/**
 * Dumbbell press. At the bottom the upper arm points `DUMBBELL_ELBOW.flare` degrees out from the trunk and
 * `drop` degrees below the chest plane, with the forearm vertical (elbow under the wrist).
 */
function dumbbellPress(base: Pose, props: PropSpec[]): Motion {
  const top = clone(base)
  const bottom = clone(base)
  const f = rad(DUMBBELL_ELBOW.flare)
  const d = rad(DUMBBELL_ELBOW.drop)
  const elbowDir = chestDir(base, [Math.sin(f) * Math.cos(d), -Math.cos(f) * Math.cos(d), -Math.sin(d)])
  // The pole must not lie along the upper arm: tilting it down keeps it in the arm's plane, on the elbow side.
  const pole: Vec = [elbowDir[0], elbowDir[1] - 0.5, elbowDir[2]]
  const j = joints(base)
  gripEach(
    bottom,
    (side) => {
      const dir = new Vector3(sideSign(side) * elbowDir[0], elbowDir[1], elbowDir[2])
      return j[side].shoulder.clone().addScaledVector(dir, DIM.upperArm).add(new Vector3(0, DIM.forearm + DIM.hand, 0))
    },
    pole,
  )
  const [, y, z] = overShoulder(top, j.l.shoulder.x, LOCKOUT, -DUMBBELL_TOP_HEADWARD)
  gripEach(top, (side) => [sideSign(side) * j.l.shoulder.x, y, z], pole)
  for (const p of [top, bottom]) palmsToFeet(p)
  return {
    keys: [key(0, top, 'Hạ tạ'), key(0.5, bottom, 'Đẩy lên'), key(0.85, top, 'Nghỉ')],
    props: [...props, { kind: 'dumbbell', at: 'gripL' }, { kind: 'dumbbell', at: 'gripR' }],
    seconds: 3.4,
  }
}

const INCLINE = { seatY: 0.43, seatDepth: 0.36, padFrom: -0.1, padTo: 0.82, legAt: 0.45 }

/** Reclined on an incline bench (seat + back pad), feet flat on the floor. */
function lyingIncline(angle: number): { pose: Pose; bench: PropSpec[] } {
  const pose = feetOnFloor(supine(INCLINE.seatY, PELVIS_Z, angle), FEET.half, FEET.z)
  const bench: PropSpec[] = [
    { kind: 'block', center: [0, INCLINE.seatY / 2, PELVIS_Z + 0.02], size: [PAD.width, INCLINE.seatY, INCLINE.seatDepth] },
    backPad(pose, INCLINE.padFrom, INCLINE.padTo),
    padLeg(pose, INCLINE.legAt),
  ]
  return { pose, bench }
}

/** Incline barbell bench press on a 30° bench: bar from lockout over the shoulders down to the upper chest. */
function inclineBarbellBenchPress(): Motion {
  const { pose, bench } = lyingIncline(30)
  setScapulae(pose)
  return barbellPress(pose, 0.32, [0, 0.1, 0.14], PRESS_POLE, bench)
}

const DECLINE = { angle: -15, pelvisY: 0.72, padFrom: -0.2, padTo: 0.85, roller: 0.05, rollerHalf: 0.2 }

/** Decline barbell bench press (head 15° below the hips), shins hooked under the leg rollers. */
function declineBarbellBenchPress(): Motion {
  const pose = setScapulae(supine(DECLINE.pelvisY - LYING_PELVIS_LIFT, PELVIS_Z, DECLINE.angle))
  const hip = joints(pose).l.hip
  const thighUp = rad(20)
  const knee = new Vector3(0, hip.y + DIM.thigh * Math.sin(thighUp), hip.z + DIM.thigh * Math.cos(thighUp))
  const shankDown = rad(70)
  const ankle = knee.clone().add(new Vector3(0, -DIM.shank * Math.sin(shankDown), DIM.shank * Math.cos(shankDown)))
  for (const side of SIDES) {
    pose.legs[side] = { target: [sideSign(side) * DIM.hipHalfWidth, ankle.y, ankle.z], pole: [0, 1, 0.6] }
    delete pose.feet[side]
  }
  const kneeRoller = new Vector3(0, knee.y - 0.1, knee.z - 0.06)
  const ankleRoller = ankle.clone().add(new Vector3(0, 0.02, 0.08))
  const roller = (at: Vector3): PropSpec => ({
    kind: 'rod',
    from: [-DECLINE.rollerHalf, at.y, at.z],
    to: [DECLINE.rollerHalf, at.y, at.z],
    radius: DECLINE.roller,
  })
  const bench: PropSpec[] = [
    backPad(pose, DECLINE.padFrom, DECLINE.padTo),
    padLeg(pose, 0),
    padLeg(pose, 0.7),
    roller(kneeRoller),
    roller(ankleRoller),
    { kind: 'rod', from: [0, 0, ankleRoller.z], to: [0, kneeRoller.y, ankleRoller.z], radius: BENCH_LEG_RADIUS },
    { kind: 'rod', from: [0, kneeRoller.y, ankleRoller.z], to: [0, kneeRoller.y, kneeRoller.z], radius: BENCH_LEG_RADIUS },
  ]
  return barbellPress(pose, 0.32, [0, -0.01, 0.15], PRESS_POLE, bench)
}

/** Flat dumbbell press: from lockout over the chin, lowered to the sides of the mid-chest. */
function dumbbellBenchPress(): Motion {
  return dumbbellPress(setScapulae(lyingFlat()), [flatBench()])
}

/** Incline dumbbell press on a 45° bench (ACE: 45–60°), lowered to the upper chest with forearms vertical. */
function inclineDumbbellPress(): Motion {
  const { pose, bench } = lyingIncline(45)
  setScapulae(pose)
  return dumbbellPress(pose, bench)
}

/** Turns the elbow crease towards the midline so the soft elbow bend stays in the plane of a fly. */
const FLY_ROT = -90
const FLY_BEND = 20

/** Dumbbell fly: arms over the chest, palms in, lowered in a wide arc until the upper arms are level with the shoulders. */
function dumbbellFly(): Motion {
  const top = armsAngles(setScapulae(lyingFlat()), { flex: 90, abd: 2, rot: FLY_ROT, bend: FLY_BEND })
  const bottom = armsAngles(clone(top), { flex: 90, abd: 92, rot: FLY_ROT, bend: FLY_BEND })
  return {
    keys: [key(0, top, 'Mở tay xuống'), key(0.5, bottom, 'Khép tay lên'), key(0.86, top, 'Nghỉ')],
    props: [flatBench(), { kind: 'dumbbell', at: 'gripL' }, { kind: 'dumbbell', at: 'gripR' }],
    seconds: 3.6,
  }
}

const CROSSOVER = { pulleyX: 1.15, frameY: 2.2, frameZ: -0.35 }

/** Uprights of a cable crossover station with a pulley on each side at `pulleyY`. */
function crossoverStation(pulleyY: number, pulleyZ: number): PropSpec[] {
  return SIDES.flatMap((side): PropSpec[] => {
    const x = sideSign(side) * CROSSOVER.pulleyX
    return [
      { kind: 'rod', from: [x, 0, pulleyZ], to: [x, CROSSOVER.frameY, pulleyZ], radius: 0.03 },
      { kind: 'cable', from: [x, pulleyY, pulleyZ], to: side === 'l' ? 'gripL' : 'gripR' },
    ]
  })
}

/** Standing cable fly from pulleys just above the shoulders: trunk inclined forward, hands meet in front of the body. */
function cableCrossover(): Motion {
  const open = stand(0.14)
  open.pelvis = [0, open.pelvis[1] - 0.03, -0.05]
  open.pelvisRot = [15, 0, 0]
  armsAngles(open, { flex: 80, abd: 85, rot: FLY_ROT, bend: FLY_BEND })
  const closed = armsAngles(clone(open), { flex: 80, abd: -6, rot: FLY_ROT, bend: FLY_BEND })
  return {
    keys: [key(0, open, 'Ép tay vào'), key(0.27, closed, 'Giữ'), key(0.5, closed, 'Mở tay chậm')],
    props: crossoverStation(1.62, CROSSOVER.frameZ),
    seconds: 4.4,
  }
}

/** Low-to-high cable fly: staggered stance, upright trunk, hands sweep up and in from hip level to meet at face height. */
function lowToHighCableFly(): Motion {
  const low = stand()
  low.pelvis = [0, low.pelvis[1] - 0.04, 0]
  for (const side of SIDES) {
    low.legs[side] = { target: [sideSign(side) * 0.12, FLOOR_ANKLE_Y, side === 'l' ? 0.2 : -0.2], pole: [sideSign(side) * 0.15, 0.1, 1] }
  }
  armsAngles(low, { flex: 12, abd: 45, bend: 15 })
  const high = armsAngles(clone(low), { flex: 105, abd: -6, bend: 15 })
  return {
    keys: [key(0, low, 'Kéo lên'), key(0.32, high, 'Giữ'), key(0.42, high, 'Hạ xuống chậm')],
    props: crossoverStation(0.7, CROSSOVER.frameZ),
    seconds: 3.8,
  }
}

const DIP = { barY: 1.25, half: 0.27, barFrom: -0.35, barTo: 0.45 }

/** Moves the pelvis so the midpoint of the shoulders lands on `at`. */
function shouldersAt(pose: Pose, at: Vec): Pose {
  const j = joints(pose)
  const mid = j.l.shoulder.clone().lerp(j.r.shoulder, 0.5)
  pose.pelvis = [pose.pelvis[0] + at[0] - mid.x, pose.pelvis[1] + at[1] - mid.y, pose.pelvis[2] + at[2] - mid.z]
  return pose
}

/**
 * Shoulder position over a hand that grips a support: the forearm leans `forearmBack` degrees behind vertical
 * (elbow behind the hand) and the upper arm rises `upperRise` degrees above horizontal from elbow to shoulder.
 */
function shoulderFromHand(hand: Vec, forearmBack: number, upperRise: number, forearm = DIM.forearm + DIM.hand): Vec {
  const f = rad(forearmBack)
  const u = rad(upperRise)
  return [
    0,
    hand[1] + forearm * Math.cos(f) + DIM.upperArm * Math.sin(u),
    hand[2] - forearm * Math.sin(f) + DIM.upperArm * Math.cos(u),
  ]
}

/** Parallel-bar chest dip: from straight arms with shoulders over the hands down to 90° elbows, trunk leaning forward. */
function chestDip(): Motion {
  const legs: LimbAngles = { flex: 10, abd: 3, bend: 75 }
  const hands: Vec = [0, DIP.barY, 0]
  const top = legsAngles(stand(), legs)
  top.pelvisRot = [8, 0, 0]
  shouldersAt(top, overShoulderOfHands(hands))
  const bottom = clone(top)
  bottom.pelvisRot = [30, 0, 0]
  shouldersAt(bottom, shoulderFromHand(hands, 10, 10))
  for (const p of [top, bottom]) palmsIn(gripBar(p, hands, DIP.half, [0.4, -0.2, -1]))
  return {
    keys: [key(0, top, 'Hạ người'), key(0.5, bottom, 'Đẩy lên'), key(0.85, top, 'Nghỉ')],
    props: SIDES.flatMap((side): PropSpec[] => {
      const x = sideSign(side) * DIP.half
      return [
        { kind: 'rod', from: [x, DIP.barY, DIP.barFrom], to: [x, DIP.barY, DIP.barTo], radius: 0.022 },
        { kind: 'rod', from: [x, 0, DIP.barFrom], to: [x, DIP.barY, DIP.barFrom], radius: 0.03 },
        { kind: 'rod', from: [x, 0, DIP.barTo], to: [x, DIP.barY, DIP.barTo], radius: 0.03 },
      ]
    }),
    seconds: 3.4,
  }
}

/** Shoulders straight above hands gripping at ±DIP.half, arms at lockout. */
function overShoulderOfHands(hands: Vec): Vec {
  const dx = DIP.half - DIM.shoulderHalfWidth
  return [0, hands[1] + Math.sqrt(LOCKOUT ** 2 - dx * dx), hands[2] + 0.02]
}

const SEAT = { y: 0.45, depth: 0.42, back: 0.08, backHeight: 0.8 }
const PEC_DECK_ARM_RISE = 0.06
/** Post from the pec deck's arm axes down to the backrest, clear of the head. */
const PEC_DECK_POST_Z = -0.18
const MACHINE_LEVER = 0.45
/** The machine arm ends just past the hand, at the handle. */
const HANDLE_END = 0.04
/** Uprights stand behind the backrest so they do not hide the lifter. */
const MACHINE_FRAME = { x: 0.5, z: -0.3 }

/** Upright on a machine seat, back on the pad, feet flat with knees about 90°. */
function seated(): { pose: Pose; seat: PropSpec[] } {
  const pose = feetOnFloor(stand(), 0.16, 0.48, [0, 0.3, 1])
  pose.pelvis = [0, SEAT.y + LYING_PELVIS_LIFT, 0]
  const backZ = -LYING_PELVIS_LIFT - SEAT.back / 2
  const seat: PropSpec[] = [
    { kind: 'block', center: [0, SEAT.y / 2, 0.12], size: [0.4, SEAT.y, SEAT.depth] },
    { kind: 'block', center: [0, SEAT.y + 0.05 + (SEAT.backHeight - 0.05) / 2, backZ], size: [0.4, SEAT.backHeight - 0.05, SEAT.back] },
  ]
  return { pose, seat }
}

/**
 * Seated chest press (ACE): handles at nipple level, starting no deeper than the front of the chest, pressed
 * forward until the elbows are almost straight but not locked.
 */
function machineChestPress(): Motion {
  const { pose, seat } = seated()
  setScapulae(pose)
  const back = clone(pose)
  const out = clone(pose)
  const shoulder = joints(pose).l.shoulder
  const handleY = chestPoint(pose, [0, 0, 0]).y
  const half = 0.24
  const start = chestPoint(pose, [0, 0, 0.13]).z
  const dy = shoulder.y - handleY
  const dx = half - shoulder.x
  const end = shoulder.z + Math.sqrt(LOCKOUT ** 2 - dy * dy - dx * dx)
  const pole: Vec = [0.8, -0.4, -1]
  gripBar(back, [0, handleY, start], half, pole)
  gripBar(out, [0, handleY, end], half, pole)
  for (const p of [back, out]) palmsToFeet(p)
  // Lever arms hang from a pivot above and midway between the two handle positions, so their length holds.
  const pivot = (side: Side, x = half): Vec => [sideSign(side) * x, handleY + MACHINE_LEVER, (start + end) / 2]
  const frameTop = (side: Side): Vec => [sideSign(side) * MACHINE_FRAME.x, handleY + MACHINE_LEVER, MACHINE_FRAME.z]
  return {
    keys: [key(0, back, 'Đẩy ra'), key(0.35, out, 'Trả về chậm'), key(0.9, back, 'Nghỉ')],
    props: [
      ...seat,
      ...SIDES.flatMap((side): PropSpec[] => [
        { kind: 'lever', pivot: pivot(side), at: side === 'l' ? 'gripL' : 'gripR', overhang: HANDLE_END },
        { kind: 'rod', from: pivot(side), to: pivot(side, MACHINE_FRAME.x), radius: 0.025 },
        { kind: 'rod', from: pivot(side, MACHINE_FRAME.x), to: frameTop(side), radius: 0.025 },
        { kind: 'rod', from: [sideSign(side) * MACHINE_FRAME.x, 0, MACHINE_FRAME.z], to: frameTop(side), radius: 0.03 },
      ]),
    ],
    seconds: 3.4,
  }
}

/**
 * Pec deck: upper arms level with the shoulders, elbows at 90°, forearms on the pads and hands on the handles at
 * head height; the arms swing together in front of the chest. The machine arms hang from a vertical axis above
 * each shoulder (the forearm pads cannot be drawn).
 */
function pecDeck(): Motion {
  const { pose, seat } = seated()
  const open = armsAngles(pose, { flex: 90, abd: 90, bend: 90 })
  const closed = armsAngles(clone(open), { flex: 90, abd: -8, bend: 90 })
  const shoulder = joints(open).l.shoulder
  // Each machine arm turns about a vertical axis straight above the shoulder, so the handle stays at a fixed distance.
  const axisY = joints(open).l.grip.y + PEC_DECK_ARM_RISE
  const pivot = (side: Side): Vec => [sideSign(side) * shoulder.x, axisY, shoulder.z]
  const behind: Vec = [0, axisY, PEC_DECK_POST_Z]
  return {
    keys: [key(0, open, 'Ép vào'), key(0.38, closed, 'Mở ra chậm'), key(0.9, open, 'Nghỉ')],
    props: [
      ...seat,
      ...SIDES.map((side): PropSpec => ({ kind: 'lever', pivot: pivot(side), at: side === 'l' ? 'gripL' : 'gripR', overhang: HANDLE_END })),
      { kind: 'rod', from: pivot('r'), to: pivot('l'), radius: 0.025 },
      { kind: 'rod', from: [0, axisY, shoulder.z], to: behind, radius: 0.025 },
      { kind: 'rod', from: behind, to: [0, SEAT.y + SEAT.backHeight, PEC_DECK_POST_Z], radius: 0.025 },
    ],
    seconds: 3.6,
  }
}

/** Arms tilted towards the feet so the dumbbells start above the chest, not the face. */
const PULLOVER_START_FLEX = 75

/** Dumbbell pullover (ACE): a dumbbell in each hand, palms facing, arms nearly straight from over the chest to behind the head. */
function dumbbellPullover(): Motion {
  const over = armsAngles(lyingFlat(), { flex: PULLOVER_START_FLEX, abd: 0, bend: 15 })
  const back = armsAngles(clone(over), { flex: 165, abd: 0, bend: 15 })
  for (const p of [over, back]) palmsIn(p)
  return {
    keys: [key(0, over, 'Đưa ra sau đầu'), key(0.5, back, 'Kéo về'), key(0.88, over, 'Nghỉ')],
    props: [flatBench(), { kind: 'dumbbell', at: 'gripL' }, { kind: 'dumbbell', at: 'gripR' }],
    seconds: 3.8,
  }
}

/** Close-grip bench press: hands in line with the shoulders, elbows tucked towards the feet, bar to the lower chest. */
function closeGripBenchPress(): Motion {
  return barbellPress(lyingFlat(), DIM.shoulderHalfWidth, [0, 0, 0.15], [0.25, -1, 1], [flatBench()])
}

const DIAMOND = { wristHalf: 0.1, wristY: 0.04, fingersIn: 35, bottom: 89, ankleZ: -0.75 }
const UPPER_FOREARM = DIM.upperArm + DIM.forearm

/** Plank angle at which the shoulders are `reach` from the hands (wrists), found by bisection. */
function plankAtReach(wristAt: (side: Side) => Vec, reach: number, low: number, high: number): number {
  let [lo, hi] = [low, high]
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2
    const d = joints(plank(mid, DIAMOND.ankleZ)).l.shoulder.distanceTo(new Vector3(...wristAt('l')))
    if (d > reach) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

/**
 * Diamond push-up: hands flat under the chest, thumbs and index fingers together, body straight; the chest is
 * lowered to the hands and pressed back up until the elbows are almost straight.
 */
function diamondPushUp(): Motion {
  const chestZ = chestPoint(plank(DIAMOND.bottom, DIAMOND.ankleZ), [0, 0, 0]).z
  const wrist = (side: Side): Vec => [sideSign(side) * DIAMOND.wristHalf, DIAMOND.wristY, chestZ]
  const inward = rad(DIAMOND.fingersIn)
  const fingers = (side: Side): Vec => [-sideSign(side) * Math.sin(inward), 0, Math.cos(inward)]
  const top = plankAtReach(wrist, 0.998 * UPPER_FOREARM, 50, DIAMOND.bottom)
  const at = (s: number) => flatHands(plank(top + (DIAMOND.bottom - top) * s, DIAMOND.ankleZ), wrist, [0.7, 0.3, -1], fingers)
  return {
    keys: throughKeys(at, ['Hạ người', 'Đẩy lên', 'Giữ thẳng'], [0.5, 0.85]),
    props: [{ kind: 'block', center: [0, 0.005, -0.1], size: [0.7, 0.01, 1.9] }],
    seconds: 3,
  }
}

const BENCH_DIP = { half: 0.2, wristBehindEdge: 0.06, wristLift: 0.05, fingersDown: 35, edgeZ: -0.04, depth: 0.32, length: 1.1, heelZ: 0.9, ankleY: 0.09, armTilt: 31 }

/**
 * Bench dip: hands on the bench edge beside the hips, palms on top and fingers curled over the edge, legs out in
 * front on the heels; the hips are lowered close to the bench until the upper arms are level with the floor.
 */
function benchDip(): Motion {
  const wristZ = BENCH_DIP.edgeZ - BENCH_DIP.wristBehindEdge
  const wrist = (side: Side): Vec => [sideSign(side) * BENCH_DIP.half, BENCH_HEIGHT + BENCH_DIP.wristLift, wristZ]
  const mid: Vec = [0, BENCH_HEIGHT + BENCH_DIP.wristLift, wristZ]
  const tilt = rad(BENCH_DIP.armTilt)
  const reach = 0.998 * UPPER_FOREARM
  const topShoulders: Vec = [0, mid[1] + reach * Math.cos(tilt), mid[2] + reach * Math.sin(tilt)]
  const bottomShoulders = shoulderFromHand(mid, 15, 0, DIM.forearm)
  const down = rad(BENCH_DIP.fingersDown)
  const at = (s: number) => {
    const pose = stand()
    for (const side of SIDES) {
      pose.legs[side] = { target: [sideSign(side) * 0.12, BENCH_DIP.ankleY, BENCH_DIP.heelZ], pole: [0, 1, 0.2] }
      pose.feet[side] = { fwd: [0, 0, 1], pitch: -70 }
    }
    pose.pelvisRot = [8 + 4 * s, 0, 0]
    shouldersAt(pose, topShoulders.map((v, i) => v + (bottomShoulders[i] - v) * s) as Vec)
    return flatHands(pose, wrist, [0.3, 0.2, -1], () => [0, -Math.sin(down), Math.cos(down)])
  }
  return {
    keys: throughKeys(at, ['Hạ hông', 'Đẩy lên', 'Nghỉ'], [0.5, 0.85]),
    props: [
      {
        kind: 'block',
        center: [0, BENCH_HEIGHT / 2, BENCH_DIP.edgeZ - BENCH_DIP.depth / 2],
        size: [BENCH_DIP.length, BENCH_HEIGHT, BENCH_DIP.depth],
      },
    ],
    seconds: 3.2,
  }
}

export const motions: Record<string, () => Motion> = {
  'incline-barbell-bench-press': inclineBarbellBenchPress,
  'decline-barbell-bench-press': declineBarbellBenchPress,
  'dumbbell-bench-press': dumbbellBenchPress,
  'incline-dumbbell-press': inclineDumbbellPress,
  'dumbbell-fly': dumbbellFly,
  'cable-crossover': cableCrossover,
  'chest-dip': chestDip,
  'machine-chest-press': machineChestPress,
  'pec-deck': pecDeck,
  'dumbbell-pullover': dumbbellPullover,
  'close-grip-bench-press': closeGripBenchPress,
  'low-to-high-cable-fly': lowToHighCableFly,
  'diamond-push-up': diamondPushUp,
  'bench-dip': benchDip,
}
