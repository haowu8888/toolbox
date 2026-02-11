import { ref, computed } from 'vue'

const theme = ref('light')
let mediaQuery = null

// 初始化主题
const initTheme = () => {
  const saved = localStorage.getItem('toolbox_theme')
  mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

  if (saved) {
    theme.value = saved
  } else if (mediaQuery.matches) {
    theme.value = 'dark'
  }

  applyTheme(theme.value)

  // 监听系统主题切换
  mediaQuery.addEventListener('change', handleSystemThemeChange)
}

const handleSystemThemeChange = (e) => {
  // 仅当用户未手动设置过主题时跟随系统
  if (!localStorage.getItem('toolbox_theme')) {
    theme.value = e.matches ? 'dark' : 'light'
    applyTheme(theme.value)
  }
}

// 应用主题
const applyTheme = (themeValue) => {
  const root = document.documentElement

  if (themeValue === 'dark') {
    root.setAttribute('data-theme', 'dark')
  } else {
    root.removeAttribute('data-theme')
  }

  localStorage.setItem('toolbox_theme', themeValue)
}

// 切换主题
const toggleTheme = () => {
  theme.value = theme.value === 'light' ? 'dark' : 'light'
  applyTheme(theme.value)
}

// 设置主题
const setTheme = (themeValue) => {
  theme.value = themeValue
  applyTheme(themeValue)
}

export const useTheme = () => {
  return {
    theme: computed(() => theme.value),
    initTheme,
    toggleTheme,
    setTheme,
    isDark: computed(() => theme.value === 'dark'),
  }
}
