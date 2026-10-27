import '..'

import { afterEach, describe, expect, it } from 'vite-plus/test'

import type { WebUiButton } from '@/components/button'

import type { WebUiBackTop } from '..'

afterEach(() => document.body.replaceChildren())

describe('WebUiBackTop 容器定位（浏览器）', () => {
  it('右缘距容器 content box 的偏移跟随 --wui-back-top-right，较大的 top token 不会裁掉按钮', async () => {
    const target = document.createElement('div')
    target.style.cssText = [
      'box-sizing: border-box',
      'width: 320px',
      'height: 160px',
      'overflow: auto',
      'border: 4px solid',
      'padding: 10px',
      '--wui-back-top-top: 150px',
      '--wui-back-top-right: 37px'
    ].join(';')

    const content = document.createElement('div')
    content.style.height = '700px'
    const backTop = document.createElement('web-ui-back-top') as WebUiBackTop
    backTop.threshold = 1
    backTop.scrollTarget = target
    target.append(content, backTop)
    document.body.append(target)
    await backTop.updateComplete

    target.scrollTop = 200
    target.dispatchEvent(new Event('scroll'))
    await backTop.updateComplete

    const button = backTop.shadowRoot?.querySelector<WebUiButton>('web-ui-button')
    if (!button) throw new Error('back-top 未渲染可见 button')
    await button.updateComplete
    expect(backTop.visible).toBe(true)

    const targetRect = target.getBoundingClientRect()
    const targetStyle = getComputedStyle(target)
    const contentRight =
      targetRect.right - Number.parseFloat(targetStyle.borderRightWidth) - Number.parseFloat(targetStyle.paddingRight)
    const scrollportTop = targetRect.top + Number.parseFloat(targetStyle.borderTopWidth)
    const scrollportBottom = targetRect.bottom - Number.parseFloat(targetStyle.borderBottomWidth)
    const buttonRect = button.getBoundingClientRect()

    const expectedRight = Number.parseFloat(getComputedStyle(target).getPropertyValue('--wui-back-top-right'))
    expect(expectedRight, '前置：--wui-back-top-right 必须在容器作用域内解析出值').toBeGreaterThan(0)
    expect(buttonRect.right).toBeCloseTo(contentRight - expectedRight, 1)
    expect(buttonRect.top).toBeGreaterThanOrEqual(scrollportTop)
    expect(buttonRect.bottom).toBeLessThanOrEqual(scrollportBottom)
  })
})
