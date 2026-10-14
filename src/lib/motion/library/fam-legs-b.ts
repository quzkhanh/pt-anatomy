import type { Motion, PropSpec } from '../motion'
import type { Limb } from '../pose'
import {
  armsAngles,
  chestPoint,
  clone,
  deg,
  DIM,
  FLOOR_ANKLE_Y,
  joints,
  key,
  rad,
  stand,
  type Pose,
  type Vec,
} from './helpers'

/** Shoulder joint to grip centre with the elbow straight. */
const ARM_REACH = DIM.upperArm + DIM.forearm + DIM.hand
const LEG = DIM.thigh + DIM.shank
/** Hip-to-ankle distance of a leg that is straight but not hyperextended (knee ≈ 5°). */
const STRAIGHT_LEG = LEG * 0.999
/** A loaded bar resting on the floor sits at the radius of a standard 45 cm plate (as drawn in props.ts). */
const BAR_FLOOR_Y = 0.225
/** Knee joint height above a surface the shin rests on (shank radius of the mannequin). */
const KNEELING_KNEE_LIFT = 0.05
/** Bar centre in front of (or on top of) the thigh axis when it rests against the thigh: thigh plus bar radius. */
const BAR_ON_THIGH = 0.09
/** Bar height when it passes the knees (knee joint height with near-vertical shins). */
const KNEE_BAR_Y = 0.5
/**
 * Pivot of a heel raise, ahead of the ankle along the sole. The mannequin's foot is rigid, so the pivot sits
 * between the ball of the foot and the toes to keep the toe tip from sinking into the support.
 */
const BALL_AHEAD = 0.17
/** Forefoot length resting on a step or plate behind the pivot. */
const FOREFOOT_ON = 0.05
const HEEL_BEHIND = DIM.heelBehindAnkle
const sign = (side: 'l' | 'r') => (side === 'l' ? 1 : -1)
const SIDES = ['l', 'r'] as const
/** Forearm rotation (Pose.forearms): overhand grip and thumb-up grip. */
const PRONATED = 180
const NEUTRAL = 90
const forearms = (deg: number) => ({ l: deg, r: deg })
type RollerSpec = Extract<PropSpec, { kind: 'roller' }>
/** Machine pads moving with the body, one per side. */
const rollers = (joint: 'shoulder' | 'knee' | 'ankle', face: RollerSpec['face'], length?: number, outward?: number): PropSpec[] =>
  SIDES.map((side) => ({ kind: 'roller', at: `${joint}${side === 'l' ? 'L' : 'R'}`, face, length, outward }))

/** Pelvis height that leaves both legs straight with the ankles `ankleHalf` from the midline and `ahead` behind the hips. */
const straightPelvisY = (ankleHalf: number, pelvisX = 0, ahead = 0) =>
  FLOOR_ANKLE_Y + Math.sqrt(STRAIGHT_LEG ** 2 - (Math.abs(ankleHalf) - DIM.hipHalfWidth - Math.abs(pelvisX)) ** 2 - ahead ** 2)

/**
 * Ankle (y, z) that keeps the point of the sole `along` metres ahead of the ankle at `contact`
 * while the foot (pointing +Z) is pitched `pitch` degrees (+ heel up).
 */
function ankleAbout(contact: [number, number], along: number, pitch: number): [number, number] {
  const p = rad(pitch)
  return [contact[0] + along * Math.sin(p) + DIM.ankleHeight * Math.cos(p), contact[1] - along * Math.cos(p) + DIM.ankleHeight * Math.sin(p)]
}

/** Both ankles at (±half, y, z) with the feet pointing +Z at `pitch`; knees bend towards `pole`. */
function setFeet(pose: Pose, half: number, [y, z]: [number, number], pitch: number, pole: Vec = [0, 0, 1]) {
  for (const side of SIDES) {
    pose.legs[side] = { target: [sign(side) * half, y, z], pole: [sign(side) * pole[0], pole[1], pole[2]] }
    pose.feet[side] = { fwd: [0, 0, 1], pitch }
  }
  return pose
}


interface Lift {
  stance: number
  toeOut: number
  halfGrip: number
  /** Bar path over the mid-foot. */
  barZ: number
  /** Trunk tilt (deg) and how far the shoulders are ahead of the bar, with the bar on the floor and at the knees. */
  floor: [number, number]
  knee: [number, number]
}

/**
 * Deadlift poses with straight arms hanging from the shoulders to the bar (joint angles, as in hinge.ts),
 * the pelvis placed so the bar sits at `barY` over the mid-foot; at lockout the bar rests against the thighs.
 */
function deadliftPoses(l: Lift) {
  const abd = deg(Math.asin((l.halfGrip - DIM.shoulderHalfWidth) / ARM_REACH))
  const hang = (tilt: number, ahead: number, barY: number | null) => {
    const p = stand(l.stance, l.toeOut)
    p.pelvisRot = [tilt, 0, 0]
    p.pelvis = [0, 0, 0]
    const shoulder = joints(p).l.shoulder
    const drop = Math.sqrt(ARM_REACH ** 2 - (l.halfGrip - shoulder.x) ** 2 - ahead ** 2)
    p.pelvis = [0, barY === null ? straightPelvisY(l.stance) : barY + drop - shoulder.y, l.barZ + ahead - shoulder.z]
    p.forearms = forearms(PRONATED)
    return armsAngles(p, { flex: tilt - deg(Math.asin(ahead / ARM_REACH)), abd, bend: 0 })
  }
  return { bottom: hang(...l.floor, BAR_FLOOR_Y), pass: hang(...l.knee, KNEE_BAR_Y), top: hang(0, -BAR_ON_THIGH, null) }
}

function deadlift(lift: Lift): Motion {
  const { bottom, pass, top } = deadliftPoses(lift)
  return {
    keys: [key(0, bottom, 'Kéo lên'), key(0.2, pass, 'Đẩy hông tới'), key(0.38, top, 'Hạ tạ'), key(0.62, pass, 'Chùng gối'), key(0.82, bottom, 'Nghỉ')],
    props: [{ kind: 'barbell', at: 'grips' }],
    seconds: 4,
  }
}

/** Conventional: feet about shoulder width, hands just outside the knees, shins close to the bar. */
const conventionalDeadlift = () =>
  deadlift({ stance: 0.14, toeOut: 7, halfGrip: 0.25, barZ: 0.09, floor: [61, 0.03], knee: [49, 0.04] })

/** Sumo: wide stance with toes turned out, hands inside the knees, a more upright trunk. */
const sumoDeadlift = () =>
  deadlift({ stance: 0.34, toeOut: 35, halfGrip: 0.16, barZ: 0.08, floor: [49, 0.02], knee: [38, 0.03] })

/** Toes tucked under (foot pointing down) with the toe tips on the floor behind the pad. */
const NORDIC = { padTop: 0.05, tilt: 68, ankleY: 0.2, toePitch: 75, rollerRadius: 0.04, frameHalf: 0.3 }

/** Nordic hamstring curl: kneeling, ankles held; the straight body from knees to head lowers forward slowly. */
function nordicHamstringCurl(): Motion {
  const kneeY = NORDIC.padTop + KNEELING_KNEE_LIFT
  // The ankle sits one shank length from the knee so the knee stays on the pad throughout.
  const ankle: Vec = [DIM.hipHalfWidth, NORDIC.ankleY, -Math.sqrt(DIM.shank ** 2 - (NORDIC.ankleY - kneeY) ** 2)]
  const body = (tilt: number) => {
    const p = armsAngles(stand(), { flex: 25, abd: 10, bend: 95 })
    p.forearms = forearms(PRONATED)
    p.pelvisRot = [tilt, 0, 0]
    p.pelvis = [0, kneeY + DIM.thigh * Math.cos(rad(tilt)), DIM.thigh * Math.sin(rad(tilt))]
    for (const side of SIDES) {
      p.legs[side] = { target: [sign(side) * ankle[0], ankle[1], ankle[2]], pole: [0, -Math.cos(rad(tilt)), -Math.sin(rad(tilt))] }
      p.feet[side] = { fwd: [0, 0, 1], pitch: NORDIC.toePitch }
    }
    return p
  }
  // The hips swing on an arc about the knees; keys every third of the range keep the knees on the pad
  // (a straight blend between distant keys cuts the arc and drives the knees into the pad).
  const [up, upper, lower, down] = [0, 1 / 3, 2 / 3, 1].map((f) => body(f * NORDIC.tilt))
  const rollerY = ankle[1] + KNEELING_KNEE_LIFT + NORDIC.rollerRadius
  const rollerZ = ankle[2] - 0.02
  const x = NORDIC.frameHalf
  return {
    keys: [
      key(0, up, 'Ngả người xuống'),
      key(0.2, upper, 'Ngả người xuống'),
      key(0.4, lower, 'Ngả người xuống'),
      key(0.6, down, 'Chống tay, trở về'),
      key(0.7, lower, 'Trở về'),
      key(0.8, upper, 'Trở về'),
      key(0.9, up, 'Nghỉ'),
    ],
    props: [
      { kind: 'block', center: [0, NORDIC.padTop / 2, -0.08], size: [0.5, NORDIC.padTop, 0.5] },
      { kind: 'rod', from: [-x, rollerY, rollerZ], to: [x, rollerY, rollerZ], radius: NORDIC.rollerRadius },
      { kind: 'rod', from: [-x, 0, rollerZ], to: [-x, rollerY, rollerZ] },
      { kind: 'rod', from: [x, 0, rollerZ], to: [x, rollerY, rollerZ] },
    ],
    seconds: 4,
  }
}

/** `hipAhead`: hips slightly ahead of the ankles, keeping the body's weight over the forefoot. */
const CALF_STEP = { height: 0.12, ballZ: 0.12, depth: 0.32, width: 0.6, stance: 0.1, low: -20, high: 40, hipAhead: 0.05 }
/** Hands on the shoulder-pad handles, relative to each shoulder joint (x outward). */
const PAD_HANDLE: Vec = [0.12, 0.08, 0.14]
/** Shoulder pads cover the top of the shoulder from beside the neck to the acromion, clear of the neck. */
const SHOULDER_PAD_LENGTH = 0.2
const HANDLE_LENGTH = 0.12

/**
 * Standing calf raise machine: shoulders under the pads, forefoot on the platform; heels drop below the
 * forefoot, then rise as high as possible, knees straight.
 */
function standingCalfRaise(): Motion {
  const ball: [number, number] = [CALF_STEP.height, CALF_STEP.ballZ]
  const at = (pitch: number) => {
    const ankle = ankleAbout(ball, BALL_AHEAD, pitch)
    const p = setFeet(stand(), CALF_STEP.stance, ankle, pitch)
    p.pelvis = [0, ankle[0] - FLOOR_ANKLE_Y + straightPelvisY(CALF_STEP.stance, 0, CALF_STEP.hipAhead), ankle[1] + CALF_STEP.hipAhead]
    const j = joints(p)
    for (const side of SIDES) {
      const sh = j[side].shoulder
      p.arms[side] = { target: [sh.x + sign(side) * PAD_HANDLE[0], sh.y + PAD_HANDLE[1], sh.z + PAD_HANDLE[2]], pole: [sign(side) * 0.6, -1, 0] }
    }
    // Neutral grip on the handles that project forward from the shoulder pads.
    p.forearms = forearms(NEUTRAL)
    return p
  }
  const low = at(CALF_STEP.low)
  const high = at(CALF_STEP.high)
  const edge = CALF_STEP.ballZ - FOREFOOT_ON
  return {
    keys: [key(0, low, 'Nhón lên'), key(0.35, high, 'Giữ'), key(0.45, high, 'Hạ gót'), key(0.88, low, 'Giãn')],
    props: [
      { kind: 'block', center: [0, CALF_STEP.height / 2, edge + CALF_STEP.depth / 2], size: [CALF_STEP.width, CALF_STEP.height, CALF_STEP.depth] },
      ...rollers('shoulder', 'top', SHOULDER_PAD_LENGTH),
      { kind: 'handle', at: 'gripL', length: HANDLE_LENGTH },
      { kind: 'handle', at: 'gripR', length: HANDLE_LENGTH },
    ],
    seconds: 3.2,
  }
}

/** `barAt`: fraction of the thigh from hip to knee where the load rests (just above the knee). */
/** `hands`: hands holding the pad, outward of and above each knee joint. */
const SEATED_CALF = { plateTop: 0.06, ballZ: 0.56, seat: 0.42, stance: 0.12, low: -15, high: 28, hands: [0.13, 0.19, -0.03] as Vec }

/** Seated calf raise machine: knees at about 90°, the pad resting on the thighs at the knees, heels raised. */
function seatedCalfRaise(): Motion {
  const ball: [number, number] = [SEATED_CALF.plateTop, SEATED_CALF.ballZ]
  const pelvisY = SEATED_CALF.seat + 0.1
  const at = (pitch: number) => {
    const ankle = ankleAbout(ball, BALL_AHEAD, pitch)
    const p = setFeet(stand(), SEATED_CALF.stance, ankle, pitch, [0, 1, 0.3])
    p.pelvis = [0, pelvisY, 0]
    const j = joints(p)
    const [hx, hy, hz] = SEATED_CALF.hands
    for (const side of SIDES) {
      const knee = j[side].knee
      p.arms[side] = { target: [knee.x + sign(side) * hx, knee.y + hy, knee.z + hz], pole: [sign(side) * 0.5, -0.3, -1] }
    }
    p.forearms = forearms(PRONATED)
    return p
  }
  const low = at(SEATED_CALF.low)
  const high = at(SEATED_CALF.high)
  return {
    keys: [key(0, low, 'Nhón lên'), key(0.35, high, 'Giữ'), key(0.45, high, 'Hạ gót'), key(0.88, low, 'Giãn')],
    props: [
      { kind: 'block', center: [0, SEATED_CALF.seat / 2, -0.05], size: [0.4, SEATED_CALF.seat, 0.45] },
      { kind: 'block', center: [0, SEATED_CALF.plateTop / 2, SEATED_CALF.ballZ - FOREFOOT_ON + 0.1], size: [0.45, SEATED_CALF.plateTop, 0.2] },
      ...rollers('knee', 'top'),
    ],
    seconds: 3.2,
  }
}

const CHAIR = { x: 0.42, seat: 0.45, backTop: 0.88, size: 0.42, handLift: 0.03 }
/** The hips drift slightly forward of the ankles as the toes lift and the ankles rise off the heels. */
const TIBIALIS = { stance: 0.1, lift: -22, hipAhead: 0.02 }

/** Tibialis raise beside a chair: heels stay on the floor while the toes lift towards the shins. */
function tibialisRaise(): Motion {
  const at = (pitch: number) => {
    const ankle = ankleAbout([0, -HEEL_BEHIND], -HEEL_BEHIND, pitch)
    const p = setFeet(stand(), TIBIALIS.stance, ankle, pitch)
    p.pelvis = [0, ankle[0] - FLOOR_ANKLE_Y + straightPelvisY(TIBIALIS.stance, 0, TIBIALIS.hipAhead), ankle[1] + TIBIALIS.hipAhead]
    p.arms.r = { flex: 0, abd: 6, bend: 5 }
    p.forearms = forearms(NEUTRAL)
    p.arms.l = { target: [CHAIR.x, CHAIR.backTop + CHAIR.handLift, 0], pole: [0.5, -1, -0.5] }
    return p
  }
  const down = at(0)
  const up = at(TIBIALIS.lift)
  return {
    keys: [key(0, down, 'Nâng mũi chân'), key(0.38, up, 'Hạ xuống'), key(0.85, down, 'Nghỉ')],
    props: [
      { kind: 'block', center: [CHAIR.x + CHAIR.size / 2, CHAIR.seat - 0.02, 0], size: [CHAIR.size, 0.04, CHAIR.size] },
      { kind: 'block', center: [CHAIR.x, CHAIR.backTop / 2, 0], size: [0.04, CHAIR.backTop, CHAIR.size] },
      { kind: 'block', center: [CHAIR.x + CHAIR.size - 0.02, CHAIR.seat / 2, 0], size: [0.04, CHAIR.seat, CHAIR.size] },
    ],
    seconds: 2.8,
  }
}

/**
 * `closed` keeps the knee pads (on the inner side of each knee) about 3 cm apart. The seat is high enough
 * for the foot pegs on the moving arms to clear the floor.
 */
const ADDUCTION = { seat: 0.5, recline: 10, handleX: 0.27, open: 38, closed: 13, pegLength: 0.14 }
/** Knee pads sit snug against the inner knee: pulled 1 cm towards the midline from the default gap. */
const KNEE_PAD_SHIFT = -0.01

/**
 * Seated hip adduction machine: back against the pad, knees pressing on the outer face of the knee pads,
 * feet on the foot pegs; thighs open to a light inner-thigh stretch, then squeeze in without the pads meeting.
 */
function machineHipAdduction(): Motion {
  const at = (abd: number) => {
    const p = stand()
    p.pelvis = [0, ADDUCTION.seat + 0.1, 0]
    p.pelvisRot = [-ADDUCTION.recline, 0, 0]
    const leg: Limb = { flex: 90 - ADDUCTION.recline, abd, bend: 90 }
    p.legs = { l: { ...leg }, r: { ...leg } }
    p.feet = {}
    for (const side of SIDES) p.arms[side] = { target: [sign(side) * ADDUCTION.handleX, ADDUCTION.seat + 0.1, 0.08], pole: [sign(side) * 0.3, 0, -1] }
    p.forearms = forearms(NEUTRAL)
    return p
  }
  const open = at(ADDUCTION.open)
  const closed = at(ADDUCTION.closed)
  const back = chestPoint(open, [0, 0, -0.14])
  return {
    keys: [key(0, open, 'Kẹp vào'), key(0.26, closed, 'Giữ'), key(0.6, closed, 'Mở ra'), key(0.93, open, 'Nghỉ')],
    props: [
      { kind: 'block', center: [0, ADDUCTION.seat / 2, 0.02], size: [0.42, ADDUCTION.seat, 0.45] },
      { kind: 'block', center: [back.x, back.y, back.z], size: [0.42, 0.6, 0.06], rot: [-ADDUCTION.recline, 0, 0] },
      ...SIDES.map((side): PropSpec => ({ kind: 'rod', from: [sign(side) * ADDUCTION.handleX, ADDUCTION.seat + 0.1, -0.05], to: [sign(side) * ADDUCTION.handleX, ADDUCTION.seat + 0.1, 0.15] })),
      ...rollers('knee', 'inside', undefined, KNEE_PAD_SHIFT),
      ...rollers('ankle', 'back', ADDUCTION.pegLength),
    ],
    // Longer than a plain rep: the source holds the squeeze for a few seconds.
    seconds: 4.5,
  }
}

/** Shoulder adduction that brings both hands together on one handle at the midline. */
const HANDS_TOGETHER = -12
/** Arm angles are shoulder flexion in the chest frame; at the hike the arms point `hikeArmsBack` behind vertical. */
const SWING = { stance: 0.2, toeOut: 10, hikeTilt: 58, hikePelvis: [0, 0.87, -0.2] as Vec, hikeArmsBack: 28, drive: 30, float: 80, drop: 18 }

/** Hip-hinge pose: trunk tilted `tilt`, pelvis at `pelvis`, arms swung `armFlex` in the chest frame, hands together. */
function hingeWithArms(stance: number, toeOut: number, tilt: number, pelvis: Vec, armFlex: number, forearm: number) {
  const p = armsAngles(stand(stance, toeOut), { flex: armFlex, abd: HANDS_TOGETHER, bend: 0 })
  p.forearms = forearms(forearm)
  p.pelvisRot = [tilt, 0, 0]
  p.pelvis = pelvis
  return p
}

/** Hardstyle kettlebell swing: hike between the legs, snap the hips through, the bell floats to chest height. */
function kettlebellSwing(): Motion {
  const standY = straightPelvisY(SWING.stance)
  const hike = hingeWithArms(SWING.stance, SWING.toeOut, SWING.hikeTilt, SWING.hikePelvis, SWING.hikeTilt - SWING.hikeArmsBack, PRONATED)
  const upright = (armFlex: number) => hingeWithArms(SWING.stance, SWING.toeOut, 0, [0, standY, 0], armFlex, PRONATED)
  const drive = upright(SWING.drive)
  const float = upright(SWING.float)
  const fall = upright(SWING.drop)
  return {
    keys: [key(0, hike, 'Kéo tạ ra sau'), key(0.25, drive, 'Tạ bay lên'), key(0.45, float, 'Thả tạ rơi'), key(0.7, fall, 'Gập hông')],
    props: [{ kind: 'kettlebell', at: 'grips' }],
    seconds: 2.8,
  }
}

const PULL_THROUGH = {
  stance: 0.21,
  toeOut: 10,
  pulley: [0, 0.12, -1.1] as Vec,
  towerHeight: 2.1,
  tilt: 62,
  pelvis: [0, 0.86, -0.21] as Vec,
  armsBack: 22,
  /** Hands just in front of the groin, clear of the thighs. */
  tallArms: 10,
}

/** Cable pull-through: back to a low pulley, rope between the legs; hips push back, then drive forward to stand tall. */
function cablePullThrough(): Motion {
  const { stance, toeOut, tilt } = PULL_THROUGH
  const back = hingeWithArms(stance, toeOut, tilt, PULL_THROUGH.pelvis, tilt - PULL_THROUGH.armsBack, NEUTRAL)
  const tall = hingeWithArms(stance, toeOut, 0, [0, straightPelvisY(stance), 0], PULL_THROUGH.tallArms, NEUTRAL)
  return {
    keys: [key(0, tall, 'Đẩy hông ra sau'), key(0.45, back, 'Đẩy hông tới'), key(0.85, tall, 'Siết mông')],
    props: [
      { kind: 'rod', from: [0, 0, PULL_THROUGH.pulley[2] - 0.06], to: [0, PULL_THROUGH.towerHeight, PULL_THROUGH.pulley[2] - 0.06], radius: 0.04 },
      { kind: 'cable', from: PULL_THROUGH.pulley, to: 'grips' },
    ],
    seconds: 3.4,
  }
}

/** Standing on the right leg: the pelvis shifts over the right foot. */
const SL_RDL = { ankleX: -0.09, pelvisX: -0.04, tilt: 74 }

/** Single-leg RDL on the right leg: hips hinge back, the left leg extends straight behind in line with the trunk, hips level. */
function singleLegRomanianDeadlift(): Motion {
  const pose = (tilt: number, pelvis: Vec, free: Limb, freePitch: number) => {
    const p = stand()
    p.pelvisRot = [tilt, 0, 0]
    p.pelvis = pelvis
    p.legs.r = { target: [SL_RDL.ankleX, FLOOR_ANKLE_Y, 0], pole: [-0.1, 0.1, 1] }
    p.feet = { r: { fwd: [0, 0, 1], pitch: 0 }, l: { fwd: [0, 0, 1], pitch: freePitch } }
    p.legs.l = free
    armsAngles(p, { flex: tilt, abd: 6, bend: 0 })
    p.forearms = forearms(NEUTRAL)
    return p
  }
  const top = pose(2, [SL_RDL.pelvisX, 0.92, -0.01], { flex: 8, abd: 0, bend: 30 }, 0)
  // Free leg in line with the trunk; its foot stays square to the shin (pitch = tilt).
  const bottom = pose(SL_RDL.tilt, [SL_RDL.pelvisX, 0.89, -0.2], { flex: 0, abd: 0, bend: 4 }, SL_RDL.tilt)
  return {
    keys: [key(0, top, 'Đẩy hông ra sau'), key(0.5, bottom, 'Đứng lên'), key(0.9, top, 'Giữ thăng bằng')],
    props: [],
    seconds: 4,
  }
}

/** `retract`: shoulder blades drawn slightly back (Pose.scapula protraction, m). */
const FARMER = { stance: 0.1, lift: 0.1, shift: 0.025, retract: -0.015 }

/** Farmer's walk in place: upright trunk, dumbbells hanging beside the hips, short alternating steps. */
function dumbbellFarmersWalk(): Motion {
  const base = armsAngles(stand(FARMER.stance), { flex: 0, abd: 9, bend: 0 })
  base.forearms = forearms(NEUTRAL)
  base.scapula = { l: [0, FARMER.retract], r: [0, FARMER.retract] }
  base.pelvis = [0, straightPelvisY(FARMER.stance), 0]
  const step = (side: 'l' | 'r') => {
    const p = clone(base)
    const s = sign(side)
    p.pelvis = [-s * FARMER.shift, straightPelvisY(FARMER.stance, FARMER.shift), 0]
    p.legs[side] = { target: [s * FARMER.stance, FLOOR_ANKLE_Y + FARMER.lift, 0.04], pole: [0, 0, 1] }
    p.feet[side] = { fwd: [0, 0, 1], pitch: 15 }
    return p
  }
  return {
    keys: [key(0, base, 'Nhấc chân trái'), key(0.25, step('l'), 'Đặt xuống'), key(0.5, base, 'Nhấc chân phải'), key(0.75, step('r'), 'Đặt xuống')],
    props: [
      { kind: 'dumbbell', at: 'gripL' },
      { kind: 'dumbbell', at: 'gripR' },
    ],
    seconds: 2.8,
  }
}

export const motions: Record<string, () => Motion> = {
  'conventional-deadlift': conventionalDeadlift,
  'sumo-deadlift': sumoDeadlift,
  'nordic-hamstring-curl': nordicHamstringCurl,
  'standing-calf-raise': standingCalfRaise,
  'seated-calf-raise': seatedCalfRaise,
  'tibialis-raise': tibialisRaise,
  'machine-hip-adduction': machineHipAdduction,
  'kettlebell-swing': kettlebellSwing,
  'cable-pull-through': cablePullThrough,
  'single-leg-romanian-deadlift': singleLegRomanianDeadlift,
  'dumbbell-farmers-walk': dumbbellFarmersWalk,
}
