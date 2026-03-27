import { describe, expect, it } from 'vitest'
import {
  METAL_DEFS,
  OUNCE_TO_GRAMS,
  POUND_TO_GRAMS,
  convertSourcePriceToUsdGram,
  convertUsdGramToCnyGram,
  fetchRealtimeSnapshot,
  fetchUsdToCnyRate,
  normalizeRealtimeItem,
} from './metalPrice'

const findMetal = (symbol) => METAL_DEFS.find((item) => item.symbol === symbol)

describe('metalPrice conversions', () => {
  it('converts troy ounce price to usd per gram', () => {
    expect(convertSourcePriceToUsdGram(OUNCE_TO_GRAMS, 'troy-ounce')).toBe(1)
  })

  it('converts pound price to usd per gram', () => {
    expect(convertSourcePriceToUsdGram(POUND_TO_GRAMS, 'pound')).toBe(1)
  })

  it('converts usd gram to cny gram correctly', () => {
    expect(convertUsdGramToCnyGram(2, 7.2)).toBe(14.4)
  })

  it('normalizes copper quote with pound source unit', () => {
    const item = normalizeRealtimeItem(
      { symbol: 'HG', name: 'Copper', price: 5.46, updatedAt: '2026-03-27T03:00:00Z' },
      7.2,
      findMetal('HG'),
    )

    expect(item).toMatchObject({
      symbol: 'HG',
      name: '铜',
      sourceUnitLabel: 'USD/lb',
      priceUsdPerSourceUnit: 5.46,
      priceUsdPerOunce: expect.any(Number),
      priceUsdPerGram: expect.any(Number),
      priceCnyPerGram: expect.any(Number),
      error: null,
    })
  })
})

describe('metalPrice fetching', () => {
  it('reads USD to CNY rate from Frankfurter response', async () => {
    const fetchImpl = async () => ({
      ok: true,
      json: async () => ({
        amount: 1,
        base: 'USD',
        date: '2026-03-26',
        rates: { CNY: 6.91 },
      }),
    })

    await expect(fetchUsdToCnyRate({ fetchImpl })).resolves.toBe(6.91)
  })

  it('aggregates realtime items with partial failures', async () => {
    const fetchImpl = async (url) => {
      if (url.includes('frankfurter')) {
        return {
          ok: true,
          json: async () => ({
            amount: 1,
            base: 'USD',
            date: '2026-03-26',
            rates: { CNY: 7.2 },
          }),
        }
      }

      if (url.includes('/price/XAU')) {
        return {
          ok: true,
          json: async () => ({
            symbol: 'XAU',
            name: 'Gold',
            price: 3000,
            updatedAt: '2026-03-27T00:00:00Z',
          }),
        }
      }

      if (url.includes('/price/XAG')) {
        return { ok: false, status: 500 }
      }

      return {
        ok: true,
        json: async () => ({
          symbol: 'HG',
          name: 'Copper',
          price: 4.2,
          updatedAt: '2026-03-27T00:00:00Z',
        }),
      }
    }

    const result = await fetchRealtimeSnapshot({ fetchImpl, symbols: ['XAU', 'XAG', 'HG'] })

    expect(result.usdToCnyRate).toBe(7.2)
    expect(result.exchangeRateError).toBe('')
    expect(result.items).toHaveLength(3)
    expect(result.items.find((item) => item.symbol === 'XAU')).toMatchObject({
      sourceUnitLabel: 'USD/oz',
      error: null,
    })
    expect(result.items.find((item) => item.symbol === 'XAG')).toMatchObject({
      symbol: 'XAG',
      error: 'Request failed: 500',
    })
    expect(result.items.find((item) => item.symbol === 'HG')).toMatchObject({
      sourceUnitLabel: 'USD/lb',
      error: null,
    })
  })

  it('keeps usd prices when exchange rate request fails', async () => {
    const fetchImpl = async (url) => {
      if (url.includes('frankfurter')) {
        throw new Error('rate offline')
      }

      return {
        ok: true,
        json: async () => ({
          symbol: 'XAU',
          name: 'Gold',
          price: 3100,
          updatedAt: '2026-03-27T00:00:00Z',
        }),
      }
    }

    const result = await fetchRealtimeSnapshot({ fetchImpl, symbols: ['XAU'] })

    expect(result.usdToCnyRate).toBeNull()
    expect(result.exchangeRateError).toContain('rate offline')
    expect(result.items[0]).toMatchObject({
      symbol: 'XAU',
      priceUsdPerOunce: 3100,
      priceCnyPerGram: null,
      error: null,
    })
  })
})
