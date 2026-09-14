/**
 * 行级文本对比。
 *
 * 算法：先裁掉公共前后缀，再用 patience diff（两侧唯一行 + 最长递增子序列）
 * 定位锚点并递归；无锚点的小片段回退到 LCS 动态规划（单元格数量受限），
 * 超大片段直接视为整体替换，避免 O(m·n) 内存把页面卡死。
 */

const LCS_CELL_LIMIT = 4_000_000

export const splitLines = (text) => {
  if (text === null || text === undefined || text === '') return []
  const lines = String(text).split('\n')
  if (lines.length && lines[lines.length - 1] === '') lines.pop()
  return lines
}

const normalizeLine = (line, { ignoreWhitespace = false, ignoreCase = false } = {}) => {
  let out = line
  if (ignoreWhitespace) out = out.replace(/\s+/g, ' ').trim()
  if (ignoreCase) out = out.toLowerCase()
  return out
}

const pushEqual = (out, a, b) => out.push({ type: 'equal', a, b })
const pushDelete = (out, a) => out.push({ type: 'delete', a })
const pushInsert = (out, b) => out.push({ type: 'insert', b })

const lcsDiff = (a, aStart, aEnd, b, bStart, bEnd, out) => {
  const m = aEnd - aStart
  const n = bEnd - bStart
  const width = n + 1
  const table = new Uint32Array((m + 1) * width)

  for (let i = m - 1; i >= 0; i--) {
    const rowOffset = i * width
    const nextRowOffset = rowOffset + width
    for (let j = n - 1; j >= 0; j--) {
      if (a[aStart + i] === b[bStart + j]) {
        table[rowOffset + j] = table[nextRowOffset + j + 1] + 1
      } else {
        const down = table[nextRowOffset + j]
        const right = table[rowOffset + j + 1]
        table[rowOffset + j] = down >= right ? down : right
      }
    }
  }

  let i = 0
  let j = 0
  while (i < m && j < n) {
    if (a[aStart + i] === b[bStart + j]) {
      pushEqual(out, aStart + i, bStart + j)
      i++
      j++
    } else if (table[(i + 1) * width + j] >= table[i * width + j + 1]) {
      pushDelete(out, aStart + i)
      i++
    } else {
      pushInsert(out, bStart + j)
      j++
    }
  }
  while (i < m) pushDelete(out, aStart + i++)
  while (j < n) pushInsert(out, bStart + j++)
}

const longestIncreasingSubsequence = (pairs) => {
  if (pairs.length === 0) return []
  const tails = []
  const prev = new Int32Array(pairs.length).fill(-1)

  for (let i = 0; i < pairs.length; i++) {
    const value = pairs[i][1]
    let lo = 0
    let hi = tails.length
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (pairs[tails[mid]][1] < value) lo = mid + 1
      else hi = mid
    }
    if (lo > 0) prev[i] = tails[lo - 1]
    tails[lo] = i
  }

  const result = []
  let k = tails[tails.length - 1]
  while (k !== -1) {
    result.push(pairs[k])
    k = prev[k]
  }
  return result.reverse()
}

const findUniqueAnchors = (a, aStart, aEnd, b, bStart, bEnd) => {
  const countA = new Map()
  const countB = new Map()
  for (let i = aStart; i < aEnd; i++) countA.set(a[i], (countA.get(a[i]) || 0) + 1)
  for (let j = bStart; j < bEnd; j++) countB.set(b[j], (countB.get(b[j]) || 0) + 1)

  const positionInB = new Map()
  for (let j = bStart; j < bEnd; j++) {
    const key = b[j]
    if (countB.get(key) === 1 && countA.get(key) === 1) positionInB.set(key, j)
  }

  const pairs = []
  for (let i = aStart; i < aEnd; i++) {
    const key = a[i]
    if (countA.get(key) === 1 && positionInB.has(key)) pairs.push([i, positionInB.get(key)])
  }
  return longestIncreasingSubsequence(pairs)
}

const patienceDiff = (a, aStart, aEnd, b, bStart, bEnd, out) => {
  while (aStart < aEnd && bStart < bEnd && a[aStart] === b[bStart]) {
    pushEqual(out, aStart, bStart)
    aStart++
    bStart++
  }

  let suffix = 0
  while (aEnd > aStart && bEnd > bStart && a[aEnd - 1] === b[bEnd - 1]) {
    aEnd--
    bEnd--
    suffix++
  }

  const m = aEnd - aStart
  const n = bEnd - bStart

  if (m === 0) {
    for (let j = bStart; j < bEnd; j++) pushInsert(out, j)
  } else if (n === 0) {
    for (let i = aStart; i < aEnd; i++) pushDelete(out, i)
  } else {
    const anchors = findUniqueAnchors(a, aStart, aEnd, b, bStart, bEnd)
    if (anchors.length === 0) {
      if (m * n <= LCS_CELL_LIMIT) {
        lcsDiff(a, aStart, aEnd, b, bStart, bEnd, out)
      } else {
        for (let i = aStart; i < aEnd; i++) pushDelete(out, i)
        for (let j = bStart; j < bEnd; j++) pushInsert(out, j)
      }
    } else {
      let ai = aStart
      let bi = bStart
      for (const [ax, bx] of anchors) {
        patienceDiff(a, ai, ax, b, bi, bx, out)
        pushEqual(out, ax, bx)
        ai = ax + 1
        bi = bx + 1
      }
      patienceDiff(a, ai, aEnd, b, bi, bEnd, out)
    }
  }

  for (let k = 0; k < suffix; k++) pushEqual(out, aEnd + k, bEnd + k)
}

/**
 * 对比两个序列（字符串数组），返回操作列表。
 */
export const diffSequences = (a, b) => {
  const ops = []
  patienceDiff(a, 0, a.length, b, 0, b.length, ops)
  return ops
}

/**
 * 行级对比。返回：
 * {
 *   entries: [{ type: 'equal'|'insert'|'delete', text, oldLine, newLine }],
 *   stats: { added, deleted, unchanged, changed },
 *   oldLineCount, newLineCount
 * }
 */
export const diffLines = (oldText, newText, options = {}) => {
  const oldLines = splitLines(oldText)
  const newLines = splitLines(newText)
  const a = oldLines.map((line) => normalizeLine(line, options))
  const b = newLines.map((line) => normalizeLine(line, options))
  const ops = diffSequences(a, b)

  const stats = { added: 0, deleted: 0, unchanged: 0, changed: 0 }
  const entries = ops.map((op) => {
    if (op.type === 'equal') {
      stats.unchanged++
      return { type: 'equal', text: newLines[op.b], oldLine: op.a + 1, newLine: op.b + 1 }
    }
    if (op.type === 'delete') {
      stats.deleted++
      return { type: 'delete', text: oldLines[op.a], oldLine: op.a + 1, newLine: null }
    }
    stats.added++
    return { type: 'insert', text: newLines[op.b], oldLine: null, newLine: op.b + 1 }
  })
  stats.changed = stats.added + stats.deleted

  return { entries, stats, oldLineCount: oldLines.length, newLineCount: newLines.length }
}

/**
 * 字符级对比（用于行内高亮）。返回 { oldSegments, newSegments }，
 * 每段为 { text, changed }。
 */
export const diffInline = (oldLine, newLine) => {
  const a = Array.from(oldLine ?? '')
  const b = Array.from(newLine ?? '')
  const ops = diffSequences(a, b)

  const oldSegments = []
  const newSegments = []
  const push = (list, text, changed) => {
    const last = list[list.length - 1]
    if (last && last.changed === changed) last.text += text
    else list.push({ text, changed })
  }

  for (const op of ops) {
    if (op.type === 'equal') {
      push(oldSegments, a[op.a], false)
      push(newSegments, b[op.b], false)
    } else if (op.type === 'delete') {
      push(oldSegments, a[op.a], true)
    } else {
      push(newSegments, b[op.b], true)
    }
  }
  return { oldSegments, newSegments }
}

/**
 * 将对比结果按上下文行数拆成 hunk。
 */
export const buildHunks = (entries, context = 3) => {
  const hunks = []
  const total = entries.length
  let index = 0

  while (index < total) {
    if (entries[index].type === 'equal') {
      index++
      continue
    }

    const start = Math.max(0, index - context)
    let lastChange = index
    let cursor = index
    while (cursor < total) {
      if (entries[cursor].type !== 'equal') {
        lastChange = cursor
        cursor++
        continue
      }
      let equalEnd = cursor
      while (equalEnd < total && entries[equalEnd].type === 'equal') equalEnd++
      if (equalEnd >= total || equalEnd - cursor > context * 2) break
      cursor = equalEnd
    }
    const end = Math.min(total, lastChange + 1 + context)
    const slice = entries.slice(start, end)

    const oldLinesBefore = entries.slice(0, start).filter((e) => e.oldLine !== null).length
    const newLinesBefore = entries.slice(0, start).filter((e) => e.newLine !== null).length
    const oldCount = slice.filter((e) => e.oldLine !== null).length
    const newCount = slice.filter((e) => e.newLine !== null).length

    hunks.push({
      oldStart: oldCount ? oldLinesBefore + 1 : oldLinesBefore,
      oldCount,
      newStart: newCount ? newLinesBefore + 1 : newLinesBefore,
      newCount,
      entries: slice,
    })
    index = end
  }

  return hunks
}

const PREFIX = { equal: ' ', insert: '+', delete: '-' }

export const formatUnifiedDiff = (entries, { oldName = 'a.txt', newName = 'b.txt', context = 3 } = {}) => {
  const hunks = buildHunks(entries, context)
  if (hunks.length === 0) return ''
  const lines = [`--- ${oldName}`, `+++ ${newName}`]
  for (const hunk of hunks) {
    lines.push(`@@ -${hunk.oldStart},${hunk.oldCount} +${hunk.newStart},${hunk.newCount} @@`)
    for (const entry of hunk.entries) lines.push(PREFIX[entry.type] + entry.text)
  }
  return lines.join('\n')
}

export const formatSimpleDiff = (entries) =>
  entries.map((entry) => `${PREFIX[entry.type]} ${entry.text}`).join('\n')

/**
 * 并排视图的行配对：删除与插入按顺序两两对齐。
 */
export const buildSideBySideRows = (entries) => {
  const rows = []
  let index = 0
  while (index < entries.length) {
    const entry = entries[index]
    if (entry.type === 'equal') {
      rows.push({ left: entry, right: entry, kind: 'equal' })
      index++
      continue
    }

    const deletes = []
    const inserts = []
    while (index < entries.length && entries[index].type !== 'equal') {
      if (entries[index].type === 'delete') deletes.push(entries[index])
      else inserts.push(entries[index])
      index++
    }

    const length = Math.max(deletes.length, inserts.length)
    for (let k = 0; k < length; k++) {
      const left = deletes[k] ?? null
      const right = inserts[k] ?? null
      rows.push({ left, right, kind: left && right ? 'modify' : left ? 'delete' : 'insert' })
    }
  }
  return rows
}
