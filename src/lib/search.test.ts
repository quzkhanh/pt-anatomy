import { describe, expect, it } from 'vitest'
import { searchMuscles } from './content'
import { createSearch, normalize, SEARCH_LIMIT } from './search'

describe('normalize', () => {
  it('bỏ dấu, đ thành d, chữ thường, gộp khoảng trắng', () => {
    expect(normalize('  Cơ NGỰC   lớn ')).toBe('co nguc lon')
    expect(normalize('Đùi')).toBe('dui')
  })
})

describe('createSearch', () => {
  const items = ['cơ chéo bụng ngoài', 'bụng chân', 'cơ thẳng bụng', 'gân bụng']
  const search = createSearch(items, (s) => [s])

  it('khớp đầu chuỗi trước, rồi đầu từ, giữ thứ tự gốc trong cùng hạng', () => {
    expect(search('bung')).toEqual(['bụng chân', 'cơ chéo bụng ngoài', 'cơ thẳng bụng', 'gân bụng'])
  })

  it('khớp giữa từ xếp sau cùng', () => {
    expect(createSearch(['abc', 'xbc', 'bcx'], (s) => [s])('bc')).toEqual(['bcx', 'abc', 'xbc'])
  })

  it('query rỗng hoặc toàn khoảng trắng trả mảng rỗng', () => {
    expect(search('   ')).toEqual([])
  })

  it('giới hạn số kết quả', () => {
    const many = Array.from({ length: SEARCH_LIMIT + 5 }, (_, i) => `cơ ${i}`)
    expect(createSearch(many, (s) => [s])('co')).toHaveLength(SEARCH_LIMIT)
  })
})

describe('searchMuscles', () => {
  it('gõ có dấu, viết hoa, thừa khoảng trắng vẫn ra cơ ngực', () => {
    expect(searchMuscles('  NGỰC ').map((m) => m.id).slice(0, 2).sort()).toEqual(['pectoralis-major', 'pectoralis-minor'])
  })

  it('tìm được theo tên tiếng Anh và theo tên phần cơ', () => {
    expect(searchMuscles('latissimus')[0].id).toBe('latissimus-dorsi')
    expect(searchMuscles('bo truoc')[0].id).toBe('deltoid')
  })
})
