import { describe, expect, it } from 'vitest'
import {
  createId,
  randomInt,
  randomPick,
  randomString,
  sampleWithoutReplacement,
  shuffle,
  uuidV4,
  weightedIndex,
} from './random'

describe('randomInt', () => {
  it('stays inside the inclusive range', () => {
    for (let i = 0; i < 500; i++) {
      const value = randomInt(3, 7)
      expect(value).toBeGreaterThanOrEqual(3)
      expect(value).toBeLessThanOrEqual(7)
      expect(Number.isInteger(value)).toBe(true)
    }
  })

  it('returns the only value for a single-element range', () => {
    expect(randomInt(5, 5)).toBe(5)
  })

  it('rejects invalid ranges', () => {
    expect(() => randomInt(5, 2)).toThrow(RangeError)
  })
})

describe('collections', () => {
  it('picks from lists', () => {
    expect(randomPick([])).toBeUndefined()
    expect(['a', 'b']).toContain(randomPick(['a', 'b']))
  })

  it('shuffles without losing elements', () => {
    const source = [1, 2, 3, 4, 5, 6]
    const shuffled = shuffle(source)
    expect(shuffled).toHaveLength(source.length)
    expect([...shuffled].sort()).toEqual([...source].sort())
    expect(source).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('samples without replacement', () => {
    const sample = sampleWithoutReplacement(['a', 'b', 'c', 'd'], 3)
    expect(sample).toHaveLength(3)
    expect(new Set(sample).size).toBe(3)
  })
})

describe('weightedIndex', () => {
  it('never returns zero-weight entries', () => {
    for (let i = 0; i < 200; i++) {
      expect(weightedIndex([0, 5, 0])).toBe(1)
    }
  })

  it('returns -1 when all weights are zero', () => {
    expect(weightedIndex([0, 0])).toBe(-1)
  })
})

describe('strings and ids', () => {
  it('builds strings from an alphabet', () => {
    const value = randomString(12, 'ab')
    expect(value).toHaveLength(12)
    expect(value).toMatch(/^[ab]+$/)
  })

  it('creates v4 uuids', () => {
    expect(uuidV4()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  })

  it('creates unique ids', () => {
    const ids = new Set(Array.from({ length: 200 }, () => createId('n-')))
    expect(ids.size).toBe(200)
    expect([...ids][0]).toMatch(/^n-/)
  })
})
