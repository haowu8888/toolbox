import { onBeforeUnmount } from 'vue'
import { runRegex } from '../utils/regexRunner'

export const REGEX_TIMEOUT_MS = 1500

const namedError = (name, message) => Object.assign(new Error(message), { name })

/**
 * 在 Web Worker 中执行正则，超时后终止并重建 Worker，避免 (a+)+$ 这类回溯把页面卡死。
 *  - run(payload) 返回 Promise；新请求会取消尚未完成的旧请求（AbortError）
 *  - 超时抛出 TimeoutError
 *  - 不支持 Worker 的环境退化为同步执行
 */
export const useRegexWorker = ({ timeoutMs = REGEX_TIMEOUT_MS } = {}) => {
  const supported = typeof Worker !== 'undefined'
  let worker = null
  let seq = 0
  let pending = null

  const kill = () => {
    worker?.terminate()
    worker = null
  }

  const settle = (fn) => {
    if (!pending) return
    const current = pending
    pending = null
    clearTimeout(current.timer)
    fn(current)
  }

  const spawn = () => {
    worker = new Worker(new URL('../utils/regex.worker.js', import.meta.url), { type: 'module' })
    worker.onmessage = ({ data }) => {
      if (!pending || data.id !== pending.id) return
      settle(({ resolve, reject }) =>
        data.ok ? resolve(data.result) : reject(new Error(data.error)),
      )
    }
    worker.onerror = (event) => {
      event.preventDefault?.()
      kill()
      settle(({ reject }) => reject(new Error(event.message || '正则执行失败')))
    }
  }

  const run = (payload) => {
    if (!supported) return Promise.resolve().then(() => runRegex(payload))

    // 上一个请求还没返回：多半正在回溯，直接丢弃这个线程
    if (pending) {
      kill()
      settle(({ reject }) => reject(namedError('AbortError', '已取消')))
    }
    if (!worker) spawn()

    const id = ++seq
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        kill()
        settle(() =>
          reject(
            namedError(
              'TimeoutError',
              `匹配超过 ${timeoutMs / 1000} 秒已中止，正则可能存在灾难性回溯`,
            ),
          ),
        )
      }, timeoutMs)
      pending = { id, resolve, reject, timer }
      worker.postMessage({ id, payload })
    })
  }

  onBeforeUnmount(() => {
    settle(({ reject }) => reject(namedError('AbortError', '已取消')))
    kill()
  })

  return { run }
}
