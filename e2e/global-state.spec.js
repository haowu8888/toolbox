import { test, expect } from '@playwright/test'
import fs from 'node:fs/promises'

const openSettings = async (page) => {
  await page.goto('/#tool-settings', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.tool-panel')).toHaveAttribute('data-active-tool', 'settings')
  await expect(page.locator('.settings-panel')).toBeVisible()
}

const seedGlobalState = async (page) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => {
    localStorage.setItem(
      'toolbox_notes',
      JSON.stringify([
        {
          id: 1,
          title: 'keep me',
          content: 'note content',
          isTodo: false,
          completed: false,
          tags: ['工作'],
          priority: 'normal',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]),
    )
    localStorage.setItem('toolbox_favorite_tools', JSON.stringify(['json']))
    localStorage.setItem('toolbox_recent_tools', JSON.stringify(['json', 'jwt']))
    localStorage.setItem('toolbox_last_tool', 'jwt')
    localStorage.setItem(
      'toolbox_lottery_records',
      JSON.stringify([{ id: 'r1', name: 'A', createdAt: new Date().toISOString() }]),
    )
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
}

const readStoredState = async (page) =>
  page.evaluate(() => {
    const parseArray = (key) => {
      const raw = localStorage.getItem(key)
      return raw ? JSON.parse(raw) : null
    }

    return {
      notes: localStorage.getItem('toolbox_notes'),
      favoriteTools: parseArray('toolbox_favorite_tools'),
      recentTools: parseArray('toolbox_recent_tools'),
      lastTool: localStorage.getItem('toolbox_last_tool'),
      lotteryRecords: localStorage.getItem('toolbox_lottery_records'),
    }
  })

test('settings page survives corrupted storage', async ({ page }) => {
  const consoleErrors = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text())
  })
  page.on('pageerror', (err) => consoleErrors.push(err.message))

  await page.addInitScript(() => {
    localStorage.setItem('toolbox_history', '{broken')
    localStorage.setItem('toolbox_favorites', '{broken')
  })

  await page.goto('/#tool-settings', { waitUntil: 'domcontentloaded' })

  await expect(page.locator('.error-boundary')).toHaveCount(0)
  await expect(page.locator('.settings-panel')).toBeVisible()
  expect(consoleErrors, consoleErrors.join('\n')).toEqual([])
})

test('clear all data removes browser app state', async ({ page }) => {
  await seedGlobalState(page)
  await openSettings(page)

  page.once('dialog', (dialog) => dialog.accept())
  await page.locator('.danger-actions .btn-danger').click()
  await page.waitForTimeout(1600)
  await page.waitForLoadState('domcontentloaded')

  const state = await readStoredState(page)

  expect(state).toEqual({
    notes: null,
    favoriteTools: null,
    recentTools: ['settings'],
    lastTool: 'settings',
    lotteryRecords: null,
  })
})

test('settings export and import preserve browser app state', async ({ page }) => {
  await seedGlobalState(page)
  await openSettings(page)

  const downloadPromise = page.waitForEvent('download')
  await page.locator('.backup-actions .btn-primary').first().click()
  const download = await downloadPromise
  const downloadPath = await download.path()
  const exported = JSON.parse(await fs.readFile(downloadPath, 'utf8'))

  expect(exported.appState).toMatchObject({
    notes: expect.any(Array),
    favoriteTools: ['json'],
    recentTools: ['settings', 'jwt', 'json'],
    lastTool: 'settings',
    lotteryRecords: expect.any(Array),
  })

  await page.evaluate(() => localStorage.clear())
  await page.locator('.backup-actions input[type="file"]').setInputFiles(downloadPath)
  await page.waitForTimeout(1800)
  await page.waitForLoadState('domcontentloaded')

  const restored = await page.evaluate(() => ({
    notes: JSON.parse(localStorage.getItem('toolbox_notes') || '[]'),
    favoriteTools: JSON.parse(localStorage.getItem('toolbox_favorite_tools') || '[]'),
    recentTools: JSON.parse(localStorage.getItem('toolbox_recent_tools') || '[]'),
    lastTool: localStorage.getItem('toolbox_last_tool'),
    lotteryRecords: JSON.parse(localStorage.getItem('toolbox_lottery_records') || '[]'),
  }))

  expect(restored.favoriteTools).toEqual(['json'])
  expect(restored.recentTools).toEqual(['settings', 'jwt', 'json'])
  expect(restored.lastTool).toBe('settings')
  expect(restored.notes).toHaveLength(1)
  expect(restored.lotteryRecords).toHaveLength(1)
})

test('theme toggle persists after reload', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page.locator('.theme-toggle').click()
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
})

test('command palette can jump to jwt tool', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page.locator('.search-trigger').click()
  await page.locator('.search-panel .search-input').fill('jwt')
  await page.keyboard.press('Enter')
  await expect(page.locator('.tool-panel')).toHaveAttribute('data-active-tool', 'jwt')
})

test('command palette prioritizes recent tools', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => {
    localStorage.setItem('toolbox_recent_tools', JSON.stringify(['jwt', 'notes', 'json']))
  })
  await page.reload({ waitUntil: 'domcontentloaded' })

  await page.locator('.search-trigger').click()

  const orderedToolIds = await page.locator('.search-panel .result-item').evaluateAll((items) =>
    items.slice(0, 3).map((item) => item.getAttribute('data-tool-id')),
  )

  expect(orderedToolIds).toEqual(['jwt', 'notes', 'json'])
})

test('settings stats include notes and lottery records', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => {
    localStorage.setItem(
      'toolbox_notes',
      JSON.stringify([
        { id: 1, title: 'n1' },
        { id: 2, title: 'n2' },
      ]),
    )
    localStorage.setItem(
      'toolbox_lottery_records',
      JSON.stringify([
        { id: 'r1' },
        { id: 'r2' },
        { id: 'r3' },
      ]),
    )
  })
  await page.goto('/#tool-settings', { waitUntil: 'domcontentloaded' })

  await expect(page.locator('.stat-item[data-stat-key="notes"] .stat-value')).toHaveText(/2/)
  await expect(page.locator('.stat-item[data-stat-key="lotteryRecords"] .stat-value')).toHaveText(/3/)
})
