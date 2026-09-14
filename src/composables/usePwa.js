import { ref } from 'vue'
import { registerSW } from 'virtual:pwa-register'

const needRefresh = ref(false)
const offlineReady = ref(false)
let updateServiceWorker = null
let registered = false

/**
 * PWA 生命周期：注册 Service Worker，暴露「新版本可用」与「离线可用」状态。
 * registerType 为 prompt，新版本不会静默替换，由用户决定何时刷新。
 */
export const usePwa = () => {
  const init = () => {
    if (registered) return
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return
    registered = true

    try {
      updateServiceWorker = registerSW({
        immediate: true,
        onNeedRefresh() {
          needRefresh.value = true
        },
        onOfflineReady() {
          offlineReady.value = true
        },
        onRegisterError(error) {
          console.warn('Service Worker 注册失败:', error)
        },
      })
    } catch (error) {
      console.warn('PWA 初始化失败:', error)
    }
  }

  const applyUpdate = async () => {
    if (!updateServiceWorker) {
      window.location.reload()
      return
    }
    needRefresh.value = false
    await updateServiceWorker(true)
  }

  const dismissUpdate = () => {
    needRefresh.value = false
  }

  return { needRefresh, offlineReady, init, applyUpdate, dismissUpdate }
}
