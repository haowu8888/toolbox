import { test, expect } from '@playwright/test'
import { tools } from '../src/tools/meta.js'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const buildTrendPayload = (prices) => ({
  chart: {
    result: [
      {
        timestamp: prices.map((_, index) => 1_700_000_000 + index * 3_600),
        indicators: {
          quote: [{ close: prices }],
        },
      },
    ],
  },
})

const smokeTrendSeries = {
  'GC=F': [2988, 2996, 3004],
  'SI=F': [33.2, 33.6, 34.1],
  'HG=F': [4.12, 4.18, 4.23],
}

const smokeSetup = {
  notes: async (page) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        'toolbox_notes',
        JSON.stringify([
          {
            id: 'n1',
            title: 'Note',
            content: 'hello',
            createdAt: new Date().toISOString(),
            tags: ['工作'],
            isTodo: false,
            completed: false,
            priority: 'normal',
          },
        ]),
      )
    })
  },
  storage: async (page) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        'toolbox_history',
        JSON.stringify([
          {
            id: 'h1',
            type: '测试',
            value: 'v',
            timestamp: new Date().toISOString(),
          },
        ]),
      )
      localStorage.setItem(
        'toolbox_favorites',
        JSON.stringify([
          {
            id: 'f1',
            type: 'fav',
            value: 'x',
            name: 'x',
            createdAt: new Date().toISOString(),
          },
        ]),
      )
    })
  },
  settings: async (page) => {
    await page.addInitScript(() => {
      localStorage.setItem('toolbox_config', JSON.stringify({ a: 1 }))
      localStorage.setItem('toolbox_history', JSON.stringify([{ id: 'h1', type: 't', value: 'v' }]))
      localStorage.setItem(
        'toolbox_favorites',
        JSON.stringify([{ id: 'f1', type: 'fav', value: 'x', name: 'x' }]),
      )
    })
  },
  metalprice: async (page) => {
    await page.route('https://api.frankfurter.app/*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          amount: 1,
          base: 'USD',
          date: '2026-03-26',
          rates: { CNY: 7.2 },
        }),
      })
    })

    await page.route('https://api.gold-api.com/price/*', async (route) => {
      const symbol = route.request().url().split('/').pop()
      const payloads = {
        XAU: { symbol: 'XAU', name: 'Gold', price: 3000, updatedAt: '2026-03-27T00:00:00Z' },
        XAG: { symbol: 'XAG', name: 'Silver', price: 35, updatedAt: '2026-03-27T00:00:00Z' },
        HG: { symbol: 'HG', name: 'Copper', price: 4.2, updatedAt: '2026-03-27T00:00:00Z' },
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(payloads[symbol]),
      })
    })

    await page.route('https://corsproxy.io/?*', async (route) => {
      const url = new URL(route.request().url())
      const target = decodeURIComponent(url.search.slice(1))
      const ticker = target.match(/chart\/([^?]+)/)?.[1]

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(buildTrendPayload(smokeTrendSeries[ticker] || [1, 2, 3])),
      })
    })
  },
}

const smokeActions = {
  qrcode: async (page) => {
    await page.getByPlaceholder('输入文本、链接或其他内容，将自动生成二维码').fill('hello')
    await expect(page.locator('img.qr-image')).toBeVisible()
  },
  json: async (page) => {
    await page.getByPlaceholder('粘贴你的 JSON 内容或上传文件').fill('{"a":1,"b":[2,3]}')
    await expect(page.getByPlaceholder('格式化后的 JSON 将显示在这里')).toHaveValue(/"a": 1/)
  },
  encrypt: async (page) => {
    await page.getByPlaceholder('输入需要加密的文本').fill('hello')
    await expect(page.locator('.text-encryption .result-hash').first()).toBeVisible()
  },
  encoding: async (page) => {
    await page.getByPlaceholder('输入需要转换的文本').fill('中文🙂')
    await expect(page.getByPlaceholder('转换结果将显示在这里')).toHaveValue(/^[A-Za-z0-9+/=]+$/)
    const encoded = await page.getByPlaceholder('转换结果将显示在这里').inputValue()
    await page.getByLabel('Base64 解码').check()
    await page.getByPlaceholder('输入需要转换的文本').fill(encoded)
    await expect(page.getByPlaceholder('转换结果将显示在这里')).toHaveValue('中文🙂')
  },
  markdown: async (page) => {
    await page.getByPlaceholder('输入 Markdown 内容，实时预览效果...').fill('# Title\n\n**Bold**')
    await expect(page.locator('.markdown-preview h1')).toHaveText('Title')
  },
  time: async (page) => {
    await page.getByPlaceholder('输入时间戳 (秒 或 毫秒)').fill('1700000000000')
    await expect(page.locator('.time-tools .result-box code').first()).toHaveText(/\d{4}-\d{2}-\d{2}/)
  },
  convert: async (page) => {
    await page.locator('.convert-tools input[placeholder="输入数值"]').first().fill('1000')
    await expect(page.locator('.convert-tools .result-field').first()).toHaveText('1.000000')
  },
  color: async (page) => {
    const hex = await page.getByLabel('HEX 输入').inputValue()
    await expect(page.getByLabel('颜色选择器')).toHaveValue(hex.toLowerCase())
  },
  validator: async (page) => {
    await page.locator('.validator-tools textarea').fill('example@email.com')
    await expect(page.locator('.validator-tools .result-status')).toHaveText('验证通过')
  },
  regex: async (page) => {
    await page.getByPlaceholder('输入正则表达式，如：\\d+').fill('\\d+')
    await page.getByPlaceholder('输入要测试的文本').fill('a1 b22')
    await page.getByRole('button', { name: '🎨 高亮' }).click()
    await expect(page.locator('.output-content mark')).toHaveCount(2)
  },
  notes: async (page) => {
    await page.getByPlaceholder('输入标题或任务...').fill('Test note')
    await page.getByRole('button', { name: '➕ 添加笔记' }).click()
    await expect(page.locator('.notes-tools .note-card').first()).toBeVisible()
  },
  textadvanced: async (page) => {
    await page.getByRole('button', { name: '刷新' }).click()
    await expect(page.locator('.text-tools .uuid-item').first()).toBeVisible()
  },
  calculator: async (page) => {
    await page.getByRole('button', { name: '1' }).click()
    await page.getByRole('button', { name: '+' }).click()
    await page.getByRole('button', { name: '2' }).click()
    await page.getByRole('button', { name: '=' }).click()
    await expect(page.locator('.calculator .display')).toHaveText(/3/)
  },
  codeformatter: async (page) => {
    await page.getByPlaceholder('粘贴你的代码...').fill('{"a":1,"b":2}')
    await page.locator('.code-tools .controls').getByRole('button', { name: '✨ 格式化' }).click()
    await expect(page.getByPlaceholder('格式化后的结果')).toHaveValue(/"a": 1/)
  },
  fileconverter: async (page) => {
    const filePath = path.join(os.tmpdir(), `toolbox-hash-${Date.now()}.txt`)
    fs.writeFileSync(filePath, 'hello')
    await page.getByRole('button', { name: '🔐 文件哈希', exact: true }).click()
    await page.getByTestId('hash-file-input').setInputFiles(filePath)
    await expect(page.locator('.file-tools pre.result-text')).toContainText('MD5:')
  },
  jwt: async (page) => {
    await page.locator('.jwt-decoder textarea').fill(
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
    )
    await expect(page.locator('.jwt-decoder .decode-block')).toHaveCount(3)
  },
  cron: async (page) => {
    await page.locator('.cron-parser .cron-input').fill('*/5 * * * *')
    await expect(page.locator('.cron-parser .execution-item')).toHaveCount(5)
  },
  diff: async (page) => {
    await page.getByPlaceholder('在此输入原始文本...').fill('a\nb\nc\n')
    await page.getByPlaceholder('在此输入修改后的文本...').fill('a\nc\nd\n')
    await page.getByRole('button', { name: '对比' }).click()
    await expect(page.locator('.diff-tool .stat-value').first()).toBeVisible()
  },
  datagen: async (page) => {
    await page.getByRole('button', { name: '生成文本' }).click()
    await expect(page.locator('.data-generator pre.result-pre')).not.toHaveText('')
  },
  cssunit: async (page) => {
    await page.locator('.css-unit-converter input[placeholder="输入数值"]').fill('16')
    await expect(page.locator('.css-unit-converter .result-card').first()).toBeVisible()
  },
  imgcompress: async (page) => {
    const pngPath = path.join(os.tmpdir(), `toolbox-1x1-${Date.now()}.png`)
    const pngBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO1YJ9wAAAAASUVORK5CYII='
    fs.writeFileSync(pngPath, Buffer.from(pngBase64, 'base64'))
    await page.locator('.image-compressor input[type="file"]').setInputFiles(pngPath)
    await page.getByRole('button', { name: '开始压缩' }).click()
    await expect(page.locator('.image-compressor .result-section')).toBeVisible()
  },
  htmlentity: async (page) => {
    await page.locator('.html-entity-converter textarea').first().fill('<div>&</div>')
    await page.getByRole('button', { name: '编码', exact: true }).click()
    await expect(page.locator('.html-entity-converter textarea').nth(1)).toHaveValue(/&lt;div&gt;/)
  },
  configconvert: async (page) => {
    await page.locator('.config-converter textarea').first().fill('{"a":1}')
    await page.getByRole('button', { name: '🔄 转换' }).click()
    await expect(page.locator('.config-converter textarea').nth(1)).not.toHaveValue('')
  },
  csvjson: async (page) => {
    await page.locator('.csv-json textarea').first().fill('name,age\nAlice,18\nBob,20')
    await page.getByRole('button', { name: '转换', exact: true }).click()
    await expect(page.getByPlaceholder('转换结果将显示在这里')).toHaveValue(/\[\s*{\s*"name":\s*"Alice"/)
  },
  curlfetch: async (page) => {
    await page.getByPlaceholder('粘贴 curl 命令，例如：curl https://example.com').fill(
      "curl -X POST 'https://example.com/api' -H 'Content-Type: application/json' -d '{\"a\":1}'",
    )
    await page.getByRole('button', { name: '转换', exact: true }).click()
    await expect(page.getByPlaceholder('转换后的 fetch 代码')).toHaveValue(/fetch\("https:\/\/example\.com\/api"/)
  },
  urltools: async (page) => {
    await page.getByRole('button', { name: '🧾 Query ↔ JSON', exact: true }).click()
    await page.getByLabel('QueryString 输入').fill('a=1&b=2&b=3')
    await page.getByRole('button', { name: '➡️ 转 JSON', exact: true }).click()
    await expect(page.getByLabel('Query JSON 输入')).toHaveValue(/"b": \[\s*"2",\s*"3"\s*\]/)
  },
  chmod: async (page) => {
    await page.getByLabel('chmod 八进制输入').fill('644')
    await expect(page.getByLabel('chmod rwx 输入')).toHaveValue('rw-r--r--')
  },
  storage: async (page) => {
    await expect(page.locator('.storage-panel')).toBeVisible()
    await expect(page.locator('.storage-panel .tab-btn')).toHaveCount(2)
  },
  settings: async (page) => {
    await expect(page.locator('.settings-panel .stat-card, .settings-panel .stats-grid')).toBeVisible()
  },
  metalprice: async (page) => {
    await expect(page.locator('.metal-price-tool .price-card')).toHaveCount(3)
    await expect(page.locator('.metal-price-tool .metal-trend-chart')).toHaveCount(3)
    await expect(page.locator('.metal-price-tool .status-bar')).toContainText('USD/CNY 7.2000')
    await expect(page.locator('.metal-price-tool .price-card').filter({ hasText: 'XAU' })).toContainText(
      '3000.00 USD/oz',
    )
  },
}

for (const tool of tools) {
  test(`tool: ${tool.id}`, async ({ page }) => {
    const consoleErrors = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })
    page.on('pageerror', (err) => consoleErrors.push(err.message))

    if (smokeSetup[tool.id]) await smokeSetup[tool.id](page)
    await page.goto(`/#tool-${tool.id}`, { waitUntil: 'domcontentloaded' })
    const panel = page.locator('.tool-panel')
    await expect(panel).toHaveAttribute('data-active-tool', tool.id, { timeout: 15_000 })
    await expect(panel).toHaveAttribute('data-tool-ready', 'true', { timeout: 15_000 })
    await expect(page.locator('.error-boundary')).toHaveCount(0)

    if (smokeActions[tool.id]) {
      await smokeActions[tool.id](page)
    }

    expect(consoleErrors, consoleErrors.join('\n')).toEqual([])
  })
}
