import { runRegex } from './regexRunner'

// 在独立线程执行用户正则：即使出现灾难性回溯，主线程也能通过 terminate() 及时止损
self.onmessage = ({ data }) => {
  const { id, payload } = data
  try {
    self.postMessage({ id, ok: true, result: runRegex(payload) })
  } catch (err) {
    self.postMessage({ id, ok: false, error: err?.message || String(err) })
  }
}
