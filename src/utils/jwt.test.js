import { describe, expect, it } from 'vitest'
import { base64UrlDecode, base64UrlEncode, decodeJwt, getJwtTimeStatus, isJwtTimeClaim } from './jwt'

const SAMPLE =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'

describe('base64url', () => {
  it('round-trips unicode text', () => {
    const encoded = base64UrlEncode('你好, world 🙂')
    expect(encoded).not.toMatch(/[+/=]/)
    expect(base64UrlDecode(encoded)).toBe('你好, world 🙂')
  })

  it('rejects invalid length', () => {
    expect(() => base64UrlDecode('abcde')).toThrow(/长度无效/)
  })
})

describe('decodeJwt', () => {
  it('decodes header and payload', () => {
    const result = decodeJwt(SAMPLE)
    expect(result.ok).toBe(true)
    expect(result.header).toEqual({ alg: 'HS256', typ: 'JWT' })
    expect(result.payload).toMatchObject({ sub: '1234567890', name: 'John Doe', iat: 1516239022 })
    expect(result.signature).toBe('SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c')
  })

  it('returns a neutral state for empty input', () => {
    expect(decodeJwt('   ')).toMatchObject({ ok: false, error: '' })
  })

  it('reports structural errors', () => {
    expect(decodeJwt('a.b').error).toMatch(/3 个部分/)
    expect(decodeJwt('.b.c').error).toMatch(/为空/)
    expect(decodeJwt('!!!.eyJhIjoxfQ.sig').error).toMatch(/Header/)
    expect(decodeJwt(`${base64UrlEncode('[1]')}.${base64UrlEncode('{}')}.sig`).error).toMatch(/JSON 对象/)
  })
})

describe('time status', () => {
  it('detects expired and pending tokens', () => {
    const now = 1_700_000_000_000
    const expired = getJwtTimeStatus({ exp: 1_699_999_000, iat: 1_699_990_000 }, now)
    expect(expired.expired).toBe(true)
    expect(expired.remainingSeconds).toBe(-1000)
    expect(expired.lifetimeSeconds).toBe(9000)

    const pending = getJwtTimeStatus({ nbf: 1_700_001_000 }, now)
    expect(pending.notYetValid).toBe(true)
    expect(pending.expired).toBe(false)
    expect(pending.remainingSeconds).toBeNull()
  })

  it('identifies numeric time claims', () => {
    expect(isJwtTimeClaim('exp', 1)).toBe(true)
    expect(isJwtTimeClaim('exp', '1')).toBe(false)
    expect(isJwtTimeClaim('name', 1)).toBe(false)
  })
})
