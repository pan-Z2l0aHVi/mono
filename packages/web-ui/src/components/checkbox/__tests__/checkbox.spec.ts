import { afterEach, describe, expect, it } from 'vite-plus/test'

import '..'
import { cleanupElement, mountElement, queryA11y, spyEvents, waitForUpdate } from '@/shared/test-utils'

import type { WebUiCheckbox } from '..'

afterEach(() => document.body.replaceChildren())

/**
 * 共有契约（checked 默认值与不反射、name/disabled/required 反射、
 * role="checkbox" 与 aria-checked、input・change 事件、键盘空格/Enter）见
 * `src/shared/form-association/__tests__/choice-control-contract.spec.ts`。
 * 本文件只保留 checkbox 特有的公开契约。
 */
const createCheckbox = (): WebUiCheckbox => mountElement<WebUiCheckbox>('web-ui-checkbox')

/** 断言语义角色存在后返回它；缺角色时立即失败，而不是抛出隐晦的 TypeError。 */
const controlOf = (el: WebUiCheckbox): HTMLElement => {
  const node = queryA11y(el, '[role="checkbox"]')
  expect(node, '未找到 role="checkbox" 的可交互元素').toBeTruthy()
  return node as HTMLElement
}

describe('WebUiCheckbox 组件特有契约', () => {
  it('点击切换后派发 input 和 change 事件，不派发 update:checked', async () => {
    const el = createCheckbox()
    await waitForUpdate(el)

    const [inputEvents] = spyEvents(el, 'input')
    const [changeEvents] = spyEvents(el, 'change')
    const [updateEvents] = spyEvents(el, 'update:checked')

    controlOf(el).click()
    await waitForUpdate(el)

    expect(inputEvents).toHaveLength(1)
    expect(changeEvents).toHaveLength(1)
    expect(updateEvents).toHaveLength(0)
    cleanupElement(el)
  })

  it('多次点击在 true/false 之间切换并每次都派发 input', async () => {
    const el = createCheckbox()
    await waitForUpdate(el)

    const [inputEvents] = spyEvents(el, 'input')

    controlOf(el).click()
    await waitForUpdate(el)
    expect(el.checked).toBe(true)

    controlOf(el).click()
    await waitForUpdate(el)
    expect(el.checked).toBe(false)

    controlOf(el).click()
    await waitForUpdate(el)
    expect(el.checked).toBe(true)

    expect(inputEvents).toHaveLength(3)
    cleanupElement(el)
  })
})
