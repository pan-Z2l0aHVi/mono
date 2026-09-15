import { afterEach, describe, expect, it } from 'vite-plus/test'

import { mountElement, waitForUpdate } from '@/shared/test-utils'

import '..'
import type { WebUiSvgDrawLines } from '..'

const createEl = (): WebUiSvgDrawLines => mountElement<WebUiSvgDrawLines>('web-ui-svg-draw-lines')

afterEach(() => document.body.replaceChildren())

describe('WebUiSvgDrawLines 组件（浏览器）', () => {
  it('直接 light DOM SVG 完成后恢复原始内联样式', async () => {
    const el = createEl()
    el.duration = 50
    el.innerHTML = '<svg><path d="M0 0 L100 100" style="stroke-dasharray: 4; stroke-dashoffset: 2"/></svg>'
    await waitForUpdate(el)
    const path = el.querySelector('path')!

    await el.replay()

    expect(path.style.strokeDasharray).toBe('4')
    expect(path.style.strokeDashoffset).toBe('2')
    el.remove()
  })

  it('首次 slot 内容出现后自动播放一次', async () => {
    const el = createEl()
    // 拉长时长，确保断言时动画仍处于进行中
    el.duration = 5000
    el.innerHTML = '<svg><path d="M0 0 L100 100"/></svg>'
    await waitForUpdate(el)
    const path = el.querySelector('path')!

    // 未显式调用 replay()，仅凭内容出现即产生动画
    await expect.poll(() => path.getAnimations().length).toBeGreaterThan(0)
    el.remove()
  })

  it('无内容时 replay 立即 resolve', async () => {
    const el = createEl()
    await expect(el.replay()).resolves.toBeUndefined()
    el.remove()
  })

  it('空 SVG 无几何元素时 replay 不报错', async () => {
    const el = createEl()
    el.innerHTML = '<svg></svg>'
    await waitForUpdate(el)
    await expect(el.replay()).resolves.toBeUndefined()
    el.remove()
  })
})
