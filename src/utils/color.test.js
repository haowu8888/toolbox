import { describe, expect, it } from 'vitest'
import {
  contrastRatio,
  hexToRgb,
  hslToHex,
  hslToRgb,
  normalizeHex,
  rgbToHex,
  rgbToHsl,
  wcagLevel,
} from './color'

describe('color conversions', () => {
  it('normalizes hex in short / long form with or without #', () => {
    expect(normalizeHex('#abc')).toBe('#AABBCC')
    expect(normalizeHex('4ecdc4')).toBe('#4ECDC4')
    expect(normalizeHex(' #4ECDC4 ')).toBe('#4ECDC4')
    expect(normalizeHex('#abcd')).toBeNull()
    expect(normalizeHex('zzz')).toBeNull()
  })

  it('round-trips hex → rgb → hex', () => {
    expect(hexToRgb('#4ecdc4')).toEqual({ r: 78, g: 205, b: 196 })
    expect(rgbToHex(78, 205, 196)).toBe('#4ECDC4')
    expect(hexToRgb('nope')).toBeNull()
  })

  it('converts between rgb and hsl', () => {
    expect(rgbToHsl(255, 0, 0)).toEqual({ h: 0, s: 100, l: 50 })
    expect(rgbToHsl(128, 128, 128)).toEqual({ h: 0, s: 0, l: 50 })
    expect(hslToRgb(120, 100, 25)).toEqual({ r: 0, g: 128, b: 0 })
    expect(hslToHex(360, 100, 50)).toBe('#FF0000')
    expect(hslToHex(-120, 100, 50)).toBe('#0000FF')
  })
})

describe('contrast', () => {
  const white = { r: 255, g: 255, b: 255 }
  const black = { r: 0, g: 0, b: 0 }

  it('computes WCAG contrast ratios', () => {
    expect(contrastRatio(white, black)).toBeCloseTo(21, 5)
    expect(contrastRatio(white, white)).toBeCloseTo(1, 5)
    expect(contrastRatio(hexToRgb('#767676'), white)).toBeCloseTo(4.54, 2)
  })

  it('maps ratios to levels', () => {
    expect(wcagLevel(21)).toBe('AAA')
    expect(wcagLevel(4.6)).toBe('AA')
    expect(wcagLevel(3.2)).toBe('AA 大字')
    expect(wcagLevel(1.5)).toBe('不达标')
  })
})
