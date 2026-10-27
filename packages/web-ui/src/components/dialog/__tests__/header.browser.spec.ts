import '..'

import { afterEach, describe, expect, it } from 'vite-plus/test'

import { afterRenderStep, flushSlotChange, pollUntil } from '@/shared/test-utils'
import { scrollElementToEnd } from '@/shared/test-utils/viewport'

import type { WebUiDialog } from '..'

/*
 * chrome 带的浏览器几何与渲染（见 style.css「chrome 带」一段）：
 *
 * - 卡片把 inline padding 让给各分区后，带必须自带水平 padding，否则内容会贴到卡片内沿；
 * - 带不属于滚动区，正文滚动时它不跟着走；
 * - 带为空时不占位，正文从卡片上缘起；
 * - 带里的标题由谁提供：槽优先于 heading 属性，槽撤走才轮到属性。
 * 这些都是浏览器排版与槽分发才能证明的用户后果，不在 jsdom 里钉。
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
  // transform 落定后还要让这一步的布局结算完，几何断言读到的才是定稿盒子。
  await afterRenderStep()
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
    // 带里画的是标题本身，不是一个空壳。
    expect(heading.textContent).toContain('设置')
    expect(heading.getBoundingClientRect().height).toBeGreaterThan(0)
    // 带与内容区读同一份 inline padding（这里显式设成 30px，避免默认值恒等的空转）。
    expect(parseFloat(getComputedStyle(band).paddingLeft)).toBeCloseTo(30, 1)
    expect(parseFloat(getComputedStyle(desc).paddingLeft)).toBeCloseTo(30, 1)
    expect(heading.getBoundingClientRect().left).toBeCloseTo(desc.getBoundingClientRect().left + 30, 0)
  })

  it('带为空时不占位：正文从卡片上缘起', async () => {
    const component = build('<div>正文</div>')
    // 卡片自身的内边距与内容区的 focus 余量都归零，剩下的偏移只可能来自 chrome 带。
    component.style.setProperty('--wui-dialog-padding', '0px')
    component.style.setProperty('--wui-dialog-desc-focus-padding', '0px')
    // 带的下外边距放大到 40px：空带若仍然占位，正文会被推开整整 40px。
    component.style.setProperty('--wui-dialog-title-gap', '40px')
    await openAndSettle(component)

    const body = query<HTMLElement>(component, '.wui-dialog-body')
    const content = component.querySelector('div') as HTMLElement

    expect(content.getBoundingClientRect().top - body.getBoundingClientRect().top).toBeCloseTo(0, 1)
  })

  it('header 槽接管后，带里画的是槽内容，heading 的 fallback 不画', async () => {
    const component = build('<span slot="header">槽标题</span>')
    component.heading = '属性标题'
    await openAndSettle(component)

    const fallback = query<HTMLElement>(component, '.wui-dialog-heading')
    const slotted = component.querySelector('[slot="header"]') as HTMLElement

    // 用户读到的是槽里的文字：槽内容在带里绘制，heading 的 fallback 没有布局盒。
    expect(slotted.getBoundingClientRect().height).toBeGreaterThan(0)
    expect(fallback.getClientRects().length).toBe(0)
  })

  it('槽内容撤走后，带里换回 heading 的 fallback', async () => {
    const component = build('<span slot="header">槽标题</span>')
    component.heading = '属性标题'
    await openAndSettle(component)

    const fallback = query<HTMLElement>(component, '.wui-dialog-heading')
    const slotted = component.querySelector('[slot="header"]') as HTMLElement
    expect(fallback.getClientRects().length).toBe(0)

    slotted.remove()
    await flushSlotChange(component)

    expect(fallback.getBoundingClientRect().height).toBeGreaterThan(0)
  })

  it('正文滚动时 chrome 带不跟随滚动', async () => {
    const component = build('<div style="height: 2000px">正文</div>')
    component.heading = '设置'
    component.style.setProperty('--wui-dialog-max-height', '200px')
    await openAndSettle(component)

    const band = query<HTMLElement>(component, '.header')
    const desc = query<HTMLElement>(component, '.desc')
    const before = band.getBoundingClientRect().top

    await scrollElementToEnd(desc)

    expect(desc.scrollTop).toBeGreaterThan(0)
    expect(band.getBoundingClientRect().top).toBeCloseTo(before, 1)
  })
})
