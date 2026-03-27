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

  test('parseQueryString keeps repeated keys as array', () => {
    expect(parseQueryString('a=1&b=2&b=3')).toEqual({ a: '1', b: ['2', '3'] })
  })

  test('stringifyQuery supports arrays and skips null', () => {
    const qs = stringifyQuery({ a: '1', b: ['2', '3'], c: null })
    expect(qs).toBe('a=1&b=2&b=3')
  })
})

