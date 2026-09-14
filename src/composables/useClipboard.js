import { useToast } from './useToast'
import { useHistory } from './useStorage'

const toText = (value) => {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'object') return JSON.stringify(value, null, 2)
  return String(value)
}

// 非安全上下文（如局域网 http）没有 navigator.clipboard，退化为 execCommand
const writeWithFallback = async (text) => {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.setAttribute('aria-hidden', 'true')
  textarea.style.position = 'fixed'
  textarea.style.top = '0'
  textarea.style.left = '0'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  textarea.setSelectionRange(0, text.length)

  let ok = false
  try {
    ok = document.execCommand('copy')
  } finally {
    textarea.remove()
  }
  if (!ok) throw new Error('execCommand copy failed')
}

/**
 * 统一的复制到剪贴板逻辑：成功/失败提示 + 可选写入历史记录。
 *
 * copyText(value, { successMessage, errorMessage, history })
 *  - history: '类型' 或 ['类型', '记录内容']，缺省记录内容为复制的文本
 */
export const useClipboard = () => {
  const { showToast } = useToast()
  const { addHistory } = useHistory()

  const copyText = async (value, options = {}) => {
    const {
      successMessage = '已复制',
      errorMessage = '复制失败',
      emptyMessage = '没有可复制的内容',
      history = null,
    } = options

    const text = toText(value)
    if (!text) {
      if (emptyMessage) showToast(emptyMessage, 'info')
      return false
    }

    try {
      await writeWithFallback(text)
      if (successMessage) showToast(successMessage)
      if (history) {
        const [type, recordValue] = Array.isArray(history) ? history : [history, text]
        addHistory(type, recordValue ?? text)
      }
      return true
    } catch {
      showToast(errorMessage, 'error')
      return false
    }
  }

  return { copyText }
}
