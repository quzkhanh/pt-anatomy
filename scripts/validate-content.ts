import { REGIONS, STATUSES, type Muscle } from '../src/lib/content-types.ts'

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
