import { describe, expect, it } from 'vitest'
import { createTimeoutSignal, describeRequestError, fetchJson } from './http'

describe('describeRequestError', () => {
  it('maps timeout and abort errors to a friendly message', () => {
    const timeout = new Error('signal timed out')
    timeout.name = 'TimeoutError'
    const abort = new Error('aborted')
    abort.name = 'AbortError'

    expect(describeRequestError(timeout)).toBe('请求超时，请稍后重试')
    expect(describeRequestError(abort)).toBe('请求超时，请稍后重试')
  })

  it('maps network-level TypeError to a friendly message', () => {
    expect(describeRequestError(new TypeError('Failed to fetch'))).toBe('网络请求失败，请检查网络连接后重试')
  })

  it('keeps explicit error messages and stringifies non-errors', () => {
    expect(describeRequestError(new Error('接口返回 502'))).toBe('接口返回 502')
    expect(describeRequestError('boom')).toBe('boom')
  })
})

describe('fetchJson', () => {
  it('passes a timeout signal to the fetch implementation and parses JSON', async () => {
    const calls = []
    const fetchImpl = async (url, init) => {
      calls.push({ url, init })
      return { ok: true, json: async () => ({ hello: 'world' }) }
    }

    await expect(fetchJson('https://example.com/data', { fetchImpl })).resolves.toEqual({ hello: 'world' })
    expect(calls).toHaveLength(1)
    expect(calls[0].url).toBe('https://example.com/data')
    expect(calls[0].init.signal).toBeInstanceOf(AbortSignal)
  })

  it('throws with the HTTP status for non-2xx responses', async () => {
    const fetchImpl = async () => ({ ok: false, status: 503 })
    await expect(fetchJson('https://example.com/data', { fetchImpl })).rejects.toThrow('接口返回 503')
  })

  it('creates an AbortSignal when the platform supports timeouts', () => {
    expect(createTimeoutSignal(50)).toBeInstanceOf(AbortSignal)
  })
})
