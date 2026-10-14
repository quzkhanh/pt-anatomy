import { describe, expect, it } from 'vitest'
import { collectQuotes, normalizeText } from './quotes.ts'

describe('normalizeText', () => {
  it('bỏ thẻ, script/style, giải entity, thống nhất nháy/gạch, gộp khoảng trắng, chữ thường', () => {
    const html = '<style>p{}</style><p>The  <em>clavicular</em>&nbsp;head&#8217;s role &amp; it’s “key” – yes</p><script>x()</script>'
    expect(normalizeText(html)).toBe("the clavicular head's role & it's \"key\" - yes")
  })
  it('bỏ khoảng trắng quanh dấu câu và ngoặc', () => {
    expect(normalizeText('the <a>subscapularis</a>, and ( <b>x</b> )')).toBe('the subscapularis, and (x)')
  })
  it('giải entity số thập lục phân', () => {
    expect(normalizeText('a&#x2014;b')).toBe('a-b')
  })
})

describe('collectQuotes', () => {
  it('lấy mọi {url, quote} lồng nhau, owner là đường dẫn khóa', () => {
    const evidence = { muscles: { deltoid: [{ url: 'u1', quote: 'q1', field: 'nerve' }] }, breathing: [{ url: 'u2', quote: 'q2' }] }
    expect(collectQuotes(evidence)).toEqual([
      { owner: 'muscles.deltoid', url: 'u1', quote: 'q1' },
      { owner: 'breathing', url: 'u2', quote: 'q2' },
    ])
  })
})
