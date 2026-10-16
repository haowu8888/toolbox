import { downloadJson, timestampedFilename } from '../utils/download'
import {
  CLEARABLE_STORAGE_KEYS,
  defaultAppState,
  readStorageJson,
  readStorageRaw,
  removeStorageKey,
  STORAGE_KEYS,
  writeStorageJson,
  writeStorageRaw,
} from '../utils/storageKeys'

export const CONFIG_VERSION = '1.0'
export const MAX_IMPORT_SIZE = 5 * 1024 * 1024
const MAX_IMPORT_ITEMS = 500

// null 表示“跟随系统”，导入时不写入主题键，避免把跟随系统的用户强制切成浅色
const normalizeTheme = (theme) => (theme === 'dark' || theme === 'light' ? theme : null)

const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)

// 列表里混入 null / 数字等非对象条目时，读取它们的组件会直接崩溃，导入时先过滤掉
const objectList = (value) => (Array.isArray(value) ? value.filter(isPlainObject).slice(0, MAX_IMPORT_ITEMS) : [])
const stringList = (value) =>
  Array.isArray(value) ? value.filter((item) => typeof item === 'string' && item).slice(0, MAX_IMPORT_ITEMS) : []

const normalizeAppState = (appState = {}) => ({
  favoriteTools: stringList(appState.favoriteTools),
  recentTools: stringList(appState.recentTools),
  lastTool: typeof appState.lastTool === 'string' && appState.lastTool ? appState.lastTool : null,
  notes: objectList(appState.notes),
  lotteryTemplates: objectList(appState.lotteryTemplates),
  lotteryRecords: objectList(appState.lotteryRecords),
})

const readThemeValue = () => normalizeTheme(readStorageRaw(STORAGE_KEYS.theme))

const readAppState = () => {
  const defaults = defaultAppState()
  return {
    favoriteTools: readStorageJson(STORAGE_KEYS.favoriteTools, defaults.favoriteTools),
    recentTools: readStorageJson(STORAGE_KEYS.recentTools, defaults.recentTools),
    lastTool: readStorageRaw(STORAGE_KEYS.lastTool),
    notes: readStorageJson(STORAGE_KEYS.notes, defaults.notes),
    lotteryTemplates: readStorageJson(STORAGE_KEYS.lotteryTemplates, defaults.lotteryTemplates),
    lotteryRecords: readStorageJson(STORAGE_KEYS.lotteryRecords, defaults.lotteryRecords),
  }
}

/** 返回是否全部写入成功（配额不足时 writeStorage* 返回 false） */
const writeAppState = (appState) => {
  const results = [
    writeStorageJson(STORAGE_KEYS.favoriteTools, appState.favoriteTools),
    writeStorageJson(STORAGE_KEYS.recentTools, appState.recentTools),
    writeStorageJson(STORAGE_KEYS.notes, appState.notes),
    writeStorageJson(STORAGE_KEYS.lotteryTemplates, appState.lotteryTemplates),
    writeStorageJson(STORAGE_KEYS.lotteryRecords, appState.lotteryRecords),
  ]
  if (appState.lastTool) results.push(writeStorageRaw(STORAGE_KEYS.lastTool, appState.lastTool))
  else removeStorageKey(STORAGE_KEYS.lastTool)
  return results.every(Boolean)
}

const snapshotStorage = () => CLEARABLE_STORAGE_KEYS.map((storageKey) => [storageKey, readStorageRaw(storageKey)])

const restoreStorage = (snapshot) => {
  for (const [storageKey, value] of snapshot) {
    if (value === null) removeStorageKey(storageKey)
    else writeStorageRaw(storageKey, value)
  }
}

const readFileAsText = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (event) => resolve(String(event.target?.result ?? ''))
    reader.onerror = () => reject(new Error('读取文件失败'))
    reader.readAsText(file)
  })

/**
 * 校验导入的配置对象，返回规范化后的数据；不合法时抛出带中文说明的错误。
 */
export const validateImportedConfig = (data) => {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('配置文件格式错误：根节点应为对象')
  }
  if (data.version !== CONFIG_VERSION) {
    throw new Error(`配置文件版本不兼容（期望 ${CONFIG_VERSION}，实际 ${data.version ?? '缺失'}）`)
  }
  if (data.history !== undefined && !Array.isArray(data.history)) {
    throw new Error('配置文件格式错误：history 应为数组')
  }
  if (data.favorites !== undefined && !Array.isArray(data.favorites)) {
    throw new Error('配置文件格式错误：favorites 应为数组')
  }
  if (data.appState !== undefined && (typeof data.appState !== 'object' || data.appState === null)) {
    throw new Error('配置文件格式错误：appState 应为对象')
  }
  if (data.config !== undefined && (typeof data.config !== 'object' || data.config === null)) {
    throw new Error('配置文件格式错误：config 应为对象')
  }

  return {
    config: data.config || {},
    history: objectList(data.history),
    favorites: objectList(data.favorites),
    theme: normalizeTheme(data.theme),
    appState: normalizeAppState(data.appState),
  }
}

/**
 * 配置管理工具
 */
export const useConfig = (key = STORAGE_KEYS.config) => {
  const getConfig = () => {
    const value = readStorageJson(key, {})
    return value && typeof value === 'object' ? value : {}
  }

  const saveConfig = (config) => writeStorageJson(key, config)

  const exportConfig = () => ({
    config: getConfig(),
    history: readStorageJson(STORAGE_KEYS.history, []),
    favorites: readStorageJson(STORAGE_KEYS.favorites, []),
    theme: readThemeValue(),
    appState: readAppState(),
    exportDate: new Date().toISOString(),
    version: CONFIG_VERSION,
  })

  const downloadConfig = (filename = timestampedFilename('toolbox-config', 'json')) => {
    downloadJson(exportConfig(), filename)
  }

  const importConfig = async (file) => {
    if (!file) throw new Error('未选择文件')
    if (file.size > MAX_IMPORT_SIZE) throw new Error('配置文件过大，最大支持 5MB')

    const text = await readFileAsText(file)
    let data
    try {
      data = JSON.parse(text)
    } catch (err) {
      throw new Error('配置文件格式错误：' + err.message)
    }

    const normalized = validateImportedConfig(data)
    // 要么全部写入，要么回滚：避免配额不足时只导入一半
    const snapshot = snapshotStorage()
    const results = [
      writeStorageJson(STORAGE_KEYS.config, normalized.config),
      writeStorageJson(STORAGE_KEYS.history, normalized.history),
      writeStorageJson(STORAGE_KEYS.favorites, normalized.favorites),
    ]
    if (normalized.theme) results.push(writeStorageRaw(STORAGE_KEYS.theme, normalized.theme))
    else removeStorageKey(STORAGE_KEYS.theme)
    results.push(writeAppState(normalized.appState))

    if (!results.every(Boolean)) {
      restoreStorage(snapshot)
      throw new Error('浏览器存储空间不足或不可用，导入已取消，原有数据未改动')
    }
    return data
  }

  const clearAllData = () => {
    for (const storageKey of CLEARABLE_STORAGE_KEYS) removeStorageKey(storageKey)
  }

  const getDataStats = () => {
    const config = getConfig()
    const history = readStorageJson(STORAGE_KEYS.history, [])
    const favorites = readStorageJson(STORAGE_KEYS.favorites, [])
    const notes = readStorageJson(STORAGE_KEYS.notes, [])
    const lotteryRecords = readStorageJson(STORAGE_KEYS.lotteryRecords, [])
    const totalSize = CLEARABLE_STORAGE_KEYS.reduce(
      (size, storageKey) => size + readStorageRaw(storageKey, '').length,
      0,
    )

    return {
      configSize: JSON.stringify(config).length,
      historyCount: Array.isArray(history) ? history.length : 0,
      favoritesCount: Array.isArray(favorites) ? favorites.length : 0,
      notesCount: Array.isArray(notes) ? notes.length : 0,
      lotteryRecordCount: Array.isArray(lotteryRecords) ? lotteryRecords.length : 0,
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
