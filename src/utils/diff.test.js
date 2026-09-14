import { describe, expect, it } from 'vitest'
import {
  buildHunks,
  buildSideBySideRows,
  diffInline,
  diffLines,
  formatSimpleDiff,
  formatUnifiedDiff,
  splitLines,
} from './diff'

const types = (result) => result.entries.map((e) => e.type[0]).join('')

describe('splitLines', () => {
  it('drops a single trailing newline', () => {
    expect(splitLines('a\nb\n')).toEqual(['a', 'b'])
    expect(splitLines('a\nb')).toEqual(['a', 'b'])
    expect(splitLines('')).toEqual([])
    expect(splitLines('\n')).toEqual([''])
  })
})

describe('diffLines', () => {
  it('reports identical input as unchanged', () => {
    const result = diffLines('a\nb\nc', 'a\nb\nc')
    expect(types(result)).toBe('eee')
    expect(result.stats).toEqual({ added: 0, deleted: 0, unchanged: 3, changed: 0 })
  })

  it('handles pure insertions and deletions', () => {
    expect(types(diffLines('', 'a\nb'))).toBe('ii')
    expect(types(diffLines('a\nb', ''))).toBe('dd')
  })

  it('produces a minimal diff for the classic example', () => {
    const result = diffLines('a\nb\nc\n', 'a\nc\nd\n')
    expect(types(result)).toBe('edei')
    expect(result.stats).toEqual({ added: 1, deleted: 1, unchanged: 2, changed: 2 })
    expect(result.entries[1]).toEqual({ type: 'delete', text: 'b', oldLine: 2, newLine: null })
    expect(result.entries[3]).toEqual({ type: 'insert', text: 'd', oldLine: null, newLine: 3 })
  })

  it('keeps line numbers on both sides', () => {
    const result = diffLines('x\ny', 'y\nz')
    const equal = result.entries.find((e) => e.type === 'equal')
    expect(equal).toEqual({ type: 'equal', text: 'y', oldLine: 2, newLine: 1 })
  })

  it('anchors on unique lines and always round-trips both inputs', () => {
    const oldLines = ['function a() {', '  return 1', '}', '', 'function b() {', '  return 2', '}']
    const newLines = ['function b() {', '  return 2', '}', '', 'function a() {', '  return 1', '}']
    const result = diffLines(oldLines.join('\n'), newLines.join('\n'))

    // 无论锚点选在哪个函数块上，原文与新文都必须能从结果中原样重建
    const rebuiltOld = result.entries.filter((e) => e.type !== 'insert').map((e) => e.text)
    const rebuiltNew = result.entries.filter((e) => e.type !== 'delete').map((e) => e.text)
    expect(rebuiltOld).toEqual(oldLines)
    expect(rebuiltNew).toEqual(newLines)

    // 至少有一个完整函数块（3 行）被识别为未变
    expect(result.stats.unchanged).toBeGreaterThanOrEqual(3)
    const unchanged = result.entries.filter((e) => e.type === 'equal').map((e) => e.text)
    expect(unchanged.includes('function a() {') || unchanged.includes('function b() {')).toBe(true)
  })

  it('supports ignoreWhitespace and ignoreCase', () => {
    expect(types(diffLines('a  b', 'a b', { ignoreWhitespace: true }))).toBe('e')
    expect(types(diffLines('Hello', 'hello', { ignoreCase: true }))).toBe('e')
    expect(types(diffLines('Hello', 'hello'))).toBe('di')
  })

  it('handles repeated lines without anchors', () => {
    const result = diffLines('x\nx\nx', 'x\nx')
    expect(result.stats).toEqual({ added: 0, deleted: 1, unchanged: 2, changed: 1 })
  })

  it('copes with large inputs quickly', () => {
    const oldLines = Array.from({ length: 6000 }, (_, i) => `line ${i}`)
    const newLines = oldLines.map((line, i) => (i % 97 === 0 ? `${line} changed` : line))
    newLines.splice(3000, 0, 'inserted')
    const started = Date.now()
    const result = diffLines(oldLines.join('\n'), newLines.join('\n'))
    expect(Date.now() - started).toBeLessThan(2000)
    expect(result.stats.added).toBe(63)
    expect(result.stats.deleted).toBe(62)
  })
})

describe('diffInline', () => {
  it('marks changed characters on both sides', () => {
    const { oldSegments, newSegments } = diffInline('const a = 1', 'const b = 12')
    expect(oldSegments.map((s) => s.text).join('')).toBe('const a = 1')
    expect(newSegments.map((s) => s.text).join('')).toBe('const b = 12')
    expect(oldSegments.some((s) => s.changed && s.text === 'a')).toBe(true)
    expect(newSegments.filter((s) => s.changed).map((s) => s.text)).toEqual(['b', '2'])
  })
})

describe('hunks and formatting', () => {
  const oldText = Array.from({ length: 12 }, (_, i) => `l${i + 1}`).join('\n')
  const newText = oldText.replace('l5', 'L5').replace('l11', 'L11')

  it('groups changes with context', () => {
    const { entries } = diffLines(oldText, newText)
    const hunks = buildHunks(entries, 2)
    expect(hunks).toHaveLength(2)
    expect(hunks[0]).toMatchObject({ oldStart: 3, oldCount: 5, newStart: 3, newCount: 5 })
    expect(hunks[1]).toMatchObject({ oldStart: 9, oldCount: 4, newStart: 9, newCount: 4 })
  })

  it('renders unified and simple formats', () => {
    const { entries } = diffLines('a\nb\nc', 'a\nB\nc')
    expect(formatUnifiedDiff(entries, { oldName: 'old', newName: 'new', context: 1 })).toBe(
      ['--- old', '+++ new', '@@ -1,3 +1,3 @@', ' a', '-b', '+B', ' c'].join('\n'),
    )
    expect(formatSimpleDiff(entries)).toBe(['  a', '- b', '+ B', '  c'].join('\n'))
    expect(formatUnifiedDiff(diffLines('a', 'a').entries)).toBe('')
  })

  it('describes insertions into an empty file', () => {
    const { entries } = diffLines('', 'a\nb')
    expect(formatUnifiedDiff(entries)).toContain('@@ -0,0 +1,2 @@')
  })

  it('pairs deletions with insertions for side-by-side view', () => {
    const { entries } = diffLines('a\nb\nc', 'a\nB\nc\nd')
    const rows = buildSideBySideRows(entries)
    expect(rows.map((r) => r.kind)).toEqual(['equal', 'modify', 'equal', 'insert'])
    expect(rows[1].left.text).toBe('b')
    expect(rows[1].right.text).toBe('B')
  })
})
