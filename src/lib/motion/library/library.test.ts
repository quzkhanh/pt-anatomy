import { Vector3 } from 'three'
import { describe, expect, it } from 'vitest'
import { exercises } from '../../content'
import { sampleMotion } from '../motion'
import { jointAngles, solvePose, type Limb } from '../pose'
import { MOTIONS } from './index'

const SAMPLES = 60
const POINTS = ['shoulder', 'elbow', 'wrist', 'grip', 'hip', 'knee', 'ankle', 'heel', 'toe'] as const
const REACH_TOLERANCE_M = 0.02
const CONTINUITY_SAMPLES = 120
/** Fastest real segment speeds here are ~2 m/s; a bigger step between samples is a teleport, not motion. */
const MAX_STEP_M = 0.15
const FLOOR_TOLERANCE_M = 0.01
/**
 * Range-of-motion limits in degrees, from the AAOS normal values (Greene & Heckman, "The Clinical
 * Measurement of Joint Motion", 1994) with a small allowance for the mannequin's simplified joints.
 */
const ROM = {
  elbow: [0, 155],
  knee: [0, 155],
  shoulder: [0, 185],
  hipFlex: [-35, 140],
  ankle: [-40, 55],
  spineFlex: [-30, 90],
  spineSide: [-40, 40],
  spineTwist: [-50, 50],
  /** Loaded wrists (hands flat in a plank or quadruped) go a little past the AAOS 70° extension. */
  wrist: [-95, 85],
} as const

const isTarget = (l: Limb): l is Extract<Limb, { target: unknown }> => 'target' in l
const within = (value: number, [lo, hi]: readonly [number, number]) => value >= lo - 1e-6 && value <= hi + 1e-6

describe('thư viện động tác', () => {
  it.each(Object.keys(MOTIONS))('%s: khoá tăng dần, tư thế hợp lệ ở mọi thời điểm', (id) => {
    const motion = MOTIONS[id]!()
    const ts = motion.keys.map((k) => k.t)
    expect(ts[0]).toBe(0)
    expect(ts.every((t, i) => i === 0 || t > ts[i - 1])).toBe(true)
    expect(ts.at(-1)!).toBeLessThan(1)
    for (let i = 0; i < SAMPLES; i++) {
      const t = i / SAMPLES
      const { pose } = sampleMotion(motion, t)
      const j = solvePose(pose)
      const where = `${id} t=${t.toFixed(2)}`
      const points = [j.head, j.pelvis, j.chest, ...(['l', 'r'] as const).flatMap((s) => POINTS.map((k) => j[s][k]))]
      for (const p of points) {
        expect(Number.isFinite(p.x + p.y + p.z), `${where}: NaN`).toBe(true)
        expect(p.y, `${where}: xuyên sàn`).toBeGreaterThan(-FLOOR_TOLERANCE_M)
      }
      for (const side of ['l', 'r'] as const) {
        const arm = pose.arms[side]
        const leg = pose.legs[side]
        if (isTarget(arm)) expect(j[side].grip.distanceTo(new Vector3(...arm.target)), `${where}: tay ${side} không với tới`).toBeLessThan(REACH_TOLERANCE_M)
        if (isTarget(leg)) expect(j[side].ankle.distanceTo(new Vector3(...leg.target)), `${where}: chân ${side} không với tới`).toBeLessThan(REACH_TOLERANCE_M)
      }
      const a = jointAngles(j)
      for (const S of ['L', 'R']) {
        expect(within(a[`elbow${S}`], ROM.elbow), `${where}: khuỷu ${S} ${a[`elbow${S}`].toFixed(0)}°`).toBe(true)
        expect(within(a[`knee${S}`], ROM.knee), `${where}: gối ${S} ${a[`knee${S}`].toFixed(0)}°`).toBe(true)
        expect(within(a[`shoulder${S}`], ROM.shoulder), `${where}: vai ${S} ${a[`shoulder${S}`].toFixed(0)}°`).toBe(true)
        expect(within(a[`hipFlex${S}`], ROM.hipFlex), `${where}: hông ${S} ${a[`hipFlex${S}`].toFixed(0)}°`).toBe(true)
        expect(within(a[`ankle${S}`], ROM.ankle), `${where}: cổ chân ${S} ${a[`ankle${S}`].toFixed(0)}°`).toBe(true)
      }
      for (const side of ['l', 'r'] as const) {
        const w = pose.wrists?.[side] ?? 0
        expect(within(w, ROM.wrist), `${where}: cổ tay ${side} ${w.toFixed(0)}°`).toBe(true)
      }
      const [flex, sideBend, twist] = pose.spine
      expect(within(flex, ROM.spineFlex) && within(sideBend, ROM.spineSide) && within(twist, ROM.spineTwist), `${where}: cột sống`).toBe(true)
    }
  })

  it.each(Object.keys(MOTIONS))('%s: mặt trước của tay/chân không lật giữa chừng (vùng tô cơ không nhảy mặt)', (id) => {
    const motion = MOTIONS[id]!()
    const at = (t: number) => solvePose(sampleMotion(motion, t).pose)
    let prev = at(0)
    for (let i = 1; i <= SAMPLES; i++) {
      const next = at(i / SAMPLES)
      for (const side of ['l', 'r'] as const) {
        for (const key of ['armFront', 'legFront', 'palm'] as const) {
          expect(prev[side][key].dot(next[side][key]), `${id} t=${(i / SAMPLES).toFixed(2)}: ${key} ${side} lật`).toBeGreaterThan(0)
        }
      }
      prev = next
    }
  })

  it.each(Object.keys(MOTIONS))('%s: mỗi tay/chân giữ cùng một kiểu (IK hoặc góc khớp) ở mọi khoá — đổi kiểu làm giật', (id) => {
    const { keys } = MOTIONS[id]!()
    for (const part of ['arms', 'legs'] as const) {
      for (const side of ['l', 'r'] as const) {
        const modes = new Set(keys.map((k) => isTarget(k.pose[part][side])))
        expect(modes.size, `${id}: ${part}.${side} đổi kiểu giữa các khoá`).toBe(1)
      }
    }
  })

  it.each(Object.keys(MOTIONS))('%s: liên tục — không khớp nào nhảy quá 15 cm mỗi 1/120 chu kỳ', (id) => {
    const motion = MOTIONS[id]!()
    let prev = solvePose(sampleMotion(motion, 0).pose)
    for (let i = 1; i <= CONTINUITY_SAMPLES; i++) {
      const next = solvePose(sampleMotion(motion, i / CONTINUITY_SAMPLES).pose)
      for (const side of ['l', 'r'] as const) {
        for (const k of POINTS) {
          expect(next[side][k].distanceTo(prev[side][k]), `${id} t=${(i / CONTINUITY_SAMPLES).toFixed(3)}: ${side}.${k} nhảy`).toBeLessThan(MAX_STEP_M)
        }
      }
      prev = next
    }
  })

  it('mọi bài tập đều có động tác', () => {
    expect(exercises.filter((e) => !MOTIONS[e.id]).map((e) => e.id)).toEqual([])
  })
})
