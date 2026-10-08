import { afterEach, describe, expect, it } from 'vite-plus/test'

import { pollUntil } from '@/shared/test-utils'

import '..'
import type { WebUiDialog } from '..'

/*
 * chrome 带的浏览器几何（见 style.css「chrome 带」一段）：
 *
 * - 卡片把 inline padding 让给各分区后，带必须自带水平 padding，否则内容会贴到卡片内沿；
 * - 带不属于滚动区，正文滚动时它不跟着走。
 * 两条都是浏览器排版才能证明的用户后果，不在 jsdom 里钉。
 */

afterEach(() => document.body.replaceChildren())

async function openAndSettle(component: WebUiDialog): Promise<void> {
  component.open = true
  await component.updateComplete
  const dialog = component.shadowRoot?.querySelector('dialog') as HTMLElement
  await pollUntil(() => {
    const transform = getComputedStyle(dialog).transform
    return transform === 'none' || transform === 'matrix(1, 0, 0, 1, 0, 0)'
  }, 'enter transform not settled')
  await new Promise(resolve => requestAnimationFrame(resolve))
}

function query<T extends HTMLElement>(component: WebUiDialog, selector: string): T {
  const el = component.shadowRoot?.querySelector(selector) as T | null
  if (!el) throw new Error(`Expected ${selector} to exist.`)
  return el
}

function build(content = '<p>正文</p>'): WebUiDialog {
  const component = document.createElement('web-ui-dialog')
  component.innerHTML = content
  document.body.append(component)
  return component
}

describe('WebUiDialog chrome 带（浏览器几何）', () => {
  it('heading 渲染在带里，且与正文内容左缘对齐（同源 inline padding）', async () => {
    const component = build()
    component.heading = '设置'
    component.style.setProperty('--wui-dialog-inline-padding', '30px')
    await openAndSettle(component)

    const band = query<HTMLElement>(component, '.header')
    const heading = query<HTMLElement>(component, '.wui-dialog-heading')
    const desc = query<HTMLElement>(component, '.desc')

    expect(band.hidden).toBe(false)
    // 带与内容区读同一份 inline padding（这里显式设成 30px，避免默认值恒等的空转）。
    expect(parseFloat(getComputedStyle(band).paddingLeft)).toBeCloseTo(30, 1)
    expect(parseFloat(getComputedStyle(desc).paddingLeft)).toBeCloseTo(30, 1)
    expect(heading.getBoundingClientRect().left).toBeCloseTo(desc.getBoundingClientRect().left + 30, 0)
  })

  it('正文滚动时 chrome 带不跟随滚动', async () => {
    const component = build('<div style="height: 2000px">正文</div>')
    component.heading = '设置'
    component.style.setProperty('--wui-dialog-max-height', '200px')
    await openAndSettle(component)

    const band = query<HTMLElement>(component, '.header')
    const desc = query<HTMLElement>(component, '.desc')
    const before = band.getBoundingClientRect().top

    desc.scrollTop = 9999
    await new Promise(resolve => requestAnimationFrame(resolve))

    expect(desc.scrollTop).toBeGreaterThan(0)
    expect(band.getBoundingClientRect().top).toBeCloseTo(before, 1)
  })
})
