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
  it('bỏ comment, noscript', () => {
    expect(normalizeText('a<!-- hidden -->b<noscript>x</noscript>c')).toBe('a b c')
  })
  it('bỏ chú thích [n] của Wikipedia', () => {
    expect(normalizeText('It is a weak flexor<sup>[2]</sup> and adductor [citation needed].')).toBe('it is a weak flexor and adductor.')
  })
  it('bỏ chú thích [n] tách thẻ span', () => {
    expect(normalizeText('a weak<span>[</span>2<span>]</span> flexor')).toBe('a weak flexor')
  })
  it('giữ ngoặc biên tập [T] và năm [2024]', () => {
    expect(normalizeText('[T]he muscle')).toBe('[t]he muscle')
    expect(normalizeText('in [2024] study')).toBe('in [2024] study')
  })
  it('giữ entity số ngoài khoảng Unicode nguyên văn', () => {
    expect(normalizeText('&#99999999;')).toBe('&#99999999;')
  })
  it('&lt;b&gt; thành văn bản <b>', () => {
    expect(normalizeText('&lt;b&gt;')).toBe('<b>')
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
