import { expect, test, type Page } from '@playwright/test'
import muscles from '../../content/muscles.json' with { type: 'json' }

const SHEET = 'section[aria-label="Thông tin cơ"]'
const vi = (id: string) => muscles.find((m) => m.id === id)!.vi

// Opens at the peek snap; `expand` raises the sheet to half so the tabs and chips can be clicked
// (at peek the content sits behind the tab bar).
async function openMuscle(page: Page, id: string, expand = true) {
  await page.getByRole('searchbox', { name: 'Tìm cơ hoặc bài tập' }).fill(vi(id))
  await page.locator('.results button').first().click()
  await expect(page.locator(SHEET)).toHaveAttribute('aria-hidden', 'false')
  if (expand) await page.locator(SHEET).getByRole('button', { name: 'Mở rộng' }).click()
}

async function ready(page: Page) {
  await page.goto('/?debug')
  await page.waitForFunction(() => window.__ptDebug !== undefined)
}

const tabs = (page: Page) => page.locator(SHEET).getByRole('group', { name: 'Nội dung về cơ' })
const chips = (page: Page) => page.locator(SHEET).getByRole('group', { name: 'Lọc theo dụng cụ' })

test('cơ ngực lớn: tab Bài tập mặc định, lọc Tạ đơn chỉ còn bài tạ đơn, ♥ không mở bài', async ({ page }) => {
  await ready(page)
  await openMuscle(page, 'pectoralis-major')
  await expect(tabs(page).getByRole('button', { name: 'Bài tập' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator(SHEET).getByRole('heading', { name: 'Bài tập chính cho cơ này' })).toBeVisible()
  await chips(page).getByRole('button', { name: 'Tạ đơn' }).click()
  const metas = page.locator(`${SHEET} li .meta`)
  expect(await metas.count()).toBeGreaterThan(0)
  for (const text of await metas.allTextContents()) expect(text).toContain('Tạ đơn')
  await page.locator(`${SHEET} li`).first().getByRole('button', { name: /^Lưu .* vào Yêu thích$/ }).click()
  // Still the muscle's sheet: the ♥ only saves, it does not open the exercise.
  await expect(page.locator(SHEET)).toHaveAttribute('aria-hidden', 'false')
})

test('đổi sang cơ khác thì bộ lọc về Tất cả', async ({ page }) => {
  await ready(page)
  await openMuscle(page, 'pectoralis-major')
  await chips(page).getByRole('button', { name: 'Tạ đơn' }).click()
  await openMuscle(page, 'latissimus-dorsi')
  await expect(chips(page).getByRole('button', { name: 'Tất cả' })).toHaveAttribute('aria-pressed', 'true')
})

test('răng cưa trước: chỉ có nhóm hỗ trợ, một loại dụng cụ thì không có hàng chip', async ({ page }) => {
  await ready(page)
  await openMuscle(page, 'serratus-anterior')
  await expect(tabs(page).getByRole('button', { name: 'Bài tập' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator(SHEET).getByRole('heading', { name: 'Cơ này hỗ trợ trong' })).toBeVisible()
  await expect(page.locator(SHEET).getByRole('heading', { name: 'Bài tập chính cho cơ này' })).toHaveCount(0)
  await expect(chips(page)).toHaveCount(0)
})

test('gân gót không có bài: mở thẳng tab Thông tin, tab Bài tập báo chưa có', async ({ page }) => {
  await ready(page)
  await openMuscle(page, 'calcaneal-tendon')
  await expect(tabs(page).getByRole('button', { name: 'Thông tin' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator(SHEET).getByText(/^Nguồn/)).toBeVisible()
  await tabs(page).getByRole('button', { name: 'Bài tập' }).click()
  await expect(page.locator(SHEET).getByText('Chưa có bài tập có nguồn cho cơ này.')).toBeVisible()
})
