import { describe, expect, it } from 'vite-plus/test'

import { OverlayController } from '../overlay-controller'

function createTrigger(): HTMLElement {
  const el = document.createElement('div')
  el.style.cssText = 'position:fixed;left:100px;top:200px;width:120px;height:40px;'
  document.body.appendChild(el)
  return el
}

function createOverlay(): HTMLElement {
  const el = document.createElement('div')
  el.style.cssText = 'position:fixed;width:150px;height:200px;'
  document.body.appendChild(el)
  return el
}

describe('OverlayController', () => {
  it('创建实例', () => {
    const trigger = createTrigger()
    const overlay = createOverlay()
    const controller = new OverlayController(trigger, overlay)
    expect(controller).toBeInstanceOf(OverlayController)
    trigger.remove()
    overlay.remove()
  })

  it('open 时设置 overlay 可见', async () => {
    const trigger = createTrigger()
    const overlay = createOverlay()
    const controller = new OverlayController(trigger, overlay)

    controller.open()
    await new Promise(r => requestAnimationFrame(r))

    expect(overlay.style.display).not.toBe('none')
    expect(controller.isOpen).toBe(true)

    controller.dispose()
    trigger.remove()
    overlay.remove()
  })

  it('close 时隐藏 overlay', async () => {
    const trigger = createTrigger()
    const overlay = createOverlay()
    const controller = new OverlayController(trigger, overlay)

    controller.open()
    await new Promise(r => requestAnimationFrame(r))
    controller.close()
    await new Promise(r => requestAnimationFrame(r))

    expect(controller.isOpen).toBe(false)

    controller.dispose()
    trigger.remove()
    overlay.remove()
  })

  it('toggle 切换 open/close', async () => {
    const trigger = createTrigger()
    const overlay = createOverlay()
    const controller = new OverlayController(trigger, overlay)

    controller.toggle()
    await new Promise(r => requestAnimationFrame(r))
    expect(controller.isOpen).toBe(true)

    controller.toggle()
    await new Promise(r => requestAnimationFrame(r))
    expect(controller.isOpen).toBe(false)

    controller.dispose()
    trigger.remove()
    overlay.remove()
  })

  it('placement 参数透传', () => {
    const trigger = createTrigger()
    const overlay = createOverlay()
    const controller = new OverlayController(trigger, overlay, { placement: 'top' })

    expect(controller.options.placement).toBe('top')

    controller.dispose()
    trigger.remove()
    overlay.remove()
  })

  it('dispose 清理资源', async () => {
    const trigger = createTrigger()
    const overlay = createOverlay()
    const controller = new OverlayController(trigger, overlay)

    controller.open()
    await new Promise(r => requestAnimationFrame(r))
    controller.dispose()

    expect(controller.isOpen).toBe(false)

    trigger.remove()
    overlay.remove()
  })
})
