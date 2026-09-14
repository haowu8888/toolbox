/**
 * 常见格式校验，供「数据验证」工具使用；纯函数、可单测。
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const CN_MOBILE_RE = /^1[3-9]\d{9}$/
const E164_RE = /^\+?[1-9]\d{1,14}$/
const IPV4_RE = /^((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/
const HOSTNAME_RE = /^([a-z0-9-]+\.)+[a-z0-9-]{2,}$/i
const SCHEME_RE = /^[a-z][a-z0-9+.-]*:\/\//i

const normalize = (value) => String(value ?? '').trim()

export const isValidEmail = (value) => EMAIL_RE.test(normalize(value))

export const isValidCnMobile = (value) => CN_MOBILE_RE.test(normalize(value))

/** E.164：可选 +，最多 15 位数字；容忍用户输入里的空格与短横线 */
export const isValidE164 = (value) => E164_RE.test(normalize(value).replace(/[\s-]/g, ''))

export const isValidIpv4 = (value) => IPV4_RE.test(normalize(value))

/**
 * http/https 网址：用 URL 解析代替正则，避免回溯爆炸，也能正确处理端口、查询串、IDN 等。
 * 省略协议时按 https 补全。
 */
export const isValidHttpUrl = (value) => {
  const text = normalize(value)
  if (!text || /\s/.test(text)) return false

  let url
  try {
    url = new URL(SCHEME_RE.test(text) ? text : `https://${text}`)
  } catch {
    return false
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false
  const host = url.hostname
  if (!host) return false
  if (host === 'localhost' || host.startsWith('[')) return true
  return IPV4_RE.test(host) || HOSTNAME_RE.test(host)
}

// GB 11643-1999：前 17 位加权求和 mod 11 → 校验码
const ID_WEIGHTS = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2]
const ID_CHECK_CODES = '10X98765432'

const isValidBirthDate = (year, month, day) => {
  if (year < 1900) return false
  const date = new Date(year, month - 1, day)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return false
  return date.getTime() <= Date.now()
}

/** 18 位居民身份证：地区码不以 0 开头、出生日期合法、校验码正确 */
export const isValidCnIdCard = (value) => {
  const id = normalize(value).toUpperCase()
  if (!/^[1-9]\d{16}[\dX]$/.test(id)) return false

  const year = Number(id.slice(6, 10))
  const month = Number(id.slice(10, 12))
  const day = Number(id.slice(12, 14))
  if (!isValidBirthDate(year, month, day)) return false

  const sum = ID_WEIGHTS.reduce((total, weight, index) => total + weight * Number(id[index]), 0)
  return ID_CHECK_CODES[sum % 11] === id[17]
}

export const VALIDATOR_DEFS = Object.freeze([
  {
    key: 'email',
    name: '邮箱验证',
    description: '验证邮箱格式是否正确',
    rule: '形如 local@domain.tld，不含空格',
    example: 'example@email.com',
    test: isValidEmail,
  },
  {
    key: 'phone',
    name: '手机号验证',
    description: '验证中国大陆 11 位手机号',
    rule: '以 1 开头，第二位为 3-9，共 11 位数字',
    example: '13812345678',
    test: isValidCnMobile,
  },
  {
    key: 'url',
    name: 'URL 验证',
    description: '验证 http / https 网址格式',
    rule: '协议可省略；主机名需为合法域名、IP 或 localhost，支持端口、路径、查询串',
    example: 'https://www.example.com/path?q=1',
    test: isValidHttpUrl,
  },
  {
    key: 'phone_int',
    name: '国际电话号码',
    description: 'E.164 格式的国际电话号码',
    rule: '可选 +，1-15 位数字，空格和短横线会被忽略',
    example: '+86 138 1234 5678',
    test: isValidE164,
  },
  {
    key: 'ipv4',
    name: 'IPv4 地址',
    description: '验证 IPv4 地址格式',
    rule: '四段 0-255 的十进制数，用点分隔',
    example: '192.168.1.1',
    test: isValidIpv4,
  },
  {
    key: 'idcard',
    name: '身份证号验证',
    description: '验证 18 位居民身份证号',
    rule: '17 位数字 + 校验码（数字或 X）；出生日期需合法，校验码按 GB 11643 加权算法核对',
    example: '110101199003076018',
    test: isValidCnIdCard,
  },
])

export const getValidator = (key) => VALIDATOR_DEFS.find((item) => item.key === key) || null
