/**
 * 颜色换算工具（HEX / RGB / HSL）与 WCAG 对比度。
 */

/** 规范化 HEX：接受 #abc、abc、#aabbcc、aabbcc，返回大写 #AABBCC；不合法返回 null */
export const normalizeHex = (input) => {
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(input ?? '').trim())
  if (!match) return null
  const hex = match[1].length === 3 ? [...match[1]].map((c) => c + c).join('') : match[1]
  return `#${hex.toUpperCase()}`
}

export const hexToRgb = (input) => {
  const hex = normalizeHex(input)
  if (!hex) return null
  const num = parseInt(hex.slice(1), 16)
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 }
}

export const rgbToHex = (r, g, b) =>
  '#' +
  [r, g, b]
    .map((x) => Math.round(x).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()

export const rgbToHsl = (r, g, b) => {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  let h = 0
  let s = 0

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
    else if (max === g) h = ((b - r) / d + 2) / 6
    else h = ((r - g) / d + 4) / 6
  }

  return { h: Math.round(h * 360) % 360, s: Math.round(s * 100), l: Math.round(l * 100) }
}

export const hslToRgb = (h, s, l) => {
  h = (((h % 360) + 360) % 360) / 360
  s /= 100
  l /= 100
  if (s === 0) {
    const v = Math.round(l * 255)
    return { r: v, g: v, b: v }
  }
  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  return {
    r: Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    g: Math.round(hue2rgb(p, q, h) * 255),
    b: Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  }
}

export const hslToHex = (h, s, l) => {
  const { r, g, b } = hslToRgb(h, s, l)
  return rgbToHex(r, g, b)
}

// WCAG 2.x 相对亮度
export const relativeLuminance = ({ r, g, b }) => {
  const channel = (value) => {
    const c = value / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

export const contrastRatio = (a, b) => {
  const la = relativeLuminance(a)
  const lb = relativeLuminance(b)
  const [light, dark] = la > lb ? [la, lb] : [lb, la]
  return (light + 0.05) / (dark + 0.05)
}

/** 普通文本 AA ≥ 4.5、AAA ≥ 7；大号文本 AA ≥ 3 */
export const wcagLevel = (ratio) => {
  if (ratio >= 7) return 'AAA'
  if (ratio >= 4.5) return 'AA'
  if (ratio >= 3) return 'AA 大字'
  return '不达标'
}
