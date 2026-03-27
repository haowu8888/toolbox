import { describe, expect, test } from 'vitest'
import { normalizeOctal, octalToRwx, rwxToOctal } from './chmodUtils'

describe('chmodUtils', () => {
  test('octalToRwx basic', () => {
    expect(octalToRwx('755')).toEqual({ rwx: 'rwxr-xr-x', octal: '755', error: '' })
    expect(octalToRwx('644')).toEqual({ rwx: 'rw-r--r--', octal: '644', error: '' })
  })

  test('octalToRwx supports special bits', () => {
    expect(octalToRwx('4755')).toEqual({ rwx: 'rwsr-xr-x', octal: '4755', error: '' })
  })

  test('rwxToOctal basic', () => {
    expect(rwxToOctal('rwxr-xr-x')).toEqual({ octal: '755', error: '' })
    expect(rwxToOctal('rw-r--r--')).toEqual({ octal: '644', error: '' })
  })

  test('rwxToOctal supports special bits', () => {
    expect(rwxToOctal('rwsr-xr-x')).toEqual({ octal: '4755', error: '' })
    expect(rwxToOctal('rwxrwxrwt')).toEqual({ octal: '1777', error: '' })
  })

  test('normalizeOctal validates input', () => {
    expect(normalizeOctal('0755')).toEqual({ octal: '0755', error: '' })
    expect(normalizeOctal('999').error).toContain('八进制')
  })
})

