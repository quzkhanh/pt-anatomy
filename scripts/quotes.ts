const ENTITIES: Record<string, string> = { amp: '&', nbsp: ' ', quot: '"', apos: "'", lt: '<', gt: '>', ndash: '-', mdash: '-', rsquo: "'", lsquo: "'", ldquo: '"', rdquo: '"' }

const decode = (s: string) =>
  s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] !== '#') return ENTITIES[e.toLowerCase()] ?? m
    const code = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)
    return code <= 0x10ffff ? String.fromCodePoint(code) : m
  })

/** Page or quote text reduced to what a reader sees, so a verbatim quote survives markup and typography. */
export const normalizeText = (html: string) =>
  decode(html.replace(/<!--[\s\S]*?-->/g, ' ').replace(/<(script|style|noscript|template)[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' '))
    .replace(/[‘’′]/g, "'")
    .replace(/[“”″]/g, '"')
    .replace(/[‐-―−]/g, '-')
    .replace(/\[\s*(?:\d{1,3}|[a-z]|note \d{1,3}|citation needed)\s*\]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/ ([,.;:!?)\]])/g, '$1')
    .replace(/([(\[]) /g, '$1')
    .replace(/ ?\/ ?/g, '/')
    .trim()
    .toLowerCase()

export interface FoundQuote {
  owner: string
  url: string
  quote: string
}

export function collectQuotes(node: unknown, owner = ''): FoundQuote[] {
  if (Array.isArray(node)) return node.flatMap((n) => collectQuotes(n, owner))
  if (!node || typeof node !== 'object') return []
  const { url, quote } = node as Record<string, unknown>
  if (typeof url === 'string' && typeof quote === 'string') return [{ owner, url, quote }]
  return Object.entries(node).flatMap(([k, v]) => collectQuotes(v, owner ? `${owner}.${k}` : k))
}
