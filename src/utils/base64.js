/**
 * UTF-8 安全的 Base64 编解码。
 *  - 解码兼容 URL-safe 字母表（- _）、缺失的 = 填充以及换行 / 空白
 *  - 解码结果不是合法 UTF-8 时抛错，而不是悄悄输出乱码
 */
export const base64Encode = (text, { urlSafe = false } = {}) => {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  // 分块拼接，避免超长输入时逐字符拼接过慢
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  const encoded = btoa(binary)
  return urlSafe ? encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') : encoded
}

export const normalizeBase64 = (text) => {
  const compact = String(text).replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/')
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(compact)) throw new Error('包含非 Base64 字符')
  const unpadded = compact.replace(/=+$/, '')
  if (unpadded.length % 4 === 1) throw new Error('Base64 长度不正确')
  return unpadded + '='.repeat((4 - (unpadded.length % 4)) % 4)
}

export const base64ToBytes = (text) => {
  const binary = atob(normalizeBase64(text))
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

export const base64Decode = (text) => {
  const bytes = base64ToBytes(text)
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    throw new Error('解码结果不是有效的 UTF-8 文本（可能是二进制数据）')
  }
}
