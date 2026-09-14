/**
 * HTML 实体编码/解码（纯函数，可在 Node 与浏览器中运行）。
 */

const BASIC_ENTITY_MAP = Object.freeze({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
})

export const NAMED_ENTITIES = Object.freeze({
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  // 空白类字符使用转义写法，避免源码中出现肉眼不可见的特殊字符
  nbsp: ' ',
  ensp: ' ',
  emsp: ' ',
  thinsp: ' ',
  zwnj: '‌',
  zwj: '‍',
  shy: '­',
  copy: '©',
  reg: '®',
  trade: '™',
  euro: '€',
  pound: '£',
  yen: '¥',
  cent: '¢',
  curren: '¤',
  sect: '§',
  para: '¶',
  deg: '°',
  plusmn: '±',
  times: '×',
  divide: '÷',
  micro: 'µ',
  middot: '·',
  bull: '•',
  hellip: '…',
  ndash: '–',
  mdash: '—',
  lsquo: '‘',
  rsquo: '’',
  sbquo: '‚',
  ldquo: '“',
  rdquo: '”',
  bdquo: '„',
  laquo: '«',
  raquo: '»',
  iexcl: '¡',
  iquest: '¿',
  frac12: '½',
  frac14: '¼',
  frac34: '¾',
  sup1: '¹',
  sup2: '²',
  sup3: '³',
  larr: '←',
  uarr: '↑',
  rarr: '→',
  darr: '↓',
  harr: '↔',
  crarr: '↵',
  lArr: '⇐',
  rArr: '⇒',
  hArr: '⇔',
  infin: '∞',
  ne: '≠',
  le: '≤',
  ge: '≥',
  asymp: '≈',
  equiv: '≡',
  sum: '∑',
  prod: '∏',
  radic: '√',
  minus: '−',
  lowast: '∗',
  part: '∂',
  int: '∫',
  forall: '∀',
  exist: '∃',
  empty: '∅',
  isin: '∈',
  notin: '∉',
  hearts: '♥',
  spades: '♠',
  clubs: '♣',
  diams: '♦',
  alpha: 'α',
  beta: 'β',
  gamma: 'γ',
  delta: 'δ',
  epsilon: 'ε',
  theta: 'θ',
  lambda: 'λ',
  mu: 'μ',
  pi: 'π',
  sigma: 'σ',
  tau: 'τ',
  phi: 'φ',
  omega: 'ω',
  Delta: 'Δ',
  Sigma: 'Σ',
  Omega: 'Ω',
  Pi: 'Π',
  Agrave: 'À',
  Aacute: 'Á',
  Acirc: 'Â',
  Atilde: 'Ã',
  Auml: 'Ä',
  Aring: 'Å',
  AElig: 'Æ',
  Ccedil: 'Ç',
  Egrave: 'È',
  Eacute: 'É',
  Ecirc: 'Ê',
  Euml: 'Ë',
  Ntilde: 'Ñ',
  Ograve: 'Ò',
  Oacute: 'Ó',
  Ocirc: 'Ô',
  Ouml: 'Ö',
  Oslash: 'Ø',
  Ugrave: 'Ù',
  Uacute: 'Ú',
  Ucirc: 'Û',
  Uuml: 'Ü',
  szlig: 'ß',
  agrave: 'à',
  aacute: 'á',
  acirc: 'â',
  atilde: 'ã',
  auml: 'ä',
  aring: 'å',
  aelig: 'æ',
  ccedil: 'ç',
  egrave: 'è',
  eacute: 'é',
  ecirc: 'ê',
  euml: 'ë',
  igrave: 'ì',
  iacute: 'í',
  icirc: 'î',
  iuml: 'ï',
  ntilde: 'ñ',
  ograve: 'ò',
  oacute: 'ó',
  ocirc: 'ô',
  otilde: 'õ',
  ouml: 'ö',
  oslash: 'ø',
  ugrave: 'ù',
  uacute: 'ú',
  ucirc: 'û',
  uuml: 'ü',
  yacute: 'ý',
  yuml: 'ÿ',
})

const REPLACEMENT_CHAR = '�'

const REVERSE_NAMED = (() => {
  const map = new Map()
  for (const [name, char] of Object.entries(NAMED_ENTITIES)) {
    if (!map.has(char)) map.set(char, `&${name};`)
  }
  return map
})()

const BASIC_PATTERN = /[&<>"']/g

export const encodeBasicEntities = (text) =>
  String(text ?? '').replace(BASIC_PATTERN, (char) => BASIC_ENTITY_MAP[char])

/**
 * 编码。mode:
 *  - 'basic'：仅 & < > " '
 *  - 'full'：基础字符 + 所有非 ASCII 字符转为数字实体（按码点，正确处理 emoji）
 *  - 'named'：优先使用常见命名实体，其余非 ASCII 转数字实体
 * numeric: 'decimal' | 'hex'
 */
export const encodeHtmlEntities = (text, { mode = 'basic', numeric = 'decimal' } = {}) => {
  const source = String(text ?? '')
  if (mode === 'basic') return encodeBasicEntities(source)

  const toNumeric = (codePoint) =>
    numeric === 'hex' ? `&#x${codePoint.toString(16).toUpperCase()};` : `&#${codePoint};`

  let result = ''
  for (const char of source) {
    if (BASIC_ENTITY_MAP[char]) {
      result += BASIC_ENTITY_MAP[char]
      continue
    }
    const codePoint = char.codePointAt(0)
    if (codePoint <= 127) {
      result += char
      continue
    }
    if (mode === 'named' && REVERSE_NAMED.has(char)) {
      result += REVERSE_NAMED.get(char)
      continue
    }
    result += toNumeric(codePoint)
  }
  return result
}

const ENTITY_PATTERN = /&(#[xX][0-9a-fA-F]{1,6}|#\d{1,7}|[a-zA-Z][a-zA-Z0-9]{1,31});/g

const decodeNumeric = (body) => {
  const isHex = body[1] === 'x' || body[1] === 'X'
  const codePoint = parseInt(body.slice(isHex ? 2 : 1), isHex ? 16 : 10)
  if (!Number.isFinite(codePoint) || codePoint > 0x10ffff) return REPLACEMENT_CHAR
  if (codePoint === 0 || (codePoint >= 0xd800 && codePoint <= 0xdfff)) return REPLACEMENT_CHAR
  return String.fromCodePoint(codePoint)
}

/**
 * 解码。未知命名实体默认原样保留，可通过 fallback(entityText) 自定义（例如浏览器 DOM 解码）。
 */
export const decodeHtmlEntities = (text, { fallback } = {}) =>
  String(text ?? '').replace(ENTITY_PATTERN, (match, body) => {
    if (body[0] === '#') return decodeNumeric(body)
    if (Object.hasOwn(NAMED_ENTITIES, body)) return NAMED_ENTITIES[body]
    if (typeof fallback === 'function') {
      const decoded = fallback(match)
      if (typeof decoded === 'string' && decoded !== match) return decoded
    }
    return match
  })

export const QUICK_REFERENCE_ENTITIES = Object.freeze([
  { char: '&', entity: '&amp;' },
  { char: '<', entity: '&lt;' },
  { char: '>', entity: '&gt;' },
  { char: '"', entity: '&quot;' },
  { char: "'", entity: '&#39;' },
  { char: ' ', entity: '&nbsp;', display: '(空格)' },
  { char: '©', entity: '&copy;' },
  { char: '®', entity: '&reg;' },
  { char: '™', entity: '&trade;' },
  { char: '€', entity: '&euro;' },
  { char: '£', entity: '&pound;' },
  { char: '¥', entity: '&yen;' },
  { char: '°', entity: '&deg;' },
  { char: '×', entity: '&times;' },
  { char: '…', entity: '&hellip;' },
  { char: '—', entity: '&mdash;' },
  { char: '→', entity: '&rarr;' },
  { char: '≠', entity: '&ne;' },
])
