import { afterEach, describe, expect, it } from 'vite-plus/test'

import { pollUntil } from '@/shared/test-utils'

import '..'
import type { WebUiDialog } from '..'

/*
 * 关闭按钮的偏移契约（见 style.css「关闭按钮（绝对定位，两种内容模式同一套规则）」）。
 *
 * 用户实测报的缺陷：设置对话框里按钮离卡片上沿近、离右沿远。根因是标题模式把按钮当
 * `.title-row` 的 flex 子项，偏移由卡片 padding 决定（默认上 20 / 右 24），而 body 模式
 * 用 --wui-dialog-close-top / --wui-dialog-close-right 绝对定位（默认 16/16）。修法是把两种
 * 模式收敛到同一套绝对定位规则。
 *
 * 这里只钉**用户可感知的几何**：两种模式的偏移都等于公开 token 的值、默认相等，以及
 * 标题与按钮矩形不相交。不钉内部 class，也不钉实现细节。
 */

afterEach(() => document.body.replaceChildren())

type Upgradable = HTMLElement & { updateComplete?: Promise<unknown> }

async function openAndSettle(component: WebUiDialog): Promise<void> {
  component.open = true
  await component.updateComplete
  const button = component.shadowRoot?.querySelector('web-ui-button') as Upgradable | null
  await button?.updateComplete
  const icon = button?.shadowRoot?.querySelector('web-ui-icon') as Upgradable | null
  await icon?.updateComplete
  const dialog = component.shadowRoot?.querySelector('dialog') as HTMLElement
  // 进场带 transform: scale(1.1)，未落定时 rect 读数虚高；等变换收敛再量。
  await pollUntil(() => {
    const transform = getComputedStyle(dialog).transform
    return transform === 'none' || transform === 'matrix(1, 0, 0, 1, 0, 0)'
  }, 'enter transform not settled')
  await new Promise(resolve => requestAnimationFrame(resolve))
}

function mount(innerHTML: string, closable = true): WebUiDialog {
  const el = document.createElement('web-ui-dialog')
  el.innerHTML = innerHTML
  el.closable = closable
  document.body.append(el)
  return el
}

/** 按可访问名定位，不依赖内部 class，也不钉 aria-label 的字面量。 */
function closeButtonOf(component: WebUiDialog): HTMLElement {
  const found = [...(component.shadowRoot?.querySelectorAll<HTMLElement>('[aria-label]') ?? [])].find(
    button => button.getAttribute('aria-label')?.trim() !== ''
  )
  if (!found) throw new Error('Expected the close button to exist')
  return found
}

function dialogOf(component: WebUiDialog): HTMLElement {
  return shadowQuery<HTMLElement>(component, 'dialog')
}

function shadowQuery<T extends HTMLElement>(component: WebUiDialog, selector: string): T {
  const found = component.shadowRoot?.querySelector(selector) as T | null
  if (!found) throw new Error(`Expected ${selector} to exist`)
  return found
}

/** 按钮相对卡片 padding box 的偏移：上沿到上沿、右沿到右沿的距离。 */
function closeOffsets(component: WebUiDialog) {
  const close = closeButtonOf(component).getBoundingClientRect()
  const card = dialogOf(component).getBoundingClientRect()
  return {
    top: Math.round((close.top - card.top) * 100) / 100,
    right: Math.round((card.right - close.right) * 100) / 100
  }
}

function intersectionArea(a: DOMRect, b: DOMRect): number {
  const w = Math.min(a.right, b.right) - Math.max(a.left, b.left)
  const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)
  return w > 0 && h > 0 ? w * h : 0
}

describe('WebUiDialog 关闭按钮偏移（浏览器几何）', () => {
  it('title 模式：默认 top / right 相等，都是 16px', async () => {
    const el = mount('<span slot="title">设置</span>')
    await openAndSettle(el)

    expect(closeOffsets(el)).toEqual({ top: 16, right: 16 })
  })

  it('body 模式：默认 top / right 仍是 16px，与改动前逐字一致', async () => {
    const el = mount('<section slot="body">自定义主体</section>')
    await openAndSettle(el)

    expect(closeOffsets(el)).toEqual({ top: 16, right: 16 })
  })

  it('两种模式都跟随 --wui-dialog-close-top / --wui-dialog-close-right（可不等）', async () => {
    const titleMode = mount('<span slot="title">设置</span>')
    const bodyMode = mount('<section slot="body">自定义主体</section>')
    for (const el of [titleMode, bodyMode]) {
      el.style.setProperty('--wui-dialog-close-top', '30px')
      el.style.setProperty('--wui-dialog-close-right', '8px')
    }
    await openAndSettle(titleMode)
    await openAndSettle(bodyMode)

    // 断言真依赖这两个 token：若哪模式退回「靠卡片 padding 决定」，这里拿到的是 20/24，立刻红。
    expect(closeOffsets(titleMode)).toEqual({ top: 30, right: 8 })
    expect(closeOffsets(bodyMode)).toEqual({ top: 30, right: 8 })
  })

  it('title 模式：长标题不会钻到关闭按钮下面（矩形不相交）', async () => {
    const el = mount(
      '<span slot="title">这是一条足够长的标题，长到足以在窄卡片里换行并一直排到按钮所在的那一列去</span>'
    )
    await openAndSettle(el)

    const close = closeButtonOf(el).getBoundingClientRect()
    const titleBox = shadowQuery<HTMLElement>(el, '.title').getBoundingClientRect()
    const titleText = (el.querySelector('[slot="title"]') as HTMLElement).getBoundingClientRect()

    // 先证明这个标题确实够长：标题盒排到了按钮左沿的右边（也就是按钮确实悬在标题盒上方），
    // 否则下面的不相交断言可能只是「标题本来就短」的空转。
    expect(titleBox.right).toBeGreaterThan(close.left)
    expect(intersectionArea(titleText, close)).toBe(0)
  })
})
