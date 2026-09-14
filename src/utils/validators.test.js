import { describe, expect, it } from 'vitest'
import {
  VALIDATOR_DEFS,
  getValidator,
  isValidCnIdCard,
  isValidCnMobile,
  isValidE164,
  isValidEmail,
  isValidHttpUrl,
  isValidIpv4,
} from './validators'

describe('isValidEmail', () => {
  it('accepts common addresses and rejects malformed ones', () => {
    expect(isValidEmail('example@email.com')).toBe(true)
    expect(isValidEmail('first.last+tag@sub.example.co')).toBe(true)
    expect(isValidEmail('no-at-sign.com')).toBe(false)
    expect(isValidEmail('has space@example.com')).toBe(false)
    expect(isValidEmail('user@localhost')).toBe(false)
  })
})

describe('isValidCnMobile', () => {
  it('requires 11 digits starting with 13-19', () => {
    expect(isValidCnMobile('13812345678')).toBe(true)
    expect(isValidCnMobile('19912345678')).toBe(true)
    expect(isValidCnMobile('12812345678')).toBe(false)
    expect(isValidCnMobile('1381234567')).toBe(false)
  })
})

describe('isValidE164', () => {
  it('ignores formatting spaces and dashes', () => {
    expect(isValidE164('+86 138 1234 5678')).toBe(true)
    expect(isValidE164('+1-415-555-2671')).toBe(true)
    expect(isValidE164('8613812345678')).toBe(true)
    expect(isValidE164('+0123')).toBe(false)
    expect(isValidE164('+1234567890123456')).toBe(false)
  })
})

describe('isValidIpv4', () => {
  it('checks each octet range', () => {
    expect(isValidIpv4('192.168.1.1')).toBe(true)
    expect(isValidIpv4('0.0.0.0')).toBe(true)
    expect(isValidIpv4('255.255.255.255')).toBe(true)
    expect(isValidIpv4('256.1.1.1')).toBe(false)
    expect(isValidIpv4('1.1.1')).toBe(false)
    expect(isValidIpv4('01.1.1.1')).toBe(false)
  })
})

describe('isValidHttpUrl', () => {
  it('accepts urls with ports, query strings, long TLDs and missing protocol', () => {
    expect(isValidHttpUrl('https://www.example.com')).toBe(true)
    expect(isValidHttpUrl('http://example.com:8080/path?a=1&b=2#hash')).toBe(true)
    expect(isValidHttpUrl('example.technology/page')).toBe(true)
    expect(isValidHttpUrl('http://localhost:3000')).toBe(true)
    expect(isValidHttpUrl('http://192.168.0.1/admin')).toBe(true)
    expect(isValidHttpUrl('https://[::1]/')).toBe(true)
  })

  it('rejects non-http schemes, bare words and inputs with spaces', () => {
    expect(isValidHttpUrl('ftp://example.com')).toBe(false)
    expect(isValidHttpUrl('javascript:alert(1)')).toBe(false)
    expect(isValidHttpUrl('not a url')).toBe(false)
    expect(isValidHttpUrl('example')).toBe(false)
    expect(isValidHttpUrl('')).toBe(false)
  })

  it('does not hang on long adversarial input (former regex backtracking)', () => {
    const started = Date.now()
    expect(isValidHttpUrl(`https://example.com/${'a '.repeat(5000)}!`)).toBe(false)
    expect(Date.now() - started).toBeLessThan(200)
  })
})

describe('isValidCnIdCard', () => {
  it('accepts an id whose check digit and birth date are valid', () => {
    expect(isValidCnIdCard('110101199003076018')).toBe(true)
    expect(isValidCnIdCard(' 110101199003076018 ')).toBe(true)
  })

  it('rejects wrong check digits, impossible dates and bad lengths', () => {
    expect(isValidCnIdCard('110101199003076013')).toBe(false)
    expect(isValidCnIdCard('110101199002306018')).toBe(false)
    expect(isValidCnIdCard('000000000000000000')).toBe(false)
    expect(isValidCnIdCard('11010119900307601')).toBe(false)
  })

  it('computes X check codes case-insensitively', () => {
    // 前 17 位加权和为 200，200 mod 11 = 2，对应校验码 X
    const body = '11010119900307600'
    const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2]
    const sum = weights.reduce((total, weight, index) => total + weight * Number(body[index]), 0)
    expect(sum % 11).toBe(2)
    expect(isValidCnIdCard(`${body}X`)).toBe(true)
    expect(isValidCnIdCard(`${body}x`)).toBe(true)
    expect(isValidCnIdCard(`${body}0`)).toBe(false)
  })
})

describe('VALIDATOR_DEFS', () => {
  it('every built-in example passes its own validator', () => {
    for (const def of VALIDATOR_DEFS) {
      expect(def.test(def.example), def.key).toBe(true)
    }
  })

  it('looks validators up by key', () => {
    expect(getValidator('email')?.name).toBe('邮箱验证')
    expect(getValidator('nope')).toBeNull()
  })
})
