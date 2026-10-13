import { describe, expect, it } from 'vitest'
import { QUALITY, QualityGovernor } from './quality'

function run(governor: QualityGovernor, fps: number, ms: number, start = 0) {
  let changed = 0
  for (let t = start; t <= start + ms; t += 1000 / fps) if (governor.frame(t)) changed++
  return changed
}

describe('QualityGovernor', () => {
  it('giữ nguyên khi đạt 60 fps', () => {
    const g = new QualityGovernor(2)
    expect(run(g, 60, 5000)).toBe(0)
    expect(g.ratio).toBe(2)
  })

  it('hạ một nấc khi dưới 45 fps liên tục 2 giây', () => {
    const g = new QualityGovernor(2)
    expect(run(g, 30, 2100)).toBe(1)
    expect(g.ratio).toBe(2 - QUALITY.step)
  })

  it('không tính khoảng nghỉ giữa các lần tương tác', () => {
    const g = new QualityGovernor(2)
    for (let burst = 0; burst < 5; burst++) run(g, 30, 1500, burst * 3000)
    expect(g.ratio).toBe(2)
  })

  it('không hạ dưới mức tối thiểu', () => {
    const g = new QualityGovernor(QUALITY.minRatio)
    expect(run(g, 20, 10000)).toBe(0)
    expect(g.ratio).toBe(QUALITY.minRatio)
  })
})
