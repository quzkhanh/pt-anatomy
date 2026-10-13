import { expect, test } from '@playwright/test'

const CPU_SLOWDOWN = 4
const NETWORK_4G = { offline: false, latency: 70, downloadThroughput: 1_125_000, uploadThroughput: 375_000 }
const BUDGET = { readyMs: 3000, pickMs: 100 }

test('mở lần đầu qua 4G và chạm cơ trên máy chậm 4 lần vẫn trong ngân sách', async ({ page }) => {
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Network.enable')
  await cdp.send('Network.emulateNetworkConditions', NETWORK_4G)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU_SLOWDOWN })

  await page.goto('/?debug')
  await page.waitForFunction(() => window.__ptDebug !== undefined, undefined, { timeout: 30_000 })
  const { readyMs } = await page.evaluate(() => window.__ptDebug!.stats())

  await page.waitForTimeout(1500)
  const point = await page.evaluate(() => window.__ptDebug!.screenPoint('pectoralis-major'))
  await page.touchscreen.tap(point!.x, point!.y)
  await page.waitForTimeout(300)
  const { pickMs } = await page.evaluate(() => window.__ptDebug!.stats())

  console.log(`readyMs=${Math.round(readyMs)} pickMs=${pickMs.toFixed(1)}`)
  expect(readyMs).toBeLessThan(BUDGET.readyMs)
  expect(pickMs).toBeLessThan(BUDGET.pickMs)
})
