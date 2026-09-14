export const pad2 = (n) => String(n).padStart(2, '0')

const BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB']

export const formatBytes = (bytes, digits = 2) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const index = Math.min(BYTE_UNITS.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
  const value = bytes / 1024 ** index
  const rounded = index === 0 ? Math.round(value) : parseFloat(value.toFixed(digits))
  return `${rounded} ${BYTE_UNITS[index]}`
}

export const toDate = (value) => {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  if (value === null || value === undefined || value === '') return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

const TOKEN_PATTERN = /yyyy|MM|dd|HH|mm|ss|SSS/g

/**
 * 按模式格式化本地时间，支持 yyyy MM dd HH mm ss SSS。
 */
export const formatDateTime = (value, pattern = 'yyyy-MM-dd HH:mm:ss') => {
  const date = toDate(value)
  if (!date) return ''
  const map = {
    yyyy: String(date.getFullYear()),
    MM: pad2(date.getMonth() + 1),
    dd: pad2(date.getDate()),
    HH: pad2(date.getHours()),
    mm: pad2(date.getMinutes()),
    ss: pad2(date.getSeconds()),
    SSS: String(date.getMilliseconds()).padStart(3, '0'),
  }
  return pattern.replace(TOKEN_PATTERN, (token) => map[token])
}

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/**
 * 相对时间：刚刚 / 5分钟前 / 3小时后 / 2天前，超过 7 天显示日期。
 */
export const formatRelativeTime = (value, now = Date.now()) => {
  const date = toDate(value)
  if (!date) return ''
  const diff = now - date.getTime()
  const abs = Math.abs(diff)
  const suffix = diff >= 0 ? '前' : '后'

  if (abs < MINUTE) return diff >= 0 ? '刚刚' : '即将'
  if (abs < HOUR) return `${Math.floor(abs / MINUTE)}分钟${suffix}`
  if (abs < DAY) return `${Math.floor(abs / HOUR)}小时${suffix}`
  if (abs < 7 * DAY) return `${Math.floor(abs / DAY)}天${suffix}`
  return date.toLocaleDateString('zh-CN')
}

/**
 * 秒数转可读时长：1 天 2 小时 3 分钟 4 秒
 */
export const formatDuration = (seconds) => {
  if (!Number.isFinite(seconds)) return ''
  let remaining = Math.floor(Math.abs(seconds))
  const parts = []
  const units = [
    ['天', 86_400],
    ['小时', 3_600],
    ['分钟', 60],
    ['秒', 1],
  ]
  for (const [label, size] of units) {
    const count = Math.floor(remaining / size)
    if (count > 0 || (label === '秒' && parts.length === 0)) {
      parts.push(`${count} ${label}`)
      remaining -= count * size
    }
    if (parts.length >= 3) break
  }
  return parts.join(' ')
}

export const truncate = (text, length = 50) => {
  if (!text) return ''
  const value = String(text)
  return value.length > length ? `${value.slice(0, length)}…` : value
}
