const ENTITIES: Record<string, string> = { amp: '&', nbsp: ' ', quot: '"', apos: "'", lt: '<', gt: '>', ndash: '-', mdash: '-', rsquo: "'", lsquo: "'", ldquo: '"', rdquo: '"' }

const decode = (s: string) =>
  s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] !== '#') return ENTITIES[e.toLowerCase()] ?? m
    const code = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)
    return code <= 0x10ffff ? String.fromCodePoint(code) : m
  })

const stripHidden = (html: string) => html.replace(/<(script|style|noscript|template)\b[\s\S]*?<\/\1>/gi, ' ')

/**
 * Page or quote text reduced to what a reader sees, so a verbatim quote survives markup and typography.
 * `keepHidden` keeps script/style/template text, for pages that ship their article only as a JS payload.
 */
export const normalizeText = (html: string, keepHidden = false) => {
  const visible = html.replace(/<!--[\s\S]*?-->/g, ' ')
  return decode((keepHidden ? visible : stripHidden(visible)).replace(/<[^>]+>/g, ' '))
    .replace(/[‘’′]/g, "'")
    .replace(/[“”″]/g, '"')
    .replace(/[‐-―−]/g, '-')
    .replace(/\[\s*(?:\d{1,3}|[a-z]|note \d{1,3}|citation needed)\s*\]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/ ([,.;:!?)\]]|'(?![\p{L}\p{N}]))/gu, '$1')
    .replace(/([(\[]) /g, '$1')
    .replace(/ ?([/-]) ?/g, '$1')
    .trim()
    .toLowerCase()
}

/** Plain text (e.g. from pdftotext), where `<` and `&` are characters, not markup. */
export const normalizePlainText = (text: string) => normalizeText(text.replace(/&/g, '&amp;').replace(/</g, '&lt;'))

const WORD_CHAR = /[\p{L}\p{N}]/u

/** `quote` occurs in `page` without starting or ending mid-word ("stable joint" is not in "unstable joint"). */
export function findQuote(page: string, quote: string): boolean {
  const open = WORD_CHAR.test(quote[0] ?? '')
  const close = WORD_CHAR.test(quote.at(-1) ?? '')
  for (let i = page.indexOf(quote); i !== -1; i = page.indexOf(quote, i + 1)) {
    if (open && WORD_CHAR.test(page[i - 1] ?? '')) continue
    if (close && WORD_CHAR.test(page[i + quote.length] ?? '')) continue
    return true
  }
  return false
}

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
