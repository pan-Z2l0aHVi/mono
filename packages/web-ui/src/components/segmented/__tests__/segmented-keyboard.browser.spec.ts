import '..'
import '@/components/segmented-trigger'

import { afterEach, describe, expect, it } from 'vite-plus/test'
import { userEvent } from 'vite-plus/test/browser'

import { pollUntil, queryA11y, waitForUpdate } from '@/shared/test-utils'

import type { WebUiSegmented } from '..'
import type { WebUiSegmentedTrigger } from '../../segmented-trigger'

afterEach(() => document.body.replaceChildren())

function optionSurface(trigger: WebUiSegmentedTrigger): HTMLElement {
  const option = queryA11y(trigger, '[role="option"]')
  if (!(option instanceof HTMLElement)) throw new Error('未找到 role="option" 的可交互元素')
  return option
}

function mountGroup(
  value: string,
  disabledSecond = false
): {
  before: HTMLButtonElement
  group: WebUiSegmented
  triggers: [WebUiSegmentedTrigger, WebUiSegmentedTrigger, WebUiSegmentedTrigger]
  after: HTMLButtonElement
} {
  const before = document.createElement('button')
  const group = document.createElement('web-ui-segmented') as WebUiSegmented
  group.value = value
  const triggers = (['a', 'b', 'c'] as const).map(optionValue => {
    const trigger = document.createElement('web-ui-segmented-trigger') as WebUiSegmentedTrigger
    trigger.value = optionValue
    trigger.textContent = optionValue
    if (disabledSecond && optionValue === 'b') trigger.disabled = true
    return trigger
  }) as [WebUiSegmentedTrigger, WebUiSegmentedTrigger, WebUiSegmentedTrigger]
  group.append(...triggers)
  const after = document.createElement('button')
  document.body.append(before, group, after)
  return { before, group, triggers, after }
}

async function settle(group: WebUiSegmented, triggers: WebUiSegmentedTrigger[]) {
  await waitForUpdate(group)
  await Promise.all(triggers.map(trigger => trigger.updateComplete))
}

describe('WebUiSegmented 键盘导航（浏览器）', () => {
  it('Tab 只进入当前 option，方向键与 Home / End 移动焦点和选中', async () => {
    const { before, group, triggers, after } = mountGroup('a', true)
    await settle(group, triggers)

    const options = triggers.map(optionSurface)
    expect(options.map(option => option.getAttribute('tabindex'))).toEqual(['0', '-1', '-1'])

    before.focus()
    await userEvent.keyboard('{Tab}')
    expect(document.activeElement).toBe(triggers[0])
    expect(triggers[0].shadowRoot?.activeElement).toBe(options[0])

    await userEvent.keyboard('{ArrowRight}')
    await settle(group, triggers)
    expect(group.value).toBe('c')
    expect(triggers[2].shadowRoot?.activeElement).toBe(options[2])
    expect(options.map(option => option.getAttribute('tabindex'))).toEqual(['-1', '-1', '0'])

    await userEvent.keyboard('{ArrowRight}')
    await settle(group, triggers)
    expect(group.value).toBe('a')
    expect(triggers[0].shadowRoot?.activeElement).toBe(options[0])

    await userEvent.keyboard('{ArrowLeft}')
    await settle(group, triggers)
    expect(group.value).toBe('c')

    await userEvent.keyboard('{Home}')
    await settle(group, triggers)
    expect(group.value).toBe('a')

    await userEvent.keyboard('{End}')
    await settle(group, triggers)
    expect(group.value).toBe('c')

    await userEvent.keyboard('{ArrowDown}')
    await settle(group, triggers)
    expect(group.value).toBe('c')
    expect(triggers[2].shadowRoot?.activeElement).toBe(options[2])

    await userEvent.keyboard('{Tab}')
    expect(document.activeElement).toBe(after)
  })

  it('焦点留在刚禁用的 option 时仍可用方向键回到启用项', async () => {
    const { group, triggers } = mountGroup('c', true)
    await settle(group, triggers)

    const options = triggers.map(optionSurface)
    options[2].focus()
    expect(triggers[2].shadowRoot?.activeElement).toBe(options[2])

    triggers[2].disabled = true
    await triggers[2].updateComplete
    await pollUntil(
      () => options[0]?.getAttribute('tabindex') === '0' && options[2]?.getAttribute('tabindex') === '-1',
      '禁用当前 option 后 roving tabindex 未转到首个启用 option'
    )

    await userEvent.keyboard('{ArrowLeft}')
    await settle(group, triggers)

    expect(group.value).toBe('a')
    expect(triggers[0].shadowRoot?.activeElement).toBe(options[0])
    expect(options.map(option => option.getAttribute('tabindex'))).toEqual(['0', '-1', '-1'])
  })

  it('只有一个启用项且没有选中值时，导航仍会选中当前项', async () => {
    const { group, triggers } = mountGroup('')
    triggers[0].disabled = true
    triggers[1].disabled = true
    await settle(group, triggers)

    const option = optionSurface(triggers[2])
    option.focus()
    await userEvent.keyboard('{ArrowRight}')
    await settle(group, triggers)

    expect(group.value).toBe('c')
    expect(triggers[2].checked).toBe(true)
    expect(triggers[2].shadowRoot?.activeElement).toBe(option)
  })

  it('同值 option 间导航时仍维持唯一选中项和 roving tab stop', async () => {
    const group = document.createElement('web-ui-segmented') as WebUiSegmented
    group.value = 'x'
    const triggers = ['x', 'x', 'y'].map(value => {
      const trigger = document.createElement('web-ui-segmented-trigger') as WebUiSegmentedTrigger
      trigger.value = value
      trigger.textContent = value
      return trigger
    })
    group.append(...triggers)
    document.body.append(group)
    await settle(group, triggers)

    const options = triggers.map(optionSurface)
    expect(triggers.map(trigger => trigger.checked)).toEqual([true, false, false])

    options[0]?.focus()
    await userEvent.keyboard('{ArrowRight}')
    await settle(group, triggers)

    expect(group.value).toBe('x')
    expect(triggers.map(trigger => trigger.checked)).toEqual([false, true, false])
    expect(options.map(option => option.getAttribute('tabindex'))).toEqual(['-1', '0', '-1'])
    expect(triggers[1]?.shadowRoot?.activeElement).toBe(options[1])
    const indicator = group.shadowRoot?.querySelector<HTMLElement>('.wui-segmented-indicator')
    if (!indicator) throw new Error('未找到 segmented 的 indicator')
    // 看用户看到的结果：选中高亮覆盖在第二颗（同值的）option 上，而不是内部定位变量等于某个值。
    await pollUntil(() => {
      const selectedRect = triggers[1]?.getBoundingClientRect()
      const indicatorRect = indicator.getBoundingClientRect()
      const center = (rect: DOMRect) => (rect.left + rect.right) / 2
      return selectedRect !== undefined && Math.abs(center(indicatorRect) - center(selectedRect)) < 1
    }, 'indicator 未移动到同值 option 中被选中的那一项')
  })

  it('RTL 中左右方向键按视觉方向移动', async () => {
    const { group, triggers } = mountGroup('b')
    group.dir = 'rtl'
    await settle(group, triggers)

    const options = triggers.map(optionSurface)
    options[1]?.focus()
    await userEvent.keyboard('{ArrowRight}')
    await settle(group, triggers)

    expect(group.value).toBe('a')
    expect(triggers[0]?.shadowRoot?.activeElement).toBe(options[0])
  })

  it('带修饰键的方向键和 Home 快捷键不触发列表导航', async () => {
    const { group, triggers } = mountGroup('b')
    await settle(group, triggers)

    const option = optionSurface(triggers[1])
    option.focus()
    for (const init of [
      { key: 'ArrowLeft', altKey: true },
      { key: 'Home', ctrlKey: true },
      { key: 'End', metaKey: true },
      { key: 'ArrowRight', shiftKey: true }
    ]) {
      const event = new KeyboardEvent('keydown', { ...init, bubbles: true, composed: true, cancelable: true })
      option.dispatchEvent(event)
      expect(event.defaultPrevented).toBe(false)
    }

    await settle(group, triggers)
    expect(group.value).toBe('b')
    expect(triggers[1]?.shadowRoot?.activeElement).toBe(option)
  })
})
