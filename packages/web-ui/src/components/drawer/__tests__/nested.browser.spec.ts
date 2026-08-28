import { afterEach, describe, expect, it } from 'vite-plus/test'

import '..'
import '@/components/theme'

import type { WebUiDrawer } from '..'

async function nextFrame() {
  await new Promise(resolve => requestAnimationFrame(resolve))
}

async function waitForOpenTransition() {
  await new Promise(resolve => setTimeout(resolve, 350))
}

// 轮询条件直至满足（弹簧/过渡时长在并行负载下不可预测）。
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

// 读取 nested 层序内部变量（写在 dialog 内联样式上）。
function nestedScale(el: WebUiDrawer): number {
  const raw = getDialog(el).style.getPropertyValue('--wui-internal-drawer-nested-scale')
  return raw ? Number.parseFloat(raw) : 1
}

afterEach(() => document.body.replaceChildren())

describe('WebUiDrawer nested 层叠（浏览器）', () => {
  it('声明式嵌套：两层同时打开，子层 depth=0 顶层全尺寸，父层缩放 0.95 并平滑过渡', async () => {
    const theme = document.createElement('web-ui-theme')
    theme.setAttribute('appearance', 'light')
    document.body.append(theme)

    const parent = document.createElement('web-ui-drawer') as WebUiDrawer
    parent.heading = 'parent'
    parent.open = true

    const child = document.createElement('web-ui-drawer') as WebUiDrawer
    child.heading = 'child'
    parent.append(child)
    theme.append(parent)
    await parent.updateComplete
    await waitForOpenTransition()

    // 单层：depth 0，无缩放
    expect(nestedScale(parent)).toBe(1)

    // 打开子层（子层在父的 default slot 内，声明式嵌套）
    child.open = true
    await child.updateComplete
    await waitForOpenTransition()

    expect(parent.open).toBe(true)
    expect(child.open).toBe(true)
    expect(getDialog(parent).open).toBe(true)
    expect(getDialog(child).open).toBe(true)

    // 父层被压到第二层：scale = 0.95
    await waitFor(() => nestedScale(parent) < 0.96)
    expect(nestedScale(parent)).toBeCloseTo(0.95, 2)
    // 子层是顶层：全尺寸
    await waitFor(() => nestedScale(child) > 0.99)
    expect(nestedScale(child)).toBe(1)
  })

  it('子层关闭后：父层平滑回到全尺寸（depth 归零）', async () => {
    const parent = document.createElement('web-ui-drawer') as WebUiDrawer
    parent.heading = 'parent'
    const child = document.createElement('web-ui-drawer') as WebUiDrawer
    child.heading = 'child'
    parent.append(child)
    document.body.append(parent)
    await parent.updateComplete

    parent.open = true
    await parent.updateComplete
    await waitForOpenTransition()
    child.open = true
    await child.updateComplete
    await waitForOpenTransition()
    await waitFor(() => nestedScale(parent) < 0.96)

    child.open = false
    await child.updateComplete
    // 关闭动画完成后 dialog 离开 top layer，父层 depth 重算归零
    await waitFor(() => !getDialog(child).open, 4000)
    await waitFor(() => nestedScale(parent) > 0.99, 4000)
    expect(parent.open).toBe(true)
    expect(getDialog(parent).open).toBe(true)
  })

  it('Esc 只关闭最顶层；父层保持打开', async () => {
    const parent = document.createElement('web-ui-drawer') as WebUiDrawer
    parent.heading = 'parent'
    const child = document.createElement('web-ui-drawer') as WebUiDrawer
    child.heading = 'child'
    parent.append(child)
    document.body.append(parent)
    await parent.updateComplete

    parent.open = true
    await parent.updateComplete
    await waitForOpenTransition()
    child.open = true
    await child.updateComplete
    await waitForOpenTransition()

    // 子层是 top layer 顶层：Esc keydown 派发到子层 dialog
    const childDialog = getDialog(child)
    childDialog.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }))
    await child.updateComplete

    expect(child.open).toBe(false)
    expect(parent.open).toBe(true)
    expect(getDialog(parent).open).toBe(true)
  })

  it('scroll lock 双 lease：两层全关后才解锁页面滚动', async () => {
    const parent = document.createElement('web-ui-drawer') as WebUiDrawer
    parent.heading = 'parent'
    const child = document.createElement('web-ui-drawer') as WebUiDrawer
    child.heading = 'child'
    parent.append(child)
    document.body.append(parent)
    await parent.updateComplete

    parent.open = true
    await parent.updateComplete
    await waitForOpenTransition()
    child.open = true
    await child.updateComplete
    await waitForOpenTransition()

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
    await waitForOpenTransition()

    const dialog = getDialog(el)
    const footerButton = el.querySelector('web-ui-button')
    const nativeButton = footerButton?.shadowRoot?.querySelector('button')
    nativeButton?.focus()
    expect(document.activeElement === nativeButton || nativeButton?.matches(':focus')).toBe(true)

    // 真实浏览器：焦点在本层 slot 内容时按 Esc，UA 将键盘事件直接路由到 top
    // layer 的 dialog（不依赖 DOM 冒泡）。合成事件无法触发 UA 路由，故按 UA
    // 的实际派发位置直接在 dialog 上派发，验证 handler 对「焦点在 slot 内」
    // 场景的响应与 guard 不误伤本层内容。
    dialog.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, composed: true, cancelable: true, key: 'Escape' })
    )
    await el.updateComplete

    expect(el.open).toBe(false)
    expect(dialog.classList.contains('is-closing')).toBe(true)
  })

  it('非顶层抽屉的几何：scale 缩小为 0.95 且向内侧偏移露出边缘（right 抽屉左缘向左凸出）', async () => {
    const parent = document.createElement('web-ui-drawer') as WebUiDrawer
    parent.heading = 'parent'
    const child = document.createElement('web-ui-drawer') as WebUiDrawer
    child.heading = 'child'
    parent.append(child)
    document.body.append(parent)
    await parent.updateComplete

    parent.open = true
    await parent.updateComplete
    await waitForOpenTransition()
    const parentDialog = getDialog(parent)
    const leftBefore = parentDialog.getBoundingClientRect().left

    child.open = true
    await child.updateComplete
    await waitForOpenTransition()
    await waitFor(() => nestedScale(parent) < 0.96)
    await nextFrame()

    // computed scale 生效（等过渡收敛；computed 序列化带亚像素噪声，按行为断言）
    await waitFor(() => Math.abs(parseFloat(getComputedStyle(parentDialog).scale) - 0.95) < 0.001)
    expect(Math.abs(parseFloat(getComputedStyle(parentDialog).scale) - 0.95)).toBeLessThan(0.001)
    // 左缘向屏幕内侧偏移，露出约 12px 边缘（leftAfter < leftBefore）
    const leftAfter = parentDialog.getBoundingClientRect().left
    expect(leftBefore - leftAfter).toBeGreaterThanOrEqual(10)
  })

  it('多宽度嵌套：父层宽 (480px)、子层窄 (320px)，父层在子层左侧清晰露出阶梯卡片', async () => {
    const parent = document.createElement('web-ui-drawer') as WebUiDrawer
    parent.heading = 'parent-wide'
    parent.style.setProperty('--wui-drawer-width', '480px')
    const child = document.createElement('web-ui-drawer') as WebUiDrawer
    child.heading = 'child-narrow'
    child.style.setProperty('--wui-drawer-width', '320px')
    parent.append(child)
    document.body.append(parent)
    await parent.updateComplete

    parent.open = true
    await parent.updateComplete
    await waitForOpenTransition()

    child.open = true
    await child.updateComplete
    await waitForOpenTransition()
    await waitFor(() => nestedScale(parent) < 0.96)
    await nextFrame()

    const parentDialog = getDialog(parent)
    const childDialog = getDialog(child)
    const parentRect = parentDialog.getBoundingClientRect()
    const childRect = childDialog.getBoundingClientRect()

    // 父层（底层）左缘比子层（顶层）左缘更靠左，卡片露出
    expect(parentRect.left).toBeLessThan(childRect.left)
  })

  it('多宽度嵌套：父层窄 (280px)、子层宽 (420px)，父层自动补偿宽度差并在子层左侧露出边缘', async () => {
    const parent = document.createElement('web-ui-drawer') as WebUiDrawer
    parent.heading = 'parent-narrow'
    parent.style.setProperty('--wui-drawer-width', '280px')
    const child = document.createElement('web-ui-drawer') as WebUiDrawer
    child.heading = 'child-wide'
    child.style.setProperty('--wui-drawer-width', '420px')
    parent.append(child)
    document.body.append(parent)
    await parent.updateComplete

    parent.open = true
    await parent.updateComplete
    await waitForOpenTransition()

    child.open = true
    await child.updateComplete
    await waitForOpenTransition()
    await waitFor(() => nestedScale(parent) < 0.96)
    await nextFrame()

    const parentDialog = getDialog(parent)
    const childDialog = getDialog(child)
    const parentRect = parentDialog.getBoundingClientRect()
    const childRect = childDialog.getBoundingClientRect()

    // 即使子层比父层宽 140px，父层也因上层最大宽度补偿而在子层左侧露出了边缘
    expect(parentRect.left).toBeLessThan(childRect.left)
  })

  it('乱序宽度交错嵌套：300px -> 520px -> 240px -> 400px 四层全部在左侧保持严格单调递进露边', async () => {
    const d1 = document.createElement('web-ui-drawer') as WebUiDrawer
    d1.heading = 'd1-300'
    d1.style.setProperty('--wui-drawer-width', '300px')

    const d2 = document.createElement('web-ui-drawer') as WebUiDrawer
    d2.heading = 'd2-520'
    d2.style.setProperty('--wui-drawer-width', '520px')

    const d3 = document.createElement('web-ui-drawer') as WebUiDrawer
    d3.heading = 'd3-240'
    d3.style.setProperty('--wui-drawer-width', '240px')

    const d4 = document.createElement('web-ui-drawer') as WebUiDrawer
    d4.heading = 'd4-400'
    d4.style.setProperty('--wui-drawer-width', '400px')

    d3.append(d4)
    d2.append(d3)
    d1.append(d2)
    document.body.append(d1)
    await d1.updateComplete

    d1.open = true
    await d1.updateComplete
    await waitForOpenTransition()

    d2.open = true
    await d2.updateComplete
    await waitForOpenTransition()

    d3.open = true
    await d3.updateComplete
    await waitForOpenTransition()

    d4.open = true
    await d4.updateComplete
    await waitForOpenTransition()
    await waitFor(() => nestedScale(d1) < 0.88)
    await nextFrame()

    const r1 = getDialog(d1).getBoundingClientRect()
    const r2 = getDialog(d2).getBoundingClientRect()
    const r3 = getDialog(d3).getBoundingClientRect()
    const r4 = getDialog(d4).getBoundingClientRect()

    // 严格满足由底至顶从左至右阶梯露边：left(d1) < left(d2) < left(d3) < left(d4)
    expect(r1.left).toBeLessThan(r2.left)
    expect(r2.left).toBeLessThan(r3.left)
    expect(r3.left).toBeLessThan(r4.left)
  })
})
