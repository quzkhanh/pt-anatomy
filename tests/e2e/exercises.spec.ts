import { expect, test, type Page } from '@playwright/test'
import exercises from '../../content/exercises.json' with { type: 'json' }

const SHEET = 'section[aria-label="Thông tin bài tập"]'
const MUSCLE_SHEET = 'section[aria-label="Thông tin cơ"]'
const bench = exercises.find((e) => e.primary[0] === 'pectoralis-major')!
const deep = exercises.find((e) => e.primary.every((ref) => ['infraspinatus', 'teres-minor', 'supraspinatus', 'subscapularis'].includes(ref.split('.')[0])))!

async function ready(page: Page, url = '/?debug') {
  await page.goto(url)
  await page.waitForFunction(() => window.__ptDebug !== undefined)
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
// Row and search-result buttons start with the exercise name; the ☆ button's label does not.
const named = (vi: string) => new RegExp(`^${escape(vi)}( |$)`)

const tab = (page: Page, name: string) => page.getByRole('navigation', { name: 'Chuyển màn' }).getByRole('button', { name })

test('tab Bài tập: lọc theo vùng, mở bài thì về Cơ thể và hiện cơ chính/phụ', async ({ page }) => {
  await ready(page)
  await tab(page, 'Bài tập').click()
  await page.getByRole('group', { name: 'Lọc theo vùng' }).getByRole('button', { name: 'Ngực' }).click()
  await page.getByRole('button', { name: named(bench.vi) }).click()
  const sheet = page.locator(SHEET)
  await expect(sheet).toHaveAttribute('aria-hidden', 'false')
  await expect(tab(page, 'Cơ thể')).toHaveAttribute('aria-current', 'page')
  await expect(sheet.getByRole('heading', { name: 'Cơ chính' })).toBeVisible()
  await expect(sheet.getByRole('button', { name: 'Cơ ngực lớn' })).toBeVisible()
  await expect(sheet.getByRole('link', { name: /YouTube/ })).toHaveAttribute('href', /youtube\.com\/results/)
})

test('bấm tên cơ trong bài tập thì xem cơ đó, cơ có danh sách bài tập', async ({ page }) => {
  await ready(page)
  await tab(page, 'Bài tập').click()
  await page.getByRole('searchbox', { name: 'Tìm bài tập' }).fill(bench.en)
  await page.getByRole('button', { name: named(bench.vi) }).click()
  await page.locator(SHEET).getByRole('button', { name: 'Kéo hoặc chạm để mở rộng, thu gọn' }).click()
  await page.locator(SHEET).getByRole('button', { name: 'Cơ ngực lớn' }).click()
  const muscleSheet = page.locator(MUSCLE_SHEET)
  await expect(muscleSheet.getByText('Bài tập chính cho cơ này')).toBeVisible()
  await expect(muscleSheet.getByRole('button', { name: bench.vi })).toBeVisible()
})

test('bài tập có cơ chính nằm sâu thì tự ẩn lớp nông', async ({ page }) => {
  await ready(page)
  await page.getByRole('searchbox', { name: 'Tìm cơ hoặc bài tập' }).fill(deep.en)
  await page.getByRole('button', { name: named(deep.vi) }).click()
  await expect(page.locator(SHEET).getByRole('heading', { name: deep.vi })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Hiện lớp nông' })).toBeVisible()
})

test('yêu thích: trống thì có hướng dẫn, lưu ☆ thì hiện và còn sau khi tải lại', async ({ page }) => {
  await ready(page)
  await tab(page, 'Yêu thích').click()
  await expect(page.getByText('Bấm ☆ ở bài tập để lưu vào đây')).toBeVisible()
  await tab(page, 'Bài tập').click()
  await page.getByRole('button', { name: `Lưu ${bench.vi} vào Yêu thích` }).click()
  await tab(page, 'Yêu thích').click()
  const favorites = page.getByRole('region', { name: 'Yêu thích' })
  await expect(favorites.getByRole('button', { name: named(bench.vi) })).toBeVisible()
  await ready(page)
  await tab(page, 'Yêu thích').click()
  await favorites.getByRole('button', { name: `Bỏ lưu ${bench.vi}` }).click()
  await expect(page.getByText('Bấm ☆ ở bài tập để lưu vào đây')).toBeVisible()
})

test('trang Nguồn & giấy phép mở và đóng được', async ({ page }) => {
  await ready(page)
  await tab(page, 'Bài tập').click()
  await page.getByRole('button', { name: 'Nguồn & giấy phép' }).click()
  const credits = page.getByRole('region', { name: 'Nguồn & giấy phép' })
  await expect(credits.getByRole('link', { name: 'CC BY-SA 4.0' })).toBeVisible()
  await credits.getByRole('button', { name: 'Đóng' }).click()
  await expect(credits).toBeHidden()
})

test('?review: duyệt Đúng thì sang mục tiếp và lưu kết quả', async ({ page }) => {
  await ready(page, '/?review&debug')
  const bar = page.getByRole('navigation', { name: 'Duyệt nội dung' })
  await expect(bar.getByText(/^Cơ 1\//)).toBeVisible()
  await expect(page.locator(MUSCLE_SHEET).getByText('Cơ ngực lớn')).toBeVisible()
  await bar.getByRole('button', { name: 'Đúng' }).click()
  await expect(bar.getByText(/^Cơ 2\//)).toBeVisible()
  await expect(bar.getByText(/Đã duyệt 1\//)).toBeVisible()
  await bar.getByRole('button', { name: 'Mục trước' }).click()
  await expect(bar.getByText(/✓ Đúng/)).toBeVisible()
})
