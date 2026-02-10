import { reactive } from 'vue'

const toasts = reactive([])
let nextId = 0

const showToast = (message, type = 'success', duration = 3000) => {
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
