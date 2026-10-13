import { describe, expect, it } from 'vitest'
import type { Muscle } from '../src/lib/content-types.ts'
import { glbMuscleObjects, validateMuscles } from './validate-content.ts'

const muscle = (over: Partial<Muscle> = {}): Muscle => ({
  id: 'deltoid', vi: 'Cơ delta', en: 'Deltoid', region: 'shoulders', superficial: true, status: 'draft',
  parts: [
    { id: 'anterior', vi: 'bó trước', object: 'A' },
    { id: 'middle', vi: 'bó giữa', object: 'B' },
  ],
  ...over,
})

function fakeGlb(json: object): Uint8Array {
  const body = new TextEncoder().encode(JSON.stringify(json).padEnd(Math.ceil(JSON.stringify(json).length / 4) * 4, ' '))
  const glb = new Uint8Array(20 + body.length)
  const view = new DataView(glb.buffer)
  view.setUint32(0, 0x46546c67, true)
  view.setUint32(4, 2, true)
  view.setUint32(8, glb.length, true)
  view.setUint32(12, body.length, true)
  view.setUint32(16, 0x4e4f534a, true)
  glb.set(body, 20)
  return glb
}

describe('validateMuscles', () => {
  it('dữ liệu khớp thì không có lỗi', () => {
    expect(validateMuscles([muscle()], new Set(['A', 'B']))).toEqual([])
  })

  it('báo object thiếu trong GLB và object GLB không thuộc cơ nào', () => {
    const errors = validateMuscles([muscle()], new Set(['A', 'C']))
    expect(errors).toContain('deltoid.middle: object "B" không có trong body.glb')
    expect(errors).toContain('object "C" trong body.glb không thuộc cơ nào')
  })

  it('báo trùng id cơ, trùng id phần, object dùng hai lần', () => {
    const dup = muscle({ parts: [{ id: 'x', vi: 'a', object: 'A' }, { id: 'x', vi: 'b', object: 'A' }] })
    const errors = validateMuscles([dup, muscle()], new Set(['A', 'B']))
    expect(errors).toContain('trùng id cơ: deltoid')
    expect(errors).toContain('deltoid: trùng id phần "x"')
    expect(errors).toContain('object "A" thuộc nhiều hơn một phần')
  })

  it('cơ nhiều phần thì phần phải có tên tiếng Việt; enum phải hợp lệ', () => {
    const bad = muscle({ region: 'neckz' as Muscle['region'], status: 'done' as Muscle['status'], parts: [{ id: 'a', object: 'A' }, { id: 'b', object: 'B' }] })
    const errors = validateMuscles([bad], new Set(['A', 'B']))
    expect(errors).toContain('deltoid.a: cơ nhiều phần thì phần phải có tên tiếng Việt')
    expect(errors).toContain('deltoid: region không hợp lệ "neckz"')
    expect(errors).toContain('deltoid: status không hợp lệ "done"')
  })
})

describe('glbMuscleObjects', () => {
  it('lấy tên node role=muscle, bỏ hậu tố .r/.l, bỏ node khác role', () => {
    const glb = fakeGlb({ nodes: [
      { name: 'Soleus muscle.r', extras: { role: 'muscle' } },
      { name: 'Head', extras: { role: 'head' } },
      { name: 'Camera' },
    ] })
    expect(glbMuscleObjects(glb)).toEqual(new Set(['Soleus muscle']))
  })
})
