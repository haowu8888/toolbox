import { reactive } from 'vue'

const toasts = reactive([])
let nextId = 0
const MAX_TOASTS = 5

const showToast = (message, type = 'success', duration = 3000) => {
  // 去重：如果最近一条消息完全相同，跳过
  if (toasts.length > 0 && toasts[toasts.length - 1].message === message) {
    return
  }
  // 超出上限时移除最早的
  if (toasts.length >= MAX_TOASTS) {
    toasts.shift()
  }
  const id = nextId++
  toasts.push({ id, message, type })
  setTimeout(() => {
    removeToast(id)
  }, duration)
}

const removeToast = (id) => {
  const index = toasts.findIndex(t => t.id === id)
  if (index > -1) {
    toasts.splice(index, 1)
  }
}

export const useToast = () => {
  return { toasts, showToast, removeToast }
}
