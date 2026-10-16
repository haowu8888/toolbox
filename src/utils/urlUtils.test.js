import { describe, expect, test } from 'vitest'
import { parseQueryString, safeParseUrl, stringifyQuery } from './urlUtils'

describe('urlUtils', () => {
  test('safeParseUrl parses full url', () => {
    const { url, error } = safeParseUrl('https://example.com/a?b=1#c')
    expect(error).toBe('')
    expect(url?.hostname).toBe('example.com')
    expect(url?.pathname).toBe('/a')
  })

  test('safeParseUrl supports missing scheme', () => {
    const { url, error } = safeParseUrl('example.com/path?a=1')
    expect(error).toBe('')
    expect(url?.protocol).toBe('https:')
    expect(url?.hostname).toBe('example.com')
    expect(url?.pathname).toBe('/path')
  })

  test('safeParseUrl treats host:port without scheme as https', () => {
    expect(safeParseUrl('localhost:3000/api').url?.href).toBe('https://localhost:3000/api')
    expect(safeParseUrl('example.com:8080').url?.port).toBe('8080')
    expect(safeParseUrl('  httpbin.org/get ').url?.href).toBe('https://httpbin.org/get')
  })

  test('safeParseUrl keeps explicit and opaque schemes', () => {
    expect(safeParseUrl('ftp://files.example.com/a').url?.protocol).toBe('ftp:')
    expect(safeParseUrl('mailto:a@b.com').url?.protocol).toBe('mailto:')
  })

  test('safeParseUrl reports invalid input', () => {
    const { url, error } = safeParseUrl('http://exa mple.com')
    expect(url).toBeNull()
    expect(error).not.toBe('')
  })

  test('parseQueryString keeps repeated keys as array', () => {
    expect(parseQueryString('a=1&b=2&b=3')).toEqual({ a: '1', b: ['2', '3'] })
  })

  test('stringifyQuery supports arrays and skips null', () => {
    const qs = stringifyQuery({ a: '1', b: ['2', '3'], c: null })
    expect(qs).toBe('a=1&b=2&b=3')
  })
})

