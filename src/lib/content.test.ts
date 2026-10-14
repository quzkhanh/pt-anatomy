import { describe, expect, it } from 'vitest'
import { attachedObjects, attachmentsOn, boneNames, equipmentIn, exerciseById, exerciseCount, exercises, exercisesFor, isSuperficial, muscleById, partByObject } from './content'

describe('content', () => {
  it('attachmentsOn gộp mọi nhóm xương chứa mảnh đó, tách nguyên ủy và bám tận', () => {
    // The 4th rib sits in several overlapping groups (ribs 1–8, ribs 3–5, ribs 1–12…).
    const rib = attachmentsOn('Fourth rib')
    const ids = (list: { muscle: { id: string } }[]) => list.map((a) => a.muscle.id)
    expect(ids(rib.origin).length).toBeGreaterThan(1)
    const humerus = attachmentsOn('Humerus')
    expect(ids(humerus.insertion)).toContain('pectoralis-major')
    expect(ids(humerus.origin)).not.toContain('pectoralis-major')
    expect(humerus.insertion.find((a) => a.muscle.id === 'pectoralis-major')!.landmarks).toHaveLength(1)
  })

  it('attachedObjects trả về các mảnh xương của nguyên ủy và bám tận, không trùng', () => {
    const objects = attachedObjects(muscleById('pectoralis-major')!)
    expect(objects).toEqual(expect.arrayContaining(['Clavicle', 'Manubrium of sternum', 'Costal cartilage of first rib', 'Humerus']))
    expect(new Set(objects).size).toBe(objects.length)
  })

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
