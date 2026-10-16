/**
 * 单位换算。系数采用国际定义的精确值（1 mi = 1609.344 m、1 lb = 0.45359237 kg …）。
 */
export const LENGTH_UNITS = {
  mm: { name: '毫米', factor: 0.001 },
  cm: { name: '厘米', factor: 0.01 },
  m: { name: '米', factor: 1 },
  km: { name: '千米', factor: 1000 },
  in: { name: '英寸', factor: 0.0254 },
  ft: { name: '英尺', factor: 0.3048 },
  yd: { name: '码', factor: 0.9144 },
  mi: { name: '英里', factor: 1609.344 },
  nmi: { name: '海里', factor: 1852 },
}

export const WEIGHT_UNITS = {
  mg: { name: '毫克', factor: 0.000001 },
  g: { name: '克', factor: 0.001 },
  kg: { name: '千克', factor: 1 },
  t: { name: '吨', factor: 1000 },
  jin: { name: '斤', factor: 0.5 },
  oz: { name: '盎司', factor: 0.028349523125 },
  lb: { name: '磅', factor: 0.45359237 },
  st: { name: '英石', factor: 6.35029318 },
}

export const VOLUME_UNITS = {
  mL: { name: '毫升', factor: 0.001 },
  L: { name: '升', factor: 1 },
  m3: { name: '立方米', factor: 1000 },
  gal: { name: '美加仑', factor: 3.785411784 },
  pt: { name: '美品脱', factor: 0.473176473 },
  cup: { name: '美制杯', factor: 0.2365882365 },
  fl_oz: { name: '美液盎司', factor: 0.0295735295625 },
}

/** 去掉浮点噪声与多余的 0：最多 12 位有效数字 */
export const formatNumber = (value) => {
  if (!Number.isFinite(value)) return ''
  if (value === 0) return '0'
  const rounded = Number(value.toPrecision(12))
  const abs = Math.abs(rounded)
  if (abs >= 1e15 || abs < 1e-9) return rounded.toExponential().replace(/\.?0+e/, 'e')
  return String(rounded)
}

const parseInput = (raw) => {
  if (raw === '' || raw === null || raw === undefined) return null
  const value = typeof raw === 'number' ? raw : Number(String(raw).trim())
  return Number.isFinite(value) ? value : null
}

/** 返回格式化后的字符串；输入为空 / 非法时返回 '' */
export const convertLinear = (raw, from, to, units) => {
  const value = parseInput(raw)
  if (value === null || !units[from] || !units[to]) return ''
  return formatNumber((value * units[from].factor) / units[to].factor)
}

const TO_KELVIN = {
  C: (v) => v + 273.15,
  F: (v) => ((v - 32) * 5) / 9 + 273.15,
  K: (v) => v,
}
const FROM_KELVIN = {
  C: (k) => k - 273.15,
  F: (k) => ((k - 273.15) * 9) / 5 + 32,
  K: (k) => k,
}

export const convertTemperature = (raw, from, to) => {
  const value = parseInput(raw)
  if (value === null || !TO_KELVIN[from] || !FROM_KELVIN[to]) return ''
  const kelvin = TO_KELVIN[from](value)
  if (kelvin < -1e-9) return '低于绝对零度'
  return formatNumber(Number(FROM_KELVIN[to](kelvin).toFixed(10)))
}
