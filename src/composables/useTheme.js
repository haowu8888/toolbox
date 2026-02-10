import { ref, watch, computed } from 'vue'

const theme = ref('light')

// 初始化主题
const initTheme = () => {
  const saved = localStorage.getItem('toolbox_theme')
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches

  if (saved) {
    theme.value = saved
  } else if (prefersDark) {
    theme.value = 'dark'
  }

  applyTheme(theme.value)
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
