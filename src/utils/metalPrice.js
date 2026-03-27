export const OUNCE_TO_GRAMS = 31.1034768
export const POUND_TO_GRAMS = 453.59237

const GOLD_API_BASE = 'https://api.gold-api.com/price'
const FRANKFURTER_RATE_URL = 'https://api.frankfurter.app/latest?from=USD&to=CNY'
const UNIT_GRAMS = {
  'troy-ounce': OUNCE_TO_GRAMS,
  pound: POUND_TO_GRAMS,
}

export const METAL_DEFS = Object.freeze([
  { symbol: 'XAU', name: '黄金', quoteUnit: 'troy-ounce', chartTicker: 'GC=F', accent: '#d4a017' },
  { symbol: 'XAG', name: '白银', quoteUnit: 'troy-ounce', chartTicker: 'SI=F', accent: '#7b8ba3' },
  { symbol: 'HG', name: '铜', quoteUnit: 'pound', chartTicker: 'HG=F', accent: '#b86b43' },
])

const roundPrice = (value) => Math.round(value * 100) / 100

const toErrorMessage = (error) => {
  if (error instanceof Error) return error.message
  return String(error)
}

const getMetalDef = (symbol) => {
  const metalDef = METAL_DEFS.find((item) => item.symbol === symbol)
  if (!metalDef) throw new Error(`Unsupported metal symbol: ${symbol}`)
  return metalDef
}

const getSourceUnitLabel = (quoteUnit) => (quoteUnit === 'pound' ? 'USD/lb' : 'USD/oz')

const convertUsdGramToUsdOunce = (priceUsdPerGram) => roundPrice(priceUsdPerGram * OUNCE_TO_GRAMS)

const fetchJson = async (url, fetchImpl) => {
  const response = await fetchImpl(url)
  if (!response.ok) throw new Error(`Request failed: ${response.status}`)
  return response.json()
}

const buildErrorItem = (symbol, error) => {
  const metalDef = getMetalDef(symbol)
  return {
    symbol,
    name: metalDef.name,
    sourceUnitLabel: getSourceUnitLabel(metalDef.quoteUnit),
    priceUsdPerSourceUnit: null,
    priceUsdPerOunce: null,
    priceUsdPerGram: null,
    priceCnyPerGram: null,
    sourceUpdatedAt: '',
    error: toErrorMessage(error),
  }
}

export const convertSourcePriceToUsdGram = (price, quoteUnit) => {
  const unitGrams = UNIT_GRAMS[quoteUnit]
  if (!unitGrams) throw new Error(`Unsupported quote unit: ${quoteUnit}`)
  return roundPrice(price / unitGrams)
}

export const convertUsdGramToCnyGram = (priceUsdPerGram, usdToCnyRate) =>
  roundPrice(priceUsdPerGram * usdToCnyRate)

export const normalizeRealtimeItem = (payload, usdToCnyRate, metalDef) => {
  const priceUsdPerGram = convertSourcePriceToUsdGram(payload.price, metalDef.quoteUnit)
  const priceUsdPerOunce =
    metalDef.quoteUnit === 'troy-ounce' ? roundPrice(payload.price) : convertUsdGramToUsdOunce(priceUsdPerGram)

  return {
    symbol: metalDef.symbol,
    name: metalDef.name,
    sourceUnitLabel: getSourceUnitLabel(metalDef.quoteUnit),
    priceUsdPerSourceUnit: roundPrice(payload.price),
    priceUsdPerOunce,
    priceUsdPerGram,
    priceCnyPerGram: usdToCnyRate ? convertUsdGramToCnyGram(priceUsdPerGram, usdToCnyRate) : null,
    sourceUpdatedAt: payload.updatedAt || '',
    error: null,
  }
}

export const fetchUsdToCnyRate = async ({ fetchImpl = fetch } = {}) => {
  const payload = await fetchJson(FRANKFURTER_RATE_URL, fetchImpl)
  const rate = payload?.rates?.CNY
  if (typeof rate !== 'number') throw new Error('Invalid USD/CNY response')
  return rate
}

export const fetchRealtimeSnapshot = async ({
  fetchImpl = fetch,
  symbols = METAL_DEFS.map((item) => item.symbol),
} = {}) => {
  let usdToCnyRate = null
  let exchangeRateError = ''

  try {
    usdToCnyRate = await fetchUsdToCnyRate({ fetchImpl })
  } catch (error) {
    exchangeRateError = toErrorMessage(error)
  }

  const items = await Promise.all(
    symbols.map(async (symbol) => {
      try {
        const metalDef = getMetalDef(symbol)
        const payload = await fetchJson(`${GOLD_API_BASE}/${symbol}`, fetchImpl)
        return normalizeRealtimeItem(payload, usdToCnyRate, metalDef)
      } catch (error) {
        return buildErrorItem(symbol, error)
      }
    }),
  )

  return {
    updatedAt: new Date().toISOString(),
    usdToCnyRate,
    items,
    exchangeRateError,
  }
}
