import { describe, expect, it } from 'vitest'
import { childPath, formatJsonText, JsonSyntaxError } from './jsonFormat'

const samples = [
  '{"a":1,"b":[1,2,{"c":null}],"d":{},"e":[],"f":"x\\ny","g":true,"h":-1.5}',
  '[]',
  '"just a string"',
  '[[[]],{"":{"k":[false]}}]',
]

describe('formatJsonText', () => {
  it('matches JSON.stringify layout for ordinary input', () => {
    for (const sample of samples) {
      const parsed = JSON.parse(sample)
      expect(formatJsonText(sample, 2).text).toBe(JSON.stringify(parsed, null, 2))
      expect(formatJsonText(sample, 4).text).toBe(JSON.stringify(parsed, null, 4))
      expect(formatJsonText(sample, 0).text).toBe(JSON.stringify(parsed))
    }
  })

  it('keeps big integers and number literals exactly', () => {
    const { text, hasUnsafeNumbers } = formatJsonText('{"id": 12345678901234567890, "v": 1.0}', 0)
    expect(text).toBe('{"id":12345678901234567890,"v":1.0}')
    expect(hasUnsafeNumbers).toBe(true)
    expect(formatJsonText('[9007199254740991]').hasUnsafeNumbers).toBe(false)
  })

  it('keeps string escapes verbatim and strips a BOM', () => {
    expect(formatJsonText('\uFEFF["\\u0041\\/"]', 0).text).toBe('["\\u0041\\/"]')
  })

  it('reports errors with line and column', () => {
    const cases = [
      ['{\n  "a": 1,\n}', /第 2 行第 9 列.*尾随逗号/],
      ["{'a': 1}", /第 1 行第 2 列.*双引号/],
      ['[1 2]', /第 1 行第 4 列.*应为 , 或 \]/],
      ['{"a": tru}', /意外的字符/],
      ['[1', /缺少 \]/],
      ['"abc', /缺少结束引号/],
      ['{} x', /多余内容/],
      ['[01]', /应为 , 或 \]/],
      ['["a\tb"]', /控制字符/],
      ['["\\x"]', /转义/],
      ['', /意外的结尾/],
    ]
    for (const [input, pattern] of cases) {
      expect(() => formatJsonText(input), input).toThrow(JsonSyntaxError)
      expect(() => formatJsonText(input), input).toThrow(pattern)
    }
  })

  it('agrees with JSON.parse on validity', () => {
    const inputs = [
      '1',
      '-0',
      '1e5',
      '1.',
      '.5',
      '-',
      'nul',
      '{"a":}',
      '[,]',
      '{"a" 1}',
      ' [ 1 , 2 ] ',
    ]
    for (const input of inputs) {
      let native = true
      try {
        JSON.parse(input)
      } catch {
        native = false
      }
      let ours = true
      try {
        formatJsonText(input)
      } catch {
        ours = false
      }
      expect(ours, input).toBe(native)
    }
  })
})

describe('childPath', () => {
  it('builds valid JSONPath segments', () => {
    expect(childPath('$', 'a')).toBe('$.a')
    expect(childPath('$.a', 0)).toBe('$.a[0]')
    expect(childPath('$', 'a.b c')).toBe('$["a.b c"]')
    expect(childPath('$', '1x')).toBe('$["1x"]')
  })
})
