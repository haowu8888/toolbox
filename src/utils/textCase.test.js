import { describe, expect, it } from 'vitest'
import { splitWords, toCamelCase, toConstantCase, toKebabCase, toPascalCase, toSnakeCase } from './textCase'

describe('splitWords', () => {
  it('splits camelCase, acronyms, digits and separators', () => {
    expect(splitWords('helloWorld')).toEqual(['hello', 'World'])
    expect(splitWords('XMLHttpRequest')).toEqual(['XML', 'Http', 'Request'])
    expect(splitWords('user_id-v2Beta test')).toEqual(['user', 'id', 'v2', 'Beta', 'test'])
    expect(splitWords('  --leading__')).toEqual(['leading'])
  })
})

describe('case conversions', () => {
  it('converts from PascalCase without leading separators', () => {
    expect(toSnakeCase('HelloWorld')).toBe('hello_world')
    expect(toKebabCase('HelloWorld')).toBe('hello-world')
  })

  it('handles acronyms sensibly', () => {
    expect(toSnakeCase('XMLHttpRequest')).toBe('xml_http_request')
    expect(toCamelCase('XMLHttpRequest')).toBe('xmlHttpRequest')
    expect(toPascalCase('xml_http_request')).toBe('XmlHttpRequest')
  })

  it('round-trips between styles', () => {
    expect(toCamelCase('hello_world_again')).toBe('helloWorldAgain')
    expect(toKebabCase('helloWorldAgain')).toBe('hello-world-again')
    expect(toPascalCase('hello-world-again')).toBe('HelloWorldAgain')
    expect(toConstantCase('helloWorld')).toBe('HELLO_WORLD')
  })

  it('converts multi-line input line by line', () => {
    expect(toSnakeCase('firstName\nlastName')).toBe('first_name\nlast_name')
    expect(toCamelCase('user id\nuser name')).toBe('userId\nuserName')
  })

  it('keeps non-ASCII letters as part of words', () => {
    expect(toSnakeCase('用户 名称')).toBe('用户_名称')
    expect(toCamelCase('café bar')).toBe('caféBar')
  })

  it('returns empty output for empty input', () => {
    expect(toCamelCase('')).toBe('')
    expect(toSnakeCase(null)).toBe('')
  })
})
