import { describe, expect, it } from 'vitest'
import { base64Decode, base64Encode, normalizeBase64 } from './base64'

describe('base64', () => {
  it('round-trips unicode and emoji', () => {
    const text = '你好, world 👋'
    expect(base64Decode(base64Encode(text))).toBe(text)
    expect(base64Encode('你好')).toBe('5L2g5aW9')
  })

  it('supports url-safe output and input', () => {
    const text = '??>>'
    const safe = base64Encode(text, { urlSafe: true })
    expect(safe).not.toMatch(/[+/=]/)
    expect(base64Decode(safe)).toBe(text)
  })

  it('tolerates whitespace, line breaks and missing padding', () => {
    expect(base64Decode('5L2g\n5aW9')).toBe('你好')
    expect(base64Decode('YQ')).toBe('a')
    expect(normalizeBase64('YWI')).toBe('YWI=')
  })

  it('handles large input', () => {
    const text = 'x'.repeat(200_000)
    expect(base64Decode(base64Encode(text))).toBe(text)
  })

  it('rejects invalid characters, bad length and non-utf8 bytes', () => {
    expect(() => base64Decode('abc$')).toThrow('非 Base64')
    expect(() => base64Decode('abcde')).toThrow('长度')
    expect(() => base64Decode('/w==')).toThrow('UTF-8')
  })
})
