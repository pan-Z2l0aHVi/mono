import { afterEach, describe, expect, it } from 'vite-plus/test'

import { pollUntil } from '@/shared/test-utils'

import '..'
import type { WebUiDialog } from '..'

afterEach(() => document.body.replaceChildren())

type Upgradable = HTMLElement & { updateComplete?: Promise<unknown> }

function createDialog(innerHTML = ''): WebUiDialog {
  const el = document.createElement('web-ui-dialog')
  el.innerHTML = innerHTML
  document.body.append(el)
  return el
}

/**
 * 关闭按钮是嵌套自定义元素（dialog > web-ui-button > web-ui-icon）。只等 dialog 的
 * updateComplete 时按钮尚未 upgrade，宿主没有 shadow 内容，量到的宽度是 0。
 */
async function openDialog(el: WebUiDialog) {
  el.open = true
  await el.updateComplete
  const button = el.shadowRoot?.querySelector('web-ui-button') as Upgradable | null
  await button?.updateComplete
  const icon = button?.shadowRoot?.querySelector('web-ui-icon') as Upgradable | null
  await icon?.updateComplete
  await settleEnterTransform(el)
  await new Promise(resolve => requestAnimationFrame(resolve))
}

/**
 * dialog 进场有 `transform: scale(1.1 → 1)`，未落定时 getBoundingClientRect 会带上
 * 缩放。`is-visible` 由 presence 在 showModal 之后才补上，所以这里按「变换已收敛」
 * 这个条件轮询，而不是等一个固定时长、也不靠 getAnimations 的条数。
 */
async function settleEnterTransform(el: WebUiDialog) {
  const dialog = el.shadowRoot?.querySelector('dialog') as HTMLElement
  await pollUntil(() => {
    const transform = getComputedStyle(dialog).transform
    return transform === 'none' || transform === 'matrix(1, 0, 0, 1, 0, 0)'
  }, 'Expected the dialog enter transform to settle at scale(1)')
}

/**
 * 按「有可访问名」定位关闭按钮，不依赖内部 class，也不钉名字的字面量。
 * 具体叫什么属于本地化内容，改语言不该让这批几何测试集体变红。
 */
function closeButtonOf(el: WebUiDialog): HTMLElement | null {
  return (
    [...(el.shadowRoot?.querySelectorAll<HTMLElement>('[aria-label]') ?? [])].find(
      button => button.getAttribute('aria-label')?.trim() !== ''
    ) ?? null
  )
}

function closeRectOf(el: WebUiDialog): DOMRect {
  const button = closeButtonOf(el)
  if (!button) throw new Error('Expected the close button to exist')
  return button.getBoundingClientRect()
}

function cardRectOf(el: WebUiDialog): DOMRect {
  const dialog = el.shadowRoot?.querySelector('dialog') as HTMLElement
  return dialog.getBoundingClientRect()
}

describe('WebUiDialog closable（浏览器几何）', () => {
  // 按钮的位置契约只钉**用户可感知的边界关系**（在卡片内、与标题同行），不钉偏移像素：
  // 日后调主题 spacing 令牌不该变成改测试。
  it('body 模式下按钮浮在卡片内，不压出卡片边界', async () => {
    const el = createDialog('<section slot="body">自定义主体</section>')
    el.closable = true
    await openDialog(el)

    const close = closeRectOf(el)
    const card = cardRectOf(el)

    expect(close.width).toBeGreaterThan(0)
    expect(close.top).toBeGreaterThan(card.top)
    expect(close.right).toBeLessThanOrEqual(card.right)
    expect(close.bottom).toBeLessThanOrEqual(card.bottom)
  })

  it('title-row 模式下按钮与标题同行，且在标题右侧', async () => {
    const el = createDialog('<span slot="title">标题</span>')
    el.closable = true
    await openDialog(el)

    const title = el.shadowRoot?.querySelector('.title')
    if (!title) throw new Error('Expected the title to exist')
    const titleRect = title.getBoundingClientRect()
    const close = closeRectOf(el)

    expect(close.left).toBeGreaterThanOrEqual(titleRect.right)
    // 同行：按钮纵向落在标题行范围内，而不是被推到标题下方。
    expect(close.top).toBeLessThan(titleRect.bottom)
    expect(close.bottom).toBeGreaterThan(titleRect.top)
  })

  it('点击按钮在真实浏览器里关闭原生 dialog', async () => {
    const el = createDialog()
    el.closable = true
    await openDialog(el)

    const dialog = el.shadowRoot?.querySelector('dialog') as HTMLDialogElement
    expect(dialog.open).toBe(true)

    closeButtonOf(el)?.click()
    await el.updateComplete

    expect(el.open).toBe(false)
  })

  it('不启用 closable 时不产生关闭按钮', async () => {
    const el = createDialog('<span slot="title">标题</span>')
    await openDialog(el)

    expect(closeButtonOf(el)).toBeNull()
  })
})
