import { test, expect } from '@playwright/test'

// 针对已修复缺陷的回归用例：每个用例都对应一个曾经真实存在的问题

const openTool = async (page, toolId) => {
  await page.goto(`/#tool-${toolId}`, { waitUntil: 'domcontentloaded' })
  const panel = page.locator('.tool-panel')
  await expect(panel).toHaveAttribute('data-active-tool', toolId)
  await expect(panel).toHaveAttribute('data-tool-ready', 'true')
}

test('switching between cached tools keeps data-tool-ready in sync', async ({ page }) => {
  await openTool(page, 'json')
  for (const id of ['jwt', 'json', 'calculator']) {
    await page.evaluate((toolId) => {
      window.location.hash = `#tool-${toolId}`
    }, id)
    await expect(page.locator('.tool-panel')).toHaveAttribute('data-active-tool', id)
    await expect(page.locator('.tool-panel')).toHaveAttribute('data-tool-ready', 'true')
  }
})

test('dark-mode component styles do not leak onto <html> or other tools', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('toolbox_theme', 'dark'))
  await openTool(page, 'calculator')
  const readRootStyle = () =>
    page.evaluate(() => {
      const style = getComputedStyle(document.documentElement)
      return { color: style.color, background: style.backgroundColor }
    })
  const before = await readRootStyle()
  const descriptionBefore = await page
    .locator('.calculator .description')
    .evaluate((el) => getComputedStyle(el).color)

  // 这些工具曾把 [data-theme=dark]{color:…} 之类的规则写到 <html> 上，或把 .description 等样式泄漏到全局
  for (const id of ['configconvert', 'jwt', 'storage', 'metalprice', 'calculator']) {
    await page.evaluate((toolId) => {
      window.location.hash = `#tool-${toolId}`
    }, id)
    await expect(page.locator('.tool-panel')).toHaveAttribute('data-tool-ready', 'true')
  }

  expect(await readRootStyle()).toEqual(before)
  expect(
    await page.locator('.calculator .description').evaluate((el) => getComputedStyle(el).color),
  ).toBe(descriptionBefore)
})

test('regex tool aborts catastrophic backtracking and stays responsive', async ({ page }) => {
  await openTool(page, 'regex')
  await page.getByPlaceholder('输入要测试的文本').fill(`${'a'.repeat(40)}!`)
  await page.getByPlaceholder('输入正则表达式，如：\\d+').fill('^(a+)+$')
  await expect(page.locator('.regex-tools .error-message')).toContainText('灾难性回溯')

  await page.getByPlaceholder('输入正则表达式，如：\\d+').fill('(?<x>a)a')
  await expect(page.locator('.regex-tools .match-item').first()).toContainText('x=a')
  // 替换结果里的 <mark> 只能当文本显示
  await page.getByPlaceholder('输入要测试的文本').fill('aa')
  await page.getByPlaceholder(/输入替换文本/).fill('<mark>x</mark>')
  await page.getByRole('button', { name: '🔄 替换' }).click()
  await expect(page.locator('.regex-tools .output-text')).toHaveText('<mark>x</mark>')
})

test('json formatter keeps big integers and reports error positions', async ({ page }) => {
  await openTool(page, 'json')
  const input = page.getByPlaceholder('粘贴你的 JSON 内容或上传文件')
  await input.fill('{"id": 12345678901234567890, "v": 1.0}')
  await expect(page.getByPlaceholder('格式化后的 JSON 将显示在这里')).toHaveValue(
    '{\n  "id": 12345678901234567890,\n  "v": 1.0\n}',
  )
  await input.fill('{\n  "a": 1,\n}')
  await expect(page.locator('.json-formatter .error-message')).toContainText('第 2 行第 9 列')
})

test('calculator accepts keyboard input', async ({ page }) => {
  await openTool(page, 'calculator')
  await page.locator('.calculator h2').click()
  await page.keyboard.type('12+3*2')
  await page.keyboard.press('Enter')
  await expect(page.locator('.calculator .display')).toHaveText('30')
  await page.keyboard.press('Escape')
  await expect(page.locator('.calculator .display')).toHaveText('0')
})

test('unit converter treats 0 as a real value', async ({ page }) => {
  await openTool(page, 'convert')
  await page.locator('.convert-tools .tab-btn', { hasText: '温度' }).click()
  const section = page.locator('.convert-tools .convert-section:visible')
  await section.locator('input[placeholder="输入数值"]').fill('0')
  await expect(section.locator('.result-field')).toHaveText('32')
})

test('base64 to image download works for raw base64', async ({ page }) => {
  await openTool(page, 'fileconverter')
  await page.getByRole('button', { name: '🖼️ Base64 转图', exact: true }).click()
  await page
    .locator('.file-tools textarea')
    .fill(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    )
  await page.getByRole('button', { name: '🖼️ 显示图片' }).click()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '💾 下载图片' }).click()
  expect((await downloadPromise).suggestedFilename()).toBe('image.png')
})

test('csv converter parses real tabs in TSV mode', async ({ page }) => {
  await openTool(page, 'csvjson')
  await page.locator('.csv-json select').selectOption({ label: 'Tab (TSV)' })
  await page.locator('.csv-json textarea').first().fill('name\tage\nAlice\t18')
  await page.getByRole('button', { name: '转换', exact: true }).click()
  await expect(page.getByPlaceholder('转换结果将显示在这里')).toHaveValue(/"age": "18"/)
})
