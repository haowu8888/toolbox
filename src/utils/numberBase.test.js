import { describe, expect, it } from 'vitest'
import { convertBase } from './numberBase'

describe('convertBase', () => {
  it('converts between common bases', () => {
    expect(convertBase('255', 10, 16)).toEqual({ ok: true, value: 'FF' })
    expect(convertBase('ff', 16, 2)).toEqual({ ok: true, value: '11111111' })
    expect(convertBase('777', 8, 10)).toEqual({ ok: true, value: '511' })
    expect(convertBase('1010', 2, 8)).toEqual({ ok: true, value: '12' })
  })

  it('keeps precision for numbers beyond 2^53', () => {
    expect(convertBase('18446744073709551615', 10, 16)).toEqual({ ok: true, value: 'FFFFFFFFFFFFFFFF' })
    expect(convertBase('FFFFFFFFFFFFFFFF', 16, 10)).toEqual({ ok: true, value: '18446744073709551615' })
  })

  it('accepts sign and matching prefixes', () => {
    expect(convertBase('-0xff', 16, 10)).toEqual({ ok: true, value: '-255' })
    expect(convertBase('0b101', 2, 10)).toEqual({ ok: true, value: '5' })
    expect(convertBase('-0', 10, 2)).toEqual({ ok: true, value: '0' })
  })

  it('rejects characters that are invalid for the source base instead of truncating', () => {
    expect(convertBase('12G', 16, 10)).toMatchObject({ ok: false, error: expect.stringContaining('G') })
    expect(convertBase('129', 8, 10)).toMatchObject({ ok: false, error: expect.stringContaining('9') })
    expect(convertBase('1.5', 10, 2)).toMatchObject({ ok: false })
  })

  it('returns an empty error for blank input and validates the bases', () => {
    expect(convertBase('   ', 10, 2)).toEqual({ ok: false, error: '' })
    expect(convertBase('10', 1, 2)).toMatchObject({ ok: false })
    expect(convertBase('10', 10, 37)).toMatchObject({ ok: false })
  })
})
