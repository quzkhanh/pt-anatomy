import { readFileSync } from 'node:fs'
import { collectQuotes, normalizeText } from './quotes.ts'

const PARALLEL = 6
const HEADERS = { 'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36' }

const prefixes = process.argv.slice(2)
const quotes = collectQuotes(JSON.parse(readFileSync('content/evidence.json', 'utf8'))).filter(
  (q) => !prefixes.length || prefixes.some((p) => q.owner.startsWith(p)),
)
const urls = [...new Set(quotes.map((q) => q.url))]
const pages = new Map<string, string | Error>()
for (let i = 0; i < urls.length; i += PARALLEL) {
  await Promise.all(
    urls.slice(i, i + PARALLEL).map(async (url) => {
      try {
        const res = await fetch(url, { headers: HEADERS })
        pages.set(url, res.ok ? normalizeText(await res.text()) : new Error(`HTTP ${res.status}`))
      } catch (error) {
        pages.set(url, error as Error)
      }
    }),
  )
}
const failures = quotes.flatMap((q) => {
  const page = pages.get(q.url)!
  if (page instanceof Error) return [`${q.owner}: không tải được ${q.url} (${page.message})`]
  return page.includes(normalizeText(q.quote)) ? [] : [`${q.owner}: không thấy câu trích ở ${q.url}: "${q.quote}"`]
})
if (failures.length) {
  console.error(failures.map((f) => `✗ ${f}`).join('\n'))
  process.exit(1)
}
console.log(`✓ ${quotes.length} câu trích, ${urls.length} trang`)
