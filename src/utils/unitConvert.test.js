import { describe, expect, it } from 'vitest'
import {
  convertLinear,
  convertTemperature,
  formatNumber,
  LENGTH_UNITS,
  VOLUME_UNITS,
  WEIGHT_UNITS,
} from './unitConvert'

describe('convertLinear', () => {
  it('uses exact international definitions', () => {
    expect(convertLinear('1', 'mi', 'm', LENGTH_UNITS)).toBe('1609.344')
    expect(convertLinear('1', 'lb', 'kg', WEIGHT_UNITS)).toBe('0.45359237')
    expect(convertLinear('1', 'gal', 'L', VOLUME_UNITS)).toBe('3.785411784')
    expect(convertLinear('12', 'in', 'ft', LENGTH_UNITS)).toBe('1')
  })

  it('prints clean numbers instead of fixed decimals', () => {
    expect(convertLinear('1000', 'm', 'km', LENGTH_UNITS)).toBe('1')
    expect(convertLinear('1', 'km', 'm', LENGTH_UNITS)).toBe('1000')
    expect(convertLinear('0.1', 'm', 'cm', LENGTH_UNITS)).toBe('10')
  })

  it('treats 0 as a value and rejects garbage', () => {
    expect(convertLinear(0, 'm', 'km', LENGTH_UNITS)).toBe('0')
    expect(convertLinear('', 'm', 'km', LENGTH_UNITS)).toBe('')
    expect(convertLinear('abc', 'm', 'km', LENGTH_UNITS)).toBe('')
  })
})

describe('convertTemperature', () => {
  it('converts between C, F and K including 0', () => {
    expect(convertTemperature(0, 'C', 'F')).toBe('32')
    expect(convertTemperature(0, 'C', 'K')).toBe('273.15')
    expect(convertTemperature(-40, 'F', 'C')).toBe('-40')
    expect(convertTemperature('98.6', 'F', 'C')).toBe('37')
    expect(convertTemperature(-300, 'C', 'K')).toBe('低于绝对零度')
  })
})

describe('formatNumber', () => {
  it('handles tiny, huge and noisy values', () => {
    expect(formatNumber(0.1 + 0.2)).toBe('0.3')
    expect(formatNumber(1e-12)).toBe('1e-12')
    expect(formatNumber(2e20)).toBe('2e+20')
    expect(formatNumber(NaN)).toBe('')
  })
})
