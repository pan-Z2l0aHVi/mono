import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vite-plus/test'

import { installPointerFocusSuppression, resetPointerFocusState } from '../pointer-focus'

/**
 * 指针输入后的 focus ring 抑制（政策第 3 条「可访问性契约」）。
 *
 * Safari 等引擎在指针点击后仍让 `:focus-visible` 命中新聚焦元素，于是点击打开
 * drawer/dialog 时内部按钮会冒出 focus ring；键盘导航则必须看得见。断言全部落在
 * `data-wui-pointer-focus` 这一**公开标记**上——组件样式（button / switch / slider）
 * 就是消费它来透明化 focus ring 的，删掉任一分支都会让对应样式失效。
 */
let dispose = () => {}

beforeAll(() => {
  dispose = installPointerFocusSuppression()
})

afterAll(() => dispose())

afterEach(() => {
  resetPointerFocusState()
  document.body.replaceChildren()
})

function mountFocusTarget(): HTMLButtonElement {
  const host = document.createElement('div')
  const button = document.createElement('button')
  button.textContent = 'open'
  host.append(button)
  document.body.append(host)
  return button
}

describe('pointer focus suppression', () => {
  it('指针按下后聚焦的元素被标记，组件样式据此透明化 focus ring', () => {
    const button = mountFocusTarget()

    document.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true, isPrimary: true }))
    button.focus()

    expect(button.dataset.wuiPointerFocus).toBe('true')
  })

  it('键盘导航后聚焦的元素不再带标记，focus ring 恢复可见', () => {
    const button = mountFocusTarget()

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, composed: true }))
    button.focus()

    expect(button.hasAttribute('data-wui-pointer-focus')).toBe(false)
  })

  it('指针按下之后再来一次键盘导航，标记被清除', () => {
    const button = mountFocusTarget()

    document.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true, isPrimary: true }))
    button.focus()
    expect(button.dataset.wuiPointerFocus).toBe('true')

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, composed: true }))
    button.blur()
    button.focus()
    expect(button.hasAttribute('data-wui-pointer-focus')).toBe(false)
  })
})
