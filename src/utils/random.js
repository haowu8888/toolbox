/**
 * 基于 Web Crypto 的随机工具，避免 Math.random 与取模偏差。
 */

const getCrypto = () => {
  if (typeof globalThis.crypto?.getRandomValues !== 'function') {
    throw new Error('当前环境不支持 crypto.getRandomValues')
  }
  return globalThis.crypto
}

/**
 * [min, max] 区间内的无偏随机整数（拒绝采样）。
 */
export const randomInt = (min, max) => {
  const lower = Math.ceil(min)
  const upper = Math.floor(max)
  if (!Number.isFinite(lower) || !Number.isFinite(upper) || upper < lower) {
    throw new RangeError(`Invalid random range: ${min}-${max}`)
  }
  const span = upper - lower + 1
  if (span === 1) return lower

  const cryptoApi = getCrypto()
  const buffer = new Uint32Array(1)
  const limit = Math.floor(0x1_0000_0000 / span) * span
  let value
  do {
    cryptoApi.getRandomValues(buffer)
    value = buffer[0]
  } while (value >= limit)
  return lower + (value % span)
}

/** [0, 1) 区间随机浮点数 */
export const randomFloat = () => {
  const buffer = new Uint32Array(1)
  getCrypto().getRandomValues(buffer)
  return buffer[0] / 0x1_0000_0000
}

export const randomPick = (list) => {
  if (!Array.isArray(list) || list.length === 0) return undefined
  return list[randomInt(0, list.length - 1)]
}

export const randomPickMany = (list, count) => {
  const result = []
  for (let i = 0; i < count; i++) result.push(randomPick(list))
  return result
}

/** Fisher–Yates 洗牌，返回新数组 */
export const shuffle = (list) => {
  const copy = [...list]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = randomInt(0, i)
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

/** 不重复抽取 count 个元素 */
export const sampleWithoutReplacement = (list, count) => shuffle(list).slice(0, count)

/**
 * 按权重抽取一个索引，weights 为非负数数组。
 */
export const weightedIndex = (weights) => {
  const total = weights.reduce((sum, weight) => sum + Math.max(0, weight), 0)
  if (total <= 0) return -1
  const target = randomFloat() * total
  let cumulative = 0
  for (let i = 0; i < weights.length; i++) {
    cumulative += Math.max(0, weights[i])
    if (target < cumulative) return i
  }
  return weights.length - 1
}

export const randomString = (length, alphabet) => {
  if (!alphabet) throw new Error('alphabet is required')
  let result = ''
  for (let i = 0; i < length; i++) result += alphabet[randomInt(0, alphabet.length - 1)]
  return result
}

export const uuidV4 = () => {
  const cryptoApi = getCrypto()
  if (typeof cryptoApi.randomUUID === 'function') return cryptoApi.randomUUID()
  const bytes = new Uint8Array(16)
  cryptoApi.getRandomValues(bytes)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

/** 适合作为本地记录 id 的短唯一串 */
export const createId = (prefix = '') => {
  const cryptoApi = globalThis.crypto
  const core =
    typeof cryptoApi?.randomUUID === 'function'
      ? cryptoApi.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10)
  return `${prefix}${Date.now().toString(36)}-${core}`
}
