import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useToast } from './useToast'

describe('useToast', () => {
  beforeEach(() => {
    const { toasts } = useToast()
    toasts.splice(0)
  })

  it('dedupes consecutive identical messages', () => {
    const { toasts, showToast } = useToast()
    showToast('hello')
    showToast('hello')
    expect(toasts).toHaveLength(1)
  })

  it('keeps at most 5 toasts', () => {
    const { toasts, showToast } = useToast()
    for (let i = 0; i < 10; i++) {
      showToast(`m${i}`, 'success', 999999)
    }
    expect(toasts).toHaveLength(5)
    expect(toasts[0].message).toBe('m5')
    expect(toasts[4].message).toBe('m9')
  })

  it('auto-removes toast after duration', () => {
    vi.useFakeTimers()
    const { toasts, showToast } = useToast()
    showToast('bye', 'success', 1000)
    expect(toasts).toHaveLength(1)
    vi.advanceTimersByTime(1000)
    expect(toasts).toHaveLength(0)
    vi.useRealTimers()
  })
})

