import { afterEach, describe, expect, it } from 'vite-plus/test'

import '..'
import '@/components/theme'

import type { WebUiDrawer } from '..'

async function nextFrame() {
  await new Promise(resolve => requestAnimationFrame(resolve))
}

// 等 drawer 打开并让动画收敛（nested 层变化会让下层 dialog 同步做 450ms translate/scale 过渡）。
async function waitForOpenTransition(el: WebUiDrawer) {
  const dialog = el.shadowRoot?.querySelector('dialog') as HTMLDialogElement | null
  if (!dialog) throw new Error('Expected the drawer to contain a dialog')
  const deadline = performance.now() + 5000
  while (!dialog.open) {
    if (performance.now() > deadline) throw new Error('Expected the drawer dialog to open')
    await new Promise(resolve => requestAnimationFrame(resolve))
  }
  await el.updateComplete
  await Promise.allSettled(document.getAnimations().map(animation => animation.finished))
  await el.updateComplete
}

async function waitFor(condition: () => boolean, timeoutMs = 3000): Promise<void> {
  const start = performance.now()
  while (!condition()) {
    if (performance.now() - start > timeoutMs) throw new Error(`waitFor timeout after ${timeoutMs}ms`)
    await new Promise(resolve => setTimeout(resolve, 25))
  }
}

function getDialog(el: WebUiDrawer): HTMLDialogElement {
  return el.shadowRoot?.querySelector('dialog') as HTMLDialogElement
}

function createDrawer(heading: string): WebUiDrawer {
  const el = document.createElement('web-ui-drawer') as WebUiDrawer
  el.heading = heading
  return el
}

function pressEscape(dialog: HTMLDialogElement) {
  dialog.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, composed: true, cancelable: true, key: 'Escape' }))
}

async function openInSequence(...drawers: WebUiDrawer[]) {
  for (const drawer of drawers) {
    drawer.open = true
    await drawer.updateComplete
    await waitForOpenTransition(drawer)
  }
}

afterEach(() => document.body.replaceChildren())

/*
 * nested 层叠（浏览器）。
 *
 * 原实现的层序断言全部读 `--wui-internal-drawer-nested-scale`（写在 dialog 内联样式上的
 * 内部变量）与 `getBoundingClientRect()` 的左缘阶梯——前者是 §3 明文禁止的 `--wui-internal-*`，
 * 后者是 §12 C1 的几何。**层序本身没有公开观察面**，因此改用层的**行为后果**来承载：
 * Escape 只作用于最顶层，且关闭一层后由次层接管（UA top layer 的键盘路由）。
 *
 * 不承接的部分（已删，见 `batch-6c.md`）：0.95^depth 的具体缩放值、左缘阶梯露边的像素量、
 * 多宽度嵌套的宽度补偿——全是视觉契约，无行为判据，锁住只能锁像素。
 */
describe('WebUiDrawer nested 层叠（浏览器）', () => {
  it('声明式嵌套：两层同时打开且都进入 top layer', async () => {
    const theme = document.createElement('web-ui-theme')
    theme.setAttribute('appearance', 'light')
    document.body.append(theme)

    const parent = createDrawer('parent')
    const child = createDrawer('child')
    parent.append(child)
    theme.append(parent)
    await parent.updateComplete
    await openInSequence(parent)

    // 打开子层（子层在父的 default slot 内，声明式嵌套）
    child.open = true
    await child.updateComplete
    await waitForOpenTransition(child)

    expect(parent.open).toBe(true)
    expect(child.open).toBe(true)
    expect(getDialog(parent).open).toBe(true)
    expect(getDialog(child).open).toBe(true)
  })

  it('子层关闭后父层仍保持打开', async () => {
    const parent = createDrawer('parent')
    const child = createDrawer('child')
    parent.append(child)
    document.body.append(parent)
    await parent.updateComplete
    await openInSequence(parent, child)

    child.open = false
    await child.updateComplete
    await waitFor(() => !getDialog(child).open, 4000)

    expect(parent.open).toBe(true)
    expect(getDialog(parent).open).toBe(true)
  })

  it('Esc 只关闭最顶层；父层保持打开', async () => {
    const parent = createDrawer('parent')
    const child = createDrawer('child')
    parent.append(child)
    document.body.append(parent)
    await parent.updateComplete
    await openInSequence(parent, child)

    // 子层是 top layer 顶层：Esc keydown 派发到子层 dialog
    pressEscape(getDialog(child))
    await child.updateComplete

    expect(child.open).toBe(false)
    expect(parent.open).toBe(true)
    expect(getDialog(parent).open).toBe(true)
  })

  it('scroll lock 双 lease：两层全关后才解锁页面滚动', async () => {
    const parent = createDrawer('parent')
    const child = createDrawer('child')
    parent.append(child)
    document.body.append(parent)
    await parent.updateComplete
    await openInSequence(parent, child)

    // 两层都开：documentElement overflow 被锁定
    expect(document.documentElement.style.overflow).toBe('hidden')

    // 关闭子层：仍锁定（父层 lease 在）
    child.open = false
    await child.updateComplete
    await waitFor(() => !getDialog(child).open, 4000)
    expect(document.documentElement.style.overflow).toBe('hidden')

    // 关闭父层：解锁
    parent.open = false
    await parent.updateComplete
    await waitFor(() => !getDialog(parent).open, 4000)
    expect(document.documentElement.style.overflow).not.toBe('hidden')
  })

  it('焦点在 footer slot 按钮内按 Escape：仍关闭本层（UA top layer 键盘路由）', async () => {
    const el = document.createElement('web-ui-drawer') as WebUiDrawer
    el.innerHTML = '<web-ui-button slot="footer">关闭</web-ui-button>'
    document.body.append(el)
    el.open = true
    await el.updateComplete
    await waitForOpenTransition(el)

    const dialog = getDialog(el)
    const footerButton = el.querySelector('web-ui-button')
    const nativeButton = footerButton?.shadowRoot?.querySelector('button')
    nativeButton?.focus()
    expect(document.activeElement === nativeButton || nativeButton?.matches(':focus')).toBe(true)

    // 真实浏览器：焦点在本层 slot 内容时按 Esc，UA 将键盘事件直接路由到 top
    // layer 的 dialog（不依赖 DOM 冒泡）。合成事件无法触发 UA 路由，故按 UA
    // 的实际派发位置直接在 dialog 上派发，验证 handler 对「焦点在 slot 内」
    // 场景的响应与 guard 不误伤本层内容。
    pressEscape(dialog)
    await el.updateComplete

    expect(el.open).toBe(false)
    await waitFor(() => !dialog.open, 4000)
  })
})

describe('WebUiDrawer 同级（非 DOM 嵌套）层叠', () => {
  it('两个同级 drawer 依次打开：Esc 只关后开的那层，关掉后先开的接管', async () => {
    const theme = document.createElement('web-ui-theme')
    theme.setAttribute('appearance', 'light')
    document.body.append(theme)

    const first = createDrawer('drawer-1')
    const second = createDrawer('drawer-2')
    // 同级挂载，非嵌套
    theme.append(first)
    theme.append(second)
    await first.updateComplete
    await second.updateComplete
    await openInSequence(first, second)

    // 后开的是顶层：Esc 只作用于它。
    pressEscape(getDialog(second))
    await second.updateComplete
    await waitFor(() => !getDialog(second).open, 4000)
    expect(second.open).toBe(false)
    expect(first.open).toBe(true)

    // 顶层空出后由先开的接管：Esc 现在作用于它。
    pressEscape(getDialog(first))
    await first.updateComplete
    await waitFor(() => !getDialog(first).open, 4000)
    expect(first.open).toBe(false)
  })

  it('三个同级 drawer：Esc 逐层关闭最上层；关闭中间层不改变剩余层序', async () => {
    const d1 = createDrawer('d1')
    const d2 = createDrawer('d2')
    const d3 = createDrawer('d3')
    document.body.append(d1, d2, d3)
    await d1.updateComplete
    await d2.updateComplete
    await d3.updateComplete
    await openInSequence(d1, d2, d3)

    // Esc 关闭最上层 d3，其余不动。
    pressEscape(getDialog(d3))
    await d3.updateComplete
    await waitFor(() => !getDialog(d3).open, 4000)
    expect(d3.open).toBe(false)
    expect(d2.open).toBe(true)
    expect(d1.open).toBe(true)

    // 关闭**中间层** d2：不影响仍在顶层的…（d3 已关，此时顶层是 d2 之下的 d1）
    d2.open = false
    await d2.updateComplete
    await waitFor(() => !getDialog(d2).open, 4000)
    expect(d1.open).toBe(true)

    // 剩下的 d1 重新成为唯一顶层：Esc 关闭它。
    pressEscape(getDialog(d1))
    await d1.updateComplete
    await waitFor(() => !getDialog(d1).open, 4000)
    expect(d1.open).toBe(false)
  })
})
