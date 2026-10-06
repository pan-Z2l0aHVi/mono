import { afterEach, describe, expect, it } from 'vite-plus/test'

import { getFallbackOverlayRoot, getOverlayContainer } from '../overlay-root'

afterEach(() => {
  document.body.replaceChildren()
  document.querySelector('[data-wui-overlay-root]')?.remove()
})

/*
 * 浮层容器的**身份**契约：多个浮层共用同一个 fallback 容器，且同一 shadow root 内
 * 反复请求拿到的是同一个容器元素。
 *
 * 这是状态转换（惰性创建 → 复用），判据取对象身份而非 DOM 结构或内部属性——
 * 面板全部挂进同一个容器，容器分裂会让浮层各自为政（样式作用域、层级顺序都随之失序）。
 * 「创建了几层 shadow root」「容器带什么 data 属性」是实现形状，不留。
 */
describe('shared/overlay overlay-root', () => {
  it('fallback root 惰性创建一次，跨调用返回同一个容器', () => {
    const first = getFallbackOverlayRoot()
    const second = getFallbackOverlayRoot()

    expect(first).toBe(second)
    expect(first.isConnected).toBe(true)
  })

  it('同一 shadow root 内重复请求返回同一个容器，不分裂', () => {
    const root = getFallbackOverlayRoot().getRootNode() as ShadowRoot

    const first = getOverlayContainer(root)
    const second = getOverlayContainer(root)

    expect(first).toBe(second)
    expect(first.isConnected).toBe(true)
  })
})
