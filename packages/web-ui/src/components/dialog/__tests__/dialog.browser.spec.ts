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
  it('玻璃背景 blur 由独立模糊层承担，opacity 过渡保证任何状态切换模糊连续', async () => {
    const component = createDialog()
    component.open = true
    await component.updateComplete
    await new Promise(resolve => requestAnimationFrame(resolve))

    const dialog = component.shadowRoot?.querySelector('dialog') as HTMLDialogElement
    const blurLayer = dialog.querySelector('.wui-dialog-blur') as HTMLElement
    const surface = dialog.querySelector('.wui-dialog-surface') as HTMLElement
    const body = dialog.querySelector('.wui-dialog-body') as HTMLElement
    expect(blurLayer).toBeTruthy()
    expect(surface).toBeTruthy()
    expect(body).toBeTruthy()

    // 打开态：模糊层可见、backdrop-filter 生效并带 opacity 过渡（淡入淡出而非离散跳变）。
    // opacity 从 0 起过渡，轮询等它收敛到 1。
    const blurBackdrop = getComputedStyle(blurLayer).backdropFilter
    expect(blurBackdrop).not.toBe('none')
    expect(blurBackdrop).toContain('blur(4px)')
    await pollUntil(() => getComputedStyle(blurLayer).opacity === '1', 'blur layer did not fade in')
    expect(getComputedStyle(surface).opacity).toBe('1')
    expect(getComputedStyle(blurLayer).transitionProperty).toContain('opacity')
    expect(getComputedStyle(surface).transitionProperty).toContain('opacity')

    // dialog 元素本身不参与 opacity 过渡：opacity < 1 会让 dialog 成为 backdrop root，
    // 后代 backdrop-filter 在过渡期间被禁用、blur 在端点生硬跳变。transform 过渡保留。
    expect(getComputedStyle(dialog).transitionProperty).not.toContain('opacity')
    expect(getComputedStyle(dialog).opacity).toBe('1')
    expect(getComputedStyle(dialog).transitionProperty).toContain('transform')

    // 玻璃背景迁移：dialog 自身透明（blur 层采样纯页面、白底随 surface 淡出），
    // 玻璃背景保留在 surface 内的 body 上。
    expect(getComputedStyle(dialog).backgroundColor).toBe('rgba(0, 0, 0, 0)')
    expect(getComputedStyle(body).backgroundColor).not.toBe('rgba(0, 0, 0, 0)')

    // body 自身不再带 backdrop-filter：模糊由独立层提供，避免静止态双重模糊。
    expect(getComputedStyle(body).backdropFilter).toBe('none')

    // 关闭：模糊层与内容层切到退场时长，opacity 过渡仍在（退场同样连续）。
    component.close()
    await component.updateComplete
    expect(getComputedStyle(blurLayer).transitionDuration).not.toBe('0s')
    expect(getComputedStyle(surface).transitionDuration).not.toBe('0s')

    dialog.dispatchEvent(new TransitionEvent('transitionend', { propertyName: 'transform' }))
    await new Promise(resolve => setTimeout(resolve))
    expect(dialog.open).toBe(false)
  })
})
