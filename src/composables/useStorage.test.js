import { beforeEach, describe, expect, it } from 'vitest'
import { useFavorites, useHistory } from './useStorage'

describe('useHistory', () => {
  beforeEach(() => {
    useHistory().clearHistory()
  })

  it('adds entries newest first with generated ids and timestamps', () => {
    const { addHistory, historyList } = useHistory()
    addHistory('JSON', 'a')
    const second = addHistory('JSON', 'b')
    expect(historyList.value).toHaveLength(2)
    expect(historyList.value[0]).toBe(second)
    expect(second.id).toMatch(/^h-/)
    expect(new Date(second.timestamp).getTime()).not.toBeNaN()
  })

  it('stringifies non-string values', () => {
    const { addHistory } = useHistory()
    const item = addHistory('对象', { a: 1 })
    expect(item.value).toBe('{"a":1}')
  })

  it('skips consecutive duplicates', () => {
    const { addHistory, historyList } = useHistory()
    addHistory('复制', 'same')
    addHistory('复制', 'same')
    addHistory('其它', 'same')
    expect(historyList.value).toHaveLength(2)
  })

  it('caps the list at 200 entries and truncates huge values', () => {
    const { addHistory, historyList } = useHistory()
    for (let i = 0; i < 230; i++) addHistory('n', String(i))
    expect(historyList.value).toHaveLength(200)
    expect(historyList.value[0].value).toBe('229')

    const huge = addHistory('big', 'x'.repeat(10_000))
    expect(huge.value).toHaveLength(5000)
  })

  it('deletes single items and shares state between callers', () => {
    const first = useHistory()
    const second = useHistory()
    const item = first.addHistory('t', 'v')
    expect(second.getHistory()).toHaveLength(1)
    second.deleteHistoryItem(item.id)
    expect(first.historyList.value).toHaveLength(0)
  })
})

describe('useFavorites', () => {
  beforeEach(() => {
    useFavorites().clearFavorites()
  })

  it('adds, detects and removes favorites', () => {
    const { addFavorite, isFavorite, removeFavorite, favoriteList } = useFavorites()
    const item = addFavorite('JSON', '{"a":1}')
    expect(item.name).toBe('{"a":1}')
    expect(isFavorite('{"a":1}')).toBe(true)
    removeFavorite(item.id)
    expect(isFavorite('{"a":1}')).toBe(false)
    expect(favoriteList.value).toEqual([])
  })

  it('derives a short name when none is given', () => {
    const { addFavorite } = useFavorites()
    const item = addFavorite('文本', 'y'.repeat(80))
    expect(item.name).toHaveLength(30)
  })
})
