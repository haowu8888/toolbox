/**
 * HTML / XML 格式化与压缩（轻量词法实现，不构建 DOM）。
 *  - 注释、CDATA、属性值里的 ">" 不会截断标签
 *  - HTML 模式下 script / style 内容重新缩进，pre / textarea 原样保留
 *  - 未闭合的标签不会导致死循环
 */
const VOID_ELEMENTS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
])
const RAW_TEXT = new Set(['script', 'style'])
const PRESERVE = new Set(['pre', 'textarea'])
const INLINE_TEXT_LIMIT = 80

const readTagEnd = (input, start) => {
  let quote = null
  for (let i = start; i < input.length; i++) {
    const c = input[i]
    if (quote) {
      if (c === quote) quote = null
    } else if (c === '"' || c === "'") {
      quote = c
    } else if (c === '>') {
      return i + 1
    }
  }
  return input.length
}

const tagName = (tag) => /^<\/?\s*([^\s/>]+)/.exec(tag)?.[1] ?? ''

export const tokenizeMarkup = (input, { html = true } = {}) => {
  const tokens = []
  let i = 0
  const push = (type, value, extra = {}) => tokens.push({ type, value, ...extra })

  while (i < input.length) {
    if (input.startsWith('<!--', i)) {
      const end = input.indexOf('-->', i + 4)
      const stop = end === -1 ? input.length : end + 3
      push('comment', input.slice(i, stop))
      i = stop
      continue
    }
    if (input.startsWith('<![CDATA[', i)) {
      const end = input.indexOf(']]>', i)
      const stop = end === -1 ? input.length : end + 3
      push('cdata', input.slice(i, stop))
      i = stop
      continue
    }
    const next = input[i + 1]
    if (input[i] === '<' && next && /[A-Za-z/!?]/.test(next)) {
      const stop = readTagEnd(input, i + 1)
      const tag = input.slice(i, stop)
      i = stop
      if (tag.startsWith('<!') || tag.startsWith('<?')) {
        push('declaration', tag)
        continue
      }
      const name = tagName(tag)
      const lower = name.toLowerCase()
      if (tag.startsWith('</')) {
        push('close', tag, { name: lower })
        continue
      }
      const selfClosing = /\/\s*>$/.test(tag) || (html && VOID_ELEMENTS.has(lower))
      push(selfClosing ? 'void' : 'open', tag, { name: lower })
      // script / style / pre / textarea 的内容不按标签解析（例如脚本里的 a < b）
      if (html && !selfClosing && (RAW_TEXT.has(lower) || PRESERVE.has(lower))) {
        const closeMatch = new RegExp(`</${lower}\\s*>`, 'i').exec(input.slice(i))
        const contentEnd = closeMatch ? i + closeMatch.index : input.length
        push(PRESERVE.has(lower) ? 'preserved' : 'raw', input.slice(i, contentEnd))
        i = contentEnd
      }
      continue
    }
    let end = i + 1
    while (end < input.length && !(input[end] === '<' && /[A-Za-z/!?]/.test(input[end + 1] ?? '')))
      end++
    push('text', input.slice(i, end))
    i = end
  }
  return tokens
}

const reindentBlock = (text, pad) => {
  const lines = text.replace(/^\s*\n|\n\s*$/g, '').split('\n')
  const nonEmpty = lines.filter((line) => line.trim())
  if (!nonEmpty.length) return []
  const common = Math.min(...nonEmpty.map((line) => /^[ \t]*/.exec(line)[0].length))
  return lines.map((line) => (line.trim() ? pad + line.slice(common).trimEnd() : ''))
}

export const formatMarkup = (input, { indent = 2, html = true } = {}) => {
  const unit = ' '.repeat(indent)
  const tokens = tokenizeMarkup(String(input), { html })
  const lines = []
  let depth = 0
  const pad = () => unit.repeat(depth)
  const collapse = (text) => text.replace(/\s+/g, ' ').trim()

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
    switch (token.type) {
      case 'open': {
        const next = tokens[i + 1]
        const after = tokens[i + 2]
        // <p>短文本</p> 或 <div></div> 保持在一行
        if (next?.type === 'close' && next.name === token.name) {
          lines.push(pad() + token.value + next.value)
          i += 1
          break
        }
        if (
          next?.type === 'text' &&
          after?.type === 'close' &&
          after.name === token.name &&
          collapse(next.value).length <= INLINE_TEXT_LIMIT
        ) {
          lines.push(pad() + token.value + collapse(next.value) + after.value)
          i += 2
          break
        }
        if (next?.type === 'preserved') {
          const close = tokens[i + 2]
          lines.push(
            pad() + token.value + next.value + (close?.type === 'close' ? close.value : ''),
          )
          i += close?.type === 'close' ? 2 : 1
          break
        }
        lines.push(pad() + token.value)
        depth++
        break
      }
      case 'close':
        depth = Math.max(0, depth - 1)
        lines.push(pad() + token.value)
        break
      case 'raw':
        lines.push(...reindentBlock(token.value, unit.repeat(depth)))
        break
      case 'preserved':
        lines.push(token.value)
        break
      case 'text': {
        const text = collapse(token.value)
        if (text) lines.push(pad() + text)
        break
      }
      default:
        lines.push(pad() + token.value.trim())
    }
  }
  return lines.join('\n')
}

/** 压缩：去掉标签之间的空白与注释，pre / textarea / script / style 内容保留 */
export const minifyMarkup = (input, { html = true } = {}) =>
  tokenizeMarkup(String(input), { html })
    .filter((token) => token.type !== 'comment')
    .map((token) => {
      if (token.type === 'text')
        return token.value.replace(/\s+/g, ' ').trim() ? token.value.replace(/\s+/g, ' ') : ''
      if (token.type === 'raw') return token.value.trim()
      return token.value
    })
    .join('')
