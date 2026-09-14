import { onActivated, onBeforeUnmount, onDeactivated, onMounted, ref } from 'vue'

/**
 * KeepAlive 感知的定时器：
 *  - 组件被 <KeepAlive> 缓存（切到其它工具）时自动暂停
 *  - 页面切到后台（document.hidden）时自动暂停，回到前台恢复
 *  - 组件卸载时自动清理
 *
 * 返回 { running, pause, resume }，resume 会跳过已处于暂停条件的场景。
 */
export const useInterval = (callback, delay, options = {}) => {
  const { immediate = false, pauseWhenHidden = true } = options

  let timer = null
  let deactivated = false
  const running = ref(false)

  const canRun = () => {
    if (deactivated) return false
    if (pauseWhenHidden && typeof document !== 'undefined' && document.hidden) return false
    return true
  }

  const pause = () => {
    if (timer !== null) {
      clearInterval(timer)
      timer = null
    }
    running.value = false
  }

  const resume = () => {
    if (!canRun() || timer !== null) return
    timer = setInterval(() => callback(), delay)
    running.value = true
  }

  const onVisibilityChange = () => {
    if (document.hidden) pause()
    else resume()
  }

  onMounted(() => {
    if (immediate) callback()
    resume()
    if (pauseWhenHidden) document.addEventListener('visibilitychange', onVisibilityChange)
  })

  onActivated(() => {
    deactivated = false
    resume()
  })

  onDeactivated(() => {
    deactivated = true
    pause()
  })

  onBeforeUnmount(() => {
    pause()
    if (pauseWhenHidden) document.removeEventListener('visibilitychange', onVisibilityChange)
  })

  return { running, pause, resume }
}
