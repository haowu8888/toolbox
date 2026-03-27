export const safeParseUrl = (raw) => {
  const value = String(raw || '').trim()
  if (!value) return { url: null, error: '' }

  try {
    return { url: new URL(value), error: '' }
  } catch {
    // 兼容用户输入 host/path（无协议）形式
    try {
      return { url: new URL(`https://${value}`), error: '' }
    } catch (err2) {
      return { url: null, error: err2?.message || 'URL 解析失败' }
    }
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

