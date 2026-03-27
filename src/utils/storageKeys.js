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
