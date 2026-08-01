import { afterEach, describe, expect, it } from 'vite-plus/test'

import { createScrollLockLease } from './scroll-lock'

afterEach(() => {
  document.documentElement.style.overflow = ''
  document.body.style.position = ''
  document.body.style.top = ''
  document.body.style.width = ''
})

describe('scroll lock lease', () => {
  it('嵌套实例只释放自己获取的滚动锁', () => {
    const first = createScrollLockLease()
    const second = createScrollLockLease()

    first.sync(true)
    second.sync(true)
    expect(document.body.style.position).toBe('fixed')

    first.release()
    expect(document.body.style.position).toBe('fixed')

    second.release()
    expect(document.body.style.position).toBe('')
  })
})
