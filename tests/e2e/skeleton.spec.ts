import { expect, test, type Page } from '@playwright/test'

const BONE_SHEET = 'section[aria-label="Thông tin xương"]'
const MUSCLE_SHEET = 'section[aria-label="Thông tin cơ"]'

async function ready(page: Page) {
  await page.goto('/?debug')
  await page.waitForFunction(() => window.__ptDebug !== undefined)
}

async function showSkeleton(page: Page) {
  await ready(page)
  await page.getByRole('button', { name: 'Hiện xương' }).click()
  await expect(page.getByRole('button', { name: 'Ẩn xương' })).toBeVisible()
}

async function tapBone(page: Page, object: string) {
  const point = await page.evaluate((o) => window.__ptDebug!.boneScreenPoint(o), object)
  expect(point).not.toBeNull()
  await page.mouse.click(point!.x, point!.y)
}

test('bật xương: ẩn nút lớp nông, bấm xương đùi ra tên và cơ bám, bấm cơ thì mở sheet cơ', async ({ page }) => {
  await showSkeleton(page)
  await expect(page.getByRole('button', { name: /lớp nông/ })).toHaveCount(0)
  await page.waitForTimeout(500)
  await page.screenshot({ path: 'test-results/shots/skeleton-front.png' })
  await tapBone(page, 'Femur')
  const sheet = page.locator(BONE_SHEET)
  await expect(sheet).toHaveAttribute('aria-hidden', 'false')
  await expect(sheet.getByRole('heading', { name: /Xương đùi/ })).toBeVisible()
  await sheet.getByRole('button', { name: 'Mở rộng' }).click()
  await expect(sheet.getByRole('heading', { name: 'Cơ bám tận vào xương này' })).toBeVisible()
  await page.screenshot({ path: 'test-results/shots/skeleton-femur.png' })
  await sheet.getByRole('button', { name: 'Cơ mông lớn' }).click()
  await expect(page.locator(MUSCLE_SHEET)).toHaveAttribute('aria-hidden', 'false')
  await page.waitForTimeout(800)
  await page.screenshot({ path: 'test-results/shots/skeleton-gluteus.png' })
})

test('tắt xương khi đang mở sheet xương thì đóng sheet và hiện lại nút lớp nông', async ({ page }) => {
  await showSkeleton(page)
  await tapBone(page, 'Hip bone')
  await expect(page.locator(BONE_SHEET)).toHaveAttribute('aria-hidden', 'false')
  await page.getByRole('button', { name: 'Ẩn xương' }).click()
  await expect(page.locator(BONE_SHEET)).toHaveAttribute('aria-hidden', 'true')
  await expect(page.getByRole('button', { name: /lớp nông/ })).toBeVisible()
})

test('tải bones.glb lỗi thì nút báo lỗi, bấm lại thì tải được', async ({ page }) => {
  let fail = true
  await page.route('**/models/bones.glb', (route) => (fail ? route.abort() : route.continue()))
  await ready(page)
  await page.getByRole('button', { name: 'Hiện xương' }).click()
  await expect(page.getByRole('button', { name: 'Tải xương lỗi · Thử lại' })).toBeVisible()
  fail = false
  await page.getByRole('button', { name: 'Tải xương lỗi · Thử lại' }).click()
  await expect(page.getByRole('button', { name: 'Ẩn xương' })).toBeVisible()
})
