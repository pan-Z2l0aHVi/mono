import { describe, expect, it } from 'vite-plus/test'

import { defineOverlay } from '../overlay'

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

describe('defineOverlay 工具', () => {
  it('创建实例', () => {
    const trigger = createTrigger()
    const overlay = createOverlay()
    const ctx = defineOverlay().make({ anchor: trigger, overlay })
    expect(ctx).toBeTruthy()
    expect(ctx.open).toBeTypeOf('function')
    trigger.remove()
    overlay.remove()
  })

  it('open 时设置 overlay 可见', async () => {
    const trigger = createTrigger()
    const overlay = createOverlay()
    const ctx = defineOverlay().make({ anchor: trigger, overlay })

    ctx.open()
    await new Promise(r => requestAnimationFrame(r))

    expect(overlay.style.display).not.toBe('none')
    expect(ctx.isOpen()).toBe(true)

    ctx.dispose()
    trigger.remove()
    overlay.remove()
  })

  it('close 时隐藏 overlay', async () => {
    const trigger = createTrigger()
    const overlay = createOverlay()
    const ctx = defineOverlay().make({ anchor: trigger, overlay })

    ctx.open()
    await new Promise(r => requestAnimationFrame(r))
    ctx.close()
    await new Promise(r => requestAnimationFrame(r))

    expect(ctx.isOpen()).toBe(false)

    ctx.dispose()
    trigger.remove()
    overlay.remove()
  })

  it('toggle 切换 open/close', async () => {
    const trigger = createTrigger()
    const overlay = createOverlay()
    const ctx = defineOverlay().make({ anchor: trigger, overlay })

    ctx.toggle()
    await new Promise(r => requestAnimationFrame(r))
    expect(ctx.isOpen()).toBe(true)

    ctx.toggle()
    await new Promise(r => requestAnimationFrame(r))
    expect(ctx.isOpen()).toBe(false)

    ctx.dispose()
    trigger.remove()
    overlay.remove()
  })

  it('placement 参数透传', () => {
    const trigger = createTrigger()
    const overlay = createOverlay()
    const ctx = defineOverlay().make({ anchor: trigger, overlay, placement: 'top' })

    expect(ctx.options.placement).toBe('top')

    ctx.dispose()
    trigger.remove()
    overlay.remove()
  })

  it('按最终 placement 设置有效的浮层变换原点', async () => {
    const cases = [
      ['top-start', 'bottom left'],
      ['bottom-end', 'top right'],
      ['left-start', 'right top'],
      ['left-end', 'right bottom'],
      ['right-start', 'left top'],
      ['right-end', 'left bottom']
    ] as const

    for (const [placement, origin] of cases) {
      const trigger = createTrigger()
      const overlay = createOverlay()
      const ctx = defineOverlay().make({ anchor: trigger, overlay, placement, flip: false, shift: false })

      ctx.open()
      await new Promise(resolve => requestAnimationFrame(resolve))

      expect(overlay.style.getPropertyValue('--wui-overlay-transform-origin')).toBe(origin)

      ctx.dispose()
      trigger.remove()
      overlay.remove()
    }
  })

  it('默认使用 absolute 坐标策略', () => {
    const trigger = createTrigger()
    const overlay = createOverlay()
    const ctx = defineOverlay().make({ anchor: trigger, overlay })

    expect(ctx.options.strategy).toBe('absolute')

    ctx.dispose()
    trigger.remove()
    overlay.remove()
  })

  it('允许显式使用 fixed 坐标策略', () => {
    const trigger = createTrigger()
    const overlay = createOverlay()
    const ctx = defineOverlay().make({ anchor: trigger, overlay, strategy: 'fixed' })

    expect(ctx.options.strategy).toBe('fixed')

    ctx.dispose()
    trigger.remove()
    overlay.remove()
  })

  it('打开后更新定位选项并重新定位', async () => {
    const trigger = createTrigger()
    const overlay = createOverlay()
    const ctx = defineOverlay().make({ anchor: trigger, overlay, placement: 'bottom', offset: 4 })

    ctx.open()
    await new Promise(resolve => requestAnimationFrame(resolve))
    ctx.update({ placement: 'top', offset: 16, strategy: 'fixed' })
    await new Promise(resolve => requestAnimationFrame(resolve))

    expect(ctx.options.placement).toBe('top')
    expect(ctx.options.offset).toBe(16)
    expect(ctx.options.strategy).toBe('fixed')
    expect(overlay.style.getPropertyValue('--wui-overlay-transform-origin')).toBe('bottom center')

    ctx.dispose()
    trigger.remove()
    overlay.remove()
  })

  it('dispose 清理资源', async () => {
    const trigger = createTrigger()
    const overlay = createOverlay()
    const ctx = defineOverlay().make({ anchor: trigger, overlay })

    ctx.open()
    await new Promise(r => requestAnimationFrame(r))
    ctx.dispose()

    expect(ctx.isOpen()).toBe(false)

    trigger.remove()
    overlay.remove()
  })
})
