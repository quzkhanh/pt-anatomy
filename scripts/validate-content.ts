import { EQUIPMENT, REGIONS, STATUSES, TIP_KINDS, type Bone, type BreathingGuide, type Exercise, type Muscle, type Quote, type Source, type TipKind } from '../src/lib/content-types.ts'
import { refsOverlap, splitRef } from '../src/lib/refs.ts'

const GLB_MAGIC = 0x46546c67
const GLB_HEADER_BYTES = 12
const CHUNK_HEADER_BYTES = 8
const SIDE_SUFFIX = /\.[rl]$/

export function glbMuscleObjects(glb: Uint8Array): Set<string> {
  const view = new DataView(glb.buffer, glb.byteOffset, glb.byteLength)
  if (view.getUint32(0, true) !== GLB_MAGIC) throw new Error('body.glb không phải file GLB')
  const jsonStart = GLB_HEADER_BYTES + CHUNK_HEADER_BYTES
  const jsonLength = view.getUint32(GLB_HEADER_BYTES, true)
  const gltf = JSON.parse(new TextDecoder().decode(glb.subarray(jsonStart, jsonStart + jsonLength)))
  const nodes: { name?: string; extras?: { role?: string } }[] = gltf.nodes ?? []
  return new Set(nodes.filter((n) => n.extras?.role === 'muscle').map((n) => n.name!.replace(SIDE_SUFFIX, '')))
}

export function validateMuscles(muscles: Muscle[], glbObjects: Set<string>): string[] {
  const errors: string[] = []
  const ids = new Set<string>()
  const objects = new Set<string>()
  for (const m of muscles) {
    if (ids.has(m.id)) errors.push(`trùng id cơ: ${m.id}`)
    ids.add(m.id)
    if (!m.vi || !m.en) errors.push(`${m.id}: thiếu tên vi hoặc en`)
    if (!REGIONS.includes(m.region)) errors.push(`${m.id}: region không hợp lệ "${m.region}"`)
    if (!STATUSES.includes(m.status)) errors.push(`${m.id}: status không hợp lệ "${m.status}"`)
    if (m.parts.length === 0) errors.push(`${m.id}: không có phần nào`)
    if (!m.function) errors.push(`${m.id}: thiếu function`)
    errors.push(...validateSources(m.id, m.sources))
    const partIds = new Set<string>()
    for (const p of m.parts) {
      if (partIds.has(p.id)) errors.push(`${m.id}: trùng id phần "${p.id}"`)
      partIds.add(p.id)
      if (m.parts.length > 1 && !p.vi) errors.push(`${m.id}.${p.id}: cơ nhiều phần thì phần phải có tên tiếng Việt`)
      if (objects.has(p.object)) errors.push(`object "${p.object}" thuộc nhiều hơn một phần`)
      objects.add(p.object)
      if (!glbObjects.has(p.object)) errors.push(`${m.id}.${p.id}: object "${p.object}" không có trong body.glb`)
    }
  }
  for (const o of glbObjects) if (!objects.has(o)) errors.push(`object "${o}" trong body.glb không thuộc cơ nào`)
  return errors
}

function validateSources(owner: string, sources: Source[] | undefined): string[] {
  if (!sources?.length) return [`${owner}: thiếu sources`]
  return sources
    .filter((s) => !s.title || !s.url?.startsWith('https://'))
    .map((s) => `${owner}: nguồn thiếu title hoặc url không phải https "${s.url}"`)
}

export function validateExercises(exercises: Exercise[], muscles: Muscle[]): string[] {
  const errors: string[] = []
  const parts = new Map(muscles.map((m) => [m.id, new Set(m.parts.map((p) => p.id))]))
  const exists = (ref: string) => {
    const { muscle, part } = splitRef(ref)
    return parts.has(muscle) && (part === undefined || parts.get(muscle)!.has(part))
  }
  const ids = new Set<string>()
  for (const e of exercises) {
    if (ids.has(e.id)) errors.push(`trùng id bài tập: ${e.id}`)
    ids.add(e.id)
    if (!e.vi || !e.en) errors.push(`${e.id}: thiếu tên vi hoặc en`)
    if (!EQUIPMENT.includes(e.equipment)) errors.push(`${e.id}: equipment không hợp lệ "${e.equipment}"`)
    if (!STATUSES.includes(e.status)) errors.push(`${e.id}: status không hợp lệ "${e.status}"`)
    if (e.primary.length === 0) errors.push(`${e.id}: primary rỗng`)
    if (!e.cues?.length) errors.push(`${e.id}: thiếu cues`)
    for (const ref of [...e.primary, ...e.secondary]) {
      if (!exists(ref)) errors.push(`${e.id}: tham chiếu cơ không tồn tại "${ref}"`)
    }
    for (const p of e.primary) {
      for (const s of e.secondary) {
        if (refsOverlap(p, s)) errors.push(`${e.id}: "${p}" (chính) và "${s}" (phụ) trùng nhau`)
      }
    }
    errors.push(...validateSources(e.id, e.sources))
  }
  return errors
}

const ATTACHMENT_FIELDS = ['origin', 'insertion'] as const

export function validateDetails(muscles: Muscle[], bones: Bone[]): string[] {
  const errors: string[] = []
  const boneIds = new Set<string>()
  for (const b of bones) {
    if (boneIds.has(b.id)) errors.push(`trùng id xương: ${b.id}`)
    boneIds.add(b.id)
    if (!b.vi.trim() || !b.en.trim()) errors.push(`xương ${b.id}: thiếu tên vi hoặc en`)
    if (!b.objects.length) errors.push(`xương ${b.id}: objects rỗng`)
  }
  const used = new Set<string>()
  for (const m of muscles) {
    for (const field of ATTACHMENT_FIELDS) {
      const list = m[field]
      if (list && !list.length) errors.push(`${m.id}: ${field} rỗng`)
      list?.forEach((a, i) => {
        if (!a.vi.trim()) errors.push(`${m.id}: ${field}[${i}] thiếu mô tả`)
        for (const b of a.bones) {
          used.add(b)
          if (!boneIds.has(b)) errors.push(`${m.id}: ${field} nhắc xương không có "${b}"`)
        }
      })
    }
    if (m.nerve !== undefined && !m.nerve.trim()) errors.push(`${m.id}: nerve rỗng`)
    if (m.tips && !Object.keys(m.tips).length) errors.push(`${m.id}: tips rỗng`)
    for (const [kind, tips] of Object.entries(m.tips ?? {})) {
      if (!TIP_KINDS.includes(kind as TipKind)) errors.push(`${m.id}: nhóm mẹo không hợp lệ "${kind}"`)
      else if (!tips?.length) errors.push(`${m.id}: tips.${kind} rỗng`)
      else if (tips.some((t) => !t.trim())) errors.push(`${m.id}: tips.${kind} có ý rỗng`)
      else if (new Set(tips).size !== tips.length) errors.push(`${m.id}: tips.${kind} trùng ý`)
    }
  }
  for (const id of boneIds) if (!used.has(id)) errors.push(`xương ${id} không được cơ nào nhắc`)
  return errors
}

/** Every claim the muscle makes beyond `function`, as the `field`/`item` its quote must carry. */
function claims(m: Muscle): { field: string; item?: number }[] {
  const items = (field: string, list: unknown[] | undefined) => (list ?? []).map((_, item) => ({ field, item }))
  return [
    ...items('origin', m.origin),
    ...items('insertion', m.insertion),
    ...(m.nerve ? [{ field: 'nerve' }] : []),
    ...TIP_KINDS.flatMap((kind) => items(`tips.${kind}`, m.tips?.[kind])),
  ]
}

/**
 * Quotes whose `field`/`item` point at no claim, so a typo or a deleted/reordered item cannot leave evidence misattributed.
 * `lists`: array fields and their length; `scalars`: fields without `item`, and whether the claim exists.
 */
function misaddressed(owner: string, quotes: Quote[], lists: Record<string, number>, scalars: Map<string | undefined, boolean>): string[] {
  return quotes.flatMap(({ field, item }) => {
    if (scalars.has(field)) {
      if (item !== undefined) return [`${owner}: câu trích ${field ?? 'function'} không được có item`]
      return scalars.get(field) ? [] : [`${owner}: câu trích ${field} trỏ tới ý không có`]
    }
    if (field === undefined || !Object.hasOwn(lists, field)) return [`${owner}: câu trích có field không hợp lệ "${field}"`]
    if (item === undefined) return [`${owner}: câu trích ${field} thiếu item`]
    return Number.isInteger(item) && item >= 0 && item < lists[field] ? [] : [`${owner}: câu trích ${field}[${item}] trỏ tới ý không có`]
  })
}

export function validateEvidence(muscles: Muscle[], evidence: Record<string, Quote[]>): string[] {
  const errors: string[] = []
  for (const m of muscles) {
    const all = evidence[m.id] ?? []
    const quotes = all.filter((q) => q.quote.trim())
    for (const { field, item } of claims(m)) {
      if (!quotes.some((q) => q.field === field && q.item === item)) {
        errors.push(`${m.id}: ${field}${item === undefined ? '' : `[${item}]`} chưa có câu trích trong evidence.json`)
      }
    }
    const lists = {
      origin: m.origin?.length ?? 0,
      insertion: m.insertion?.length ?? 0,
      ...Object.fromEntries(TIP_KINDS.map((kind) => [`tips.${kind}`, m.tips?.[kind]?.length ?? 0])),
    }
    errors.push(...misaddressed(m.id, all, lists, new Map([[undefined, true], ['nerve', !!m.nerve]])))
    const urls = new Set((m.sources ?? []).map((s) => s.url))
    for (const url of new Set(quotes.map((q) => q.url))) {
      if (!urls.has(url)) errors.push(`${m.id}: câu trích dùng nguồn không có trong sources "${url}"`)
    }
  }
  const ids = new Set(muscles.map((m) => m.id))
  for (const id of Object.keys(evidence)) if (!ids.has(id)) errors.push(`evidence.json: không có cơ "${id}"`)
  return errors
}

export function validateBreathing(g: BreathingGuide, quotes: Quote[]): string[] {
  const has = (field: string, item?: number) => quotes.some((q) => q.field === field && q.item === item && q.quote.trim())
  return [
    ...(g.points.length ? [] : ['breathing: points rỗng']),
    ...g.points.flatMap((p, i) => {
      if (!p.trim()) return [`breathing: points[${i}] ý rỗng`]
      return has('points', i) ? [] : [`breathing: points[${i}] chưa có câu trích`]
    }),
    ...(new Set(g.points).size === g.points.length ? [] : ['breathing: points trùng ý']),
    ...(has('phases') ? [] : ['breathing: quy tắc pha (phases) chưa có câu trích']),
    ...misaddressed('breathing', quotes, { points: g.points.length }, new Map([['phases', true]])),
    ...validateSources('breathing', g.sources),
    ...[...new Set(quotes.map((q) => q.url))]
      .filter((url) => !g.sources.some((s) => s.url === url))
      .map((url) => `breathing: câu trích dùng nguồn không có trong sources "${url}"`),
    ...(STATUSES.includes(g.status) ? [] : [`breathing: status không hợp lệ "${g.status}"`]),
  ]
}
