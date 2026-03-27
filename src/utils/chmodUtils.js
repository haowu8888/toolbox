const validateOctal = (value) => {
  const text = String(value || '').trim().replace(/^0+/, '0') // keep single 0 if all zero
  if (!text) return { ok: false, text: '', error: '' }
  if (!/^[0-7]{3,4}$/.test(text)) {
    return {
      ok: false,
      text,
      error: '请输入 3 或 4 位八进制数字（例如 755 / 0644 / 4755）',
    }
  }
  return { ok: true, text, error: '' }
}

const digitToRwx = (digit) => {
  const n = Number(digit) || 0
  return `${n & 4 ? 'r' : '-'}${n & 2 ? 'w' : '-'}${n & 1 ? 'x' : '-'}`
}

const applySpecialBits = (rwx, specialDigit) => {
  const s = Number(specialDigit) || 0
  const chars = rwx.split('')

  // setuid owner execute
  if (s & 4) chars[2] = chars[2] === 'x' ? 's' : 'S'
  // setgid group execute
  if (s & 2) chars[5] = chars[5] === 'x' ? 's' : 'S'
  // sticky other execute
  if (s & 1) chars[8] = chars[8] === 'x' ? 't' : 'T'

  return chars.join('')
}

export const octalToRwx = (octal) => {
  const { ok, text, error } = validateOctal(octal)
  if (!ok) return { rwx: '', octal: text, error }

  const digits = text.length === 3 ? `0${text}` : text
  const [special, owner, group, other] = digits.split('')
  let rwx = `${digitToRwx(owner)}${digitToRwx(group)}${digitToRwx(other)}`
  rwx = applySpecialBits(rwx, special)
  return { rwx, octal: text, error: '' }
}

const rwxToDigit = (triplet) => {
  let n = 0
  if (triplet[0] === 'r') n += 4
  if (triplet[1] === 'w') n += 2
  if (triplet[2] === 'x') n += 1
  return n
}

export const rwxToOctal = (raw) => {
  const text = String(raw || '').trim()
  if (!text) return { octal: '', error: '' }
  if (!/^[r-][w-][xsS-][r-][w-][xsS-][r-][w-][xtT-]$/.test(text)) {
    return { octal: '', error: '请输入 9 位权限字符串，例如 rwxr-xr-x / rw-r--r-- / rwsr-sr-t' }
  }

  const owner = text.slice(0, 3)
  const group = text.slice(3, 6)
  const other = text.slice(6, 9)

  let special = 0
  if (owner[2] === 's' || owner[2] === 'S') special += 4
  if (group[2] === 's' || group[2] === 'S') special += 2
  if (other[2] === 't' || other[2] === 'T') special += 1

  const ownerNorm = owner.replace(/[sS]/, owner[2] === 's' ? 'x' : '-')
  const groupNorm = group.replace(/[sS]/, group[2] === 's' ? 'x' : '-')
  const otherNorm = other.replace(/[tT]/, other[2] === 't' ? 'x' : '-')

  const oDigit = rwxToDigit(ownerNorm)
  const gDigit = rwxToDigit(groupNorm)
  const tDigit = rwxToDigit(otherNorm)

  const octal = special ? `${special}${oDigit}${gDigit}${tDigit}` : `${oDigit}${gDigit}${tDigit}`
  return { octal, error: '' }
}

export const normalizeOctal = (octal) => {
  const { ok, text, error } = validateOctal(octal)
  if (!ok) return { octal: text, error }
  return { octal: text, error: '' }
}

