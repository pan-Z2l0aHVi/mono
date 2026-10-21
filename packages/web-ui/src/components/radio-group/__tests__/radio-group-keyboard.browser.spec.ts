import '@/components/radio'
import '@/components/radio-group'

import { afterEach, describe, expect, it } from 'vite-plus/test'
import { userEvent } from 'vite-plus/test/browser'

import type { WebUiRadio } from '@/components/radio'
import type { WebUiRadioGroup } from '@/components/radio-group'
import { mountElement, queryA11y, spyEvents } from '@/shared/test-utils'

afterEach(() => document.body.replaceChildren())

const GROUP_CONTENT = `
  <web-ui-radio value="a">A</web-ui-radio>
  <web-ui-radio value="b">B</web-ui-radio>
  <web-ui-radio value="c">C</web-ui-radio>
`

function radioControl(radio: WebUiRadio): HTMLElement {
  const control = queryA11y(radio, '[role="radio"]')
  if (!(control instanceof HTMLElement)) throw new Error('radio 应提供可聚焦的 role=radio 控件')
  return control
}

function radioTabIndexes(group: WebUiRadioGroup): string[] {
  return [...group.querySelectorAll<WebUiRadio>('web-ui-radio')].map(
    radio => radioControl(radio).getAttribute('tabindex') ?? ''
  )
}

function focusedRadioIndex(group: WebUiRadioGroup): number {
  return [...group.querySelectorAll<WebUiRadio>('web-ui-radio')].findIndex(
    radio => radio.shadowRoot?.activeElement === radioControl(radio)
  )
}

async function settleGroup(group: WebUiRadioGroup): Promise<void> {
  await group.updateComplete
  let radios = [...group.querySelectorAll<WebUiRadio>('web-ui-radio')]
  await Promise.all(radios.map(radio => radio.updateComplete))
  await group.updateComplete
  radios = [...group.querySelectorAll<WebUiRadio>('web-ui-radio')]
  await Promise.all(radios.map(radio => radio.updateComplete))
}

function createGroup(value: string, content = GROUP_CONTENT): WebUiRadioGroup {
  return mountElement<WebUiRadioGroup>('web-ui-radio-group', { attrs: { value }, html: content })
}

describe('WebUiRadioGroup 键盘契约（浏览器）', () => {
  it('Tab 只进入组内选中项一次，方向键更新选中项，下一次 Tab 离开整组', async () => {
    const before = document.createElement('button')
    const after = document.createElement('button')
    before.textContent = 'before'
    after.textContent = 'after'
    document.body.append(before)
    const group = createGroup('b')
    document.body.append(after)
    await settleGroup(group)

    before.focus()
    await userEvent.keyboard('{Tab}')
    expect(focusedRadioIndex(group)).toBe(1)
    expect(radioTabIndexes(group)).toEqual(['-1', '0', '-1'])

    await userEvent.keyboard('{ArrowRight}')
    await settleGroup(group)
    expect(group.value).toBe('c')
    expect(focusedRadioIndex(group)).toBe(2)
    expect(radioTabIndexes(group)).toEqual(['-1', '-1', '0'])

    await userEvent.keyboard('{Tab}')
    expect(document.activeElement).toBe(after)
  })

  it('四个方向键循环导航，Home 和 End 移至首尾并派发组事件', async () => {
    const group = createGroup('b')
    await settleGroup(group)
    const radios = [...group.querySelectorAll<WebUiRadio>('web-ui-radio')]
    radioControl(radios[1]!).focus()
    const [inputEvents, detachInput] = spyEvents(group, 'input')
    const [changeEvents, detachChange] = spyEvents(group, 'change')

    const steps = [
      ['{ArrowDown}', 2, 'c'],
      ['{ArrowRight}', 0, 'a'],
      ['{ArrowUp}', 2, 'c'],
      ['{ArrowLeft}', 1, 'b'],
      ['{Home}', 0, 'a'],
      ['{End}', 2, 'c']
    ] as const

    for (const [key, expectedIndex, expectedValue] of steps) {
      await userEvent.keyboard(key)
      await settleGroup(group)
      expect(group.value).toBe(expectedValue)
      expect(focusedRadioIndex(group)).toBe(expectedIndex)
      expect(radioTabIndexes(group)).toEqual(radios.map((_, index) => (index === expectedIndex ? '0' : '-1')))
    }

    expect(inputEvents).toHaveLength(steps.length)
    expect(changeEvents).toHaveLength(steps.length)
    detachInput()
    detachChange()
  })

  it('嵌套组只响应最近所属组的键盘导航', async () => {
    const outer = createGroup(
      'outer-a',
      `<web-ui-radio value="outer-a">Outer A</web-ui-radio>
       <web-ui-radio-group value="inner-b">
         <web-ui-radio value="inner-a">Inner A</web-ui-radio>
         <web-ui-radio value="inner-b">Inner B</web-ui-radio>
         <web-ui-radio value="inner-c">Inner C</web-ui-radio>
       </web-ui-radio-group>
       <web-ui-radio value="outer-c">Outer C</web-ui-radio>`
    )
    await settleGroup(outer)

    const groups = [...outer.querySelectorAll<WebUiRadioGroup>('web-ui-radio-group')]
    const inner = groups[0]!
    const innerRadios = [...inner.querySelectorAll<WebUiRadio>('web-ui-radio')]
    radioControl(innerRadios[1]!).focus()

    await userEvent.keyboard('{ArrowRight}')
    await settleGroup(outer)
    await settleGroup(inner)

    expect(outer.value).toBe('outer-a')
    expect(inner.value).toBe('inner-c')
    expect(focusedRadioIndex(inner)).toBe(2)
    expect(radioTabIndexes(inner)).toEqual(['-1', '-1', '0'])
  })

  it('跳过 fieldset 禁用的成员，禁用解除后恢复该成员的选中 Tab stop', async () => {
    const group = createGroup(
      'a',
      `<fieldset disabled><web-ui-radio value="a">A</web-ui-radio></fieldset>
       <web-ui-radio value="b">B</web-ui-radio>
       <web-ui-radio value="c">C</web-ui-radio>`
    )
    await settleGroup(group)
    const [radioA, radioB] = [...group.querySelectorAll<WebUiRadio>('web-ui-radio')]
    expect(radioA?.disabled).toBe(false)
    expect(radioControl(radioA!).getAttribute('aria-disabled')).toBe('true')
    expect(radioTabIndexes(group)).toEqual(['-1', '0', '-1'])

    radioControl(radioB!).focus()
    await userEvent.keyboard('{ArrowRight}')
    await settleGroup(group)
    expect(group.value).toBe('c')
    expect(focusedRadioIndex(group)).toBe(2)

    group.querySelector('fieldset')!.removeAttribute('disabled')
    await settleGroup(group)
    group.value = 'a'
    await settleGroup(group)
    expect(radioControl(radioA!).getAttribute('aria-disabled')).toBe('false')
    expect(radioTabIndexes(group)).toEqual(['0', '-1', '-1'])

    radioControl(radioA!).focus()
    group.querySelector('fieldset')!.setAttribute('disabled', '')
    await settleGroup(group)
    expect(radioTabIndexes(group)).toEqual(['-1', '0', '-1'])

    radioControl(radioA!).focus()
    await userEvent.keyboard('{ArrowRight}')
    await settleGroup(group)
    expect(group.value).toBe('b')
    expect(focusedRadioIndex(group)).toBe(1)
  })
})
