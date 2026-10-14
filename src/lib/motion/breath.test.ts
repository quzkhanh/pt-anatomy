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
  it('hai pha liền kề cùng có hơi thở thì ngược nhau', () => {
    const bad = motions.flatMap(([id, m]) => {
      const phases = m.keys.map((k) => k.phase).filter((p, i, a) => p !== a[i - 1])
      return phases.flatMap((p, i) => {
        const next = phases[(i + 1) % phases.length]
        const a = PHASE_BREATH[p], b = PHASE_BREATH[next]
        return phases.length > 1 && a && b && a === b ? [`${id}: ${p} → ${next}`] : []
      })
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
