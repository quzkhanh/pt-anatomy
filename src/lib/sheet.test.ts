import { describe, expect, it } from 'vitest'
import { createSheetDrag, settle } from './sheet'

const offsets = { full: 0, half: 300, peek: 600 }

describe('settle', () => {
  it('thả chậm: về nấc gần nhất', () => {
    expect(settle(offsets, 380, 0)).toBe('half')
    expect(settle(offsets, 90, 0.1)).toBe('full')
    expect(settle(offsets, 520, -0.1)).toBe('peek')
  })

  it('vuốt nhanh: tới nấc kế tiếp theo hướng vuốt tính từ vị trí hiện tại', () => {
    expect(settle(offsets, 560, -1)).toBe('half')
    expect(settle(offsets, 40, 1)).toBe('half')
    expect(settle(offsets, 0, -1)).toBe('full')
    expect(settle(offsets, 600, 1)).toBe('peek')
  })

  it('vuốt nhanh và dài không bật ngược chiều tay', () => {
    expect(settle(offsets, 30, -1)).toBe('full')
    expect(settle(offsets, 590, 1)).toBe('peek')
  })
})

describe('createSheetDrag', () => {
  const setup = () => {
    let offset: number | null = null
    let snap: 'peek' | 'half' | 'full' = 'peek'
    const drag = createSheetDrag(() => ({ snap, offsets }), (o) => (offset = o), (s) => (snap = s))
    return { drag, get: () => ({ offset, snap }) }
  }
  const p = (pointerId: number, clientY: number, timeStamp: number) => ({ pointerId, clientY, timeStamp })

  it('chạm không kéo (dưới ngưỡng) thì không đổi nấc, để nút bên trong nhận click', () => {
    const { drag, get } = setup()
    drag.begin(p(1, 700, 0))
    expect(drag.move(p(1, 704, 10))).toBe(false)
    drag.end(p(1, 704, 20))
    expect(get()).toEqual({ offset: null, snap: 'peek' })
  })

  it('kéo lên chậm rồi thả: về nấc gần nhất', () => {
    const { drag, get } = setup()
    drag.begin(p(1, 700, 0))
    expect(drag.move(p(1, 690, 100))).toBe(true)
    for (let y = 680, t = 200; y >= 410; y -= 10, t += 100) drag.move(p(1, y, t))
    drag.end(p(1, 410, 3000))
    expect(get()).toEqual({ offset: null, snap: 'half' })
  })

  it('ngón thứ hai không chiếm cử chỉ; thả xong không kẹt giữa chừng', () => {
    const { drag, get } = setup()
    drag.begin(p(1, 700, 0))
    drag.move(p(1, 600, 50))
    drag.begin(p(2, 400, 60))
    drag.move(p(2, 300, 70))
    drag.end(p(2, 300, 80))
    expect(get().offset).toBe(500)
    drag.end(p(1, 600, 900))
    expect(get().offset).toBeNull()
  })

  it('mất pointer capture thì huỷ kéo', () => {
    const { drag, get } = setup()
    drag.begin(p(1, 700, 0))
    drag.move(p(1, 500, 50))
    drag.cancel()
    expect(get()).toEqual({ offset: null, snap: 'peek' })
  })
})
