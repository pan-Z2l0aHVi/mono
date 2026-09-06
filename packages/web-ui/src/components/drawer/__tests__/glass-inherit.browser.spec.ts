import { afterEach, describe, expect, it } from 'vite-plus/test'

import '..'
import '@/components/button'
import '@/components/dialog'
import '@/components/input'
import '@/components/theme'
import type { WebUiButton } from '@/components/button'
import type { WebUiDialog } from '@/components/dialog'
import type { WebUiInput } from '@/components/input'

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

// 读取 glass 元素最终 box-shadow（slotted 内容需穿透两层 shadow root）。
function computedBoxShadow(el: HTMLElement, selector: string): string {
  const inner = el.shadowRoot?.querySelector(selector) as HTMLElement | null
  return inner ? getComputedStyle(inner).boxShadow : ''
}

function glassShadow(el: HTMLElement, selector: string): string {
  return getComputedStyle(el.shadowRoot?.querySelector(selector) as Element)
    .getPropertyValue('--wui-internal-glass-shadow')
    .trim()
}

afterEach(() => document.body.replaceChildren())

/*
 * glass 内部变量继承治理（浏览器）：
 * .wui-glass 在自身声明 --wui-internal-glass-* 默认值，阻断祖先 glass 容器
 * （drawer/dialog body 等声明 overlay 阴影的元素）沿 flattened tree 把阴影
 * 泄漏进 slotted 内容。headless drawer 同理在 dialog 上归零 inset。
 */
describe('glass 内部变量不跨边界继承（浏览器）', () => {
  it('drawer 内 slotted glass 按钮使用 glass fallback 阴影，与 drawer 外一致', async () => {
    const theme = document.createElement('web-ui-theme')
    theme.setAttribute('appearance', 'light')
    document.body.append(theme)

    const drawer = document.createElement('web-ui-drawer') as WebUiDrawer
    drawer.heading = 'glass inherit'
    drawer.open = true

    const btnInside = document.createElement('web-ui-button') as WebUiButton
    btnInside.variant = 'glass'
    btnInside.textContent = 'inside'
    drawer.append(btnInside)
    theme.append(drawer)
    await drawer.updateComplete
    await waitForOpenTransition()

    const btnOutside = document.createElement('web-ui-button') as WebUiButton
    btnOutside.variant = 'glass'
    btnOutside.textContent = 'outside'
    theme.append(btnOutside)
    await btnOutside.updateComplete
    await nextFrame()

    const shadowInside = computedBoxShadow(btnInside, 'button')
    const shadowOutside = computedBoxShadow(btnOutside, 'button')
    expect(shadowInside).toBe(shadowOutside)
    // overlay 阴影（2px 16px 40px）不应出现在 slotted glass 按钮上
    expect(shadowInside).not.toContain('2px 16px 40px')
  })

  it('drawer 内 slotted input 不继承 overlay 阴影变量', async () => {
    const theme = document.createElement('web-ui-theme')
    theme.setAttribute('appearance', 'light')
    document.body.append(theme)

    const drawer = document.createElement('web-ui-drawer') as WebUiDrawer
    drawer.heading = 'glass inherit input'
    drawer.open = true

    const input = document.createElement('web-ui-input') as WebUiInput
    drawer.append(input)
    theme.append(drawer)
    await drawer.updateComplete
    await waitForOpenTransition()

    const inherited = glassShadow(input, '.wui-input-inner')
    expect(inherited).not.toContain('2px 16px 40px')
    // getPropertyValue 返回 var() 解析后的值：glass fallback（--wui-shadow-glass 未定义时的层叠阴影）
    expect(inherited).toContain('0 8px 32px')
  })

  it('dialog 内 slotted glass 按钮不继承 overlay 阴影', async () => {
    const theme = document.createElement('web-ui-theme')
    theme.setAttribute('appearance', 'light')
    document.body.append(theme)

    const dialog = document.createElement('web-ui-dialog') as WebUiDialog
    dialog.innerHTML = '<web-ui-button slot="body" variant="glass">inside</web-ui-button>'
    document.body.append(dialog)
    await dialog.updateComplete

    const btn = dialog.querySelector('web-ui-button') as WebUiButton
    const shadow = computedBoxShadow(btn, 'button')
    expect(shadow).not.toContain('2px 16px 40px')
  })

  it('headless drawer 自身 dialog 的 inset 归零，不受非 headless 外层嵌套影响', async () => {
    const theme = document.createElement('web-ui-theme')
    theme.setAttribute('appearance', 'light')
    document.body.append(theme)

    const outer = document.createElement('web-ui-drawer') as WebUiDrawer
    outer.heading = 'outer'
    outer.open = true

    const inner = document.createElement('web-ui-drawer') as WebUiDrawer
    inner.headless = true
    inner.open = true
    outer.append(inner)
    theme.append(outer)
    await outer.updateComplete
    await waitForOpenTransition()
    await inner.updateComplete
    await waitForOpenTransition()

    const nestedInset = getComputedStyle(getDialog(inner)).getPropertyValue('--wui-internal-drawer-inset').trim()
    expect(nestedInset === '0px' || nestedInset === '').toBe(true)

    // 非 headless 外层保持 8px 留边几何
    const outerInset = getComputedStyle(getDialog(outer)).getPropertyValue('--wui-internal-drawer-inset').trim()
    expect(outerInset).toBe('8px')
  })
})

describe('--wui-drawer-inset 公开 token（浏览器）', () => {
  it('inset 0 时贴边几何：dialog 无留边，关闭位移不含留边补偿', async () => {
    const theme = document.createElement('web-ui-theme')
    theme.setAttribute('appearance', 'light')
    document.body.append(theme)

    const drawer = document.createElement('web-ui-drawer') as WebUiDrawer
    drawer.heading = 'edge to edge'
    drawer.open = true
    drawer.style.setProperty('--wui-drawer-inset', '0')
    theme.append(drawer)
    await drawer.updateComplete
    await waitForOpenTransition()

    const dialog = getDialog(drawer)
    const cs = getComputedStyle(dialog)
    // 贴边：四周 inset 均为 0，闭合补偿变量同步归 0
    expect(cs.top).toBe('0px')
    expect(cs.right).toBe('0px')
    expect(cs.bottom).toBe('0px')
    expect(cs.getPropertyValue('--wui-internal-drawer-inset').trim()).toBe('0px')

    // 对照：默认留边仍为 8px
    const defaultDrawer = document.createElement('web-ui-drawer') as WebUiDrawer
    defaultDrawer.heading = 'default inset'
    defaultDrawer.open = true
    theme.append(defaultDrawer)
    await defaultDrawer.updateComplete
    await waitForOpenTransition()
    const defaultDialog = getDialog(defaultDrawer)
    expect(getComputedStyle(defaultDialog).top).toBe('8px')
    expect(getComputedStyle(defaultDialog).getPropertyValue('--wui-internal-drawer-inset').trim()).toBe('8px')
  })
})
