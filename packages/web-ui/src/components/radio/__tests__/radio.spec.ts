import { afterEach, describe, expect, it } from 'vite-plus/test'

import '..'
import { cleanupElement, mountElement, queryA11y, spyEvents, waitForUpdate } from '@/shared/test-utils'

import type { WebUiRadio } from '..'

afterEach(() => document.body.replaceChildren())

/**
 * 共有契约（checked 默认值与不反射、name/disabled/required 反射、
 * role="radio" 与 aria-checked、input・change 事件、键盘空格/Enter）见
 * `src/shared/form-association/__tests__/choice-control-contract.spec.ts`。
 * 本文件只保留 radio 特有的公开契约。
 */
const createRadio = (): WebUiRadio => mountElement<WebUiRadio>('web-ui-radio')

/** 断言语义角色存在后返回它；缺角色时立即失败，而不是抛出隐晦的 TypeError。 */
const controlOf = (el: WebUiRadio): HTMLElement => {
  const node = queryA11y(el, '[role="radio"]')
  expect(node, '未找到 role="radio" 的可交互元素').toBeTruthy()
  return node as HTMLElement
}

describe('WebUiRadio 组件特有契约', () => {
  it('点击选中后派发 input 和 change 事件，不派发 update:checked', async () => {
    const el = createRadio()
    el.value = 'option-a'
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

  it('已选中时点击不再触发事件（radio 不可取消）', async () => {
    const el = createRadio()
    el.checked = true
    await waitForUpdate(el)

    const [inputEvents] = spyEvents(el, 'input')
    const [changeEvents] = spyEvents(el, 'change')

    controlOf(el).click()
    await waitForUpdate(el)

    expect(inputEvents).toHaveLength(0)
    expect(changeEvents).toHaveLength(0)
    expect(el.checked).toBe(true)
    cleanupElement(el)
  })
})
