import { describe, expect, it } from 'vitest'
import { PHASE_BREATH, phaseLabel } from './breath'
import { MOTIONS } from './library'

const motions = Object.entries(MOTIONS).map(([id, build]) => [id, build!()] as const)

describe('PHASE_BREATH', () => {
  it('phân loại mọi nhãn pha đang dùng', () => {
    const labels = new Set(motions.flatMap(([, m]) => m.keys.map((k) => k.phase)))
    expect([...labels].filter((l) => !(l in PHASE_BREATH))).toEqual([])
  })
  it('không giữ nhãn không còn dùng', () => {
    const labels = new Set(motions.flatMap(([, m]) => m.keys.map((k) => k.phase)))
    expect(Object.keys(PHASE_BREATH).filter((l) => !labels.has(l))).toEqual([])
  })
  it('động tác có gợi ý hơi thở thì có cả pha thở ra và hít vào', () => {
    const bad = motions.flatMap(([id, m]) => {
      const breaths = new Set(m.keys.map((k) => PHASE_BREATH[k.phase]).filter(Boolean))
      return breaths.size === 1 ? [id] : []
    })
    expect(bad).toEqual([])
  })
})

describe('phaseLabel', () => {
  it('ghép hơi thở', () => {
    expect(phaseLabel('Đẩy lên')).toBe('Đẩy lên · thở ra')
    expect(phaseLabel('Hạ tạ')).toBe('Hạ tạ · hít vào')
    expect(phaseLabel('Giữ')).toBe('Giữ')
  })
})
