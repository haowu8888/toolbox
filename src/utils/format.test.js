import { describe, expect, it } from 'vitest'
import {
  formatBytes,
  formatDateTime,
  formatDuration,
  formatRelativeTime,
  toDate,
  truncate,
} from './format'

describe('formatBytes', () => {
  it('handles empty and invalid values', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(-5)).toBe('0 B')
    expect(formatBytes(NaN)).toBe('0 B')
  })

  it('scales units', () => {
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(1024)).toBe('1 KB')
    expect(formatBytes(1536)).toBe('1.5 KB')
    expect(formatBytes(5 * 1024 * 1024)).toBe('5 MB')
  })
})

describe('formatDateTime', () => {
  const date = new Date(2024, 0, 15, 14, 30, 45, 7)

  it('formats with the default pattern', () => {
    expect(formatDateTime(date)).toBe('2024-01-15 14:30:45')
  })

  it('supports custom patterns and milliseconds', () => {
    expect(formatDateTime(date, 'yyyy/MM/dd HH:mm')).toBe('2024/01/15 14:30')
    expect(formatDateTime(date, 'HH:mm:ss.SSS')).toBe('14:30:45.007')
  })

  it('returns empty string for invalid input', () => {
    expect(formatDateTime('not a date')).toBe('')
    expect(formatDateTime(null)).toBe('')
    expect(toDate('nope')).toBeNull()
  })
})

describe('formatRelativeTime', () => {
  const now = new Date(2024, 0, 15, 12, 0, 0).getTime()

  it('describes past and future', () => {
    expect(formatRelativeTime(now - 10_000, now)).toBe('刚刚')
    expect(formatRelativeTime(now - 5 * 60_000, now)).toBe('5分钟前')
    expect(formatRelativeTime(now + 3 * 3_600_000, now)).toBe('3小时后')
    expect(formatRelativeTime(now - 2 * 86_400_000, now)).toBe('2天前')
  })

  it('falls back to a date beyond a week', () => {
    expect(formatRelativeTime(now - 30 * 86_400_000, now)).toMatch(/2023/)
  })
})

describe('formatDuration', () => {
  it('builds readable durations', () => {
    expect(formatDuration(0)).toBe('0 秒')
    expect(formatDuration(65)).toBe('1 分钟 5 秒')
    expect(formatDuration(90_061)).toBe('1 天 1 小时 1 分钟')
  })
})

describe('truncate', () => {
  it('shortens long text', () => {
    expect(truncate('abc', 5)).toBe('abc')
    expect(truncate('abcdefgh', 5)).toBe('abcde…')
    expect(truncate('')).toBe('')
  })
})
