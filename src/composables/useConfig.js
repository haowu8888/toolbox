import { CLEARABLE_STORAGE_KEYS, defaultAppState, safeParseJson, STORAGE_KEYS } from '../utils/storageKeys'

const readRawValue = (key, fallback = null) => {
  try {
    const value = localStorage.getItem(key)
    return value ?? fallback
  } catch (err) {
    console.error(`Error reading localStorage key "${key}":`, err)
    return fallback
  }
}

const readJsonValue = (key, fallback) => safeParseJson(readRawValue(key), fallback)

const writeJsonValue = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value))
}

const normalizeTheme = (theme) => (theme === 'dark' ? 'dark' : 'light')

const normalizeAppState = (appState = {}) => ({
  favoriteTools: Array.isArray(appState.favoriteTools) ? appState.favoriteTools : [],
  recentTools: Array.isArray(appState.recentTools) ? appState.recentTools : [],
  lastTool: typeof appState.lastTool === 'string' && appState.lastTool ? appState.lastTool : null,
  notes: Array.isArray(appState.notes) ? appState.notes : [],
  lotteryTemplates: Array.isArray(appState.lotteryTemplates) ? appState.lotteryTemplates : [],
  lotteryRecords: Array.isArray(appState.lotteryRecords) ? appState.lotteryRecords : [],
})

const readThemeValue = () => normalizeTheme(readRawValue(STORAGE_KEYS.theme, 'light'))

const readAppState = () => ({
  favoriteTools: readJsonValue(STORAGE_KEYS.favoriteTools, defaultAppState().favoriteTools),
  recentTools: readJsonValue(STORAGE_KEYS.recentTools, defaultAppState().recentTools),
  lastTool: readRawValue(STORAGE_KEYS.lastTool),
  notes: readJsonValue(STORAGE_KEYS.notes, defaultAppState().notes),
  lotteryTemplates: readJsonValue(STORAGE_KEYS.lotteryTemplates, defaultAppState().lotteryTemplates),
  lotteryRecords: readJsonValue(STORAGE_KEYS.lotteryRecords, defaultAppState().lotteryRecords),
})

const writeAppState = (appState) => {
  writeJsonValue(STORAGE_KEYS.favoriteTools, appState.favoriteTools)
  writeJsonValue(STORAGE_KEYS.recentTools, appState.recentTools)
  writeJsonValue(STORAGE_KEYS.notes, appState.notes)
  writeJsonValue(STORAGE_KEYS.lotteryTemplates, appState.lotteryTemplates)
  writeJsonValue(STORAGE_KEYS.lotteryRecords, appState.lotteryRecords)

  if (appState.lastTool) {
    localStorage.setItem(STORAGE_KEYS.lastTool, appState.lastTool)
    return
  }

  localStorage.removeItem(STORAGE_KEYS.lastTool)
}

/**
 * 配置管理工具
 */
export const useConfig = (key = STORAGE_KEYS.config) => {
  const getConfig = () => {
    try {
      return readJsonValue(key, {})
    } catch (err) {
      console.error(`Error reading config:`, err)
      return {}
    }
  }

  const saveConfig = (config) => {
    try {
      writeJsonValue(key, config)
    } catch (err) {
      console.error(`Error saving config:`, err)
    }
  }

  const exportConfig = () => {
    const config = getConfig()
    return {
      config,
      history: readJsonValue(STORAGE_KEYS.history, []),
      favorites: readJsonValue(STORAGE_KEYS.favorites, []),
      theme: readThemeValue(),
      appState: readAppState(),
      exportDate: new Date().toISOString(),
      version: '1.0',
    }
  }

  const downloadConfig = (filename = 'toolbox-config.json') => {
    const data = exportConfig()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  }

  const importConfig = (file) =>
    new Promise((resolve, reject) => {
      if (file.size > 5 * 1024 * 1024) {
        reject(new Error('配置文件过大，最大支持 5MB'))
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result)
          if (data.version !== '1.0') {
            reject(new Error('配置文件版本不兼容'))
            return
          }

          if (data.history && !Array.isArray(data.history)) {
            reject(new Error('配置文件格式错误：history 应为数组'))
            return
          }

          if (data.favorites && !Array.isArray(data.favorites)) {
            reject(new Error('配置文件格式错误：favorites 应为数组'))
            return
          }

          if (data.appState && typeof data.appState !== 'object') {
            reject(new Error('配置文件格式错误：appState 应为对象'))
            return
          }

          const history = Array.isArray(data.history) ? data.history.slice(0, 500) : []
          const favorites = Array.isArray(data.favorites) ? data.favorites.slice(0, 500) : []
          const appState = normalizeAppState(data.appState)

          writeJsonValue(STORAGE_KEYS.config, data.config || {})
          writeJsonValue(STORAGE_KEYS.history, history)
          writeJsonValue(STORAGE_KEYS.favorites, favorites)
          localStorage.setItem(STORAGE_KEYS.theme, normalizeTheme(data.theme))
          writeAppState(appState)

          resolve(data)
        } catch (err) {
          reject(new Error('配置文件格式错误：' + err.message))
        }
      }
      reader.onerror = () => reject(new Error('读取文件失败'))
      reader.readAsText(file)
    })

  const clearAllData = () => {
    for (const storageKey of CLEARABLE_STORAGE_KEYS) {
      localStorage.removeItem(storageKey)
    }
  }

const getDataStats = () => {
    const config = getConfig()
    const history = readJsonValue(STORAGE_KEYS.history, [])
    const favorites = readJsonValue(STORAGE_KEYS.favorites, [])
    const notes = readJsonValue(STORAGE_KEYS.notes, [])
    const lotteryRecords = readJsonValue(STORAGE_KEYS.lotteryRecords, [])
    const totalSize = CLEARABLE_STORAGE_KEYS.reduce((size, storageKey) => {
      const raw = readRawValue(storageKey, '')
      return size + raw.length
    }, 0)

    return {
      configSize: JSON.stringify(config).length,
      historyCount: history.length,
      favoritesCount: favorites.length,
      notesCount: notes.length,
      lotteryRecordCount: lotteryRecords.length,
      totalSize,
    }
  }

  return {
    getConfig,
    saveConfig,
    exportConfig,
    downloadConfig,
    importConfig,
    clearAllData,
    getDataStats,
  }
}
