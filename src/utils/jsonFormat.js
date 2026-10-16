/**
 * 无损 JSON 格式化：自带校验的递归下降解析器，数字 / 字符串字面量原样保留。
 *  - JSON.parse + stringify 会把 12345678901234567890 变成 12345678901234567000、1.0 变成 1
 *  - 出错时给出中文描述与行列号
 */
export class JsonSyntaxError extends SyntaxError {
  constructor(message, { position, line, column }) {
    super(`第 ${line} 行第 ${column} 列：${message}`)
    this.name = 'JsonSyntaxError'
    this.position = position
    this.line = line
    this.column = column
  }
}

export const stripBom = (text) => (text.charCodeAt(0) === 0xfeff ? text.slice(1) : text)

export const locate = (text, position) => {
  let line = 1
  let lineStart = 0
  for (let i = 0; i < position && i < text.length; i++) {
    if (text[i] === '\n') {
      line++
      lineStart = i + 1
    }
  }
  return { position, line, column: position - lineStart + 1 }
}

const NUMBER = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/y
const SIMPLE_ESCAPES = '"\\/bfnrt'
const LITERALS = ['true', 'false', 'null']

/**
 * @param {string} input
 * @param {number} indent 0 表示压缩
 * @returns {{ text: string, hasUnsafeNumbers: boolean }}
 */
export const formatJsonText = (input, indent = 2) => {
  const text = stripBom(String(input))
  const nl = indent ? '\n' : ''
  const colon = indent ? ': ' : ':'
  const pad = (depth) => (indent ? ' '.repeat(indent * depth) : '')
  let i = 0
  let hasUnsafeNumbers = false

  const fail = (message, position = i) => {
    throw new JsonSyntaxError(message, locate(text, position))
  }
  const unexpected = () =>
    fail(i >= text.length ? '意外的结尾' : `意外的字符 ${JSON.stringify(text[i])}`)
  const skipWhitespace = () => {
    while (
      i < text.length &&
      (text[i] === ' ' || text[i] === '\t' || text[i] === '\n' || text[i] === '\r')
    )
      i++
  }

  const parseString = () => {
    const start = i
    i++
    while (i < text.length) {
      const c = text[i]
      if (c === '"') {
        i++
        return text.slice(start, i)
      }
      if (c === '\\') {
        const escape = text[i + 1]
        if (escape === 'u') {
          if (!/^[0-9a-fA-F]{4}$/.test(text.slice(i + 2, i + 6))) fail('无效的 \\u 转义', i)
          i += 6
          continue
        }
        if (escape === undefined || !SIMPLE_ESCAPES.includes(escape)) fail('无效的转义字符', i)
        i += 2
        continue
      }
      if (c < ' ') fail('字符串中包含未转义的控制字符（如换行）', i)
      i++
    }
    return fail('字符串缺少结束引号', start)
  }

  const parseNumber = () => {
    NUMBER.lastIndex = i
    const match = NUMBER.exec(text)
    if (!match) unexpected()
    const literal = match[0]
    if (/^-?\d+$/.test(literal) && !Number.isSafeInteger(Number(literal))) hasUnsafeNumbers = true
    i = NUMBER.lastIndex
    return literal
  }

  const parseContainer = (depth, close, isObject) => {
    i++
    skipWhitespace()
    const open = isObject ? '{' : '['
    if (text[i] === close) {
      i++
      return open + close
    }
    const items = []
    for (;;) {
      skipWhitespace()
      let item = ''
      if (isObject) {
        if (text[i] !== '"') fail(i >= text.length ? '意外的结尾' : '属性名必须是双引号字符串')
        item = parseString()
        skipWhitespace()
        if (text[i] !== ':') fail('属性名后缺少冒号')
        i++
        item += colon
      }
      item += parseValue(depth + 1)
      items.push(item)
      skipWhitespace()
      if (text[i] === ',') {
        const commaAt = i
        i++
        skipWhitespace()
        if (text[i] === close) fail('不允许尾随逗号', commaAt)
        continue
      }
      if (text[i] === close) {
        i++
        break
      }
      fail(i >= text.length ? `缺少 ${close}` : `此处应为 , 或 ${close}`)
    }
    const inner = pad(depth + 1)
    return open + nl + items.map((item) => inner + item).join(',' + nl) + nl + pad(depth) + close
  }

  const parseValue = (depth) => {
    skipWhitespace()
    const c = text[i]
    if (c === '{') return parseContainer(depth, '}', true)
    if (c === '[') return parseContainer(depth, ']', false)
    if (c === '"') return parseString()
    if (c === '-' || (c >= '0' && c <= '9')) return parseNumber()
    for (const literal of LITERALS) {
      if (text.startsWith(literal, i)) {
        i += literal.length
        return literal
      }
    }
    return unexpected()
  }

  const output = parseValue(0)
  skipWhitespace()
  if (i < text.length) fail('JSON 结束后还有多余内容')
  return { text: output, hasUnsafeNumbers }
}

/** 生成 JSONPath 片段：合法标识符用 .key，其余用 ["key"]，数组用 [0] */
export const childPath = (parentPath, key) => {
  if (typeof key === 'number') return `${parentPath}[${key}]`
  return /^[A-Za-z_$][\w$]*$/.test(key)
    ? `${parentPath}.${key}`
    : `${parentPath}[${JSON.stringify(key)}]`
}
