import { afterEach, describe, expect, it } from 'vite-plus/test'
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
  it('面板自身聚焦不显示 focus ring，内部按钮仍可聚焦', async () => {
    const component = createDialog()
    const button = document.createElement('button')
    button.textContent = '打开'
    component.append(button)
    component.open = true
    await component.updateComplete
    await new Promise(resolve => requestAnimationFrame(resolve))

    const dialog = component.shadowRoot?.querySelector('dialog')
    expect(dialog).toBeTruthy()
    dialog?.focus()
    expect(getComputedStyle(dialog!).outlineStyle).toBe('none')

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
  it('玻璃卡片单层：opacity + backdrop-filter 插值过渡，任何状态切换模糊连续', async () => {
    const component = createDialog()
    component.open = true
    await component.updateComplete
    await new Promise(resolve => requestAnimationFrame(resolve))

    const dialog = component.shadowRoot?.querySelector('dialog') as HTMLDialogElement
    const body = dialog.querySelector('.wui-dialog-body') as HTMLElement
    expect(body).toBeTruthy()

    // dialog 元素本身不参与 opacity 过渡：opacity < 1 会让 dialog 成为 backdrop root，
    // 后代 backdrop-filter 在过渡期间被禁用。transform 过渡保留。
    expect(getComputedStyle(dialog).transitionProperty).not.toContain('opacity')
    expect(getComputedStyle(dialog).opacity).toBe('1')
    expect(getComputedStyle(dialog).transitionProperty).toContain('transform')

    // 打开态：玻璃卡片自身承担玻璃，opacity 收敛到 1、blur 收敛到 4px，
    // opacity + backdrop-filter 都有过渡（blur(0px)↔blur(4px) 平滑插值）。
    const bodyStyle = getComputedStyle(body)
    expect(body.classList.contains('wui-glass')).toBe(true)
    expect(bodyStyle.backgroundColor).not.toBe('rgba(0, 0, 0, 0)')
    expect(bodyStyle.transitionProperty).toContain('opacity')
    expect(bodyStyle.transitionProperty).toContain('backdrop-filter')
    await pollUntil(() => getComputedStyle(body).opacity === '1', 'dialog body did not fade in')
    // 过渡收敛后 blur 插值到目标态 4px。
    expect(getComputedStyle(body).backdropFilter).toContain('blur(4px)')

    // 关闭：卡片切到退场时长，opacity 与 backdrop-filter 过渡仍在（退场同样连续）。
    component.close()
    await component.updateComplete
    expect(getComputedStyle(body).transitionDuration).not.toBe('0s')

    dialog.dispatchEvent(new TransitionEvent('transitionend', { propertyName: 'transform' }))
    await new Promise(resolve => setTimeout(resolve))
    expect(dialog.open).toBe(false)
  })
})
