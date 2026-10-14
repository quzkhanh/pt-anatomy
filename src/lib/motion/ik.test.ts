import { Vector3 } from 'three'
import { describe, expect, it } from 'vitest'
import { solveTwoBone } from './ik'

const root = new Vector3(0, 1, 0)
const pole = new Vector3(0, 0, 1)
const close = (a: Vector3, b: Vector3) => expect(a.distanceTo(b)).toBeLessThan(1e-6)

describe('solveTwoBone', () => {
  it('đích trong tầm: chạm đích, giữ độ dài đoạn, khớp giữa gập về phía pole', () => {
    const target = new Vector3(0, 0.4, 0)
    const { mid, end } = solveTwoBone(root, target, pole, 0.4, 0.4)
    close(end, target)
    expect(mid.distanceTo(root)).toBeCloseTo(0.4, 6)
    expect(mid.distanceTo(end)).toBeCloseTo(0.4, 6)
    expect(mid.z).toBeGreaterThan(0)
  })

  it('đích ngoài tầm: duỗi thẳng về phía đích, không NaN', () => {
    const { mid, end } = solveTwoBone(root, new Vector3(0, -5, 0), pole, 0.4, 0.4)
    expect(end.y).toBeCloseTo(1 - 0.8, 4)
    expect(mid.y).toBeCloseTo(0.6, 3)
    for (const v of [mid, end]) expect(Number.isFinite(v.x + v.y + v.z)).toBe(true)
  })

  it('đích trùng gốc hoặc pole song song hướng đích: vẫn ra số hữu hạn', () => {
    for (const [target, p] of [
      [root.clone(), pole],
      [new Vector3(0, 0.5, 0), new Vector3(0, -1, 0)],
    ] as const) {
      const { mid, end } = solveTwoBone(root, target, p, 0.4, 0.3)
      for (const v of [mid, end]) expect(Number.isFinite(v.x + v.y + v.z)).toBe(true)
      expect(mid.distanceTo(root)).toBeCloseTo(0.4, 6)
      expect(mid.distanceTo(end)).toBeCloseTo(0.3, 6)
    }
  })
})
