import { afterEach, describe, expect, it } from 'vite-plus/test'
import { page } from 'vite-plus/test/browser'
import { userEvent } from 'vite-plus/test/browser'

import { pollUntil } from '@/shared/test-utils'

import '..'
import type { WebUiDialog } from '..'

afterEach(() => document.body.replaceChildren())

function createDialog(): WebUiDialog {
  const dialog = document.createElement('web-ui-dialog')
  dialog.textContent = 'Dialog content'
  document.body.append(dialog)
  return dialog
}

describe('WebUiDialog 组件（浏览器）', () => {
  it('面板自身不夺焦，内部按钮可聚焦', async () => {
    const component = createDialog()
    const button = document.createElement('button')
    button.textContent = '打开'
    component.append(button)
    component.open = true
    await component.updateComplete
    await new Promise(resolve => requestAnimationFrame(resolve))

    // 原用例还断言 `getComputedStyle(dialog).outlineStyle === 'none'`（D2 计算样式）
    // 与 `expect(dialog).toBeTruthy()`（D3 存在性），均已按 §12 C1 / §2 D3 删除；
    // 保留的是焦点归宿契约（§3 白名单）。
    const dialog = component.shadowRoot?.querySelector('dialog') as HTMLDialogElement
    dialog.focus()

    button.focus()
    expect(document.activeElement).toBe(button)
  })

  it('退出过渡完成前保持原生 dialog 位于 top layer', async () => {
    const component = createDialog()
    component.open = true
    await component.updateComplete
    await new Promise(resolve => requestAnimationFrame(resolve))

    const dialog = component.shadowRoot?.querySelector('dialog')
    expect(dialog?.open).toBe(true)

    component.close()
    await component.updateComplete
    expect(dialog?.open).toBe(true)

    dialog?.dispatchEvent(new TransitionEvent('transitionend', { propertyName: 'transform' }))
    await new Promise(resolve => setTimeout(resolve))
    expect(dialog?.open).toBe(false)
  })

  it('no-escape-close 存在时 Escape/cancel 不关闭对话框', async () => {
    const component = createDialog()
    component.noEscapeClose = true
    component.open = true
    await component.updateComplete
    await new Promise(resolve => requestAnimationFrame(resolve))

    const dialog = component.shadowRoot?.querySelector('dialog')
    dialog?.focus()
    await userEvent.keyboard('{Escape}')
    await component.updateComplete
    expect(component.open).toBe(true)

    const event = new Event('cancel', { cancelable: true })
    expect(dialog?.dispatchEvent(event)).toBe(false)
    await component.updateComplete
    expect(component.open).toBe(true)
  })

  it('子控件冒泡的 cancel 不关闭对话框，例如取消文件选择器', async () => {
    const component = createDialog()
    const input = document.createElement('input')
    input.type = 'file'
    component.append(input)
    component.open = true
    await component.updateComplete
    await new Promise(resolve => requestAnimationFrame(resolve))

    input.dispatchEvent(new Event('cancel', { bubbles: true, composed: true }))
    await component.updateComplete
    expect(component.open).toBe(true)

    const dialog = component.shadowRoot?.querySelector('dialog')
    dialog?.focus()
    await userEvent.keyboard('{Escape}')
    await component.updateComplete
    expect(component.open).toBe(false)
  })

  it('no-backdrop-close 只阻止遮罩 click，不阻止 Escape 触发的 cancel', async () => {
    const component = createDialog()
    component.noBackdropClose = true
    component.open = true
    await component.updateComplete
    await new Promise(resolve => requestAnimationFrame(resolve))

    const dialog = component.shadowRoot?.querySelector('dialog')
    expect(dialog?.open).toBe(true)

    dialog?.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
    await component.updateComplete
    expect(component.open).toBe(true)

    dialog?.focus()
    await userEvent.keyboard('{Escape}')
    await component.updateComplete
    expect(component.open).toBe(false)
  })

  it('controlled 下 Escape 与遮罩只派发 open-change(false) 请求，回写 open=false 后才真正关闭', async () => {
    const component = createDialog()
    component.controlled = true
    component.open = true
    await component.updateComplete
    await new Promise(resolve => requestAnimationFrame(resolve))

    const dialog = component.shadowRoot?.querySelector('dialog')
    expect(dialog?.open).toBe(true)

    const events: CustomEvent<{ open: boolean }>[] = []
    component.addEventListener('open-change', e => events.push(e as CustomEvent<{ open: boolean }>))

    // Escape 请求：open 不变，dialog 保持 top layer
    dialog?.focus()
    await userEvent.keyboard('{Escape}')
    await component.updateComplete
    expect(component.open).toBe(true)
    expect(dialog?.open).toBe(true)
    expect(events).toHaveLength(1)
    expect(events[0]?.detail).toEqual({ open: false })

    // 遮罩点击请求：同样只请求
    dialog?.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
    await component.updateComplete
    expect(component.open).toBe(true)
    expect(events).toHaveLength(2)

    // Consumer 回写 open=false 后才执行关闭；直接赋值不 mark，不补发通知事件（总事件数仍为 2）
    component.open = false
    await component.updateComplete
    dialog?.dispatchEvent(new TransitionEvent('transitionend', { propertyName: 'transform' }))
    await new Promise(resolve => setTimeout(resolve))
    expect(component.open).toBe(false)
    expect(dialog?.open).toBe(false)
    expect(events).toHaveLength(2)
  })

  it('controlled 下原生 close（表单 method=dialog）恢复受控状态并派发请求', async () => {
    const component = createDialog()
    component.controlled = true
    component.open = true
    await component.updateComplete
    await new Promise(resolve => requestAnimationFrame(resolve))

    const dialog = component.shadowRoot?.querySelector('dialog')
    const events: CustomEvent<{ open: boolean }>[] = []
    component.addEventListener('open-change', e => events.push(e as CustomEvent<{ open: boolean }>))

    dialog?.dispatchEvent(new Event('close'))
    await component.updateComplete

    // 原生关闭被恢复为受控打开，请求而非自关闭
    expect(component.open).toBe(true)
    expect(dialog?.open).toBe(true)
    expect(events).toHaveLength(1)
    expect(events[0]?.detail).toEqual({ open: false })
  })

  it('controlled 下程序化 showModal()/close() 依然直通，不派发请求', async () => {
    const component = createDialog()
    component.controlled = true
    const events: CustomEvent<{ open: boolean }>[] = []
    component.addEventListener('open-change', e => events.push(e as CustomEvent<{ open: boolean }>))

    component.showModal()
    await component.updateComplete
    expect(component.open).toBe(true)

    component.close()
    await component.updateComplete
    expect(component.open).toBe(false)
    expect(events).toHaveLength(0)
  })
  it('modal 固定在视口内：页面滚动后仍完整可见，且处于 :modal 层', async () => {
    // 历史回归：单层重构曾把 dialog 覆盖成 `position: relative`，导致 top layer 里的 modal
    // 回到文档流——出现在页面顶部且跟随页面滚动，用户看到"残影"与"没有固定居中"。
    //
    // 原用例的断言是 `getComputedStyle(dialog).position === 'fixed'` + 滚动前后 rect 等值，
    // 属 §12 C1 的几何 / 计算样式取值，已删。改为 §8 R3 第二通道「边界约束」：
    // 断言 modal **不随页面滚动离开视口**，同样能抓住该回归（relative 时滚动 500px 后
    // dialog 已在视口之外），但不锁死任何像素值；"在 modal 层"改用平台语义 `:modal`。
    await page.viewport(800, 600)
    const spacer = document.createElement('div')
    spacer.style.height = '2000px'
    document.body.append(spacer)
    try {
      const component = createDialog()
      // 本用例验证的是视口固定语义，必须关掉 scroll-lock：dialog 打开时默认锁滚动
      // （html overflow hidden + body fixed），页面根本滚不动，视口语义无从验证。
      component.noScrollLock = true
      component.open = true
      await component.updateComplete
      const dialog = component.shadowRoot?.querySelector('dialog') as HTMLDialogElement
      // 等进场 scale 过渡收敛再采样（WAAPI，§10 S2），避免缩放中的 rect 抖动
      await pollUntil(() => dialog.getAnimations().length === 0, 'dialog enter transition did not settle')

      expect(dialog.matches(':modal')).toBe(true)

      const scrolled = new Promise<void>(resolve => window.addEventListener('scroll', () => resolve(), { once: true }))
      window.scrollTo(0, 500)
      await scrolled
      await new Promise(resolve => requestAnimationFrame(resolve))
      expect(window.scrollY).toBeGreaterThan(0)

      const after = dialog.getBoundingClientRect()
      expect(after.top).toBeGreaterThanOrEqual(0)
      expect(after.bottom).toBeLessThanOrEqual(window.innerHeight)
    } finally {
      document.body.replaceChildren()
      window.scrollTo(0, 0)
      await page.viewport(1280, 720)
    }
  })
})
