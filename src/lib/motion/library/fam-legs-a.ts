import type { Motion, PropSpec } from '../motion'
import { lerpPose, type Foot, type LimbAngles, type Pose, type Vec } from '../pose'
import { sideSign, SIDES, type Side } from '../skeleton'
import {
  armsAngles,
  chestDir,
  chestPoint,
  clone,
  DIM,
  FLOOR_ANKLE_Y,
  gripEach,
  key,
  legsAngles,
  pelvisPoint,
  prone,
  rad,
  stand,
} from './helpers'

const TOE_REACH = DIM.footLength - DIM.heelBehindAnkle
/** Pelvis joint height above a seat the person sits on (half the buttock/thigh thickness). */
const SEATED_PELVIS_LIFT = 0.08
/** Distance from the trunk's midline to the surface of the back. */
const BACK_DEPTH = 0.105
const PAD_THICKNESS = 0.08
/** Sole to instep, as the mannequin draws the foot. */
const FOOT_THICKNESS = 0.064
/** The drawn foot is rounded at the toe, so a toe contact sinks it slightly into the support. */
const FOOT_SINK = 0.015

/** Same squat stance as the back squat (squat.ts): the studies cited compare variants at a regular stance. */
const SQUAT = { stance: 0.2, toeOut: 20 }

/** Arms hanging straight down from the shoulders, whatever the trunk's lean. */
function armsHang(p: Pose, abd: number, bend = 0) {
  return armsAngles(p, { flex: p.pelvisRot[0] + p.spine[0], abd, bend })
}

/** World point of the ankle when the toe tip rests at `toe` with the heel lifted `pitch` degrees. */
function ankleForToe(toe: Vec, pitch: number): Vec {
  const r = rad(pitch)
  return [toe[0], toe[1] + TOE_REACH * Math.sin(r) + DIM.ankleHeight * Math.cos(r), toe[2] - TOE_REACH * Math.cos(r) + DIM.ankleHeight * Math.sin(r)]
}

/** World point of the ankle when the heel rests at `heel` with the toes raised (`pitch` < 0). */
function ankleForHeel(heel: Vec, pitch: number): Vec {
  const r = rad(pitch)
  const back = DIM.heelBehindAnkle
  return [heel[0], heel[1] - back * Math.sin(r) + DIM.ankleHeight * Math.cos(r), heel[2] + back * Math.cos(r) + DIM.ankleHeight * Math.sin(r)]
}

function setLeg(p: Pose, side: Side, ankle: Vec, pole: Vec, foot: Foot) {
  p.legs[side] = { target: ankle, pole }
  p.feet[side] = foot
}

/** Forearm mid-way between supination and pronation: thumb up, palm facing the midline. */
const NEUTRAL_FOREARM = 90

const flatFoot = (): Foot => ({ fwd: [0, 0, 1], pitch: 0 })
const kneeForward = (side: Side): Vec => [sideSign(side) * 0.15, 0.1, 1]
const kneeDown: Vec = [0, -0.6, 1]

/** Top and bottom of a two-footed squat from the shared stance. */
function squatPair(pelvis: Vec, pitch: number, spine: number) {
  const top = stand(SQUAT.stance, SQUAT.toeOut)
  const bottom = clone(top)
  bottom.pelvis = pelvis
  bottom.pelvisRot = [pitch, 0, 0]
  bottom.spine = [spine, 0, 0]
  return { top, bottom }
}

const squatKeys = (top: Pose, bottom: Pose) => [key(0, top, 'Hạ xuống'), key(0.5, bottom, 'Đứng lên'), key(0.88, top, 'Nghỉ')]

/**
 * Clean-grip front rack (the parallel-arm position): overhand grip just outside the shoulders, upper arms about
 * level, elbows forward, wrists bent back so the bar rests on the front deltoids against the fingers. Arm angles
 * fitted so the grips sit ~3 cm above and ~6 cm in front of the shoulder joints; the straight-wrist IK cannot
 * reach this.
 */
const CLEAN_RACK: LimbAngles = { flex: 86, abd: 0, rot: 40, bend: 148 }
const CLEAN_RACK_WRIST = -92
const PRONATED = 180

/** Front squat to parallel (thighs level): bar across the front of the shoulders, trunk more upright than the back squat. */
function barbellFrontSquat(): Motion {
  const { top, bottom } = squatPair([0, 0.42, -0.13], 14, 4)
  for (const p of [top, bottom]) {
    armsAngles(p, CLEAN_RACK)
    p.forearms = { l: PRONATED, r: PRONATED }
    p.wrists = { l: CLEAN_RACK_WRIST, r: CLEAN_RACK_WRIST }
  }
  return { keys: squatKeys(top, bottom), props: [{ kind: 'barbell', at: 'grips' }], seconds: 3.4 }
}

/** Goblet hold (ACE): one dumbbell upright against the chest, both hands cupping its top head, elbows in. */
const GOBLET = { halfGrip: 0.05, y: 0.06, front: 0.17 }
const GOBLET_DUMBBELL: PropSpec = { kind: 'dumbbell', at: 'grips', grip: 'upright' }
function gobletHold(p: Pose) {
  return gripEach(p, (side) => chestPoint(p, [sideSign(side) * GOBLET.halfGrip, GOBLET.y, GOBLET.front]), chestDir(p, [0.2, -1, 0.1]))
}

/** Goblet squat: shoulder-width stance, lowered until the hips are below the knees, back straight. */
function gobletSquat(): Motion {
  const { top, bottom } = squatPair([0, 0.36, -0.12], 22, 4)
  for (const p of [top, bottom]) gobletHold(p)
  return { keys: squatKeys(top, bottom), props: [GOBLET_DUMBBELL], seconds: 3.4 }
}

/** Machine seat whose top is at `seatY`, spanning `from`..`to` along Z. */
function seat(seatY: number, from: number, to: number, width = 0.4): PropSpec {
  return { kind: 'block', center: [0, seatY / 2, (from + to) / 2], size: [width, seatY, to - from] }
}

/** Pad against the back of the trunk, from `from` to `from + length` above the pelvis along the trunk. */
function backPad(p: Pose, from: number, length: number, width = 0.4): PropSpec {
  const c = pelvisPoint(p, [0, from + length / 2, -(BACK_DEPTH + PAD_THICKNESS / 2)])
  return { kind: 'block', center: [c.x, c.y, c.z], size: [width, length, PAD_THICKNESS], rot: [p.pelvisRot[0], 0, 0] }
}

/** Short handle rods on both sides, along Z. */
const handles = (x: number, y: number, z: number, half = 0.08): PropSpec[] =>
  SIDES.map((side) => ({ kind: 'rod', from: [sideSign(side) * x, y, z - half], to: [sideSign(side) * x, y, z + half], radius: 0.015 }))

/** Seated on a machine seat with the backrest reclined `recline` degrees, hands on the seat handles. */
const MACHINE_SEAT = { y: 0.5, handleX: 0.25, handleY: 0.56, handleZ: 0.08 }
function seatedOnMachine(recline: number, hipFlex: number, knee: number): Pose {
  const p = stand()
  p.pelvis = [0, MACHINE_SEAT.y + SEATED_PELVIS_LIFT, 0]
  p.pelvisRot = [-recline, 0, 0]
  legsAngles(p, { flex: hipFlex, abd: 2, bend: knee })
  // Ankles neutral; spelled out because a shank lying along the pelvis' forward axis leaves the default foot direction undefined.
  const foot: Foot = { fwd: [0, 0, 1], pitch: knee - hipFlex - recline }
  p.feet = { l: foot, r: { ...foot } }
  gripEach(p, (side) => [sideSign(side) * MACHINE_SEAT.handleX, MACHINE_SEAT.handleY, MACHINE_SEAT.handleZ], [1, -0.2, -0.4])
  return p
}

/** Machine roller pad on both legs (or shoulders) at `joint`, on the `face` side. */
const rollers = (joint: 'ankle' | 'knee' | 'shoulder', face: 'front' | 'back' | 'top', slide = 0): PropSpec[] =>
  (['L', 'R'] as const).map((s) => ({ kind: 'roller', at: `${joint}${s}`, face, slide }))

const seatedProps = (p: Pose, seatTo: number): PropSpec[] => [
  seat(MACHINE_SEAT.y, -0.2, seatTo),
  backPad(p, 0.02, 0.62),
  ...handles(MACHINE_SEAT.handleX, MACHINE_SEAT.handleY, MACHINE_SEAT.handleZ),
]

/** Leg extension: knees at the seat edge (in line with the lever axis), shins from vertical to straight. */
function legExtension(): Motion {
  const bent = seatedOnMachine(10, 80, 90)
  const straight = seatedOnMachine(10, 80, 0)
  return {
    keys: [key(0, bent, 'Duỗi gối'), key(0.4, straight, 'Hạ về'), key(0.9, bent, 'Nghỉ')],
    props: [...seatedProps(bent, 0.36), ...rollers('ankle', 'front')],
    seconds: 3.2,
  }
}

/** Seated leg curl (Maeo et al. 2021): hips flexed ~90°, thighs held under a pad, knees 0°–90°. */
function seatedLegCurl(): Motion {
  const straight = seatedOnMachine(0, 90, 0)
  const bent = seatedOnMachine(0, 90, 90)
  return {
    keys: [key(0, straight, 'Gập gối'), key(0.4, bent, 'Hạ về'), key(0.9, straight, 'Nghỉ')],
    props: [...seatedProps(straight, 0.36), ...rollers('knee', 'top'), ...rollers('ankle', 'back')],
    seconds: 3.2,
  }
}

/** Lying leg curl (ACE): prone, knees just past the bench end, curled from nearly straight to past 90°. */
const CURL_BENCH = { y: 0.55, from: -0.38, to: 0.62, width: 0.34 }
const CURL_HANDLE = { x: 0.24, y: 0.47, z: 0.72 }
const CURL_PAD_SLIDE = 0.08

function lyingLegCurl(): Motion {
  const pose = (knee: number) => {
    const p = prone(CURL_BENCH.y, 0)
    p.neck = -20
    legsAngles(p, { flex: 4, abd: 2, bend: knee })
    return gripEach(p, (side) => [sideSign(side) * CURL_HANDLE.x, CURL_HANDLE.y, CURL_HANDLE.z], [1, 0.2, 0])
  }
  const straight = pose(5)
  const bent = pose(100)
  return {
    keys: [key(0, straight, 'Gập gối'), key(0.4, bent, 'Hạ về'), key(0.9, straight, 'Nghỉ')],
    props: [
      seat(CURL_BENCH.y, CURL_BENCH.from, CURL_BENCH.to, CURL_BENCH.width),
      ...handles(CURL_HANDLE.x, CURL_HANDLE.y, CURL_HANDLE.z),
      // Cue: the pad rests on the lower third of the shin, a little above the ankle.
      ...rollers('ankle', 'back', CURL_PAD_SLIDE),
    ],
    seconds: 3.2,
  }
}

/**
 * Seated leg press (ACE): back and sacrum on the backrest, from knees ~90° to relaxed, not locked. Feet sit high
 * enough on the upright footplate that the heels stay down at the bottom (~27° of ankle dorsiflexion) with the
 * hips flexed ~120°, short of the thighs pressing into the trunk.
 */
const PRESS = { seatY: 0.45, recline: 35, ankleY: 0.725, bentZ: 0.55, straightZ: 0.83, half: 0.13 }
const FOOTPLATE: [number, number] = [0.6, 0.5]
function legPress(): Motion {
  const pose = (ankleZ: number) => {
    const p = stand()
    p.pelvis = [0, PRESS.seatY + SEATED_PELVIS_LIFT, 0]
    p.pelvisRot = [-PRESS.recline, 0, 0]
    for (const side of SIDES) setLeg(p, side, [sideSign(side) * PRESS.half, PRESS.ankleY, ankleZ], [sideSign(side) * 0.2, 1, 0], { fwd: [0, 0, 1], pitch: -90 })
    gripEach(p, (side) => [sideSign(side) * 0.25, PRESS.seatY + 0.06, 0.08], [1, -0.2, -0.4])
    return p
  }
  const bent = pose(PRESS.bentZ)
  const straight = pose(PRESS.straightZ)
  return {
    keys: [key(0, bent, 'Đạp ra'), key(0.38, straight, 'Hạ về'), key(0.88, bent, 'Nghỉ')],
    props: [
      seat(PRESS.seatY, -0.2, 0.2),
      backPad(bent, 0.02, 0.62),
      ...handles(0.25, PRESS.seatY + 0.06, 0.08),
      { kind: 'sole', size: FOOTPLATE },
    ],
    seconds: 3.4,
  }
}

/**
 * Hack squat: back on a sled reclined 35° from vertical (a common carriage angle), feet on a fixed platform
 * tilted toes-up; the trunk slides along the sled and keeps its angle. The hands hold the handles that stick
 * out in front of the shoulder pads, thumbs up, so they ride with the sled.
 */
const HACK = { recline: 35, tilt: 20, soleY: 0.12, soleZ: 0.5, half: 0.15, topSlide: 0.015, bottomSlide: 0.42 }
const HACK_PLATE: Vec = [0.6, 0.04, 0.46]
const HACK_GRIP = { x: 0.27, y: 0.15, z: 0.2, handle: 0.12 }
function hackSquat(): Motion {
  const tilt = rad(HACK.tilt)
  const r = rad(HACK.recline)
  const fwd: Vec = [0, Math.sin(tilt), Math.cos(tilt)]
  const normal: Vec = [0, Math.cos(tilt), -Math.sin(tilt)]
  const toMid = (TOE_REACH - DIM.heelBehindAnkle) / 2
  const pose = (slide: number) => {
    const p = stand()
    p.pelvisRot = [-HACK.recline, 0, 0]
    p.pelvis = [0, 0.86 - Math.cos(r) * slide, -0.1 + Math.sin(r) * slide]
    for (const side of SIDES) {
      const ankle: Vec = [sideSign(side) * HACK.half, HACK.soleY - fwd[1] * toMid + normal[1] * DIM.ankleHeight, HACK.soleZ - fwd[2] * toMid + normal[2] * DIM.ankleHeight]
      setLeg(p, side, ankle, kneeForward(side), { fwd: [0, 0, 1], pitch: -HACK.tilt })
    }
    gripEach(p, (side) => chestPoint(p, [sideSign(side) * HACK_GRIP.x, HACK_GRIP.y, HACK_GRIP.z]), chestDir(p, [0.5, -1, 0]))
    p.forearms = { l: NEUTRAL_FOREARM, r: NEUTRAL_FOREARM }
    return p
  }
  const top = pose(HACK.topSlide)
  const bottom = pose(HACK.bottomSlide)
  const plate = [0, HACK.soleY - normal[1] * HACK_PLATE[1] / 2, HACK.soleZ - normal[2] * HACK_PLATE[1] / 2] as Vec
  return {
    keys: [key(0, top, 'Hạ xuống'), key(0.5, bottom, 'Đẩy lên'), key(0.88, top, 'Nghỉ')],
    props: [
      backPad(top, -0.6, 1.5, 0.45),
      ...rollers('shoulder', 'top'),
      { kind: 'handle', at: 'gripL', length: HACK_GRIP.handle },
      { kind: 'handle', at: 'gripR', length: HACK_GRIP.handle },
      { kind: 'block', center: plate, size: HACK_PLATE, rot: [-HACK.tilt, 0, 0] },
    ],
    seconds: 3.4,
  }
}

/** Lunge stance: `front` foot flat at `frontZ`, the other on its toes with the toe tip at `rearToeZ`. */
const LUNGE = { half: 0.1, rearPitch: 70 }
function lungePose(front: Side, frontZ: number, rearToeZ: number, pelvis: Vec, pitch: number, rearPitch = LUNGE.rearPitch): Pose {
  const p = stand(LUNGE.half)
  p.pelvis = pelvis
  p.pelvisRot = [pitch, 0, 0]
  for (const side of SIDES) {
    const x = sideSign(side) * LUNGE.half
    if (side === front) setLeg(p, side, [x, FLOOR_ANKLE_Y, frontZ], kneeForward(side), flatFoot())
    else setLeg(p, side, ankleForToe([x, 0, rearToeZ], rearPitch), kneeDown, { fwd: [0, 0, 1], pitch: rearPitch })
  }
  return armsHang(p, 8, 10)
}

/** A foot off the floor mid-step: ankle at `ankle`, toes `pitch` degrees down. */
function swing(p: Pose, side: Side, ankle: Vec, pitch: number) {
  setLeg(p, side, ankle, kneeForward(side), { fwd: [0, 0, 1], pitch })
  return p
}

/** Reverse lunge (ACE): the left foot steps back, the left knee lowers towards the floor, chest up. */
function reverseLunge(): Motion {
  const standing = armsHang(stand(LUNGE.half), 8, 10)
  const lift = clone(standing)
  lift.pelvis = [0, 0.9, -0.06]
  swing(lift, 'l', [LUNGE.half, 0.2, -0.38], 20)
  const land = lungePose('r', 0, -0.68, [0, 0.83, -0.3], 4)
  const bottom = lungePose('r', 0, -0.68, [0, 0.52, -0.34], 6)
  return {
    keys: [
      key(0, standing, 'Bước lùi'),
      key(0.14, lift, 'Bước lùi'),
      key(0.26, land, 'Hạ gối'),
      key(0.52, bottom, 'Đạp lên'),
      key(0.72, land, 'Đưa chân về'),
      key(0.84, lift, 'Đưa chân về'),
    ],
    props: [],
    seconds: 3.8,
  }
}

/**
 * Walking lunge, done in place: alternate forward lunges, the front knee to ~90°, the rear knee towards the floor.
 * The stepping foot lands heel first and rolls flat as the body lowers.
 */
const WALK = { frontZ: 0.95, heelStrike: -20, liftHeel: 20 }
function walkingLunge(): Motion {
  const standing = armsHang(stand(LUNGE.half), 8, 10)
  const half = (front: Side, t0: number) => {
    const rear: Side = front === 'l' ? 'r' : 'l'
    const lift = clone(standing)
    lift.pelvis = [0, 0.9, 0.12]
    swing(lift, front, [sideSign(front) * LUNGE.half, 0.2, 0.45], -10)
    const rearToe: Vec = [sideSign(rear) * LUNGE.half, 0, TOE_REACH]
    setLeg(lift, rear, ankleForToe(rearToe, WALK.liftHeel), kneeDown, { fwd: [0, 0, 1], pitch: WALK.liftHeel })
    const land = lungePose(front, WALK.frontZ, TOE_REACH, [0, 0.83, 0.55], 4)
    const heel: Vec = [sideSign(front) * LUNGE.half, 0, WALK.frontZ - DIM.heelBehindAnkle]
    setLeg(land, front, ankleForHeel(heel, WALK.heelStrike), kneeForward(front), { fwd: [0, 0, 1], pitch: WALK.heelStrike })
    const bottom = lungePose(front, WALK.frontZ, TOE_REACH, [0, 0.52, 0.6], 6)
    // Halfway through the rear heel rising, re-seat the toe tip on the floor: a straight blend of the ankle sinks it.
    const rising = lerpPose(lift, land, 0.5)
    const risingPitch = (WALK.liftHeel + LUNGE.rearPitch) / 2
    setLeg(rising, rear, ankleForToe(rearToe, risingPitch), kneeDown, { fwd: [0, 0, 1], pitch: risingPitch })
    return [
      key(t0, standing, 'Bước tới'),
      key(t0 + 0.07, lift, 'Bước tới'),
      key(t0 + 0.1, rising, 'Bước tới'),
      key(t0 + 0.13, land, 'Hạ gối'),
      key(t0 + 0.26, bottom, 'Đạp lên'),
      key(t0 + 0.36, land, 'Thu chân về'),
      key(t0 + 0.39, rising, 'Thu chân về'),
      key(t0 + 0.42, lift, 'Thu chân về'),
    ]
  }
  return { keys: [...half('r', 0), ...half('l', 0.5)], props: [], seconds: 6.4 }
}

/**
 * Bulgarian split squat (ACE): right foot forward, the top of the left foot on a knee-high bench, goblet hold,
 * upright trunk (as in the cited study). The mannequin has no toe joint and its ankle stops at 40° of
 * plantarflexion, so at the top the rear foot rests on the dorsum of the toes; it rolls flat onto the bench as the
 * knee drops, the ankle pointed ~30° at the bottom.
 */
const BSS = { benchY: 0.45, benchFrom: -1.1, benchTo: -0.68, rearToeZ: -0.8, topPitch: 135, bottomPitch: 175 }
function bulgarianSplitSquat(): Motion {
  const pose = (pelvis: Vec, trunk: number, rearPitch: number) => {
    const p = stand(LUNGE.half)
    p.pelvis = pelvis
    p.pelvisRot = [trunk, 0, 0]
    setLeg(p, 'r', [-LUNGE.half, FLOOR_ANKLE_Y, 0], kneeForward('r'), flatFoot())
    const toeY = BSS.benchY - FOOT_THICKNESS * Math.cos(rad(rearPitch)) - FOOT_SINK
    setLeg(p, 'l', ankleForToe([LUNGE.half, toeY, BSS.rearToeZ], rearPitch), kneeDown, { fwd: [0, 0, 1], pitch: rearPitch })
    return gobletHold(p)
  }
  const top = pose([0, 0.92, -0.06], 8, BSS.topPitch)
  const bottom = pose([0, 0.53, -0.37], 8, BSS.bottomPitch)
  return {
    keys: [key(0, top, 'Hạ gối'), key(0.5, bottom, 'Đạp lên'), key(0.88, top, 'Nghỉ')],
    props: [seat(BSS.benchY, BSS.benchFrom, BSS.benchTo), GOBLET_DUMBBELL],
    seconds: 3.6,
  }
}

/** Step-up (ACE): dumbbells at the sides, palms in; right foot onto the box, push up and bring the left foot alongside, step down left foot first. */
/** Pelvis height standing tall with the feet `LUNGE.half` apart (knees ~9° short of locked). */
const STAND_TALL = 0.925
const BOX = { y: 0.3, from: 0.24, to: 0.68, width: 0.6, footZ: 0.42 }
function stepUp(): Motion {
  const onBox = (side: Side): Vec => [sideSign(side) * LUNGE.half, BOX.y + FLOOR_ANKLE_Y, BOX.footZ]
  const onFloor = (side: Side): Vec => [sideSign(side) * LUNGE.half, FLOOR_ANKLE_Y, 0]
  const pose = (pelvis: Vec, pitch: number, feet: Record<Side, { at: Vec; swing?: number }>) => {
    const p = stand(LUNGE.half)
    p.pelvis = pelvis
    p.pelvisRot = [pitch, 0, 0]
    for (const side of SIDES) {
      const { at, swing: toesDown } = feet[side]
      if (toesDown === undefined) setLeg(p, side, at, kneeForward(side), flatFoot())
      else swing(p, side, at, toesDown)
    }
    p.forearms = { l: NEUTRAL_FOREARM, r: NEUTRAL_FOREARM }
    return armsHang(p, 10)
  }
  const floor = pose([0, STAND_TALL, 0], 0, { r: { at: onFloor('r') }, l: { at: onFloor('l') } })
  const rLift = pose([0, 0.91, 0.02], 2, { r: { at: [-LUNGE.half, 0.47, 0.04], swing: 15 }, l: { at: onFloor('l') } })
  const rOn = pose([0, 0.86, 0.15], 8, { r: { at: onBox('r') }, l: { at: onFloor('l') } })
  const lLift = pose([0, 1.15, 0.34], 6, { r: { at: onBox('r') }, l: { at: [LUNGE.half, 0.5, 0], swing: 20 } })
  const top = pose([0, BOX.y + STAND_TALL, BOX.footZ], 0, { r: { at: onBox('r') }, l: { at: onBox('l') } })
  const lBack = pose([0, 1.12, 0.34], 10, { r: { at: onBox('r') }, l: { at: [LUNGE.half, 0.5, 0.02], swing: 25 } })
  const rBack = pose([0, 0.91, 0.04], 4, { r: { at: [-LUNGE.half, 0.5, 0.03], swing: 25 }, l: { at: onFloor('l') } })
  return {
    keys: [
      key(0, floor, 'Bước lên'),
      key(0.08, rLift, 'Bước lên'),
      key(0.16, rOn, 'Đạp lên'),
      key(0.3, lLift, 'Đạp lên'),
      key(0.4, top, 'Bước xuống'),
      key(0.5, lBack, 'Bước xuống'),
      key(0.64, rOn, 'Hạ chân phải'),
      key(0.76, rBack, 'Hạ chân phải'),
      key(0.86, floor, 'Nghỉ'),
    ],
    props: [
      { kind: 'block', center: [0, BOX.y / 2, (BOX.from + BOX.to) / 2], size: [BOX.width, BOX.y, BOX.to - BOX.from] },
      { kind: 'dumbbell', at: 'gripL' },
      { kind: 'dumbbell', at: 'gripR' },
    ],
    seconds: 4,
  }
}

export const motions: Record<string, () => Motion> = {
  'barbell-front-squat': barbellFrontSquat,
  'goblet-squat': gobletSquat,
  'leg-press': legPress,
  'hack-squat': hackSquat,
  'walking-lunge': walkingLunge,
  'reverse-lunge': reverseLunge,
  'bulgarian-split-squat': bulgarianSplitSquat,
  'leg-extension': legExtension,
  'lying-leg-curl': lyingLegCurl,
  'seated-leg-curl': seatedLegCurl,
  'step-up': stepUp,
}
