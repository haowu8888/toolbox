import { describe, expect, it } from 'vitest'
import { METAL_DEFS } from './metalPrice'
import {
  TREND_RANGE_CONFIG,
  buildHistoryCacheKey,
  buildSvgPath,
  buildTrendRequestUrl,
  createHistoryCache,
  fetchMetalTrend,
  parseTrendPayload,
  summarizeTrendBounds,
} from './metalTrend'

const gold = METAL_DEFS.find((item) => item.symbol === 'XAU')

describe('metalTrend fetch contract', () => {
  it('builds a stable cache key by symbol and range', () => {
    expect(buildHistoryCacheKey('XAU', 'month')).toBe('XAU:month')
  })

  it('builds a same-origin request for Yahoo chart data', () => {
    const url = buildTrendRequestUrl('GC=F', 'month')

    expect(url).toContain('/api/finance/chart/GC%3DF?')
    expect(url).toContain('range=1mo')
    expect(url).toContain('interval=1d')
  })

  it('exposes the supported range config', () => {
    expect(TREND_RANGE_CONFIG.day).toMatchObject({ range: '1d', interval: '5m' })
    expect(TREND_RANGE_CONFIG.year).toMatchObject({ range: '1y', interval: '1wk' })
  })

  it('normalizes Yahoo chart payload and filters null points', () => {
    const result = parseTrendPayload(
      {
        chart: {
          result: [
            {
              timestamp: [1000, 2000, 3000],
              indicators: {
                quote: [
                  {
                    close: [3000, null, 3010],
                  },
                ],
              },
            },
          ],
        },
      },
      gold,
      'month',
    )

    expect(result).toMatchObject({
      symbol: 'XAU',
      range: 'month',
      unitLabel: 'USD/oz',
    })
    expect(result.points).toEqual([
      { time: '1970-01-01T00:16:40.000Z', price: 3000 },
      { time: '1970-01-01T00:50:00.000Z', price: 3010 },
    ])
  })

  it('reads history from cache when cache is warm', async () => {
    const cache = createHistoryCache()
    cache.set('XAU:day', {
      symbol: 'XAU',
      name: '黄金',
      range: 'day',
      unitLabel: 'USD/oz',
      points: [{ time: '2026-03-27T00:00:00.000Z', price: 3000 }],
      error: '',
    })

    const result = await fetchMetalTrend({
      fetchImpl: async () => {
        throw new Error('network should not be called')
      },
      cache,
      metalDef: gold,
      range: 'day',
    })

    expect(result.fromCache).toBe(true)
    expect(result.points).toHaveLength(1)
  })

  it('force refresh bypasses warm cache', async () => {
    const cache = createHistoryCache()
    cache.set('XAU:day', {
      symbol: 'XAU',
      name: '黄金',
      range: 'day',
      unitLabel: 'USD/oz',
      points: [{ time: '2026-03-27T00:00:00.000Z', price: 2999 }],
      error: '',
    })

    const fetchImpl = async () => ({
      ok: true,
      json: async () => ({
        chart: {
          result: [
            {
              timestamp: [1000],
              indicators: { quote: [{ close: [3001] }] },
            },
          ],
        },
      }),
    })

    const result = await fetchMetalTrend({
      fetchImpl,
      cache,
      metalDef: gold,
      range: 'day',
      forceRefresh: true,
    })

    expect(result.fromCache).toBe(false)
    expect(result.points[0].price).toBe(3001)
  })
})

describe('metalTrend chart helpers', () => {
  it('summarizes min and max values', () => {
    expect(summarizeTrendBounds([{ price: 10 }, { price: 20 }])).toEqual({ min: 10, max: 20 })
  })

  it('builds an svg path from coordinates', () => {
    const path = buildSvgPath([
      { x: 0, y: 100 },
      { x: 50, y: 50 },
      { x: 100, y: 0 },
    ])

    expect(path).toBe('M 0 100 L 50 50 L 100 0')
  })
})
