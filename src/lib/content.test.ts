import { describe, expect, it } from 'vitest'
import { isSuperficial, muscleById, partByObject } from './content'

describe('content', () => {
  it('tra được phần cơ từ tên object Z-Anatomy', () => {
    const ref = partByObject('Clavicular head of pectoralis major muscle')
    expect(ref?.muscle.id).toBe('pectoralis-major')
    expect(ref?.part.id).toBe('clavicular')
  })

  it('phần cơ ghi đè được cờ lớp nông của cơ', () => {
    const quads = muscleById('quadriceps-femoris')!
    const part = (id: string) => ({ muscle: quads, part: quads.parts.find((p) => p.id === id)! })
    expect(isSuperficial(part('rectus-femoris'))).toBe(true)
    expect(isSuperficial(part('vastus-intermedius'))).toBe(false)
  })
})
