import { ref, computed } from 'vue'

const theme = ref('light')
let mediaQuery = null
let initialized = false

const storageKey = 'toolbox_theme'

// 初始化主题（若用户未手动选择主题，则跟随系统且不写入 localStorage）
const initTheme = () => {
  if (initialized) return
  initialized = true

  const saved = localStorage.getItem(storageKey)
  mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

  if (saved === 'dark' || saved === 'light') {
    theme.value = saved
    applyTheme(theme.value, true)
  } else {
    theme.value = mediaQuery.matches ? 'dark' : 'light'
    applyTheme(theme.value, false)
  }

  // 监听系统主题切换
  mediaQuery.addEventListener('change', handleSystemThemeChange)
}

const handleSystemThemeChange = (e) => {
  // 仅当用户未手动设置过主题时跟随系统
  if (!localStorage.getItem(storageKey)) {
    theme.value = e.matches ? 'dark' : 'light'
    applyTheme(theme.value, false)
  }
}

// 应用主题
const applyTheme = (themeValue, persist) => {
  const root = document.documentElement

  if (themeValue === 'dark') {
    root.setAttribute('data-theme', 'dark')
  } else {
    root.removeAttribute('data-theme')
  }

  if (persist) {
    localStorage.setItem(storageKey, themeValue)
  } else {
    localStorage.removeItem(storageKey)
  }
}

// 切换主题
const toggleTheme = () => {
  theme.value = theme.value === 'light' ? 'dark' : 'light'
  applyTheme(theme.value, true)
}

// 设置主题
const setTheme = (themeValue) => {
  theme.value = themeValue
  applyTheme(themeValue, true)
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
    initTheme,
    toggleTheme,
    setTheme,
    disposeThemeListener,
    isDark: computed(() => theme.value === 'dark'),
  }
}
