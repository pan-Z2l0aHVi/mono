import { afterEach, describe, expect, it } from 'vite-plus/test'

import '..'
import '@/components/segmented-trigger'
import type { WebUiSegmentedTrigger } from '@/components/segmented-trigger'
import { queryA11y } from '@/shared/test-utils'

import type { WebUiSegmented } from '..'

afterEach(() => document.body.replaceChildren())

/** 手势面以公开语义 role="listbox" 定位（不依赖内部 class）。 */
function gestureSurface(segmented: WebUiSegmented): HTMLElement {
  const surface = queryA11y(segmented, '[role="listbox"]')
  if (!(surface instanceof HTMLElement)) throw new Error('未找到 role="listbox" 的手势面')
  return surface
}

/** 单个选项的可交互面以公开语义 role="option" 定位。 */
function optionSurface(trigger: WebUiSegmentedTrigger): HTMLElement {
  const surface = queryA11y(trigger, '[role="option"]')
  if (!(surface instanceof HTMLElement)) throw new Error('未找到 role="option" 的可交互面')
  return surface
}

// 注：本文件多处 `getBoundingClientRect()` 只用于给合成指针事件算 clientX/Y（测试驱动），
// 不承载任何像素契约断言——R3 允许的"边界约束"以外的几何读取在此仅为造事件所需。
function pointer(type: string, init: PointerEventInit): PointerEvent {
  return new PointerEvent(type, { bubbles: true, isPrimary: true, pointerId: 1, ...init })
}

function createSegmented(options: { disabledSecond?: boolean } = {}): {
  segmented: WebUiSegmented
  t1: WebUiSegmentedTrigger
  t2: WebUiSegmentedTrigger
  t3: WebUiSegmentedTrigger
} {
  const segmented = document.createElement('web-ui-segmented') as WebUiSegmented
  segmented.value = 'daily'

  const t1 = document.createElement('web-ui-segmented-trigger') as WebUiSegmentedTrigger
  t1.value = 'daily'
  t1.textContent = 'Daily'

  const t2 = document.createElement('web-ui-segmented-trigger') as WebUiSegmentedTrigger
  t2.value = 'weekly'
  t2.textContent = 'Weekly'
  if (options.disabledSecond) t2.disabled = true

  const t3 = document.createElement('web-ui-segmented-trigger') as WebUiSegmentedTrigger
  t3.value = 'monthly'
  t3.textContent = 'Monthly'

  segmented.append(t1, t2, t3)
  document.body.appendChild(segmented)
  return { segmented, t1, t2, t3 }
}

describe('WebUiSegmented 手势拖拽与吸附（浏览器）', () => {
  it('拖拽指示器超过中点松手：吸附至目标选项并触发 input 与 change', async () => {
    const { segmented, t1, t2 } = createSegmented()
    await segmented.updateComplete

    const inputEvents: Event[] = []
    const changeEvents: Event[] = []
    segmented.addEventListener('input', e => inputEvents.push(e))
    segmented.addEventListener('change', e => changeEvents.push(e))

    const t1Rect = t1.getBoundingClientRect()
    const t2Rect = t2.getBoundingClientRect()
    const targetDistance = t2Rect.left - t1Rect.left

    const inner = gestureSurface(segmented)

    // 1. pointerdown 启动
    inner.dispatchEvent(pointer('pointerdown', { clientX: t1Rect.left + 10, clientY: t1Rect.top + 10 }))
    await segmented.updateComplete

    // 2. 拖拽超过中点 (targetDistance * 0.7)
    window.dispatchEvent(
      pointer('pointermove', { clientX: t1Rect.left + 10 + targetDistance * 0.7, clientY: t1Rect.top + 10 })
    )
    await segmented.updateComplete

    // 3. pointerup 松手
    window.dispatchEvent(
      pointer('pointerup', { clientX: t1Rect.left + 10 + targetDistance * 0.7, clientY: t1Rect.top + 10 })
    )
    await segmented.updateComplete

    expect(segmented.value).toBe('weekly')
    expect(inputEvents).toHaveLength(1)
    expect(changeEvents).toHaveLength(1)
  })

  it('拖拽未过中点松手：回弹至原选项，不触发 input/change', async () => {
    const { segmented, t1, t2 } = createSegmented()
    await segmented.updateComplete

    const inputEvents: Event[] = []
    const changeEvents: Event[] = []
    segmented.addEventListener('input', e => inputEvents.push(e))
    segmented.addEventListener('change', e => changeEvents.push(e))

    const t1Rect = t1.getBoundingClientRect()
    const t2Rect = t2.getBoundingClientRect()
    const targetDistance = t2Rect.left - t1Rect.left

    const inner = gestureSurface(segmented)

    inner.dispatchEvent(pointer('pointerdown', { clientX: t1Rect.left + 10, clientY: t1Rect.top + 10 }))
    await segmented.updateComplete

    // 移动距离越过 6px 阈值但未越过中点 (targetDistance * 0.3)。
    // CI 慢环境渲染会跨毫秒，单次合成 move 的速度会被判 flick（>300px/s）
    // 误吸附下一项；用间隔 32ms 的多段 move 模拟真实慢拖。
    const dragDistance = Math.max(8, targetDistance * 0.3)
    const startX = t1Rect.left + 10
    for (let step = 1; step <= 10; step += 1) {
      window.dispatchEvent(
        pointer('pointermove', { clientX: startX + (dragDistance * step) / 10, clientY: t1Rect.top + 10 })
      )
      await new Promise(resolve => setTimeout(resolve, 32))
    }
    await segmented.updateComplete

    window.dispatchEvent(pointer('pointerup', { clientX: startX + dragDistance, clientY: t1Rect.top + 10 }))
    await segmented.updateComplete

    expect(segmented.value).toBe('daily')
    expect(inputEvents).toHaveLength(0)
    expect(changeEvents).toHaveLength(0)
  })

  it('跳过 disabled 选项：自动吸附至最近的可用选项', async () => {
    // t2 (weekly) disabled
    const { segmented, t1, t2 } = createSegmented({ disabledSecond: true })
    await segmented.updateComplete

    const t1Rect = t1.getBoundingClientRect()
    const t2Rect = t2.getBoundingClientRect()
    const inner = gestureSurface(segmented)

    inner.dispatchEvent(pointer('pointerdown', { clientX: t1Rect.left + 10, clientY: t1Rect.top + 10 }))
    await segmented.updateComplete

    // 拖到 t2 (weekly) 所在区域
    const t2Center = t2Rect.left + t2Rect.width / 2
    window.dispatchEvent(pointer('pointermove', { clientX: t2Center, clientY: t1Rect.top + 10 }))
    await segmented.updateComplete

    window.dispatchEvent(pointer('pointerup', { clientX: t2Center, clientY: t1Rect.top + 10 }))
    await segmented.updateComplete

    // 因为 t2 disabled，所以吸附到可用的 t1 或 t3；因为 t2 更接近谁就吸附到谁（t1 或 t3），但绝不会是 t2
    expect(segmented.value).not.toBe('weekly')
    expect(['daily', 'monthly']).toContain(segmented.value)
  })

  it('轻点（Tap）触发器正常切换选项且触发事件', async () => {
    const { segmented, t2 } = createSegmented()
    await segmented.updateComplete

    const inputEvents: Event[] = []
    const changeEvents: Event[] = []
    segmented.addEventListener('input', e => inputEvents.push(e))
    segmented.addEventListener('change', e => changeEvents.push(e))

    // 真实轻点序列：pointerdown -> pointerup (未移动) -> click
    const inner = optionSurface(t2)

    const t2Rect = t2.getBoundingClientRect()
    inner.dispatchEvent(pointer('pointerdown', { clientX: t2Rect.left + 10, clientY: t2Rect.top + 10, composed: true }))
    inner.dispatchEvent(pointer('pointerup', { clientX: t2Rect.left + 10, clientY: t2Rect.top + 10, composed: true }))
    inner.click()
    await segmented.updateComplete

    expect(segmented.value).toBe('weekly')
    expect(inputEvents).toHaveLength(1)
    expect(changeEvents).toHaveLength(1)
  })

  it('从非激活项起始的指针序列不切换选项，也不触发事件', async () => {
    const { segmented, t2 } = createSegmented()
    await segmented.updateComplete

    const inputEvents: Event[] = []
    const changeEvents: Event[] = []
    segmented.addEventListener('input', e => inputEvents.push(e))
    segmented.addEventListener('change', e => changeEvents.push(e))

    const inner = gestureSurface(segmented)
    const t2Rect = t2.getBoundingClientRect()

    // 按下未激活的 t2（drag 只能从当前激活项起始）
    inner.dispatchEvent(pointer('pointerdown', { clientX: t2Rect.left + 10, clientY: t2Rect.top + 10 }))
    await segmented.updateComplete

    window.dispatchEvent(pointer('pointermove', { clientX: t2Rect.left + 30, clientY: t2Rect.top + 10 }))
    await segmented.updateComplete

    window.dispatchEvent(pointer('pointerup', { clientX: t2Rect.left + 30, clientY: t2Rect.top + 10 }))
    await segmented.updateComplete

    expect(segmented.value, '非激活项起始的拖拽不应改变选中值').toBe('daily')
    expect(inputEvents).toHaveLength(0)
    expect(changeEvents).toHaveLength(0)
  })

  it('flick 抛掷快速手势切换至下一选项', async () => {
    const { segmented, t1 } = createSegmented()
    await segmented.updateComplete

    const t1Rect = t1.getBoundingClientRect()
    const inner = gestureSurface(segmented)

    inner.dispatchEvent(pointer('pointerdown', { clientX: t1Rect.left + 10, clientY: t1Rect.top + 10 }))
    await segmented.updateComplete

    window.dispatchEvent(pointer('pointermove', { clientX: t1Rect.left + 20, clientY: t1Rect.top + 10 }))
    await new Promise(r => setTimeout(r, 16))
    window.dispatchEvent(pointer('pointerup', { clientX: t1Rect.left + 35, clientY: t1Rect.top + 10 }))
    await segmented.updateComplete

    expect(segmented.value).toBe('weekly')
  })

  it('首帧把 indicator 直接定位到选中项，不产生 0→选中 的 left/width 过渡', async () => {
    const { segmented } = createSegmented()
    await segmented.updateComplete

    // 等首帧定位 rAF（_updateIndicator 在其中提交位置并开启 transition）执行完。
    // 若实现有 bug，transition 会在首帧从 CSS 回退的 0 滑到选中项（160ms），
    // 此刻仍在播放，getAnimations 应能捕获到 left/width。
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
    await segmented.updateComplete

    // 指示器无公开 role，只能按类名定位；本用例整体主题是动效，观察面用 Web Animations API
    // （非 CSS 取值）。属判据 §8 的动效例外，最终裁定归 b6。
    const indicator = queryA11y(segmented, '.wui-segmented-indicator') as HTMLElement | null
    expect(indicator, '指示器应已渲染').not.toBeNull()

    // 首帧无交互，indicator 不应有任何过渡在播放（尤其不应有从 0 滑入的 left/width）
    expect(indicator!.getAnimations()).toHaveLength(0)
  })

  it('trigger 的 shadow 内容命中时，touchmove 由 composedPath 守护阻止，松手后解除', async () => {
    const { segmented, t1 } = createSegmented()
    await segmented.updateComplete
    await t1.updateComplete

    const t1Surface = optionSurface(t1)
    const t1Rect = t1.getBoundingClientRect()
    const x = t1Rect.left + 10
    const y = t1Rect.top + t1Rect.height / 2

    // pointerdown 从 trigger 的 shadow 内容派发（真实触摸落点），沿 composed 路径冒泡到手势元素。
    t1Surface.dispatchEvent(pointer('pointerdown', { clientX: x, clientY: y, composed: true }))
    await segmented.updateComplete

    // 非 composed touchmove（不跨 shadow 边界）在 trigger tree 内被 composedPath 挂载的守护阻止。
    const onInner = new TouchEvent('touchmove', { bubbles: true, cancelable: true })
    t1Surface.dispatchEvent(onInner)
    expect(onInner.defaultPrevented).toBe(true)

    // 确认拖拽后守护持续有效。
    window.dispatchEvent(pointer('pointermove', { clientX: x + 30, clientY: y }))
    await segmented.updateComplete
    const onInnerAfterCommit = new TouchEvent('touchmove', { bubbles: true, cancelable: true })
    t1Surface.dispatchEvent(onInnerAfterCommit)
    expect(onInnerAfterCommit.defaultPrevented).toBe(true)

    // document/window 收不到 shadow 内 touchmove：不挂死代码。
    const onWindow = new TouchEvent('touchmove', { bubbles: true, cancelable: true })
    window.dispatchEvent(onWindow)
    expect(onWindow.defaultPrevented).toBe(false)

    // 松手后守护全部卸载。
    window.dispatchEvent(pointer('pointerup', { clientX: x + 30, clientY: y }))
    await segmented.updateComplete
    const onInnerAfter = new TouchEvent('touchmove', { bubbles: true, cancelable: true })
    t1Surface.dispatchEvent(onInnerAfter)
    expect(onInnerAfter.defaultPrevented).toBe(false)
  })
})
