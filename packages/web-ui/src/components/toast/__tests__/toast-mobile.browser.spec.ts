import '..'

import { afterEach, describe, expect, it } from 'vite-plus/test'

import { setViewport } from '@/shared/test-utils/viewport'

afterEach(async () => {
  document.body.replaceChildren()
  await setViewport(1280, 720)
})

describe('WebUiToast 移动端适配（浏览器）', () => {
  it('窄视口下不撑出横向滚动', async () => {
    await setViewport(320, 568)
    const el = document.createElement('web-ui-toast')
    el.message = 'viewport width test'
    el.visible = true
    document.body.append(el)
    await el.updateComplete

    // 判据取用户后果「窄视口下不出现横向滚动」——这正是原始缺陷的形态（toast 撑出
    // 横向 scrollbar），且不锁死任何像素宽度。
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(320)
  })
})
