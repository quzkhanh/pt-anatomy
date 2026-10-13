import { expect, test } from '@playwright/test'

test.use({ serviceWorkers: 'allow' })

test('mở lại khi mất mạng vẫn chạy nhờ service worker', async ({ page, context }) => {
  await page.goto('/?debug')
  await page.waitForFunction(() => window.__ptDebug !== undefined)
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
    const cache = await caches.open('pt-anatomy-v1')
    while (!(await cache.match('models/body.glb'))) await new Promise((r) => setTimeout(r, 100))
  })
  await context.setOffline(true)
  await page.reload()
  await page.waitForFunction(() => window.__ptDebug !== undefined)
  await expect(page.getByText('Đang mất mạng', { exact: false })).toBeVisible()
})
