/**
 * SQL 格式化 / 压缩。基于词法分析，字符串、注释、标识符、参数占位符原样保留。
 */

const MAJOR_KEYWORDS = new Set([
  'SELECT',
  'FROM',
  'WHERE',
  'GROUP BY',
  'ORDER BY',
  'HAVING',
  'LIMIT',
  'OFFSET',
  'UNION',
  'UNION ALL',
  'INTERSECT',
  'EXCEPT',
  'INSERT INTO',
  'VALUES',
  'UPDATE',
  'SET',
  'DELETE FROM',
  'CREATE TABLE',
  'ALTER TABLE',
  'DROP TABLE',
  'WITH',
  'RETURNING',
  'PARTITION BY',
  'WINDOW',
])
const JOIN_KEYWORDS = new Set([
  'JOIN',
  'INNER JOIN',
  'LEFT JOIN',
  'RIGHT JOIN',
  'FULL JOIN',
  'FULL OUTER JOIN',
  'LEFT OUTER JOIN',
  'RIGHT OUTER JOIN',
  'CROSS JOIN',
  'NATURAL JOIN',
])
const SUB_KEYWORDS = new Set(['AND', 'OR', 'ON'])
const MULTI_WORD = [
  'LEFT OUTER JOIN',
  'RIGHT OUTER JOIN',
  'FULL OUTER JOIN',
  'GROUP BY',
  'ORDER BY',
  'PARTITION BY',
  'INNER JOIN',
  'LEFT JOIN',
  'RIGHT JOIN',
  'FULL JOIN',
  'CROSS JOIN',
  'NATURAL JOIN',
  'UNION ALL',
  'INSERT INTO',
  'DELETE FROM',
  'CREATE TABLE',
  'ALTER TABLE',
  'DROP TABLE',
  'IS NOT',
  'NOT IN',
  'NOT EXISTS',
  'NOT LIKE',
  'NOT BETWEEN',
]
const OTHER_KEYWORDS = new Set([
  'AS',
  'IN',
  'BETWEEN',
  'LIKE',
  'ILIKE',
  'EXISTS',
  'CASE',
  'WHEN',
  'THEN',
  'ELSE',
  'END',
  'NULL',
  'TRUE',
  'FALSE',
  'NOT',
  'IS',
  'ASC',
  'DESC',
  'DISTINCT',
  'ALL',
  'ANY',
  'SOME',
  'INTO',
  'TABLE',
  'INDEX',
  'VIEW',
  'TRIGGER',
  'FUNCTION',
  'PROCEDURE',
  'IF',
  'BEGIN',
  'COMMIT',
  'ROLLBACK',
  'CAST',
  'COALESCE',
  'NULLIF',
  'COUNT',
  'SUM',
  'AVG',
  'MIN',
  'MAX',
  'OVER',
  'USING',
  'PRIMARY',
  'KEY',
  'FOREIGN',
  'REFERENCES',
  'DEFAULT',
  'UNIQUE',
  'CONSTRAINT',
  'CHECK',
  'RECURSIVE',
  'LATERAL',
  'NULLS',
  'FIRST',
  'LAST',
  'TOP',
])
// 这些关键字后面的括号前保留空格（IN (1, 2)），其它单词后紧跟括号视为函数调用（COUNT(*)）
const SPACE_BEFORE_PAREN = new Set([
  'IN',
  'NOT IN',
  'EXISTS',
  'NOT EXISTS',
  'VALUES',
  'AS',
  'ANY',
  'ALL',
  'SOME',
  'USING',
  'OVER',
  'ON',
  'AND',
  'OR',
  'NOT',
  'WHEN',
  'THEN',
  'ELSE',
  'IS',
  'IS NOT',
  'BETWEEN',
  'LIKE',
  'RETURNING',
  ...MAJOR_KEYWORDS,
  ...JOIN_KEYWORDS,
])

const WORD = /[A-Za-z_\u0080-￿][\w$\u0080-￿]*(?:\.(?:[A-Za-z_\u0080-￿][\w$\u0080-￿]*|\*))*/y
const NUMBER = /(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/y
const PARAM = /(?:[@:$][\w$]+|\?)/y
const MULTI_CHAR_OPERATORS = ['>=', '<=', '<>', '!=', '||', '::', '->>', '->', '=>']

const readQuoted = (input, start, close, doubledEscape) => {
  let i = start + 1
  while (i < input.length) {
    if (input[i] === close) {
      if (doubledEscape && input[i + 1] === close) {
        i += 2
        continue
      }
      return i + 1
    }
    if (input[i] === '\\' && close === "'") i++
    i++
  }
  return input.length
}

const matchAt = (regex, input, i) => {
  regex.lastIndex = i
  const match = regex.exec(input)
  return match ? match[0] : ''
}

export const tokenizeSql = (input) => {
  const tokens = []
  let i = 0
  while (i < input.length) {
    const c = input[i]
    if (/\s/.test(c)) {
      i++
      continue
    }
    if (c === '-' && input[i + 1] === '-') {
      const end = input.indexOf('\n', i)
      const stop = end === -1 ? input.length : end
      tokens.push({ type: 'lineComment', value: input.slice(i, stop).trimEnd() })
      i = stop
      continue
    }
    if (c === '/' && input[i + 1] === '*') {
      const end = input.indexOf('*/', i + 2)
      const stop = end === -1 ? input.length : end + 2
      tokens.push({ type: 'blockComment', value: input.slice(i, stop) })
      i = stop
      continue
    }
    if (c === "'" || c === '"' || c === '`') {
      const stop = readQuoted(input, i, c, true)
      tokens.push({ type: c === "'" ? 'string' : 'identifier', value: input.slice(i, stop) })
      i = stop
      continue
    }
    if (c === '[') {
      const end = input.indexOf(']', i)
      const stop = end === -1 ? input.length : end + 1
      tokens.push({ type: 'identifier', value: input.slice(i, stop) })
      i = stop
      continue
    }
    if (c === '(' || c === ')') {
      tokens.push({ type: c === '(' ? 'open' : 'close', value: c })
      i++
      continue
    }
    if (c === ',' || c === ';') {
      tokens.push({ type: c === ',' ? 'comma' : 'semicolon', value: c })
      i++
      continue
    }
    const operator = MULTI_CHAR_OPERATORS.find((op) => input.startsWith(op, i))
    if (operator) {
      tokens.push({ type: 'operator', value: operator })
      i += operator.length
      continue
    }
    const word = matchAt(WORD, input, i)
    if (word) {
      tokens.push({ type: 'word', value: word })
      i += word.length
      continue
    }
    const number = matchAt(NUMBER, input, i)
    if (number) {
      tokens.push({ type: 'number', value: number })
      i += number.length
      continue
    }
    const param = matchAt(PARAM, input, i)
    if (param) {
      tokens.push({ type: 'param', value: param })
      i += param.length
      continue
    }
    tokens.push({ type: 'operator', value: c })
    i++
  }
  return mergeMultiWordKeywords(tokens)
}

const mergeMultiWordKeywords = (tokens) => {
  const merged = []
  for (let i = 0; i < tokens.length; i++) {
    let matched = false
    if (tokens[i].type === 'word') {
      for (const len of [3, 2]) {
        const slice = tokens.slice(i, i + len)
        if (slice.length !== len || !slice.every((t) => t.type === 'word')) continue
        const upper = slice.map((t) => t.value.toUpperCase()).join(' ')
        if (MULTI_WORD.includes(upper)) {
          merged.push({ type: 'word', value: slice.map((t) => t.value).join(' ') })
          i += len - 1
          matched = true
          break
        }
      }
    }
    if (!matched) merged.push(tokens[i])
  }
  return merged
}

const isKeyword = (upper) =>
  MAJOR_KEYWORDS.has(upper) ||
  JOIN_KEYWORDS.has(upper) ||
  SUB_KEYWORDS.has(upper) ||
  OTHER_KEYWORDS.has(upper) ||
  MULTI_WORD.includes(upper)

const isUnaryContext = (prev) =>
  !prev ||
  ['operator', 'open', 'comma'].includes(prev.type) ||
  (prev.type === 'word' && isKeyword(prev.value.toUpperCase()))

export const formatSql = (sql, { indent = 2, uppercase = true } = {}) => {
  const unit = ' '.repeat(indent)
  const tokens = tokenizeSql(String(sql))
  let out = ''
  let depth = 0
  const parens = []
  // SELECT 列表所在的括号深度：只有这一层的逗号才换行，函数参数里的逗号不换行
  let selectDepth = -1
  let betweenPending = false
  let glueNext = false

  const newline = (extra = 0) => '\n' + unit.repeat(depth + extra)
  const append = (text) => {
    const needsSpace = out && !glueNext && !/[\s(]$/.test(out)
    out += (needsSpace ? ' ' : '') + text
    glueNext = false
  }
  // 位于函数调用 / 普通括号（非子查询）内部时，关键字不换行
  const inInlineParen = () => parens.length > 0 && !parens[parens.length - 1].subquery

  tokens.forEach((token, index) => {
    const { type, value } = token
    const prev = tokens[index - 1]
    const upper = value.toUpperCase()

    if (type === 'word') {
      const text = uppercase && isKeyword(upper) ? upper : value
      if (MAJOR_KEYWORDS.has(upper) && !inInlineParen()) {
        // 子查询的 "(" 之后已经换行缩进，不要再换一次
        out += out && !/\n *$/.test(out) ? newline() + text : text
        selectDepth = upper === 'SELECT' ? depth : depth === selectDepth ? -1 : selectDepth
        glueNext = false
      } else if (JOIN_KEYWORDS.has(upper) && !inInlineParen()) {
        out += newline() + text
        if (depth === selectDepth) selectDepth = -1
      } else if (SUB_KEYWORDS.has(upper) && !inInlineParen()) {
        if (upper === 'AND' && betweenPending) {
          betweenPending = false
          append(text)
        } else {
          out += newline(1) + text
        }
      } else {
        if (upper === 'BETWEEN' || upper === 'NOT BETWEEN') betweenPending = true
        append(text)
      }
      return
    }

    if (type === 'open') {
      const prevUpper = prev?.type === 'word' ? prev.value.toUpperCase() : ''
      const isCall = prev?.type === 'word' && !SPACE_BEFORE_PAREN.has(prevUpper)
      const next = tokens
        .slice(index + 1)
        .find((t) => t.type !== 'lineComment' && t.type !== 'blockComment')
      const subquery =
        next?.type === 'word' && ['SELECT', 'WITH'].includes(next.value.toUpperCase())
      if (isCall) glueNext = true
      append('(')
      parens.push({ subquery, selectDepth })
      depth++
      if (subquery) out += newline()
      return
    }

    if (type === 'close') {
      const paren = parens.pop()
      depth = Math.max(0, depth - 1)
      if (paren?.subquery) out = out.trimEnd() + newline() + ')'
      else out = out.trimEnd() + ')'
      if (paren) selectDepth = paren.selectDepth
      return
    }

    if (type === 'comma') {
      out = out.trimEnd() + ','
      if (depth === selectDepth) out += newline(1)
      return
    }

    if (type === 'semicolon') {
      out = out.trimEnd() + ';\n\n'
      depth = 0
      parens.length = 0
      selectDepth = -1
      betweenPending = false
      return
    }

    if (type === 'lineComment') {
      append(value)
      // 行注释后必须换行，否则后面的代码会被注释掉
      out += newline()
      return
    }

    if (type === 'operator' && (value === '.' || value === '::')) {
      out = out.trimEnd() + value
      glueNext = true
      return
    }

    if (type === 'operator' && (value === '-' || value === '+') && isUnaryContext(prev)) {
      append(value)
      glueNext = true
      return
    }

    append(value)
  })

  return out
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** 压缩为单行：丢弃注释（行注释留在单行里会吞掉后续代码），字符串原样保留 */
export const minifySql = (sql) => {
  const tokens = tokenizeSql(String(sql)).filter(
    (t) => t.type !== 'lineComment' && t.type !== 'blockComment',
  )
  let out = ''
  tokens.forEach((token, index) => {
    const prev = tokens[index - 1]
    const glue =
      !prev ||
      prev.type === 'open' ||
      token.type === 'close' ||
      token.type === 'comma' ||
      token.type === 'semicolon' ||
      (token.type === 'open' &&
        prev.type === 'word' &&
        !SPACE_BEFORE_PAREN.has(prev.value.toUpperCase())) ||
      ['.', '::'].includes(token.value) ||
      ['.', '::'].includes(prev.value)
    out += (glue ? '' : ' ') + token.value
  })
  return out
}
