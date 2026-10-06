import { afterEach, describe, expect, it } from 'vite-plus/test'

import { defineScrollLockLease } from '../scroll-lock'

afterEach(() => {
  document.documentElement.style.overflow = ''
  document.documentElement.style.overscrollBehavior = ''
})

describe('scroll lock lease', () => {
  it('嵌套实例只释放自己获取的滚动锁', () => {
    const first = defineScrollLockLease().make()
    const second = defineScrollLockLease().make()

    first.sync(true)
    second.sync(true)
    expect(document.documentElement.style.overflow).toBe('hidden')

    first.release()
    expect(document.documentElement.style.overflow).toBe('hidden')

    second.release()
    expect(document.documentElement.style.overflow).toBe('')
  })
})
