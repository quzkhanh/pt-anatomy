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

test('nút Trước / Sau lật model', async ({ page }) => {
  await ready(page)
  await page.getByRole('button', { name: 'Trước / Sau' }).click()
  await page.waitForTimeout(800)
  await tapMuscle(page, 'gluteus-maximus')
  await expect(page.locator(SHEET).getByText('Cơ mông lớn')).toBeVisible()
})

test('gợi ý lần đầu biến mất sau lần chạm đầu tiên và không hiện lại', async ({ page }) => {
  await ready(page)
  const hint = page.getByText('Chạm vào cơ để xem tên và bài tập')
  await expect(hint).toBeVisible()
  await tapMuscle(page, 'pectoralis-major')
  await expect(hint).toBeHidden()
  await ready(page)
  await expect(hint).toBeHidden()
})
