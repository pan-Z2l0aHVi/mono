import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import { createCopyFeedback } from '../codeblock'

describe('复制反馈', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('navigator', {
      clipboard: { writeText: vi.fn<(text: string) => Promise<void>>().mockResolvedValue() }
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('复制成功立即反馈，重复复制重新触发反馈', async () => {
    const feedback = createCopyFeedback({ readText: () => 'code' })
    try {
      await feedback.copy()
      expect(feedback.getSnapshot()).toMatchObject({ status: 'copied', run: 1 })
      vi.advanceTimersByTime(299)
      await feedback.copy()
      expect(feedback.getSnapshot()).toMatchObject({ status: 'copied', run: 2 })
      vi.advanceTimersByTime(1301)
      expect(feedback.getSnapshot().status).toBe('copied')
      vi.advanceTimersByTime(299)
      expect(feedback.getSnapshot().status).toBe('idle')
    } finally {
      feedback.dispose()
    }
  })

  it('释放后不会再发布定时的状态更新', async () => {
    const feedback = createCopyFeedback({ readText: () => 'code' })
    const listener = vi.fn<() => void>()
    feedback.subscribe(listener)
    await feedback.copy()
    expect(listener).toHaveBeenCalledTimes(1)
    feedback.dispose()
    vi.advanceTimersByTime(1600)
    expect(listener).toHaveBeenCalledTimes(1)
  })
})
