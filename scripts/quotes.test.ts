import { describe, expect, it } from 'vitest'
import { collectQuotes, findQuote, normalizePlainText, normalizeText } from './quotes.ts'

describe('normalizeText', () => {
  it('bỏ thẻ, script/style, giải entity, thống nhất nháy/gạch, gộp khoảng trắng, chữ thường', () => {
    const html = '<style>p{}</style><p>The  <em>clavicular</em>&nbsp;head&#8217;s role &amp; it’s “key” – yes</p><script>x()</script>'
    expect(normalizeText(html)).toBe("the clavicular head's role & it's \"key\"-yes")
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
  it('bỏ khoảng trắng quanh dấu gạch chéo', () => {
    expect(normalizeText('semitendinosus/ <a>gracilis</a> tendon')).toBe('semitendinosus/gracilis tendon')
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
  it('bỏ khoảng trắng quanh dấu gạch như dấu gạch chéo', () => {
    expect(normalizeText('upper back — the trapezius')).toBe(normalizeText('upper back—the trapezius'))
    expect(normalizeText('a -b - c')).toBe('a-b-c')
  })
  it('chỉ bỏ đúng thẻ script/style/noscript/template, không nuốt thẻ trùng tiền tố', () => {
    expect(normalizeText('<scripts>a</scripts> b <templatefoo>c</templatefoo> d </template>')).toBe('a b c d')
  })
  it('bỏ khoảng trắng trước dấu nháy đóng/sở hữu tách thẻ, giữ nháy mở', () => {
    expect(normalizeText("the <a>rhomboid muscles</a>' work")).toBe("the rhomboid muscles' work")
    expect(normalizeText("he said 'hello'")).toBe("he said 'hello'")
  })
  it('keepHidden giữ chữ trong script/style/template (dữ liệu JS của trang)', () => {
    expect(normalizeText('a<script>x = "Hidden Text"</script>b', true)).toBe('a x = "hidden text" b')
  })
})

describe('normalizePlainText', () => {
  it('văn bản thuần (từ PDF) giữ nguyên dấu < > & thay vì coi là thẻ', () => {
    expect(normalizePlainText('p < 0.05 and a > b\n&amp; <b>')).toBe('p < 0.05 and a > b &amp; <b>')
  })
})

describe('findQuote', () => {
  it('tìm thấy câu trích nằm trọn từ', () => {
    expect(findQuote(normalizeText('<p>A stable joint, they said.</p>'), normalizeText('stable joint'))).toBe(true)
  })
  it('không nhận câu trích bắt đầu hoặc kết thúc giữa một từ', () => {
    expect(findQuote(normalizeText('an unstable joint'), normalizeText('stable joint'))).toBe(false)
    expect(findQuote(normalizeText('hyperextension of the knee'), normalizeText('extension'))).toBe(false)
    expect(findQuote(normalizeText('the jointed part'), normalizeText('the joint'))).toBe(false)
  })
  it('vẫn tìm được ở lần xuất hiện sau nếu lần đầu nằm giữa từ', () => {
    expect(findQuote(normalizeText('unstable joint, then a stable joint'), normalizeText('stable joint'))).toBe(true)
  })
  it('câu trích mở đầu hoặc kết thúc bằng dấu câu thì không cần ranh giới từ', () => {
    expect(findQuote(normalizeText('muscles, rhomboids,and more'), normalizeText('rhomboids,'))).toBe(true)
  })
  it('chữ có dấu tính là chữ', () => {
    expect(findQuote('cơ đùi', 'ơ đùi')).toBe(false)
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
