export const STORAGE_KEYS = Object.freeze({
  config: 'toolbox_config',
  history: 'toolbox_history',
  favorites: 'toolbox_favorites',
  theme: 'toolbox_theme',
  lastTool: 'toolbox_last_tool',
  favoriteTools: 'toolbox_favorite_tools',
  recentTools: 'toolbox_recent_tools',
  notes: 'toolbox_notes',
  lotteryTemplates: 'toolbox_lottery_templates',
  lotteryRecords: 'toolbox_lottery_records',
})

export const CLEARABLE_STORAGE_KEYS = Object.freeze([
  STORAGE_KEYS.config,
  STORAGE_KEYS.history,
  STORAGE_KEYS.favorites,
  STORAGE_KEYS.theme,
  STORAGE_KEYS.lastTool,
  STORAGE_KEYS.favoriteTools,
  STORAGE_KEYS.recentTools,
  STORAGE_KEYS.notes,
  STORAGE_KEYS.lotteryTemplates,
  STORAGE_KEYS.lotteryRecords,
])

export const safeParseJson = (raw, fallback) => {
  try {
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

export const defaultAppState = () => ({
  favoriteTools: [],
  recentTools: [],
  lastTool: null,
  notes: [],
  lotteryTemplates: [],
  lotteryRecords: [],
})

/* ---------- 安全的 localStorage 读写（隐私模式 / 配额溢出 / 损坏数据都不会抛错） ---------- */

const hasStorage = () => {
  try {
    return typeof localStorage !== 'undefined'
  } catch {
    return false
  }
}

export const readStorageRaw = (key, fallback = null) => {
  if (!hasStorage()) return fallback
  try {
    const value = localStorage.getItem(key)
    return value ?? fallback
  } catch {
    return fallback
  }
}

export const readStorageJson = (key, fallback) => safeParseJson(readStorageRaw(key), fallback)

export const readStorageArray = (key) => {
  const value = readStorageJson(key, [])
  return Array.isArray(value) ? value : []
}

export const writeStorageRaw = (key, value) => {
  if (!hasStorage()) return false
  try {
    localStorage.setItem(key, value)
    return true
  } catch (err) {
    console.error(`Error saving localStorage key "${key}":`, err)
    return false
  }
}

export const writeStorageJson = (key, value) => writeStorageRaw(key, JSON.stringify(value))

export const removeStorageKey = (key) => {
  if (!hasStorage()) return
  try {
    localStorage.removeItem(key)
  } catch {
    // ignore
  }
}
