import { afterEach, describe, expect, it } from 'vite-plus/test'

import '..'
import { cleanupElement, mountElement, queryA11y, spyEvents, waitForUpdate } from '@/shared/test-utils'

import type { WebUiSwitch } from '..'

afterEach(() => document.body.replaceChildren())

/**
 * 共有契约（checked 默认值与不反射、name/disabled/required 反射、
 * role="switch" 与 aria-checked、input・change 事件）见
 * `src/shared/form-association/__tests__/choice-control-contract.spec.ts`；
 * 拖拽手势见 `switch-gesture.browser.spec.ts`。
 * 本文件只保留 switch 特有的公开契约。
 */
const createSwitch = (): WebUiSwitch => mountElement<WebUiSwitch>('web-ui-switch')

/** 断言语义角色存在后返回它；缺角色时立即失败，而不是抛出隐晦的 TypeError。 */
const controlOf = (el: WebUiSwitch): HTMLElement => {
  const node = queryA11y(el, '[role="switch"]')
  expect(node, '未找到 role="switch" 的可交互元素').toBeTruthy()
  return node as HTMLElement
}

describe('WebUiSwitch 组件特有契约', () => {
  it('内部 checkbox 有稳定且实例唯一的 id', async () => {
    const first = createSwitch()
    const second = createSwitch()
    await Promise.all([waitForUpdate(first), waitForUpdate(second)])

    const inputOf = (el: WebUiSwitch): HTMLInputElement => queryA11y(el, 'input[type="checkbox"]') as HTMLInputElement
    const firstId = inputOf(first).id
    const secondId = inputOf(second).id
    expect(firstId).not.toBe('')
    expect(secondId).not.toBe('')
    expect(secondId).not.toBe(firstId)

    first.checked = true
    await waitForUpdate(first)
    expect(inputOf(first).id).toBe(firstId)

    cleanupElement(first)
    cleanupElement(second)
  })

  it('loading 时点击不切换状态', async () => {
    const el = createSwitch()
    el.loading = true
    await waitForUpdate(el)

    controlOf(el).click()
    await waitForUpdate(el)

    expect(el.checked).toBe(false)
    cleanupElement(el)
  })

  it('多次点击每次都派发一次 input 与 change', async () => {
    const el = createSwitch()
    await waitForUpdate(el)

    const [inputEvents] = spyEvents(el, 'input')
    const [changeEvents] = spyEvents(el, 'change')

    for (let i = 0; i < 3; i++) {
      controlOf(el).click()
      await waitForUpdate(el)
    }

    expect(inputEvents).toHaveLength(3)
    expect(changeEvents).toHaveLength(3)
    cleanupElement(el)
  })
})
