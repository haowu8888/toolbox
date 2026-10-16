import { describe, expect, it } from 'vitest'
import { buildRegex, MAX_MATCHES, runRegex } from './regexRunner'

describe('runRegex', () => {
  it('lists every match with index and capture groups', () => {
    const { matches, truncated } = runRegex({ pattern: '(\\w)(\\d+)', flags: '', text: 'a1 b22' })
    expect(truncated).toBe(false)
    expect(matches).toEqual([
      { index: 0, text: 'a1', groups: ['a', '1'], named: null },
      { index: 3, text: 'b22', groups: ['b', '22'], named: null },
    ])
  })

  it('exposes named groups', () => {
    const { matches } = runRegex({ pattern: '(?<year>\\d{4})-(?<month>\\d{2})', text: '2024-05' })
    expect(matches[0].named).toEqual({ year: '2024', month: '05' })
  })

  it('splits text into highlight segments and skips zero-width matches', () => {
    expect(runRegex({ pattern: '\\d+', flags: 'g', text: 'a1 b22' }).segments).toEqual([
      { text: 'a', match: false },
      { text: '1', match: true },
      { text: ' b', match: false },
      { text: '22', match: true },
    ])
    const zeroWidth = runRegex({ pattern: '\\b', text: 'ab' })
    expect(zeroWidth.matches).toHaveLength(2)
    expect(zeroWidth.segments).toEqual([{ text: 'ab', match: false }])
  })

  it('keeps html as plain text in segments', () => {
    const { segments } = runRegex({ pattern: 'b', text: '<mark>b</mark>' })
    expect(segments.map((s) => s.text).join('')).toBe('<mark>b</mark>')
  })

  it('replaces only the first match without the g flag', () => {
    expect(
      runRegex({ pattern: 'a', flags: '', text: 'aaa', replacement: 'b', withReplace: true })
        .replaced,
    ).toBe('baa')
    expect(
      runRegex({ pattern: 'a', flags: 'g', text: 'aaa', replacement: 'b', withReplace: true })
        .replaced,
    ).toBe('bbb')
    expect(
      runRegex({
        pattern: '(\\d+)',
        flags: 'g',
        text: 'x1',
        replacement: '[$1]',
        withReplace: true,
      }).replaced,
    ).toBe('x[1]')
  })

  it('caps the number of collected matches', () => {
    const { matches, truncated } = runRegex({ pattern: 'a', text: 'a'.repeat(MAX_MATCHES + 5) })
    expect(matches).toHaveLength(MAX_MATCHES)
    expect(truncated).toBe(true)
  })

  it('throws on invalid patterns and dedupes flags', () => {
    expect(() => runRegex({ pattern: '(', text: 'x' })).toThrow()
    expect(buildRegex('a', 'gi', 'g').flags).toBe('gi')
  })
})
