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

/**
 * 历史记录管理
 */
export const useHistory = (key = 'toolbox_history') => {
  const storage = useLocalStorage(key, [])

  const addHistory = (type, value, timestamp = new Date()) => {
    const history = storage.getValue()
    const item = {
      id: Date.now(),
      type,
      value,
      timestamp,
    }
    history.unshift(item)
    // 只保留最近 50 条记录
    if (history.length > 50) {
      history.pop()
    }
    storage.setValue(history)
    return item
  }

  const getHistory = () => {
    return storage.getValue()
  }

  const clearHistory = () => {
    storage.setValue([])
  }

  const deleteHistoryItem = (id) => {
    const history = storage.getValue()
    const filtered = history.filter(item => item.id !== id)
    storage.setValue(filtered)
  }

  return {
    addHistory,
    getHistory,
    clearHistory,
    deleteHistoryItem,
  }
}

/**
 * 收藏夹管理
 */
export const useFavorites = (key = 'toolbox_favorites') => {
  const storage = useLocalStorage(key, [])

  const addFavorite = (type, value, name = '') => {
    const favorites = storage.getValue()
    const item = {
      id: Date.now(),
      type,
      value,
      name: name || value.substring(0, 30),
      createdAt: new Date(),
    }
    favorites.push(item)
    storage.setValue(favorites)
    return item
  }

  const getFavorites = () => {
    return storage.getValue()
  }

  const removeFavorite = (id) => {
    const favorites = storage.getValue()
    const filtered = favorites.filter(item => item.id !== id)
    storage.setValue(filtered)
  }

  const clearFavorites = () => {
    storage.setValue([])
  }

  const isFavorite = (value) => {
    const favorites = storage.getValue()
    return favorites.some(item => item.value === value)
  }

  return {
    addFavorite,
    getFavorites,
    removeFavorite,
    clearFavorites,
    isFavorite,
  }
}
