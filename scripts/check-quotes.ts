import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { collectQuotes, findQuote, normalizePlainText, normalizeText } from './quotes.ts'

const PARALLEL = 6
const FETCH_TIMEOUT_MS = 30_000
const USER_AGENT = 'pt-anatomy-quote-check/1.0 (+https://github.com/quzkhanh/pt-anatomy)'
const BROWSER_USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'
const BLOCKED = [403, 429]
const PDFTOTEXT = '/usr/bin/pdftotext'

/** `text`: what a reader sees; `raw`: the same page with script/template text kept. */
interface Page {
  text: string
  raw?: string
}

const get = (url: string, userAgent: string) =>
  fetch(url, { headers: { 'user-agent': userAgent }, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })

async function load(url: string): Promise<Page | Error> {
  let res = await get(url, USER_AGENT)
  if (BLOCKED.includes(res.status)) res = await get(url, BROWSER_USER_AGENT)
  if (!res.ok) return new Error(`HTTP ${res.status}`)
  const body = Buffer.from(await res.arrayBuffer())
  if (res.headers.get('content-type')?.includes('pdf') || body.subarray(0, 4).toString() === '%PDF') {
    const pdf = spawnSync(PDFTOTEXT, ['-', '-'], { input: body, maxBuffer: 64 * 1024 * 1024 })
    if (pdf.error || pdf.status !== 0) return new Error('không đọc được PDF')
    return { text: normalizePlainText(pdf.stdout.toString()) }
  }
  const html = body.toString()
  return { text: normalizeText(html), raw: normalizeText(html, true) }
}

const prefixes = process.argv.slice(2)
const quotes = collectQuotes(JSON.parse(readFileSync('content/evidence.json', 'utf8'))).filter(
  (q) => !prefixes.length || prefixes.some((p) => q.owner.startsWith(p)),
)
const urls = [...new Set(quotes.map((q) => q.url))]
const pages = new Map<string, Page | Error>()
for (let i = 0; i < urls.length; i += PARALLEL) {
  await Promise.all(
    urls.slice(i, i + PARALLEL).map(async (url) => {
      try {
        pages.set(url, await load(url))
      } catch (error) {
        pages.set(url, error as Error)
      }
    }),
  )
}
const warnings: string[] = []
const failures = quotes.flatMap((q) => {
  const quote = normalizeText(q.quote)
  if (!quote) return [`${q.owner}: câu trích rỗng (${q.url})`]
  const page = pages.get(q.url)!
  if (page instanceof Error) return [`${q.owner}: không tải được ${q.url} (${page.message})`]
  if (findQuote(page.text, quote)) return []
  if (page.raw && findQuote(page.raw, quote)) {
    warnings.push(`${q.owner}: chỉ thấy trong dữ liệu JS ở ${q.url}`)
    return []
  }
  return [`${q.owner}: không thấy câu trích ở ${q.url}: "${q.quote}"`]
})
if (warnings.length) console.warn(warnings.map((w) => `⚠ ${w}`).join('\n'))
if (failures.length) {
  console.error(failures.map((f) => `✗ ${f}`).join('\n'))
  process.exit(1)
}
console.log(`✓ ${quotes.length} câu trích, ${urls.length} trang`)
