import '..'

import { afterEach, describe, expect, it } from 'vite-plus/test'
import { page } from 'vite-plus/test/browser'

import { pollUntil } from '@/shared/test-utils'

import type { WebUiBackTop } from '..'

afterEach(() => document.body.replaceChildren())

describe('WebUiBackTop accessible name（浏览器）', () => {
  it('默认内容使用默认名称，自定义 slot 内容使用可见名称', async () => {
    const defaultBackTop = document.createElement('web-ui-back-top') as WebUiBackTop
    document.body.append(defaultBackTop)
    await defaultBackTop.updateComplete
    defaultBackTop.visible = true
    await defaultBackTop.updateComplete

    const defaultHost = page.elementLocator(defaultBackTop)
    expect(defaultHost.getByRole('button', { name: 'Back to top' }).length).toBe(1)

    const customBackTop = document.createElement('web-ui-back-top') as WebUiBackTop
    const customButton = document.createElement('web-ui-button')
    customButton.setAttribute('variant', 'primary')
    customButton.textContent = 'back top'
    customBackTop.append(customButton)
    document.body.append(customBackTop)
    await Promise.all([customBackTop.updateComplete, customButton.updateComplete])
    customBackTop.visible = true
    await customBackTop.updateComplete

    const customHost = page.elementLocator(customBackTop)
    expect(customHost.getByRole('button', { name: 'back top' }).length).toBe(2)
    expect(customHost.getByRole('button', { name: 'Back to top' }).length).toBe(0)
  })

  it('默认内容变为自定义 slot 后移除默认名称', async () => {
    const el = document.createElement('web-ui-back-top') as WebUiBackTop
    document.body.append(el)
    await el.updateComplete
    el.visible = true
    await el.updateComplete

    const customButton = document.createElement('web-ui-button')
    customButton.setAttribute('variant', 'primary')
    customButton.textContent = 'back top'
    el.append(customButton)
    await customButton.updateComplete

    const host = page.elementLocator(el)
    expect(host.getByRole('button', { name: 'back top' }).length).toBe(2)
    expect(host.getByRole('button', { name: 'Back to top' }).length).toBe(0)
  })

  it('同一个空白 text node 更新为可见文本后，accessible name 跟随 slot', async () => {
    const el = document.createElement('web-ui-back-top') as WebUiBackTop
    const text = document.createTextNode(' ')
    el.append(text)
    document.body.append(el)
    await el.updateComplete
    el.visible = true
    await el.updateComplete

    const host = page.elementLocator(el)
    expect(host.getByRole('button', { name: 'Back to top' }).length).toBe(1)

    text.textContent = 'back top'
    await pollUntil(
      () => host.getByRole('button', { name: 'back top' }).length === 1,
      'slot 文本变化后 button 的 accessible name 未更新'
    )

    expect(host.getByRole('button', { name: 'Back to top' }).length).toBe(0)

    text.textContent = ' '
    await pollUntil(
      () => host.getByRole('button', { name: 'Back to top' }).length === 1,
      'slot 文本清空后默认 button 名称未恢复'
    )
    expect(host.getByRole('button', { name: 'back top' }).length).toBe(0)
  })
})
