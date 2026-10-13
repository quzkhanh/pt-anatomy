export const SEARCH_LIMIT = 8

const RANK = { prefix: 0, wordPrefix: 1, contains: 2 } as const

export const normalize = (s: string) =>
  s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/đ/g, 'd').replace(/\s+/g, ' ').trim()

function rank(key: string, query: string): number | null {
  if (key.startsWith(query)) return RANK.prefix
  if (key.includes(` ${query}`)) return RANK.wordPrefix
  if (key.includes(query)) return RANK.contains
  return null
}

export function createSearch<T>(items: T[], keysOf: (item: T) => string[], limit = SEARCH_LIMIT) {
  const index = items.map((item) => ({ item, keys: keysOf(item).map(normalize) }))
  return (query: string): T[] => {
    const q = normalize(query)
    if (!q) return []
    const hits: { item: T; rank: number }[] = []
    for (const { item, keys } of index) {
      const ranks = keys.map((k) => rank(k, q)).filter((r) => r !== null)
      if (ranks.length) hits.push({ item, rank: Math.min(...ranks) })
    }
    return hits.sort((a, b) => a.rank - b.rank).slice(0, limit).map((h) => h.item)
  }
}
