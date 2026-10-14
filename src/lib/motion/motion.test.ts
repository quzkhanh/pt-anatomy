import { describe, expect, it } from 'vitest'
import { sampleMotion, type Motion } from './motion'
import { standing } from './pose'

const up = standing()
const down = standing()
down.pelvis = [0, 0.6, 0]
const motion: Motion = {
  keys: [
    { t: 0, pose: up, phase: 'Hạ xuống' },
    { t: 0.5, pose: down, phase: 'Đứng lên' },
  ],
  props: [],
  seconds: 3,
}

describe('sampleMotion', () => {
  it('đúng tư thế ở các khoá, vòng lặp nối về khoá đầu, nhãn pha đúng', () => {
    expect(sampleMotion(motion, 0).pose.pelvis[1]).toBeCloseTo(up.pelvis[1])
    expect(sampleMotion(motion, 0.5).pose.pelvis[1]).toBeCloseTo(0.6)
    expect(sampleMotion(motion, 0.999).pose.pelvis[1]).toBeCloseTo(up.pelvis[1], 2)
    expect(sampleMotion(motion, 1.25).phase).toBe('Hạ xuống')
    expect(sampleMotion(motion, 0.75).phase).toBe('Đứng lên')
  })

  it('giữa hai khoá nằm giữa hai tư thế', () => {
    const y = sampleMotion(motion, 0.25).pose.pelvis[1]
    expect(y).toBeLessThan(up.pelvis[1])
    expect(y).toBeGreaterThan(0.6)
  })

  it('khoá trung gian cùng pha không làm khựng: vận tốc tại khoá giữa không về 0', () => {
    const a = standing()
    const mid = standing()
    mid.pelvis = [0, 0.8, 0]
    const b = standing()
    b.pelvis = [0, 0.6, 0]
    const m: Motion = {
      keys: [
        { t: 0, pose: a, phase: 'Hạ xuống' },
        { t: 0.25, pose: mid, phase: 'Hạ xuống' },
        { t: 0.5, pose: b, phase: 'Đứng lên' },
      ],
      props: [],
      seconds: 3,
    }
    const y = (t: number) => sampleMotion(m, t).pose.pelvis[1]
    const speedAtMid = Math.abs(y(0.26) - y(0.24)) / 0.02
    expect(speedAtMid).toBeGreaterThan(0.5)
    expect(y(0.5)).toBeCloseTo(0.6)
  })
})
