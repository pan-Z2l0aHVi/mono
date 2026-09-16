import { afterEach, describe, expect, it } from 'vite-plus/test'
import { page } from 'vite-plus/test/browser'

import '..'

afterEach(async () => {
  document.body.replaceChildren()
  await page.viewport(1280, 720)
})

describe('WebUiToast 移动端适配（浏览器）', () => {
  it('窄视口下不撑出横向滚动', async () => {
    await page.viewport(320, 568)
    const el = document.createElement('web-ui-toast')
    el.message = 'viewport width test'
    el.visible = true
    document.body.append(el)
    await el.updateComplete

    // 原用例还断言 `toast.getBoundingClientRect().width === 288`（精确像素，§12 C1 已删）。
    // 保留的是 §8 R3 的「边界约束」通道：窄视口下不出现横向滚动 —— 这正是原始缺陷的形态
    // （toast 撑出横向滚动条），且不锁死任何像素值。
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(320)
  })
})

/*
 * 已删（§12 C6，兑现 §8 R2）：'toast 单层玻璃：toast 自身 opacity + backdrop-filter 插值过渡'。
 * 该用例的全部断言是 `classList.contains('wui-glass')` + `getComputedStyle(...)` 的
 * backgroundColor / transitionProperty / backdropFilter，属 §5 明文禁止的 CSS 样式断言，
 * 且是 R2 记录的「同一份玻璃断言逐组件重复 8 次」之一。收敛点在 Batch 6a 已按 §10 S4 归零
 * （8 → 0 条视觉断言），此处不另立承接。
 */
