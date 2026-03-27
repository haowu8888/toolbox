import { serveDir, serveFile } from 'https://deno.land/std@0.217.0/http/file_server.ts'
import { METAL_DEFS } from './src/utils/metalPrice.js'

const DIST_ROOT = 'dist'
const INDEX_FILE = `${DIST_ROOT}/index.html`
const TREND_PROXY_PATH = '/api/finance/chart'
const YAHOO_CHART_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart'
const ALLOWED_TREND_TICKERS = new Set(METAL_DEFS.map((item) => item.chartTicker))

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

  const interval = searchParams.get('interval')
  const range = searchParams.get('range')
  if (!interval || !range) {
    throw new Error('Missing trend query parameters')
  }

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
    })

    return new Response(response.body, {
      status: response.status,
      headers: {
        'cache-control': 'public, s-maxage=60, stale-while-revalidate=300',
        'content-type': response.headers.get('content-type') || 'application/json; charset=utf-8',
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const status = message.startsWith('Unsupported') || message.startsWith('Missing') ? 400 : 502
    return jsonResponse({ error: message }, { status })
  }
}

const serveSpaAsset = async (request: Request) => {
  const response = await serveDir(request, {
    fsRoot: DIST_ROOT,
    quiet: true,
    showDirListing: false,
  })

  if (response.status !== 404) return response

  const pathname = new URL(request.url).pathname
  if (pathname.includes('.')) return response

  return serveFile(request, INDEX_FILE)
}

Deno.serve((request) => {
  const pathname = new URL(request.url).pathname
  if (pathname.startsWith(`${TREND_PROXY_PATH}/`)) {
    return proxyTrendRequest(request)
  }
  return serveSpaAsset(request)
})
