export function splitRef(ref: string): { muscle: string; part?: string } {
  const [muscle, part] = ref.split('.')
  return { muscle, part }
}

/** A ref covers a part when it names the whole muscle or exactly that part. */
export function refCovers(ref: string, muscleId: string, partId: string): boolean {
  const r = splitRef(ref)
  return r.muscle === muscleId && (r.part === undefined || r.part === partId)
}

export function refsOverlap(a: string, b: string): boolean {
  const x = splitRef(a)
  const y = splitRef(b)
  return x.muscle === y.muscle && (!x.part || !y.part || x.part === y.part)
}
