import { describe, expect, it } from 'vitest'
import type { Bone, BreathingGuide, Exercise, Muscle, Quote } from '../src/lib/content-types.ts'
import { glbMuscleObjects, validateBreathing, validateDetails, validateEvidence, validateExercises, validateMuscles } from './validate-content.ts'

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

const humerus: Bone = { id: 'humerus', vi: 'Xương cánh tay', en: 'Humerus', objects: ['Humerus'] }
const detailed = (over: Partial<Muscle> = {}) =>
  muscle({
    insertion: [{ bones: ['humerus'], vi: 'lồi củ delta' }],
    nerve: 'Thần kinh nách',
    tips: { training: ['Ý một.', 'Ý hai.'] },
    ...over,
  })

describe('validateDetails', () => {
  it('dữ liệu đúng thì không lỗi', () => {
    expect(validateDetails([detailed()], [humerus])).toEqual([])
  })
  it('xương không có trong bones.json', () => {
    expect(validateDetails([detailed({ insertion: [{ bones: ['femur'], vi: 'x' }] })], [humerus])).toEqual([
      'deltoid: insertion nhắc xương không có "femur"',
      'xương humerus không được cơ nào nhắc',
    ])
  })
  it('điểm bám thiếu mô tả, mảng rỗng; bám mô mềm (bones rỗng) hợp lệ', () => {
    expect(validateDetails([detailed({ origin: [], insertion: [{ bones: [], vi: '' }] })], [humerus])).toEqual([
      'deltoid: origin rỗng',
      'deltoid: insertion[0] thiếu mô tả',
      'xương humerus không được cơ nào nhắc',
    ])
  })
  it('bám mô mềm với mô tả thì hợp lệ', () => {
    expect(validateDetails([detailed({ origin: [{ bones: [], vi: 'cân gan tay' }] })], [humerus])).toEqual([])
  })
  it('nhóm mẹo lạ, nhóm rỗng, ý rỗng, nerve rỗng', () => {
    const tips = { training: [], clinical: [' '], diet: ['x'] } as unknown as Muscle['tips']
    expect(validateDetails([detailed({ tips, nerve: ' ' })], [humerus])).toEqual([
      'deltoid: nerve rỗng',
      'deltoid: tips.training rỗng',
      'deltoid: tips.clinical có ý rỗng',
      'deltoid: nhóm mẹo không hợp lệ "diet"',
    ])
  })
  it('tips là object rỗng', () => {
    expect(validateDetails([detailed({ tips: {} })], [humerus])).toEqual(['deltoid: tips rỗng'])
  })
  it('bones.json trùng id, thiếu tên, objects rỗng', () => {
    const bad: Bone = { id: 'humerus', vi: '', en: 'Humerus', objects: [] }
    expect(validateDetails([detailed()], [humerus, bad])).toEqual([
      'trùng id xương: humerus',
      'xương humerus: thiếu tên vi hoặc en',
      'xương humerus: objects rỗng',
    ])
  })
})

describe('validateEvidence', () => {
  const url = 'https://openstax.org/x'
  const q = (field?: string, item?: number): Quote => ({ url, quote: 'câu', field, item })
  const full = [q(), q('insertion', 0), q('nerve'), q('tips.training', 0), q('tips.training', 1)]

  it('đủ câu trích thì không lỗi', () => {
    expect(validateEvidence([detailed()], { deltoid: full })).toEqual([])
  })
  it('báo đúng ý thiếu câu trích', () => {
    expect(validateEvidence([detailed()], { deltoid: full.slice(0, 4) })).toEqual([
      'deltoid: tips.training[1] chưa có câu trích trong evidence.json',
    ])
  })
  it('câu trích dùng url không có trong sources của cơ', () => {
    expect(validateEvidence([detailed()], { deltoid: [...full, { url: 'https://khac.org', quote: 'c' }] })).toEqual([
      'deltoid: câu trích dùng nguồn không có trong sources "https://khac.org"',
    ])
  })
  it('câu trích rỗng không tính', () => {
    expect(validateEvidence([detailed()], { deltoid: [...full.slice(0, 2), { url, quote: ' ', field: 'nerve' }, ...full.slice(3)] })).toEqual([
      'deltoid: nerve chưa có câu trích trong evidence.json',
    ])
  })
})

describe('validateBreathing', () => {
  const url = 'https://nsca.com/x'
  const guide: BreathingGuide = { points: ['Ý một.'], sources: [{ title: 'NSCA', url }], status: 'draft' }
  const quotes = [{ url, quote: 'q', field: 'points', item: 0 }, { url, quote: 'q', field: 'phases' }]
  it('đủ thì không lỗi', () => expect(validateBreathing(guide, quotes)).toEqual([]))
  it('thiếu câu trích cho ý và cho quy tắc pha', () =>
    expect(validateBreathing({ ...guide, points: ['Ý một.', 'Ý hai.'] }, quotes.slice(0, 1))).toEqual([
      'breathing: points[1] chưa có câu trích',
      'breathing: quy tắc pha (phases) chưa có câu trích',
    ]))
  it('câu trích dùng nguồn không có trong sources', () =>
    expect(validateBreathing(guide, [...quotes, { url: 'https://other.com/y', quote: 'q', field: 'points', item: 0 }])).toEqual([
      'breathing: câu trích dùng nguồn không có trong sources "https://other.com/y"',
    ]))
  it('points rỗng', () => expect(validateBreathing({ ...guide, points: [] }, quotes)).toContain('breathing: points rỗng'))
})
