import { describe, expect, it } from 'vite-plus/test'

import selectionCSS from '../selection.css?inline'

function computed(element: Element, property: string): string {
  return getComputedStyle(element).getPropertyValue(property).trim()
}

function mountWith(styles: string) {
  const style = document.createElement('style')
  style.textContent = styles
  document.head.append(style)
  return () => style.remove()
}

/*
 * `.wui-no-select` / `.wui-selectable` 是本次对外发布的公共契约：
 * - 禁选容器内的可选子元素必须恢复 `user-select: text`（继承 + 显式声明）；
 * - 工具类用 `:where()` 包裹，特异性为 0，消费方任何单类规则都能覆盖它们；
 * - `-webkit-touch-callout` 与 `user-select` 成对声明。
 * 前两点只有真实浏览器能验证（jsdom 不算层叠）；touch-callout 是 WebKit 专有属性，
 * Chromium 的 CSSOM 会丢弃这条声明，computed 恒为空串，因此对源码成对性做断言，
 * 运行期效果留给 iOS/WKWebView 真机。
 */
describe('classes/selection.css', () => {
  it('禁选容器内的可选文本恢复选择', () => {
    const removeStyle = mountWith(selectionCSS)
    const container = document.createElement('div')
    container.className = 'wui-no-select'
    container.innerHTML = '<span class="wui-selectable">可复制</span><span data-plain>不可选</span>'
    document.body.append(container)
    try {
      const selectable = container.querySelector('.wui-selectable')!
      const plain = container.querySelector('[data-plain]')!

      expect(computed(container, 'user-select')).toBe('none')
      expect(computed(plain, 'user-select')).toBe('none')
      expect(computed(selectable, 'user-select')).toBe('text')
    } finally {
      container.remove()
      removeStyle()
    }
  })

  it('user-select 与 -webkit-touch-callout 成对声明', () => {
    expect(selectionCSS).toContain('user-select: none')
    expect(selectionCSS).toContain('-webkit-touch-callout: none')
    expect(selectionCSS).toContain('user-select: text')
    expect(selectionCSS).toContain('-webkit-touch-callout: default')
  })

  it('工具类特异性为 0：先声明的单类消费方规则也能覆盖', () => {
    // 消费方规则刻意排在工具类之前：只有工具类特异性为 0 时，单类选择器仍能胜出。
    const removeConsumer = mountWith('.consumer-select { user-select: text; }')
    const removeUtilities = mountWith(selectionCSS)
    const element = document.createElement('div')
    element.className = 'wui-no-select consumer-select'
    document.body.append(element)
    try {
      expect(computed(element, 'user-select')).toBe('text')
    } finally {
      element.remove()
      removeUtilities()
      removeConsumer()
    }
  })
})
