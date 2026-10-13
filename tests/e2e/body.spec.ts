import { expect, test, type Page } from '@playwright/test'

async function ready(page: Page, url = '/?debug') {
  await page.goto(url)
  await page.waitForFunction(() => window.__ptDebug !== undefined)
}

async function tapMuscle(page: Page, muscleId: string) {
  const point = await page.evaluate((id) => window.__ptDebug!.screenPoint(id), muscleId)
  expect(point, `không chiếu được ${muscleId} lên màn hình`).not.toBeNull()
  await page.touchscreen.tap(point!.x, point!.y)
}

test('chạm vào cơ ngực hiện tên cơ', async ({ page }) => {
  await ready(page)
  await tapMuscle(page, 'pectoralis-major')
  await expect(page.getByText('Cơ ngực lớn')).toBeVisible()
})
