export const normalize = (s: string) =>
  s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/đ/g, 'd').replace(/\s+/g, ' ').trim()

export function createSearch<T>(items: T[], keysOf: (item: T) => string[]) {
  const index = items.map((item) => ({ item, keys: keysOf(item).map(normalize) }))
  return (query: string): T[] => {
    const q = normalize(query)
    return q ? index.filter(({ keys }) => keys.some((k) => k.includes(q))).map(({ item }) => item) : []
  }
}
