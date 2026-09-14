import { ref, computed } from 'vue'
import { readStorageRaw, removeStorageKey, STORAGE_KEYS, writeStorageRaw } from '../utils/storageKeys'

const theme = ref('light')
// 用户是否手动选择过主题；false 表示跟随系统
const manual = ref(false)
let mediaQuery = null
let initialized = false

const storageKey = STORAGE_KEYS.theme

const readSavedTheme = () => {
  const saved = readStorageRaw(storageKey)
  return saved === 'dark' || saved === 'light' ? saved : null
}

// 应用主题；persist=false 表示跟随系统，不写入 localStorage
const applyTheme = (themeValue, persist) => {
  const root = document.documentElement

  if (themeValue === 'dark') {
    root.setAttribute('data-theme', 'dark')
  } else {
    root.removeAttribute('data-theme')
  }

  manual.value = persist
  if (persist) {
    writeStorageRaw(storageKey, themeValue)
  } else {
    removeStorageKey(storageKey)
  }
}

const handleSystemThemeChange = (e) => {
  // 仅当用户未手动设置过主题时跟随系统
  if (!readSavedTheme()) {
    theme.value = e.matches ? 'dark' : 'light'
    applyTheme(theme.value, false)
  }
}

// 初始化主题（若用户未手动选择主题，则跟随系统且不写入 localStorage）
const initTheme = () => {
  if (initialized) return
  initialized = true

  const saved = readSavedTheme()
  mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

  if (saved) {
    theme.value = saved
    applyTheme(theme.value, true)
  } else {
    theme.value = mediaQuery.matches ? 'dark' : 'light'
    applyTheme(theme.value, false)
  }

  // 监听系统主题切换
  mediaQuery.addEventListener('change', handleSystemThemeChange)
}

// 切换主题
const toggleTheme = () => {
  theme.value = theme.value === 'light' ? 'dark' : 'light'
  applyTheme(theme.value, true)
}

// 设置主题
const setTheme = (themeValue) => {
  theme.value = themeValue === 'dark' ? 'dark' : 'light'
  applyTheme(theme.value, true)
}

// 恢复跟随系统
const resetTheme = () => {
  const prefersDark = mediaQuery
    ? mediaQuery.matches
    : window.matchMedia('(prefers-color-scheme: dark)').matches
  theme.value = prefersDark ? 'dark' : 'light'
  applyTheme(theme.value, false)
}

const disposeThemeListener = () => {
  if (!mediaQuery) return
  mediaQuery.removeEventListener('change', handleSystemThemeChange)
  mediaQuery = null
  initialized = false
}

export const useTheme = () => {
  return {
    theme: computed(() => theme.value),
    isDark: computed(() => theme.value === 'dark'),
    followsSystem: computed(() => !manual.value),
    initTheme,
    toggleTheme,
    setTheme,
    resetTheme,
    disposeThemeListener,
  }
}
