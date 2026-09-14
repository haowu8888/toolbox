import { serveDir, serveFile } from 'https://deno.land/std@0.217.0/http/file_server.ts'
import { METAL_DEFS } from './src/utils/metalPrice.js'

const DIST_ROOT = 'dist'
const INDEX_FILE = `${DIST_ROOT}/index.html`
const TREND_PROXY_PATH = '/api/finance/chart'
const YAHOO_CHART_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart'
const ALLOWED_TREND_TICKERS = new Set(METAL_DEFS.map((item) => item.chartTicker))
const ALLOWED_INTERVALS = new Set(['1m', '2m', '5m', '15m', '30m', '60m', '90m', '1h', '1d', '5d', '1wk', '1mo'])
const ALLOWED_RANGES = new Set(['1d', '5d', '1mo', '3mo', '6mo', '1y', '2y', '5y', 'ytd', 'max'])

const SECURITY_HEADERS: Record<string, string> = {
  'x-frame-options': 'SAMEORIGIN',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'permissions-policy': 'camera=(), microphone=(), geolocation=()',
  'content-security-policy':
    "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'self'; form-action 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' https://dns.google https://ipapi.co https://api.gold-api.com https://api.frankfurter.app; font-src 'self' data:; manifest-src 'self'; worker-src 'self' blob:;",
}

const NO_CACHE = 'no-cache, must-revalidate'
const IMMUTABLE = 'public, max-age=31536000, immutable'

const withHeaders = (response: Response, extra: Record<string, string>) => {
  const headers = new Headers(response.headers)
  for (const [key, value] of Object.entries(extra)) headers.set(key, value)
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

const cacheControlFor = (pathname: string) => {
  if (pathname.startsWith('/assets/')) return IMMUTABLE
  if (pathname === '/' || pathname.endsWith('.html')) return NO_CACHE
  if (pathname === '/sw.js' || pathname.startsWith('/workbox-') || pathname.endsWith('.webmanifest')) {
    return NO_CACHE
  }
  return 'public, max-age=3600'
}

const jsonResponse = (body: unknown, init: ResponseInit = {}) => {
  const headers = new Headers(init.headers)
  headers.set('content-type', 'application/json; charset=utf-8')

  return new Response(JSON.stringify(body), {
    ...init,
    headers,
  })
}

const getTrendTicker = (pathname: string) => {
  if (!pathname.startsWith(`${TREND_PROXY_PATH}/`)) return ''
  return decodeURIComponent(pathname.slice(TREND_PROXY_PATH.length + 1))
}

const buildYahooChartUrl = (ticker: string, searchParams: URLSearchParams) => {
  if (!ALLOWED_TREND_TICKERS.has(ticker)) {
    throw new Error(`Unsupported trend ticker: ${ticker}`)
  }

  const interval = searchParams.get('interval') ?? ''
  const range = searchParams.get('range') ?? ''
  if (!ALLOWED_INTERVALS.has(interval) || !ALLOWED_RANGES.has(range)) {
    throw new Error('Missing or unsupported trend query parameters')
  }

  // ticker 已通过白名单校验（形如 GC=F），Yahoo 接口按原文接收
  const yahooUrl = new URL(`${YAHOO_CHART_BASE}/${ticker}`)
  yahooUrl.search = new URLSearchParams({ interval, range }).toString()
  return yahooUrl
}

const proxyTrendRequest = async (request: Request) => {
  if (request.method !== 'GET') {
    return jsonResponse({ error: 'Method not allowed' }, { status: 405 })
  }

  const requestUrl = new URL(request.url)
  const ticker = getTrendTicker(requestUrl.pathname)

  try {
    const yahooUrl = buildYahooChartUrl(ticker, requestUrl.searchParams)
    const response = await fetch(yahooUrl, {
      headers: {
        accept: 'application/json',
        'user-agent': 'toolbox-deno-proxy/1.0',
      },
      signal: AbortSignal.timeout(10_000),
    })

    return new Response(response.body, {
      status: response.status,
      headers: {
        'cache-control': 'public, s-maxage=60, stale-while-revalidate=300',
        'content-type': response.headers.get('content-type') || 'application/json; charset=utf-8',
        'x-content-type-options': 'nosniff',
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const status = message.startsWith('Unsupported') || message.startsWith('Missing') ? 400 : 502
    return jsonResponse({ error: message }, { status })
  }
}

const serveSpaAsset = async (request: Request) => {
  const pathname = new URL(request.url).pathname
  const response = await serveDir(request, {
    fsRoot: DIST_ROOT,
    quiet: true,
    showDirListing: false,
  })

  if (response.status !== 404) {
    return withHeaders(response, { ...SECURITY_HEADERS, 'cache-control': cacheControlFor(pathname) })
  }

  // 静态文件不存在：带扩展名的路径按 404 处理，其余交给 SPA 入口
  if (pathname.includes('.')) return withHeaders(response, SECURITY_HEADERS)

  const index = await serveFile(request, INDEX_FILE)
  return withHeaders(index, { ...SECURITY_HEADERS, 'cache-control': NO_CACHE })
}

Deno.serve((request) => {
  const pathname = new URL(request.url).pathname
  if (pathname.startsWith(`${TREND_PROXY_PATH}/`)) {
    return proxyTrendRequest(request)
  }
  if (pathname.startsWith('/api/')) {
    return jsonResponse({ error: 'Not found' }, { status: 404 })
  }
  return serveSpaAsset(request)
})
