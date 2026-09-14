import { describe, expect, it } from 'vitest'
import { validateImportedConfig } from './useConfig'

describe('validateImportedConfig', () => {
  it('accepts a minimal valid file and fills defaults', () => {
    const result = validateImportedConfig({ version: '1.0' })
    expect(result).toEqual({
      config: {},
      history: [],
      favorites: [],
      // 没有主题字段 = 跟随系统，不应被强制成浅色
      theme: null,
      appState: {
        favoriteTools: [],
        recentTools: [],
        lastTool: null,
        notes: [],
        lotteryTemplates: [],
        lotteryRecords: [],
      },
    })
  })

  it('keeps app state and normalizes the theme', () => {
    const result = validateImportedConfig({
      version: '1.0',
      theme: 'dark',
      history: [{ id: 1 }],
      appState: { favoriteTools: ['json'], lastTool: 'jwt', notes: 'bad' },
    })
    expect(result.theme).toBe('dark')
    expect(result.history).toHaveLength(1)
    expect(result.appState.favoriteTools).toEqual(['json'])
    expect(result.appState.lastTool).toBe('jwt')
    expect(result.appState.notes).toEqual([])
    expect(validateImportedConfig({ version: '1.0', theme: 'blue' }).theme).toBeNull()
  })

  it('caps very long lists', () => {
    const history = Array.from({ length: 800 }, (_, i) => ({ id: i }))
    expect(validateImportedConfig({ version: '1.0', history }).history).toHaveLength(500)
  })

  it('rejects wrong shapes with readable messages', () => {
    expect(() => validateImportedConfig(null)).toThrow(/根节点/)
    expect(() => validateImportedConfig({ version: '2.0' })).toThrow(/版本不兼容/)
    expect(() => validateImportedConfig({ version: '1.0', history: {} })).toThrow(/history/)
    expect(() => validateImportedConfig({ version: '1.0', favorites: 'x' })).toThrow(/favorites/)
    expect(() => validateImportedConfig({ version: '1.0', appState: 3 })).toThrow(/appState/)
  })
})
