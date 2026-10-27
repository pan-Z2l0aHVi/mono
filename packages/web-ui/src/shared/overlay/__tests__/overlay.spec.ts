import { describe, expect, it } from 'vite-plus/test'

import { pollUntil, waitForFrame } from '@/shared/test-utils'

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

/*
 * 定位器的状态转换与它在锚定 panel 上写出的**可见后果**。
 *
 * 不留的两类：`options` 的逐字段回显（placement / strategy / offset 原样存原样取，
 * 是纯赋值测试）与浮动几何断言（jsdom 无布局，left/top 的具体像素无意义）。
 * `minAnchorWidth` 的判据取内联样式写出的 min-width —— 那正是消费方看得见的约束结果
 * （panel 不会被压得比 trigger 和 floor 更窄），而不是读变量或读 options。
 */
describe('defineOverlay 定位器', () => {
  it('新建实例初始为未打开', () => {
    const trigger = createTrigger()
    const overlay = createOverlay()
    const ctx = defineOverlay().make({ anchor: trigger, overlay })

    expect(ctx.isOpen()).toBe(false)
    trigger.remove()
    overlay.remove()
  })

  it('open 使 panel 进入可见态', async () => {
    const trigger = createTrigger()
    const overlay = createOverlay()
    const ctx = defineOverlay().make({ anchor: trigger, overlay })

    ctx.open()
    await waitForFrame()

    expect(overlay.style.display).not.toBe('none')
    expect(ctx.isOpen()).toBe(true)

    ctx.dispose()
    trigger.remove()
    overlay.remove()
  })

  it('close 与 toggle 都把实例置回未打开，toggle 可反复开合', async () => {
    const trigger = createTrigger()
    const overlay = createOverlay()
    const ctx = defineOverlay().make({ anchor: trigger, overlay })

    ctx.open()
    await waitForFrame()
    ctx.close()
    await waitForFrame()
    expect(ctx.isOpen()).toBe(false)

    ctx.toggle()
    await waitForFrame()
    expect(ctx.isOpen()).toBe(true)

    ctx.toggle()
    await waitForFrame()
    expect(ctx.isOpen()).toBe(false)

    ctx.dispose()
    trigger.remove()
    overlay.remove()
  })

  it('dispose 后不再处于打开态', async () => {
    const trigger = createTrigger()
    const overlay = createOverlay()
    const ctx = defineOverlay().make({ anchor: trigger, overlay })

    ctx.open()
    await waitForFrame()
    ctx.dispose()

    expect(ctx.isOpen()).toBe(false)

    trigger.remove()
    overlay.remove()
  })

  it('minAnchorWidth：panel 不被压得比下限更窄', async () => {
    const trigger = createTrigger()
    const overlay = createOverlay()
    const ctx = defineOverlay().make({ anchor: trigger, overlay, minAnchorWidth: true })

    ctx.open()
    await pollUntil(() => overlay.style.minWidth !== '', 'Expected minWidth to be set')
    // jsdom 中 anchor 无布局，参考宽度为 0，因此取 floor；写成「≥ floor」而不是
    // 钉死 floor —— 真实浏览器里 trigger 更宽时该值更大，这里锁的是下限这一侧。
    expect(Number.parseFloat(overlay.style.minWidth)).toBeGreaterThanOrEqual(120)

    ctx.dispose()
    trigger.remove()
    overlay.remove()
  })

  it('minAnchorWidth 的下限可被公开 token 改写', async () => {
    const trigger = createTrigger()
    const overlay = createOverlay()
    overlay.style.setProperty('--wui-overlay-min-width', '200px')
    const ctx = defineOverlay().make({ anchor: trigger, overlay, minAnchorWidth: true })

    ctx.open()
    await pollUntil(() => overlay.style.minWidth !== '', 'Expected minWidth to be set')
    expect(Number.parseFloat(overlay.style.minWidth)).toBeGreaterThanOrEqual(200)

    ctx.dispose()
    trigger.remove()
    overlay.remove()
  })

  it('关闭 minAnchorWidth 后不再留下 panel 尺寸的接管', async () => {
    const trigger = createTrigger()
    const overlay = createOverlay()
    overlay.style.setProperty('--wui-overlay-min-width', '160px')
    const ctx = defineOverlay().make({ anchor: trigger, overlay, minAnchorWidth: true })

    ctx.open()
    await waitForFrame()
    expect(overlay.style.width).not.toBe('')

    // 遗留的 inline width / min-width 会继续约束一个已经不需要宽度接管的 overlay
    // （此后 width 由 matchWidth 或内容决定），且是消费方无法从外部清掉的残留。
    ctx.update({ minAnchorWidth: false })
    await waitForFrame()
    expect(overlay.style.width).toBe('')
    expect(overlay.style.minWidth).toBe('')

    ctx.dispose()
    trigger.remove()
    overlay.remove()
  })
})
