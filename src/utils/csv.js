/**
 * CSV / TSV 解析与生成（RFC 4180：双引号包裹、"" 转义、字段内换行）。
 */
export const parseDelimited = (input, delimiter = ',') => {
  // Excel 导出的 UTF-8 CSV 带 BOM，不去掉会混进第一个表头
  const text = String(input).replace(/^\uFEFF/, '')
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false
  let quoteStartLine = 0
  let line = 1

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (char === '\n') line++

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += char
      }
      continue
    }

    if (char === '"' && field === '') {
      inQuotes = true
      quoteStartLine = line
      continue
    }
    if (char === '\r') continue
    if (char === delimiter) {
      row.push(field)
      field = ''
      continue
    }
    if (char === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
      continue
    }
    field += char
  }

  if (inQuotes) throw new Error(`第 ${quoteStartLine} 行的引号没有闭合`)
  row.push(field)
  rows.push(row)
  return rows.filter((r) => r.some((cell) => cell !== ''))
}

/** 表头去重 / 补全：空表头 → colN，重复 → name_2、name_3 */
export const normalizeHeaders = (headers, width = headers.length) => {
  const seen = new Map()
  return Array.from({ length: Math.max(width, headers.length) }, (_, idx) => {
    const base = String(headers[idx] ?? '').trim() || `col${idx + 1}`
    const count = (seen.get(base) || 0) + 1
    seen.set(base, count)
    return count === 1 ? base : `${base}_${count}`
  })
}

export const csvToObjects = (input, { delimiter = ',', hasHeader = true } = {}) => {
  const rows = parseDelimited(input, delimiter)
  if (!rows.length) return []
  const width = Math.max(...rows.map((r) => r.length))
  const headers = normalizeHeaders(hasHeader ? rows[0] : [], width)
  const dataRows = hasHeader ? rows.slice(1) : rows
  return dataRows.map((r) => Object.fromEntries(headers.map((h, idx) => [h, r[idx] ?? ''])))
}

const cellText = (value) => {
  if (value === null || value === undefined) return ''
  // 嵌套对象 / 数组序列化成 JSON，避免输出 "[object Object]"
  return typeof value === 'object' ? JSON.stringify(value) : String(value)
}

export const escapeCsvField = (value, delimiter = ',') => {
  const raw = cellText(value)
  const needsQuote = /["\r\n]/.test(raw) || raw.includes(delimiter) || /^\s|\s$/.test(raw)
  return needsQuote ? `"${raw.replaceAll('"', '""')}"` : raw
}

export const objectsToCsv = (objects, { delimiter = ',' } = {}) => {
  const headers = []
  const headerSet = new Set()
  for (const obj of objects) {
    for (const key of Object.keys(obj)) {
      if (!headerSet.has(key)) {
        headerSet.add(key)
        headers.push(key)
      }
    }
  }
  const lines = [headers.map((h) => escapeCsvField(h, delimiter)).join(delimiter)]
  for (const obj of objects)
    lines.push(headers.map((h) => escapeCsvField(obj[h], delimiter)).join(delimiter))
  return lines.join('\n')
}
