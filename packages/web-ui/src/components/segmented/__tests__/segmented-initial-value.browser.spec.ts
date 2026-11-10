import '..'

import { afterEach, describe, expect, it } from 'vite-plus/test'
import { userEvent } from 'vite-plus/test/browser'

import { pollUntil, waitForFrame, waitForUpdate } from '@/shared/test-utils'

import type { WebUiSegmented } from '..'
import type { WebUiSegmentedTrigger } from '../../segmented-trigger'

afterEach(() => document.body.replaceChildren())

describe('WebUiSegmented 初始 value 与子 trigger 升级时序（浏览器）', () => {
  it('缩放的祖先内，选中背景仍对齐选中项', async () => {
    await import('../../segmented-trigger')
    const wrapper = document.createElement('div')
    wrapper.style.transform = 'scale(1.1)'
    wrapper.innerHTML = `<web-ui-segmented value="a"><web-ui-segmented-trigger value="a">A</web-ui-segmented-trigger><web-ui-segmented-trigger value="b">B</web-ui-segmented-trigger></web-ui-segmented>`
    document.body.append(wrapper)
    const group = wrapper.firstElementChild as WebUiSegmented
    await waitForUpdate(group)
    await pollUntil(() => Number.parseFloat(group.style.getPropertyValue('--indicator-width')) > 0, '选中背景未定位')
    const selected = group.querySelector('web-ui-segmented-trigger')!.getBoundingClientRect()
    const indicator = group.shadowRoot!.querySelector<HTMLElement>('.wui-segmented-indicator')!.getBoundingClientRect()
    expect(indicator.left).toBeCloseTo(selected.left, 0)
    expect(indicator.right).toBeCloseTo(selected.right, 0)
  })
  it('从隐藏状态显示时定位已选中的指示器', async () => {
    await import('../../segmented-trigger')
    const wrapper = document.createElement('div')
    wrapper.style.display = 'none'
    wrapper.innerHTML = `<web-ui-segmented value="a"><web-ui-segmented-trigger value="a">A</web-ui-segmented-trigger><web-ui-segmented-trigger value="b">B</web-ui-segmented-trigger></web-ui-segmented>`
    document.body.append(wrapper)
    const group = wrapper.firstElementChild as WebUiSegmented
    group.style.setProperty('--wui-duration-trigger', '2s')
    await waitForUpdate(group)
    await waitForFrame()
    await waitForFrame()
    wrapper.style.display = 'block'
    await pollUntil(
      () => Number.parseFloat(group.style.getPropertyValue('--indicator-width')) > 0,
      '显示后选中指示器未定位'
    )
    const selected = group.querySelector('web-ui-segmented-trigger')!
    await waitForFrame()
    const indicator = group.shadowRoot!.querySelector<HTMLElement>('.wui-segmented-indicator')!
    expect(indicator.getBoundingClientRect().width).toBeCloseTo(selected.getBoundingClientRect().width, 0)
    expect(indicator.getAnimations().filter(animation => animation instanceof CSSTransition)).toHaveLength(0)
    expect(Number.parseFloat(group.style.getPropertyValue('--indicator-width'))).toBeCloseTo(
      selected.getBoundingClientRect().width
    )
  })
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
