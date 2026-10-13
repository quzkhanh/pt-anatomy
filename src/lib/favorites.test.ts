import { describe, expect, it } from 'vitest'
import { exercises } from './content'
import { favorites } from './favorites.svelte'

describe('favorites', () => {
  it('toggle lưu rồi bỏ lưu; bài mới lưu đứng đầu; bỏ qua id không còn tồn tại', () => {
    const [a, b] = exercises
    favorites.toggle('id-da-bi-xoa')
    favorites.toggle(a.id)
    favorites.toggle(b.id)
    expect(favorites.has(a.id)).toBe(true)
    expect(favorites.list().map((e) => e.id)).toEqual([b.id, a.id])
    favorites.toggle(a.id)
    expect(favorites.has(a.id)).toBe(false)
    expect(favorites.list().map((e) => e.id)).toEqual([b.id])
  })
})
