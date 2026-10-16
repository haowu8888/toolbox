// 带 "//" 的层级型 scheme（https://、ftp://、chrome-extension:// ……）
const HIERARCHICAL_SCHEME = /^[a-z][a-z\d+.-]*:\/\//i
// 合法但不带 "//" 的常见 scheme；其余 "xxx:" 前缀视为 host:port，例如 localhost:3000
const OPAQUE_SCHEME = /^(?:mailto|tel|sms|data|blob|about|javascript|urn|magnet|file):/i

export const safeParseUrl = (raw) => {
  const value = String(raw || '').trim()
  if (!value) return { url: null, error: '' }

  // 兼容用户输入 host/path、host:port（无协议）形式
  const candidate = HIERARCHICAL_SCHEME.test(value) || OPAQUE_SCHEME.test(value) ? value : `https://${value}`
  try {
    return { url: new URL(candidate), error: '' }
  } catch (err) {
    return { url: null, error: err?.message || 'URL 解析失败' }
  }
}

export const parseQueryString = (raw) => {
  const text = String(raw || '').trim().replace(/^\?/, '')
  const params = new URLSearchParams(text)
  const obj = {}
  for (const [key, value] of params.entries()) {
    if (Object.hasOwn(obj, key)) {
      const prev = obj[key]
      obj[key] = Array.isArray(prev) ? [...prev, value] : [prev, value]
    } else {
      obj[key] = value
    }
  }
  return obj
}

export const stringifyQuery = (obj) => {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(obj || {})) {
    if (value === null || value === undefined) continue
    if (Array.isArray(value)) {
      for (const v of value) params.append(key, String(v))
    } else {
      params.set(key, String(value))
    }
  }
  return params.toString()
}

