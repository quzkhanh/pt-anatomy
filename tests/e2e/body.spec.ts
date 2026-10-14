import { expect, test, type Page } from '@playwright/test'

const SHEET = 'section[aria-label="Thông tin cơ"]'

async function ready(page: Page, url = '/?debug') {
  await page.goto(url)
  await page.waitForFunction(() => window.__ptDebug !== undefined)
}

async function tapMuscle(page: Page, muscleId: string) {
  const point = await page.evaluate((id) => window.__ptDebug!.screenPoint(id), muscleId)
  expect(point, `không chiếu được ${muscleId} lên màn hình`).not.toBeNull()
  await page.touchscreen.tap(point!.x, point!.y)
}

test('chạm vào cơ ngực mở sheet thông tin cơ', async ({ page }) => {
  await ready(page)
  await tapMuscle(page, 'pectoralis-major')
  const sheet = page.locator(SHEET)
  await expect(sheet).toHaveAttribute('aria-hidden', 'false')
  await expect(sheet.getByText('Cơ ngực lớn')).toBeVisible()
  await expect(sheet.getByText(/đang chạm: bó (đòn|ức sườn)/)).toBeVisible()
})

test('chạm vùng trống thì đóng sheet', async ({ page }) => {
  await ready(page)
  await tapMuscle(page, 'pectoralis-major')
  await page.touchscreen.tap(8, 300)
  await expect(page.locator(SHEET)).toHaveAttribute('aria-hidden', 'true')
})

test('nút ✕ đóng sheet và bỏ chọn', async ({ page }) => {
  await ready(page)
  await tapMuscle(page, 'pectoralis-major')
  await page.locator(SHEET).getByRole('button', { name: 'Đóng' }).click()
  await expect(page.locator(SHEET)).toHaveAttribute('aria-hidden', 'true')
})

test('nút Xoay 90° đổi góc nhìn', async ({ page }) => {
  await ready(page)
  const before = await page.evaluate(() => window.__ptDebug!.screenPoint('pectoralis-major'))
  await page.getByRole('button', { name: 'Xoay 90°' }).click()
  await page.waitForTimeout(800)
  const after = await page.evaluate(() => window.__ptDebug!.screenPoint('pectoralis-major'))
  expect(Math.abs(after!.x - before!.x)).toBeGreaterThan(20)
})

test('nút Trước / Sau lật model', async ({ page }) => {
  await ready(page)
  await page.getByRole('button', { name: 'Trước / Sau' }).click()
  await page.waitForTimeout(800)
  await tapMuscle(page, 'gluteus-maximus')
  await expect(page.locator(SHEET).getByText('Cơ mông lớn')).toBeVisible()
})

test('gợi ý lần đầu biến mất sau lần chạm đầu tiên và không hiện lại', async ({ page }) => {
  await ready(page)
  const hint = page.getByText('Chạm vào cơ để xem · Kéo để xoay · Chụm 2 ngón để phóng to')
  await expect(hint).toBeVisible()
  await tapMuscle(page, 'pectoralis-major')
  await expect(hint).toBeHidden()
  await ready(page)
  await expect(hint).toBeHidden()
})

test('tìm cơ sâu thì tự ẩn lớp nông và mở thông tin', async ({ page }) => {
  await ready(page)
  await page.getByRole('searchbox', { name: 'Tìm cơ hoặc bài tập' }).fill('nguc be')
  await page.getByRole('button', { name: /Cơ ngực bé/ }).click()
  await expect(page.locator(SHEET).getByText('Cơ ngực bé')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Hiện lớp nông' })).toBeVisible()
})

test('tìm không ra thì báo không tìm thấy', async ({ page }) => {
  await ready(page)
  await page.getByRole('searchbox', { name: 'Tìm cơ hoặc bài tập' }).fill('xyzw')
  await expect(page.getByText('Không tìm thấy cơ hay bài tập nào khớp “xyzw”')).toBeVisible()
})

test('tải model lỗi thì báo lỗi, bấm Thử lại thì tải được', async ({ page }) => {
  await page.route('**/models/body.glb', (route) => route.abort())
  await page.goto('/?debug')
  await expect(page.getByText('Không tải được mô hình. Kiểm tra kết nối rồi thử lại.')).toBeVisible()
  await page.unroute('**/models/body.glb')
  await page.getByRole('button', { name: 'Thử lại' }).click()
  await page.waitForFunction(() => window.__ptDebug !== undefined)
})

test('máy không có WebGL vẫn tra cứu được bằng danh sách', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      value(this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
        return type.startsWith('webgl') ? null : Reflect.apply(original, this, [type, ...rest])
      },
    })
  })
  await page.goto('/')
  await expect(page.getByText('Máy này không hiển thị được 3D.', { exact: false })).toBeVisible()
  await page.getByRole('button', { name: /Cơ ngực lớn/ }).click()
  await expect(page.locator(SHEET).getByText('Cơ ngực lớn')).toBeVisible()
})

test('?debug hiện fps và thời gian chạm', async ({ page }) => {
  await ready(page)
  await expect(page.getByText(/fps · chạm .* ms · pixelRatio/)).toBeVisible()
})

test('kéo xoay không chọn cơ', async ({ page }) => {
  await ready(page)
  const point = await page.evaluate(() => window.__ptDebug!.screenPoint('pectoralis-major'))
  await page.mouse.move(point!.x, point!.y)
  await page.mouse.down()
  await page.mouse.move(point!.x + 20, point!.y, { steps: 4 })
  await page.mouse.up()
  await expect(page.locator(SHEET)).toHaveAttribute('aria-hidden', 'true')
})

test('xoay ngang vẫn chọn đúng', async ({ page }) => {
  await ready(page)
  await page.setViewportSize({ width: 915, height: 412 })
  await page.waitForTimeout(300)
  await tapMuscle(page, 'pectoralis-major')
  await expect(page.locator(SHEET).getByText('Cơ ngực lớn')).toBeVisible()
})

test('localStorage bị chặn vẫn chạy', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get: () => { throw new DOMException('blocked', 'SecurityError') } })
  })
  await ready(page)
  await tapMuscle(page, 'pectoralis-major')
  await expect(page.locator(SHEET).getByText('Cơ ngực lớn')).toBeVisible()
})

test('ẩn lớp nông rồi chạm chọn cơ sâu', async ({ page }) => {
  await ready(page)
  const point = await page.evaluate(() => window.__ptDebug!.screenPoint('pectoralis-major'))
  await page.getByRole('button', { name: 'Ẩn lớp nông' }).click()
  await tapMuscle(page, 'pectoralis-minor')
  await expect(page.locator(SHEET).getByText('Cơ ngực bé')).toBeVisible()
  await page.touchscreen.tap(point!.x, point!.y)
  await expect(page.locator(SHEET).getByText('Cơ ngực lớn')).toBeHidden()
})

test('mất WebGL context thì báo và Thử lại mở lại được mô hình', async ({ page }) => {
  await ready(page)
  await page.evaluate(() => {
    delete window.__ptDebug
    const gl = (document.querySelector('canvas') as HTMLCanvasElement).getContext('webgl2')
    gl?.getExtension('WEBGL_lose_context')?.loseContext()
  })
  await expect(page.getByText('Máy tạm dừng hiển thị 3D. Bấm Thử lại để mở lại mô hình.')).toBeVisible()
  await page.getByRole('button', { name: 'Thử lại' }).click()
  await page.waitForFunction(() => window.__ptDebug !== undefined)
  await tapMuscle(page, 'pectoralis-major')
  await expect(page.locator(SHEET).getByText('Cơ ngực lớn')).toBeVisible()
})
