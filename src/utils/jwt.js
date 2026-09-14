/**
 * JWT 解码（仅解析，不验证签名）。
 */

export const base64UrlToBytes = (input) => {
  let base64 = String(input ?? '')
    .trim()
    .replace(/-/g, '+')
    .replace(/_/g, '/')
  const remainder = base64.length % 4
  if (remainder === 1) throw new Error('Base64URL 长度无效')
  if (remainder) base64 += '='.repeat(4 - remainder)
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

export const base64UrlDecode = (input) => new TextDecoder('utf-8').decode(base64UrlToBytes(input))

export const base64UrlEncode = (input) => {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

const parseJsonSegment = (segment, label) => {
  let text
  try {
    text = base64UrlDecode(segment)
  } catch (err) {
    throw new Error(`${label} 不是有效的 Base64URL：${err.message}`)
  }
  try {
    const value = JSON.parse(text)
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error('内容不是 JSON 对象')
    }
    return value
  } catch (err) {
    throw new Error(`${label} 不是有效的 JSON：${err.message}`)
  }
}

/**
 * 解码 JWT。返回 { ok, error, header, payload, signature, parts }
 */
export const decodeJwt = (token) => {
  const raw = String(token ?? '').trim()
  const base = { ok: false, error: '', header: null, payload: null, signature: '', parts: [] }
  if (!raw) return base

  const parts = raw.split('.')
  if (parts.length !== 3) {
    return { ...base, parts, error: `无效的 JWT 格式：应包含 3 个部分（用 . 分隔），当前为 ${parts.length} 个` }
  }
  if (!parts[0] || !parts[1]) {
    return { ...base, parts, error: '无效的 JWT 格式：Header 或 Payload 为空' }
  }

  try {
    const header = parseJsonSegment(parts[0], 'Header')
    const payload = parseJsonSegment(parts[1], 'Payload')
    return { ok: true, error: '', header, payload, signature: parts[2], parts }
  } catch (err) {
    return { ...base, parts, error: `解码失败：${err.message}` }
  }
}

export const JWT_TIME_CLAIMS = Object.freeze(['iat', 'exp', 'nbf', 'auth_time', 'updated_at'])

export const JWT_CLAIM_DESCRIPTIONS = Object.freeze({
  iss: '签发者 (Issuer)',
  sub: '主题 (Subject)',
  aud: '受众 (Audience)',
  exp: '过期时间 (Expiration)',
  nbf: '生效时间 (Not Before)',
  iat: '签发时间 (Issued At)',
  jti: 'JWT 唯一标识 (JWT ID)',
  auth_time: '认证时间',
  scope: '授权范围',
  azp: '授权方 (Authorized Party)',
  nonce: '随机数 (Nonce)',
  typ: '类型',
  alg: '签名算法',
  kid: '密钥 ID',
})

export const isJwtTimeClaim = (key, value) => JWT_TIME_CLAIMS.includes(key) && typeof value === 'number'

/**
 * 时间相关状态。
 * 返回 { exp, nbf, iat, expired, notYetValid, remainingSeconds, lifetimeSeconds }
 */
export const getJwtTimeStatus = (payload, now = Date.now()) => {
  const nowSeconds = now / 1000
  const readNumber = (key) => (typeof payload?.[key] === 'number' ? payload[key] : null)
  const exp = readNumber('exp')
  const nbf = readNumber('nbf')
  const iat = readNumber('iat')

  return {
    exp,
    nbf,
    iat,
    expired: exp !== null && nowSeconds > exp,
    notYetValid: nbf !== null && nowSeconds < nbf,
    remainingSeconds: exp !== null ? Math.round(exp - nowSeconds) : null,
    lifetimeSeconds: exp !== null && iat !== null ? exp - iat : null,
  }
}
