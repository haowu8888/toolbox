import { ref } from 'vue'
import { createId } from '../utils/random'
import { readStorageArray, readStorageJson, STORAGE_KEYS, writeStorageJson } from '../utils/storageKeys'

const MAX_HISTORY = 200
// 单条记录最长保留的字符数，防止超大 JSON 撑爆 localStorage 配额
const MAX_VALUE_LENGTH = 5000

/**
 * 简单的 localStorage JSON 读写封装（不响应式）。
 */
export const useLocalStorage = (key, defaultValue) => ({
  getValue: () => readStorageJson(key, defaultValue),
  setValue: (value) => writeStorageJson(key, value),
})

const toRecordValue = (value) => (typeof value === 'string' ? value : JSON.stringify(value))

// 单例响应式状态，确保所有组件共享同一份数据
let historyRef = null
let favoritesRef = null

const ensureHistory = () => {
  if (!historyRef) historyRef = ref(readStorageArray(STORAGE_KEYS.history))
  return historyRef
}

const ensureFavorites = () => {
  if (!favoritesRef) favoritesRef = ref(readStorageArray(STORAGE_KEYS.favorites))
  return favoritesRef
}

const persistHistory = () => writeStorageJson(STORAGE_KEYS.history, historyRef.value)
const persistFavorites = () => writeStorageJson(STORAGE_KEYS.favorites, favoritesRef.value)

/**
 * 历史记录管理（响应式单例）
 */
export const useHistory = () => {
  const list = ensureHistory()

  const addHistory = (type, value) => {
    const recordValue = toRecordValue(value).slice(0, MAX_VALUE_LENGTH)
    const latest = list.value[0]
    // 连续相同的记录只保留一条，避免同一输入反复写入
    if (latest && latest.type === type && latest.value === recordValue) {
      return latest
    }
    const item = {
      id: createId('h-'),
      type,
      value: recordValue,
      timestamp: new Date().toISOString(),
    }
    list.value = [item, ...list.value.slice(0, MAX_HISTORY - 1)]
    persistHistory()
    return item
  }

  const getHistory = () => list.value

  const clearHistory = () => {
    list.value = []
    persistHistory()
  }

  const deleteHistoryItem = (id) => {
    list.value = list.value.filter((item) => item.id !== id)
    persistHistory()
  }

  return {
    addHistory,
    getHistory,
    clearHistory,
    deleteHistoryItem,
    historyList: list,
  }
}

/**
 * 收藏夹管理（响应式单例）
 */
export const useFavorites = () => {
  const list = ensureFavorites()

  const addFavorite = (type, value, name = '') => {
    const recordValue = toRecordValue(value)
    const item = {
      id: createId('f-'),
      type,
      value: recordValue,
      name: name || recordValue.substring(0, 30),
      createdAt: new Date().toISOString(),
    }
    list.value = [...list.value, item]
    persistFavorites()
    return item
  }

  const getFavorites = () => list.value

  const removeFavorite = (id) => {
    list.value = list.value.filter((item) => item.id !== id)
    persistFavorites()
  }

  const clearFavorites = () => {
    list.value = []
    persistFavorites()
  }

  const isFavorite = (value) => list.value.some((item) => item.value === value)

  return {
    addFavorite,
    getFavorites,
    removeFavorite,
    clearFavorites,
    isFavorite,
    favoriteList: list,
  }
}
