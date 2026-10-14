import { describe, expect, it } from 'vitest'
import type { Bone, BreathingGuide, Exercise, Muscle, Quote } from '../src/lib/content-types.ts'
import { glbObjects, validateBreathing, validateDetails, validateEvidence, validateExercises, validateMuscles, validateSkeleton } from './validate-content.ts'

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

describe('glbObjects', () => {
  it('lấy tên node đúng role, bỏ hậu tố .r/.l, bỏ node khác role', () => {
    const glb = fakeGlb({ nodes: [
      { name: 'Soleus muscle.r', extras: { role: 'muscle' } },
      { name: 'Femur.r', extras: { role: 'bone' } },
      { name: 'Head', extras: { role: 'head' } },
      { name: 'Camera' },
    ] })
    expect(glbObjects(glb, 'muscle')).toEqual(new Set(['Soleus muscle']))
    expect(glbObjects(glb, 'bone')).toEqual(new Set(['Femur']))
  })
})

describe('validateSkeleton', () => {
  const femur = { object: 'Femur', vi: 'Xương đùi' }
  it('hợp lệ khi khớp đúng bones.glb', () => {
    expect(validateSkeleton([femur], new Set(['Femur']))).toEqual([])
  })
  it('báo trùng, thiếu tên, thiếu trong GLB và mesh GLB chưa có tên', () => {
    const errors = validateSkeleton([femur, femur, { object: 'Tibia', vi: ' ' }], new Set(['Femur', 'Patella']))
    expect(errors).toEqual([
      'skeleton.json trùng object "Femur"',
      'skeleton.json: "Tibia" thiếu tên vi',
      'skeleton.json: "Tibia" không có trong bones.glb (chạy npm run model:bones)',
      'bones.glb có "Patella" nhưng skeleton.json không có tên',
    ])
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
  it('trùng ý trong một nhóm mẹo', () => {
    expect(validateDetails([detailed({ tips: { training: ['Ý một.', 'Ý một.'], clinical: ['Ý một.'] } })], [humerus])).toEqual([
      'deltoid: tips.training trùng ý',
    ])
  })
  it('tên xương chỉ có khoảng trắng', () => {
    expect(validateDetails([detailed()], [{ ...humerus, vi: ' ', en: 'Humerus' }])).toEqual(['xương humerus: thiếu tên vi hoặc en'])
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
  it('câu trích có field lạ, thiếu item, item ngoài khoảng, nerve có item, function có item', () => {
    const bad = [
      ...full,
      q('tips.trainng', 0),
      q('insertion'),
      q('insertion', 1),
      q('tips.clinical', 0),
      q('nerve', 0),
      q(undefined, 0),
    ]
    expect(validateEvidence([detailed()], { deltoid: bad })).toEqual([
      'deltoid: câu trích có field không hợp lệ "tips.trainng"',
      'deltoid: câu trích insertion thiếu item',
      'deltoid: câu trích insertion[1] trỏ tới ý không có',
      'deltoid: câu trích tips.clinical[0] trỏ tới ý không có',
      'deltoid: câu trích nerve không được có item',
      'deltoid: câu trích function không được có item',
    ])
  })
  it('câu trích nerve khi cơ không có nerve', () => {
    expect(validateEvidence([detailed({ nerve: undefined })], { deltoid: full })).toEqual(['deltoid: câu trích nerve trỏ tới ý không có'])
  })
  it('khóa evidence không phải id cơ', () => {
    expect(validateEvidence([detailed()], { deltoid: full, deltoidd: [q()] })).toEqual(['evidence.json: không có cơ "deltoidd"'])
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
  it('ý rỗng và trùng ý', () =>
    expect(validateBreathing({ ...guide, points: ['Ý một.', ' ', 'Ý một.'] }, [...quotes, { url, quote: 'q', field: 'points', item: 1 }, { url, quote: 'q', field: 'points', item: 2 }])).toEqual([
      'breathing: points[1] ý rỗng',
      'breathing: points trùng ý',
    ]))
  it('câu trích có field lạ, item ngoài khoảng, thiếu item, phases có item', () =>
    expect(
      validateBreathing(guide, [
        ...quotes,
        { url, quote: 'q', field: 'point', item: 0 },
        { url, quote: 'q', field: 'points', item: 3 },
        { url, quote: 'q', field: 'points' },
        { url, quote: 'q', field: 'phases', item: 0 },
        { url, quote: 'q' },
      ]),
    ).toEqual([
      'breathing: câu trích có field không hợp lệ "point"',
      'breathing: câu trích points[3] trỏ tới ý không có',
      'breathing: câu trích points thiếu item',
      'breathing: câu trích phases không được có item',
      'breathing: câu trích có field không hợp lệ "undefined"',
    ]))
  it('points rỗng', () => expect(validateBreathing({ ...guide, points: [] }, quotes)).toContain('breathing: points rỗng'))
})
