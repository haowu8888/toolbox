/**
 * 任意进制（2-36）整数互转：逐字符校验 + BigInt 计算，避免 parseInt 静默吞掉非法字符与大数精度丢失。
 */

const DIGITS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const PREFIXES = { 2: /^0b/i, 8: /^0o/i, 16: /^0x/i }

export const convertBase = (input, fromBase, toBase) => {
  const from = Number(fromBase)
  const to = Number(toBase)
  if (!Number.isInteger(from) || from < 2 || from > 36 || !Number.isInteger(to) || to < 2 || to > 36) {
    return { ok: false, error: '进制需在 2-36 之间' }
  }

  let text = String(input ?? '').trim()
  if (!text) return { ok: false, error: '' }

  let negative = false
  if (text.startsWith('-') || text.startsWith('+')) {
    negative = text.startsWith('-')
    text = text.slice(1)
  }
  if (PREFIXES[from]) text = text.replace(PREFIXES[from], '')
  if (!text) return { ok: false, error: '缺少数字部分' }

  let value = 0n
  const bigFrom = BigInt(from)
  for (const char of text.toUpperCase()) {
    const digit = DIGITS.indexOf(char)
    if (digit === -1 || digit >= from) {
      return { ok: false, error: `“${char}” 不是 ${from} 进制的有效字符` }
    }
    value = value * bigFrom + BigInt(digit)
  }

  const result = value.toString(to).toUpperCase()
  return { ok: true, value: negative && value !== 0n ? `-${result}` : result }
}
