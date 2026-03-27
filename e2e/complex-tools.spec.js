import { test, expect } from '@playwright/test'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import QRCode from 'qrcode'

const openTool = async (page, toolId) => {
  await page.goto(`/#tool-${toolId}`, { waitUntil: 'domcontentloaded' })
  const panel = page.locator('.tool-panel')
  await expect(panel).toHaveAttribute('data-active-tool', toolId)
  await expect(panel).toHaveAttribute('data-tool-ready', 'true')
  await expect(page.locator('.error-boundary')).toHaveCount(0)
}

const createTempQrFile = async (text) => {
  const filePath = path.join(os.tmpdir(), `toolbox-scan-${Date.now()}.png`)
  await QRCode.toFile(filePath, text, {
    errorCorrectionLevel: 'H',
    margin: 1,
    width: 320,
  })
  return filePath
}

test('qrcode tool can download generated image and decode uploaded qrcode', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  const qrText = 'https://toolbox.test/qr-scan'
  const qrFilePath = await createTempQrFile(qrText)

  await openTool(page, 'qrcode')

  await page.getByPlaceholder('输入文本、链接或其他内容，将自动生成二维码').fill(qrText)
  await expect(page.locator('img.qr-image')).toBeVisible()

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '下载二维码' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('qrcode.png')

  const generatedHistory = await page.evaluate(() => JSON.parse(localStorage.getItem('toolbox_history') || '[]'))
  expect(generatedHistory[0]).toMatchObject({
    type: '二维码生成',
    value: qrText,
  })

  await page.getByRole('button', { name: '清空' }).first().click()
  await expect(page.locator('img.qr-image')).toHaveCount(0)

  await page.getByRole('button', { name: '识别二维码' }).click()
  await page.locator('.upload-label input[type="file"]').setInputFiles(qrFilePath)
  await expect(page.locator('.scan-preview img')).toBeVisible()
  await expect(page.locator('.scan-result .result-text')).toHaveText(qrText)

  await page.getByRole('button', { name: '📋 复制' }).click()
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(qrText)

  const scanHistory = await page.evaluate(() => JSON.parse(localStorage.getItem('toolbox_history') || '[]'))
  expect(scanHistory[0]).toMatchObject({
    type: '二维码识别',
    value: qrText,
  })

  await page.getByRole('button', { name: '清空' }).click()
  await expect(page.locator('.scan-preview img')).toHaveCount(0)
  await expect(page.locator('.scan-result')).toHaveCount(0)
})

test('notes tool supports add edit filter todo and export flows', async ({ page }) => {
  await openTool(page, 'notes')

  await page.getByPlaceholder('输入标题或任务...').fill('设计评审')
  await page.getByPlaceholder('输入内容（可选）').fill('检查交互稿和边界情况')
  await page.locator('.add-section .tag-btn', { hasText: '工作' }).click()
  await page.locator('.add-section .priority-option').filter({ hasText: '高' }).click()
  await page.getByRole('button', { name: '➕ 添加笔记' }).click()

  await page.getByPlaceholder('输入标题或任务...').fill('回归测试')
  await page.getByPlaceholder('输入内容（可选）').fill('覆盖抽奖和存储模块')
  await page.locator('.add-section .tag-btn', { hasText: '待办' }).click()
  await page.getByRole('button', { name: '✓ 添加任务' }).click()

  await expect(page.locator('.notes-list .note-card')).toHaveCount(2)

  await page.locator('.notes-list .note-card').filter({ hasText: '设计评审' }).locator('.btn-edit').click()
  await page.locator('.edit-input').fill('设计评审-已更新')
  await page.locator('.edit-textarea').fill('补充空状态和异常流')
  await page.getByRole('button', { name: '💾 保存' }).click()
  await expect(page.locator('.notes-list .note-card').filter({ hasText: '设计评审-已更新' })).toHaveCount(1)

  await page.getByRole('button', { name: '✓ 任务' }).click()
  const todoCard = page.locator('.notes-list .note-card').filter({ hasText: '回归测试' })
  await expect(todoCard).toHaveCount(1)
  await todoCard.locator('.todo-checkbox').check()
  await expect(todoCard.locator('.badge.completed')).toContainText('已完成')

  await page.getByRole('button', { name: '全部' }).click()
  await page.getByPlaceholder('🔍 搜索笔记...').fill('设计评审-已更新')
  await expect(page.locator('.notes-list .note-card')).toHaveCount(1)
  await page.locator('.filter-select').selectOption('工作')
  await expect(page.locator('.notes-list .note-card')).toHaveCount(1)

  await page.getByPlaceholder('🔍 搜索笔记...').fill('')
  await page.locator('.filter-select').selectOption('')

  await page.getByRole('button', { name: '📤 导出' }).click()
  const jsonDownloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '导出为 JSON' }).click()
  const jsonDownload = await jsonDownloadPromise
  const jsonPath = await jsonDownload.path()
  const exportedNotes = JSON.parse(await fs.readFile(jsonPath, 'utf8'))
  expect(exportedNotes).toHaveLength(2)
  expect(exportedNotes).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        title: '设计评审-已更新',
        content: '补充空状态和异常流',
      }),
      expect.objectContaining({
        title: '回归测试',
        isTodo: true,
        completed: true,
      }),
    ]),
  )

  await page.getByRole('button', { name: '📤 导出' }).click()
  const markdownDownloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '导出为 Markdown' }).click()
  const markdownDownload = await markdownDownloadPromise
  const markdownPath = await markdownDownload.path()
  const markdown = await fs.readFile(markdownPath, 'utf8')
  expect(markdown).toContain('## 设计评审-已更新')
  expect(markdown).toContain('## 回归测试')
  expect(markdown).toContain('已完成')
})

test('notes tool supports delete confirmation and clear all', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'toolbox_notes',
      JSON.stringify([
        {
          id: 1,
          title: '保留一',
          content: 'alpha',
          isTodo: false,
          completed: false,
          tags: ['工作'],
          priority: 'normal',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 2,
          title: '保留二',
          content: 'beta',
          isTodo: true,
          completed: false,
          tags: ['待办'],
          priority: 'high',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]),
    )
  })

  await openTool(page, 'notes')

  const firstDeleteButton = page.locator('.notes-list .note-card').first().locator('.btn-delete')
  await firstDeleteButton.click()
  await expect(firstDeleteButton).toContainText('确认')
  await firstDeleteButton.click()
  await expect(page.locator('.notes-list .note-card')).toHaveCount(1)

  const clearButton = page.locator('.footer-action .btn-danger')
  await clearButton.click()
  await expect(clearButton).toContainText('确认清空')
  await clearButton.click()
  await expect(page.locator('.empty-state')).toContainText('还没有笔记')

  const storedNotes = await page.evaluate(() => JSON.parse(localStorage.getItem('toolbox_notes') || '[]'))
  expect(storedNotes).toEqual([])
})

test('storage panel supports pagination filtering favorite and clear flows', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.addInitScript(() => {
    const history = Array.from({ length: 12 }, (_, index) => ({
      id: `h-${index + 1}`,
      type: index % 2 === 0 ? 'JSON' : 'URL',
      value: `value-${index + 1}`,
      timestamp: new Date(Date.now() - index * 60_000).toISOString(),
    }))

    localStorage.setItem('toolbox_history', JSON.stringify(history))
    localStorage.setItem(
      'toolbox_favorites',
      JSON.stringify([
        {
          id: 'fav-1',
          type: 'JSON',
          value: 'seed-favorite',
          name: 'seed-favorite',
          createdAt: new Date().toISOString(),
        },
      ]),
    )
  })

  await openTool(page, 'storage')

  const historyPanel = page.locator('.storage-panel .panel-content').first()
  const favoritesPanel = page.locator('.storage-panel .panel-content').nth(1)

  await expect(historyPanel.locator('.page-info')).toContainText('1-10 / 12')
  await historyPanel.locator('.page-size-select').selectOption('5')
  await expect(historyPanel.locator('.page-info')).toContainText('1-5 / 12')
  await historyPanel.locator('.pagination .page-btn').filter({ hasText: '3' }).click()
  await expect(historyPanel.locator('.page-info')).toContainText('11-12 / 12')
  await expect(historyPanel.locator('.list-item').first()).toContainText('value-11')

  await historyPanel.locator('.filter-input').fill('value-11')
  await expect(historyPanel.locator('.list-item')).toHaveCount(1)
  await historyPanel.locator('.filter-select').selectOption('JSON')
  await expect(historyPanel.locator('.list-item')).toHaveCount(1)
  await historyPanel.locator('.btn-action').filter({ hasText: '📋' }).click()
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe('value-11')

  await historyPanel.locator('.btn-star').first().click()
  await historyPanel.locator('.filter-reset').click()
  await expect(historyPanel.locator('.filter-input')).toHaveValue('')

  await page.getByRole('button', { name: /收藏夹/ }).click()
  await expect(favoritesPanel.locator('.list-item')).toHaveCount(2)
  await favoritesPanel.locator('.filter-input').fill('value-11')
  await expect(favoritesPanel.locator('.list-item')).toHaveCount(1)

  const favoriteDeleteButton = favoritesPanel.locator('.list-item').filter({ hasText: 'value-11' }).locator('.btn-delete')
  await favoriteDeleteButton.click()
  await favoriteDeleteButton.click()
  await expect(favoritesPanel.locator('.list-item').filter({ hasText: 'value-11' })).toHaveCount(0)

  await page.getByRole('button', { name: /历史记录/ }).click()
  const historyDeleteButton = historyPanel.locator('.list-item').first().locator('.btn-delete')
  await historyDeleteButton.click()
  await historyDeleteButton.click()
  await expect(historyPanel.locator('.list-item').filter({ hasText: 'value-1' })).toHaveCount(0)

  const clearHistoryButton = historyPanel.locator('.panel-header button')
  await clearHistoryButton.click()
  await expect(clearHistoryButton).toContainText('确认清空')
  await clearHistoryButton.click()
  await expect(historyPanel.locator('.empty-state')).toContainText('还没有历史记录')
})

test('lottery quick draw supports template save edit use and record list', async ({ page }) => {
  test.slow()
  await openTool(page, 'lottery')

  const quickInput = page.locator('.lottery-tool .tab-content:visible .input-textarea')
  await quickInput.fill('前端\n后端\n测试')
  await page.locator('.lottery-tool .config-input').fill('2')
  await page.locator('.lottery-tool .spin-btn:visible').click()
  await expect(page.locator('.lottery-tool .result-section')).toBeVisible({ timeout: 15_000 })
  await expect(page.locator('.lottery-tool .result-section .result-tag')).toHaveCount(2)

  await page.locator('.lottery-tool .btn-save-tpl').click()
  await page.locator('.modal-input').fill('团队抽签')
  await page.locator('.modal-btn.confirm').click()

  await page.getByRole('button', { name: /抽奖记录/ }).click()
  const recordCard = page.locator('.record-card').first()
  await expect(recordCard).toContainText('快速抽奖')
  await expect(recordCard.locator('.record-result-tag')).toHaveCount(2)

  await page.getByRole('button', { name: /模板管理/ }).click()
  const customTemplate = page.locator('.tpl-card.custom').filter({ hasText: '团队抽签' })
  await expect(customTemplate).toHaveCount(1)
  await customTemplate.getByRole('button', { name: '编辑' }).click()
  await page.locator('.tpl-edit-input').fill('团队抽签-改')
  await page.locator('.tpl-edit-textarea').fill('设计\n开发\n测试\n运维')
  await page.getByRole('button', { name: '保存' }).click()
  await expect(page.locator('.tpl-card.custom').filter({ hasText: '团队抽签-改' })).toHaveCount(1)

  await page.locator('.tpl-card.custom').filter({ hasText: '团队抽签-改' }).getByRole('button', { name: '使用' }).click()
  await expect(page.locator('.lottery-tool .tab-content:visible .input-textarea')).toHaveValue('设计\n开发\n测试\n运维')
})

test('lottery advanced draw supports custom prize config and record clearing', async ({ page }) => {
  test.slow()
  await openTool(page, 'lottery')

  await page.getByRole('button', { name: /高级抽奖/ }).click()
  await page.locator('.name-input').fill('神秘大奖')
  await page.locator('.add-item-row .small-input').first().fill('20')
  await page.locator('.add-item-row .small-input').nth(1).fill('2')
  await page.locator('.btn-add').click()
  await expect(page.locator('.prize-row').filter({ hasText: '神秘大奖' })).toHaveCount(1)

  await page.locator('.prize-row').filter({ hasText: '神秘大奖' }).locator('.inline-input').fill('25')
  await expect(page.locator('.prize-row').filter({ hasText: '神秘大奖' }).locator('.pr-prob')).not.toHaveText('0.0%')

  await page.locator('.lottery-tool .spin-btn:visible').click()
  await expect(page.locator('.lottery-tool .result-section .result-tag.big')).toHaveCount(1, {
    timeout: 15_000,
  })

  await page.getByRole('button', { name: /抽奖记录/ }).click()
  await expect(page.locator('.record-card').first()).toContainText('高级抽奖')

  await page.locator('.btn-clear').click()
  await expect(page.locator('.empty-records')).toContainText('暂无抽奖记录')

  const storedRecords = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('toolbox_lottery_records') || '[]'),
  )
  expect(storedRecords).toEqual([])
})
