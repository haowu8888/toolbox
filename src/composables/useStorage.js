import { ref } from 'vue'

/**
 * 本地存储工具
 */
export const useLocalStorage = (key, defaultValue) => {
  const getValue = () => {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : defaultValue
    } catch (err) {
      console.error(`Error reading localStorage key "${key}":`, err)
      return defaultValue
    }
  }

  const setValue = (value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch (err) {
      console.error(`Error setting localStorage key "${key}":`, err)
    }
  }

  return { getValue, setValue }
}

// 单例响应式状态，确保所有组件共享同一数据
let _historyRef = null
let _historyKey = 'toolbox_history'
let _favoritesRef = null
let _favoritesKey = 'toolbox_favorites'
let _idCounter = 0

function loadFromStorage(key, defaultValue) {
  try {
    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : defaultValue
  } catch {
    return defaultValue
  }
}

function saveToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (err) {
    console.error(`Error saving localStorage key "${key}":`, err)
  }
}

/**
 * 历史记录管理（响应式单例）
 */
export const useHistory = (key = 'toolbox_history') => {
  _historyKey = key
  if (!_historyRef) {
    _historyRef = ref(loadFromStorage(key, []))
  }

  const addHistory = (type, value) => {
    const item = {
      id: `${Date.now()}-${++_idCounter}`,
      type,
      value: typeof value === 'string' ? value : JSON.stringify(value),
      timestamp: new Date().toISOString(),
    }
    _historyRef.value = [item, ..._historyRef.value.slice(0, 199)]
    saveToStorage(_historyKey, _historyRef.value)
    return item
  }

  const getHistory = () => _historyRef.value

  const clearHistory = () => {
    _historyRef.value = []
    saveToStorage(_historyKey, [])
  }

  const deleteHistoryItem = (id) => {
    _historyRef.value = _historyRef.value.filter(item => item.id !== id)
    saveToStorage(_historyKey, _historyRef.value)
  }

  return {
    addHistory,
    getHistory,
    clearHistory,
    deleteHistoryItem,
    historyList: _historyRef,
  }
}

/**
 * 收藏夹管理（响应式单例）
 */
export const useFavorites = (key = 'toolbox_favorites') => {
  _favoritesKey = key
  if (!_favoritesRef) {
    _favoritesRef = ref(loadFromStorage(key, []))
  }

  const addFavorite = (type, value, name = '') => {
    const item = {
      id: `${Date.now()}-${++_idCounter}`,
      type,
      value: typeof value === 'string' ? value : JSON.stringify(value),
      name: name || (typeof value === 'string' ? value.substring(0, 30) : ''),
      createdAt: new Date().toISOString(),
    }
    _favoritesRef.value = [..._favoritesRef.value, item]
    saveToStorage(_favoritesKey, _favoritesRef.value)
    return item
  }

  const getFavorites = () => _favoritesRef.value

  const removeFavorite = (id) => {
    _favoritesRef.value = _favoritesRef.value.filter(item => item.id !== id)
    saveToStorage(_favoritesKey, _favoritesRef.value)
  }

  const clearFavorites = () => {
    _favoritesRef.value = []
    saveToStorage(_favoritesKey, [])
  }

  const isFavorite = (value) => {
    return _favoritesRef.value.some(item => item.value === value)
  }

  return {
    addFavorite,
    getFavorites,
    removeFavorite,
    clearFavorites,
    isFavorite,
    favoriteList: _favoritesRef,
  }
}
