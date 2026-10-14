import { expect, test, type Page } from '@playwright/test'

const SHEET = 'section[aria-label="Thông tin bài tập"]'

async function openBench(page: Page) {
  await page.goto('/?debug')
  await page.waitForFunction(() => window.__ptDebug !== undefined)
  await page.getByRole('searchbox', { name: 'Tìm cơ hoặc bài tập' }).fill('bench press')
  await page.locator('.results button').first().click()
  await page.waitForFunction(() => window.__ptMotion !== undefined)
}

const box = async (page: Page, selector: string) => (await page.locator(selector).first().boundingBox())!

for (const viewport of [null, { width: 360, height: 640 }]) {
  test.describe(`điện thoại ${viewport ? `${viewport.width}×${viewport.height}` : 'Pixel 7'}`, () => {
    if (viewport) test.use({ viewport })

    test('sheet nửa màn: hàng nút động tác một dòng, nằm trên thanh tab, vuốt dọc trên khung thì cuộn sheet', async ({ page }) => {
      await openBench(page)
      await page.locator(SHEET).getByRole('button', { name: '▶ Xem động tác' }).click()
      await page.waitForFunction(() => window.__ptMotion?.running() === true)
      await page.waitForTimeout(400)
      const controls = await box(page, `${SHEET} .controls`)
      const tabBar = await box(page, 'nav[aria-label="Chuyển màn"]')
      expect(controls.y + controls.height).toBeLessThanOrEqual(tabBar.y)
      // One row: a tap-height button plus the row's padding.
      expect(controls.height).toBeLessThanOrEqual(64)
      const touchAction = await page.locator(`${SHEET} figure canvas`).evaluate((c) => getComputedStyle(c).touchAction)
      expect(touchAction).toBe('pan-y')
    })
  })
}

test.describe('máy tính 1440×900', () => {
  test.use({ viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false, deviceScaleFactor: 1 })

  test('sheet thành panel bên phải, khung động tác nằm trọn trong màn và tự chạy', async ({ page }) => {
    await openBench(page)
    await page.waitForTimeout(400)
    const sheet = await box(page, SHEET)
    expect(sheet.width).toBeLessThanOrEqual(420)
    expect(sheet.x + sheet.width).toBeCloseTo(1440, 0)
    expect(sheet.y).toBeLessThanOrEqual(1)
    const canvas = await box(page, `${SHEET} figure canvas`)
    const tabBar = await box(page, 'nav[aria-label="Chuyển màn"]')
    expect(canvas.y + canvas.height).toBeLessThanOrEqual(tabBar.y)
    await page.waitForFunction(() => window.__ptMotion?.running() === true)
  })

  test('ô tìm kiếm và nút xoay không giãn hết màn, không bị panel che', async ({ page }) => {
    await openBench(page)
    await page.waitForTimeout(400)
    const search = await box(page, '.search')
    expect(search.width).toBeLessThanOrEqual(420)
    const sheet = await box(page, SHEET)
    const actions = await box(page, '.actions')
    expect(actions.x + actions.width).toBeLessThanOrEqual(sheet.x)
  })

  test('màn Bài tập: nội dung không rộng quá 720px', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('navigation', { name: 'Chuyển màn' }).getByRole('button', { name: 'Bài tập' }).click()
    const list = await box(page, 'section[aria-label="Bài tập"] ul')
    expect(list.width).toBeLessThanOrEqual(720)
  })
})
