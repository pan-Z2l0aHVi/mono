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

    ctx.dispose()
    trigger.remove()
    overlay.remove()
  })

  it('minAnchorWidth 使用默认 120px floor', async () => {
    const trigger = createTrigger()
    const overlay = createOverlay()
    const ctx = defineOverlay().make({ anchor: trigger, overlay, minAnchorWidth: true })

    ctx.open()
    await new Promise(r => requestAnimationFrame(r))

    // jsdom 中 anchor 无布局，参考宽度为 0，min-width 取 floor
    expect(overlay.style.minWidth).toBe('120px')

    ctx.dispose()
    trigger.remove()
    overlay.remove()
  })

  it('minAnchorWidth 读取 --wui-overlay-min-width 作为 floor', async () => {
    const trigger = createTrigger()
    const overlay = createOverlay()
    overlay.style.setProperty('--wui-overlay-min-width', '200px')
    const ctx = defineOverlay().make({ anchor: trigger, overlay, minAnchorWidth: true })

    ctx.open()
    await new Promise(r => requestAnimationFrame(r))

    expect(overlay.style.minWidth).toBe('200px')

    ctx.dispose()
    trigger.remove()
    overlay.remove()
  })

  it('关闭 minAnchorWidth 后清理 inline width/min-width', async () => {
    const trigger = createTrigger()
    const overlay = createOverlay()
    overlay.style.setProperty('--wui-overlay-min-width', '160px')
    const ctx = defineOverlay().make({ anchor: trigger, overlay, minAnchorWidth: true })

    ctx.open()
    await new Promise(r => requestAnimationFrame(r))
    expect(overlay.style.width).toBe('max-content')
    expect(overlay.style.minWidth).toBe('160px')

    ctx.update({ minAnchorWidth: false })
    await new Promise(r => requestAnimationFrame(r))
    expect(overlay.style.width).toBe('')
    expect(overlay.style.minWidth).toBe('')

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
