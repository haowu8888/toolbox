// 常见图片格式的 Base64 魔数前缀（原始字节头编码后的样子）
const BASE64_SIGNATURES = [
  ['iVBORw0KGgo', 'image/png'],
  ['/9j/', 'image/jpeg'],
  ['R0lGOD', 'image/gif'],
  ['UklGR', 'image/webp'],
  ['Qk', 'image/bmp'],
  ['PHN2Zy', 'image/svg+xml'],
  ['PD94bWwg', 'image/svg+xml'],
  ['AAABAA', 'image/x-icon'],
]

const EXTENSIONS = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/bmp': 'bmp',
  'image/svg+xml': 'svg',
  'image/x-icon': 'ico',
  'image/avif': 'avif',
}

/**
 * 把用户粘贴的内容规范成图片 data URL：
 *  - 已是 data:image/...;base64, 直接使用（去掉空白）
 *  - 纯 Base64 则按魔数推断 MIME
 */
export const toImageDataUrl = (input) => {
  const value = String(input ?? '').trim()
  const dataUrlMatch = /^data:(image\/[\w.+-]+)(;[^,]*)?,([\s\S]*)$/i.exec(value)
  if (dataUrlMatch) {
    const [, mime, params = '', payload] = dataUrlMatch
    const isBase64 = /;base64/i.test(params)
    return {
      mime: mime.toLowerCase(),
      dataUrl: `data:${mime}${params},${isBase64 ? payload.replace(/\s+/g, '') : payload}`,
    }
  }
  const base64 = value.replace(/\s+/g, '')
  if (!base64 || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) {
    throw new Error('请输入 data:image 开头的数据或纯 Base64 图片内容')
  }
  const mime = BASE64_SIGNATURES.find(([prefix]) => base64.startsWith(prefix))?.[1]
  if (!mime) throw new Error('无法识别图片格式，请补充 data:image/xxx;base64, 前缀')
  return { mime, dataUrl: `data:${mime};base64,${base64}` }
}

export const extensionForMime = (mime) => EXTENSIONS[String(mime).toLowerCase()] ?? 'png'

export const mimeFromDataUrl = (dataUrl) =>
  /^data:([^;,]+)/i.exec(String(dataUrl))?.[1]?.toLowerCase() ?? ''
