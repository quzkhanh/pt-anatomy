import { EQUIPMENT, REGIONS, STATUSES, type Exercise, type Muscle, type Source } from '../src/lib/content-types.ts'
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
