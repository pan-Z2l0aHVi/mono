import { describe, expect, it } from 'vite-plus/test'

import { withOverlay } from '../overlay'

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

describe('withOverlay', () => {
  it('创建实例', () => {
    const trigger = createTrigger()
    const overlay = createOverlay()
    const ctx = withOverlay.make({ anchor: trigger, overlay })
    expect(ctx).toBeTruthy()
    expect(ctx.open).toBeTypeOf('function')
    trigger.remove()
    overlay.remove()
  })

  it('open 时设置 overlay 可见', async () => {
    const trigger = createTrigger()
    const overlay = createOverlay()
    const ctx = withOverlay.make({ anchor: trigger, overlay })

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
    const ctx = withOverlay.make({ anchor: trigger, overlay })

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
    const ctx = withOverlay.make({ anchor: trigger, overlay })

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
    const ctx = withOverlay.make({ anchor: trigger, overlay, placement: 'top' })

    expect(ctx.options.placement).toBe('top')

    ctx.dispose()
    trigger.remove()
    overlay.remove()
  })

  it('dispose 清理资源', async () => {
    const trigger = createTrigger()
    const overlay = createOverlay()
    const ctx = withOverlay.make({ anchor: trigger, overlay })

    ctx.open()
    await new Promise(r => requestAnimationFrame(r))
    ctx.dispose()

    expect(ctx.isOpen()).toBe(false)

    trigger.remove()
    overlay.remove()
  })
})
