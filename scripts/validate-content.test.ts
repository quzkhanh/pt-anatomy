import { describe, expect, it } from 'vitest'
import type { Exercise, Muscle } from '../src/lib/content-types.ts'
import { glbMuscleObjects, validateExercises, validateMuscles } from './validate-content.ts'

const muscle = (over: Partial<Muscle> = {}): Muscle => ({
  id: 'deltoid', vi: 'Cơ delta', en: 'Deltoid', region: 'shoulders', superficial: true, status: 'draft',
  parts: [
    { id: 'anterior', vi: 'bó trước', object: 'A' },
    { id: 'middle', vi: 'bó giữa', object: 'B' },
  ],
  function: 'Dạng cánh tay.',
  sources: [{ title: 'OpenStax', url: 'https://openstax.org/x' }],
  ...over,
})

const exercise = (over: Partial<Exercise> = {}): Exercise => ({
  id: 'lateral-raise', en: 'Lateral raise', vi: 'Dang tạ đơn', equipment: 'dumbbell',
  primary: ['deltoid.middle'], secondary: ['deltoid.anterior'], cues: ['Nâng tới ngang vai.'],
  sources: [{ title: 'ACE', url: 'https://acefitness.org/x' }], status: 'draft',
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

describe('validateExercises', () => {
  it('bài hợp lệ thì không có lỗi; hai phần khác nhau của một cơ được ở chính và phụ', () => {
    expect(validateExercises([exercise()], [muscle()])).toEqual([])
  })

  it('báo tham chiếu không tồn tại, trùng chính/phụ, primary rỗng, enum sai', () => {
    const bad = exercise({ equipment: 'rope' as Exercise['equipment'], primary: [], secondary: ['deltoid.x', 'biceps'] })
    const overlap = exercise({ id: 'b', primary: ['deltoid'], secondary: ['deltoid.anterior'] })
    const errors = validateExercises([bad, overlap], [muscle()])
    expect(errors).toContain('lateral-raise: equipment không hợp lệ "rope"')
    expect(errors).toContain('lateral-raise: primary rỗng')
    expect(errors).toContain('lateral-raise: tham chiếu cơ không tồn tại "deltoid.x"')
    expect(errors).toContain('lateral-raise: tham chiếu cơ không tồn tại "biceps"')
    expect(errors).toContain('b: "deltoid" (chính) và "deltoid.anterior" (phụ) trùng nhau')
  })

  it('báo trùng id, thiếu nguồn, nguồn không https', () => {
    const errors = validateExercises(
      [exercise({ sources: [] }), exercise({ sources: [{ title: 'x', url: 'http://a' }] })],
      [muscle()],
    )
    expect(errors).toContain('trùng id bài tập: lateral-raise')
    expect(errors).toContain('lateral-raise: thiếu sources')
    expect(errors).toContain('lateral-raise: nguồn thiếu title hoặc url không phải https "http://a"')
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
