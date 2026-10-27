import '..'

import { afterEach, describe, expect, it } from 'vite-plus/test'
import { userEvent } from 'vite-plus/test/browser'

import { pollUntil, waitForUpdate } from '@/shared/test-utils'

import type { WebUiSegmented } from '..'
import type { WebUiSegmentedTrigger } from '../../segmented-trigger'

afterEach(() => document.body.replaceChildren())

describe('WebUiSegmented 初始 value 与子 trigger 升级时序（浏览器）', () => {
  it('子 trigger 晚于宿主升级时，indicator 与 Tab stop 仍按 value 定位', async () => {
    const before = document.createElement('button')
    const markup = document.createElement('div')
    markup.innerHTML = `
      <web-ui-segmented value="b">
        <web-ui-segmented-trigger value="a">A</web-ui-segmented-trigger>
        <web-ui-segmented-trigger value="b">B</web-ui-segmented-trigger>
        <web-ui-segmented-trigger value="c">C</web-ui-segmented-trigger>
      </web-ui-segmented>
    `
    const group = markup.firstElementChild as WebUiSegmented
    const after = document.createElement('button')
    document.body.append(before, group, after)

    await waitForUpdate(group)
    expect(group.value).toBe('b')

    await import('../../segmented-trigger')

    const triggers = [...group.querySelectorAll<WebUiSegmentedTrigger>('web-ui-segmented-trigger')]
    await Promise.all(triggers.map(trigger => trigger.updateComplete))
    const option = (trigger: WebUiSegmentedTrigger) => trigger.shadowRoot?.querySelector<HTMLElement>('[role="option"]')

    await pollUntil(
      () => triggers.map(trigger => option(trigger)?.getAttribute('tabindex')).join(',') === '-1,0,-1',
      'trigger 定义后 tab stop 未同步到 host value 指向的项'
    )
    await pollUntil(
      () => Number.parseFloat(group.style.getPropertyValue('--indicator-width')) > 0,
      'trigger 定义后 indicator 仍未定位到 host value 指向的项'
    )

    const groupRect = group.getBoundingClientRect()
    const selectedRect = triggers[1]?.getBoundingClientRect()
    expect(selectedRect).toBeDefined()
    expect(Number.parseFloat(group.style.getPropertyValue('--indicator-left'))).toBeCloseTo(
      (selectedRect?.left ?? 0) - groupRect.left,
      0
    )
    expect(Number.parseFloat(group.style.getPropertyValue('--indicator-width'))).toBeCloseTo(
      selectedRect?.width ?? 0,
      0
    )

    before.focus()
    await userEvent.keyboard('{Tab}')
    expect(document.activeElement).toBe(triggers[1])
    expect(triggers[1]?.shadowRoot?.activeElement).toBe(option(triggers[1] as WebUiSegmentedTrigger))

    await userEvent.keyboard('{Tab}')
    expect(document.activeElement).toBe(after)
  })
})
