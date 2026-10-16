/**
 * 正则匹配的纯函数实现，既在 Web Worker 中运行（防止灾难性回溯卡死页面），
 * 也可在不支持 Worker 的环境下同步调用。
 */
export const MAX_MATCHES = 1000
export const SUPPORTED_FLAGS = ['g', 'i', 'm', 's', 'u']

export const buildRegex = (pattern, flags = '', extraFlags = '') => {
  const merged = [...new Set(`${flags}${extraFlags}`.split(''))].join('')
  return new RegExp(pattern, merged)
}

/**
 * @returns {{
 *   matches: { index: number, text: string, groups: (string|undefined)[], named: Record<string,string>|null }[],
 *   truncated: boolean,
 *   segments: { text: string, match: boolean }[],
 *   replaced?: string,
 * }}
 */
export const runRegex = ({ pattern, flags = '', text = '', replacement, withReplace = false }) => {
  // 列出匹配时总是按全局枚举；未勾选 g 时替换仍只替换第一个，符合 String#replace 语义
  const regex = buildRegex(pattern, flags, 'g')
  const matches = []
  const segments = []
  let lastIndex = 0
  let truncated = false

  for (const match of text.matchAll(regex)) {
    if (matches.length >= MAX_MATCHES) {
      truncated = true
      break
    }
    matches.push({
      index: match.index,
      text: match[0],
      groups: match.slice(1),
      named: match.groups ? { ...match.groups } : null,
    })
    if (match.index > lastIndex)
      segments.push({ text: text.slice(lastIndex, match.index), match: false })
    // 零宽匹配没有可高亮的文字
    if (match[0]) segments.push({ text: match[0], match: true })
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < text.length) segments.push({ text: text.slice(lastIndex), match: false })

  const result = { matches, truncated, segments }
  if (withReplace) result.replaced = text.replace(buildRegex(pattern, flags), replacement ?? '')
  return result
}
