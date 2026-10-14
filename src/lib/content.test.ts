import { describe, expect, it } from 'vitest'
import { boneNames, equipmentIn, exerciseById, exerciseCount, exercises, exercisesFor, isSuperficial, muscleById, partByObject } from './content'

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

  it('equipmentIn liệt kê dụng cụ theo thứ tự EQUIPMENT, không trùng', () => {
    const pick = (equipment: string) => exercises.find((e) => e.equipment === equipment)!
    const list = [pick('machine'), pick('barbell'), pick('machine'), pick('dumbbell')]
    expect(equipmentIn(list)).toEqual(['barbell', 'dumbbell', 'machine'])
    expect(equipmentIn([])).toEqual([])
  })

  it('exerciseCount đếm mỗi bài một lần dù cơ ở cả nhóm chính và phụ', () => {
    const { primary, secondary } = exercisesFor('pectoralis-major')
    expect(exerciseCount('pectoralis-major')).toBe(new Set([...primary, ...secondary]).size)
    expect(exerciseCount('calcaneal-tendon')).toBe(0)
    expect(exerciseById(primary[0].id)).toBe(primary[0])
  })
})

describe('boneNames', () => {
  it('cơ ngực lớn: bám tận xương cánh tay', () => {
    const pec = muscleById('pectoralis-major')!
    expect(pec.insertion!.flatMap(boneNames)).toContain('Xương cánh tay')
  })

  it('tra tên tiếng Việt theo thứ tự, id lạ thì giữ id', () => {
    expect(boneNames({ bones: ['không-có'], vi: 'x' })).toEqual(['không-có'])
  })
})
