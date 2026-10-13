import { test } from '@playwright/test'

test('chụp ảnh mặt trước để người xem', async ({ page }) => {
  await page.goto('/?debug')
  await page.waitForFunction(() => window.__ptDebug !== undefined)
  await page.waitForTimeout(500)
  await page.screenshot({ path: 'test-results/shots/front.png' })
})

test('chụp ảnh mặt sau để người xem', async ({ page }) => {
  await page.goto('/?debug')
  await page.waitForFunction(() => window.__ptDebug !== undefined)
  await page.evaluate(() => window.__ptDebug!.flip())
  await page.waitForTimeout(800)
  await page.screenshot({ path: 'test-results/shots/back.png' })
})
