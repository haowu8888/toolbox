import { test, expect } from '@playwright/test'

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

const trendSeries = {
  '1d': {
    'GC=F': [
      [2998, 3001, 3004],
      [3006, 3009, 3012],
    ],
    'SI=F': [
      [33.2, 33.5, 33.8],
      [33.6, 33.9, 34.2],
    ],
    'HG=F': [
      [4.1, 4.15, 4.2],
      [4.18, 4.22, 4.28],
    ],
  },
  '1mo': {
    'GC=F': [[2880, 2894, 2910]],
    'SI=F': [[30.2, 31.4, 32.5]],
    'HG=F': [[3.8, 3.95, 4.08]],
  },
}

const setupMetalRoutes = async (page, counters) => {
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
    const version = Math.floor(counters.realtime.length / 3)
    counters.realtime.push(symbol)
    const prices = {
      XAU: 3000 + version * 10,
      XAG: 35 + version,
      HG: 4.2 + version * 0.1,
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        symbol,
        name: symbol,
        price: prices[symbol],
        updatedAt: `2026-03-27T00:00:0${version}Z`,
      }),
    })
  })

  await page.route('https://corsproxy.io/?*', async (route) => {
    const requestUrl = new URL(route.request().url())
    const targetUrl = new URL(decodeURIComponent(requestUrl.search.slice(1)))
    const ticker = targetUrl.pathname.split('/').pop()
    const range = targetUrl.searchParams.get('range')
    const key = `${ticker}:${range}`
    const seriesIndex = counters.trendVersions[key] || 0
    const seriesGroups = trendSeries[range]?.[ticker] || [[1, 2, 3]]
    const series = seriesGroups[Math.min(seriesIndex, seriesGroups.length - 1)]

    counters.trend.push(key)
    counters.trendVersions[key] = seriesIndex + 1

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(buildTrendPayload(series)),
    })
  })
}

test('metal price tool supports refresh range cache copy and auto refresh flows', async ({ page, context }) => {
  test.slow()
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])

  const counters = {
    realtime: [],
    trend: [],
    trendVersions: {},
  }

  await setupMetalRoutes(page, counters)
  await page.goto('/#tool-metalprice', { waitUntil: 'domcontentloaded' })

  const cards = page.locator('.metal-price-tool .price-card')
  const charts = page.locator('.metal-price-tool .metal-trend-chart')
  const goldCard = cards.filter({ hasText: 'XAU' })
  const goldChart = charts.filter({ hasText: '黄金' })

  await expect(cards).toHaveCount(3)
  await expect(charts).toHaveCount(3)
  await expect(goldCard).toContainText('3000.00 USD/oz')
  await expect(goldChart).toContainText('3004.00')
  expect(counters.realtime).toHaveLength(3)
  expect(counters.trend).toEqual(['GC=F:1d', 'SI=F:1d', 'HG=F:1d'])

  await goldCard.locator('.price-row[data-field="usd-oz"] .copy-btn').click()
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toContain('3000.00 USD/oz')

  await page.getByRole('button', { name: '手动刷新' }).click()
  await expect(goldCard).toContainText('3010.00 USD/oz')
  await expect(goldChart).toContainText('3012.00')
  expect(counters.realtime).toHaveLength(6)
  expect(counters.trend).toEqual(['GC=F:1d', 'SI=F:1d', 'HG=F:1d', 'GC=F:1d', 'SI=F:1d', 'HG=F:1d'])

  const historyList = await page.evaluate(() => JSON.parse(localStorage.getItem('toolbox_history') || '[]'))
  expect(historyList[0]).toMatchObject({
    type: '金属行情',
  })

  await page.getByRole('button', { name: '月' }).click()
  await expect(goldChart).toContainText('2910.00')
  expect(counters.trend).toEqual([
    'GC=F:1d',
    'SI=F:1d',
    'HG=F:1d',
    'GC=F:1d',
    'SI=F:1d',
    'HG=F:1d',
    'GC=F:1mo',
    'SI=F:1mo',
    'HG=F:1mo',
  ])

  const trendCallsBeforeCacheRead = counters.trend.length
  await page.getByRole('button', { name: '日' }).click()
  await expect(goldChart).toContainText('3012.00')
  await expect(goldChart).toContainText('缓存')
  expect(counters.trend).toHaveLength(trendCallsBeforeCacheRead)

  const trendCallsBeforeAutoRefresh = counters.trend.length
  await page.waitForTimeout(61_000)
  await expect(goldCard).toContainText('3020.00 USD/oz')
  expect(counters.realtime).toHaveLength(9)
  expect(counters.trend).toHaveLength(trendCallsBeforeAutoRefresh)
})
