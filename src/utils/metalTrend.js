const CORS_PROXY_BASE = 'https://corsproxy.io/?'
const YAHOO_CHART_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart'

export const TREND_RANGE_CONFIG = Object.freeze({
  day: { range: '1d', interval: '5m' },
  week: { range: '5d', interval: '30m' },
  month: { range: '1mo', interval: '1d' },
  year: { range: '1y', interval: '1wk' },
})

const roundCoord = (value) => Math.round(value * 100) / 100

const getUnitLabel = (metalDef) => (metalDef.quoteUnit === 'pound' ? 'USD/lb' : 'USD/oz')

const fetchJson = async (url, fetchImpl) => {
  const response = await fetchImpl(url)
  if (!response.ok) throw new Error(`Request failed: ${response.status}`)
  return response.json()
}

const normalizePoint = (timestamp, price) => ({
  time: new Date(timestamp * 1000).toISOString(),
  price: roundCoord(price),
})

const getTrendConfig = (range) => {
  const config = TREND_RANGE_CONFIG[range]
  if (!config) throw new Error(`Unsupported trend range: ${range}`)
  return config
}

export const createHistoryCache = () => new Map()

export const buildHistoryCacheKey = (symbol, range) => `${symbol}:${range}`

export const buildTrendRequestUrl = (ticker, range) => {
  const { interval, range: windowRange } = getTrendConfig(range)
  const yahooUrl = `${YAHOO_CHART_BASE}/${ticker}?interval=${interval}&range=${windowRange}`
  return `${CORS_PROXY_BASE}${encodeURIComponent(yahooUrl)}`
}

export const parseTrendPayload = (payload, metalDef, range) => {
  const result = payload?.chart?.result?.[0]
  const timestamps = result?.timestamp || []
  const closes = result?.indicators?.quote?.[0]?.close || []
  const points = timestamps.reduce((list, timestamp, index) => {
    const price = closes[index]
    if (typeof price === 'number' && Number.isFinite(price)) {
      list.push(normalizePoint(timestamp, price))
    }
    return list
  }, [])

  if (!points.length) throw new Error('Trend response contains no points')

  return {
    symbol: metalDef.symbol,
    name: metalDef.name,
    range,
    unitLabel: getUnitLabel(metalDef),
    points,
    error: '',
  }
}

export const fetchMetalTrend = async ({
  fetchImpl = fetch,
  cache,
  metalDef,
  range,
  forceRefresh = false,
}) => {
  const cacheKey = buildHistoryCacheKey(metalDef.symbol, range)
  if (cache && !forceRefresh && cache.has(cacheKey)) {
    return {
      ...cache.get(cacheKey),
      fromCache: true,
    }
  }

  const payload = await fetchJson(buildTrendRequestUrl(metalDef.chartTicker, range), fetchImpl)
  const trend = parseTrendPayload(payload, metalDef, range)

  if (cache) cache.set(cacheKey, trend)

  return {
    ...trend,
    fromCache: false,
  }
}

export const summarizeTrendBounds = (points) => {
  const prices = points.map((point) => point.price)
  return {
    min: Math.min(...prices),
    max: Math.max(...prices),
  }
}

export const mapTrendPointsToCoords = ({
  points,
  width = 100,
  height = 100,
  padding = 8,
}) => {
  if (!points.length) return []
  const { min, max } = summarizeTrendBounds(points)
  const usableWidth = width - padding * 2
  const usableHeight = height - padding * 2
  const priceSpan = max - min || 1
  const stepBase = Math.max(points.length - 1, 1)

  return points.map((point, index) => ({
    ...point,
    x: roundCoord(padding + (usableWidth * index) / stepBase),
    y: roundCoord(height - padding - ((point.price - min) / priceSpan) * usableHeight),
  }))
}

export const buildSvgPath = (points) =>
  points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')
