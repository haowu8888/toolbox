export const DEFAULT_REQUEST_TIMEOUT_MS = 10_000

/**
 * 生成一个到期自动中止的 AbortSignal；旧环境没有 AbortSignal.timeout 时返回 undefined（不限时）。
 */
export const createTimeoutSignal = (timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS) => {
  if (typeof AbortSignal === 'undefined' || typeof AbortSignal.timeout !== 'function') return undefined
  return AbortSignal.timeout(timeoutMs)
}

/**
 * 把 fetch 抛出的各类错误转成适合直接展示给用户的中文说明。
 *  - 超时 / 中止：TimeoutError、AbortError
 *  - 网络层失败（断网、DNS、CORS 被拦、CSP 拒绝）：浏览器统一抛 TypeError "Failed to fetch"
 */
export const describeRequestError = (error) => {
  const name = error?.name
  if (name === 'TimeoutError' || name === 'AbortError') return '请求超时，请稍后重试'
  if (error instanceof TypeError) return '网络请求失败，请检查网络连接后重试'
  if (error instanceof Error) return error.message
  return String(error)
}

/**
 * 带超时的 JSON 请求；非 2xx 直接抛错，方便调用方统一处理。
 */
export const fetchJson = async (url, { fetchImpl = fetch, timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS } = {}) => {
  const response = await fetchImpl(url, { signal: createTimeoutSignal(timeoutMs) })
  if (!response.ok) throw new Error(`接口返回 ${response.status}`)
  return response.json()
}
