import { expect, test, type Page } from '@playwright/test'
import exercises from '../../content/exercises.json' with { type: 'json' }
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

test('gân gót không có bài: mở thẳng tab Giải phẫu, tab Bài tập báo chưa có', async ({ page }) => {
  await ready(page)
  await openMuscle(page, 'calcaneal-tendon')
  await expect(tabs(page).getByRole('button', { name: 'Giải phẫu' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator(SHEET).getByText(/^Nguồn/)).toBeVisible()
  await expect(tabs(page).getByRole('button', { name: 'Mẹo PT' })).toHaveCount(0)
  await expect(page.locator(SHEET).getByRole('heading', { name: 'Nguyên ủy' })).toHaveCount(0)
  await tabs(page).getByRole('button', { name: 'Bài tập' }).click()
  await expect(page.locator(SHEET).getByText('Chưa có bài tập có nguồn cho cơ này.')).toBeVisible()
})

const EX_SHEET = 'section[aria-label="Thông tin bài tập"]'
const countFor = (id: string) =>
  exercises.filter((e) => [...e.primary, ...e.secondary].some((ref) => ref.split('.')[0] === id)).length

test('Xem n bài tập → lọc → mở bài → ‹ quay lại đúng tab và bộ lọc', async ({ page }) => {
  await ready(page)
  await openMuscle(page, 'pectoralis-major')
  await tabs(page).getByRole('button', { name: 'Giải phẫu' }).click()
  // Back to peek, where the header offers the exercises: it must switch away from the details tab.
  await page.locator(SHEET).getByRole('button', { name: 'Thu gọn' }).click()
  await page.locator(SHEET).getByRole('button', { name: `Xem ${countFor('pectoralis-major')} bài tập` }).click()
  await expect(tabs(page).getByRole('button', { name: 'Bài tập' })).toHaveAttribute('aria-pressed', 'true')
  await chips(page).getByRole('button', { name: 'Tạ đơn' }).click()
  await page.locator(`${SHEET} li button.open`).first().click()
  const back = page.locator(EX_SHEET).getByRole('button', { name: `‹ ${vi('pectoralis-major')}` })
  await back.click()
  await expect(page.locator(SHEET)).toHaveAttribute('aria-hidden', 'false')
  await expect(tabs(page).getByRole('button', { name: 'Bài tập' })).toHaveAttribute('aria-pressed', 'true')
  await expect(chips(page).getByRole('button', { name: 'Tạ đơn' })).toHaveAttribute('aria-pressed', 'true')
})

test('mở bài từ tab Bài tập thì không có nút quay lại cơ', async ({ page }) => {
  await ready(page)
  await page.getByRole('navigation', { name: 'Chuyển màn' }).getByRole('button', { name: 'Bài tập' }).click()
  await page.locator('section[aria-label="Bài tập"] li button.open').first().click()
  await expect(page.locator(EX_SHEET)).toHaveAttribute('aria-hidden', 'false')
  await expect(page.locator(EX_SHEET).getByRole('button', { name: /^‹/ })).toHaveCount(0)
})

test('model tải xong sau khi đã chọn cơ thì không xóa tab và bộ lọc đang chọn', async ({ page }) => {
  let release!: () => void
  const held = new Promise<void>((resolve) => (release = resolve))
  await page.route('**/models/body.glb', async (route) => {
    await held
    await route.continue()
  })
  await page.goto('/?debug')
  await openMuscle(page, 'pectoralis-major')
  await chips(page).getByRole('button', { name: 'Tạ đơn' }).click()
  release()
  await page.waitForFunction(() => window.__ptDebug !== undefined)
  await page.waitForTimeout(300)
  await expect(chips(page).getByRole('button', { name: 'Tạ đơn' })).toHaveAttribute('aria-pressed', 'true')
})
