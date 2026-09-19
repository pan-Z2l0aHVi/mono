import { describe, expect, it, vi } from 'vite-plus/test'

import { attachDragGesture } from '../drag-gesture'
import { clamp, dampOverscroll, normalizeProgress, snapToNearest, springOffsets, SPRING_PRESETS } from '../physics'
import { attachPinchGesture } from '../pinch-gesture'

describe('shared/gesture physics', () => {
  it('clamp 正确限制在 [min, max] 范围内', () => {
    expect(clamp(150, 100, 200)).toBe(150)
    expect(clamp(50, 100, 200)).toBe(100)
    expect(clamp(250, 100, 200)).toBe(200)
  })

  it('snapToNearest 正确返回距离目标值最近的下标', () => {
    expect(snapToNearest(10, [])).toBe(-1)
    expect(snapToNearest(10, [0, 20, 50])).toBe(0) // 10 与 0 距离 10，与 20 距离 10，取第一个
    expect(snapToNearest(15, [0, 20, 50])).toBe(1)
    expect(snapToNearest(45, [0, 20, 50])).toBe(2)
    expect(snapToNearest(-10, [0, 20, 50])).toBe(0)
  })

  it('normalizeProgress 正确将数值映射为 0~1 之间的比例', () => {
    expect(normalizeProgress(50, 0, 100)).toBe(0.5)
    expect(normalizeProgress(0, 0, 100)).toBe(0)
    expect(normalizeProgress(100, 0, 100)).toBe(1)
    expect(normalizeProgress(-10, 0, 100)).toBe(0)
    expect(normalizeProgress(150, 0, 100)).toBe(1)
    expect(normalizeProgress(50, 100, 100)).toBe(0) // min === max 兜底
  })

  it('dampOverscroll 允许方向原样通过，反向按平方根压缩', () => {
    expect(dampOverscroll(50)).toBe(50)
    expect(dampOverscroll(0)).toBe(0)
    // 反向：sign(d) * |d| ** 0.5 —— 压缩比随位移增大而下降，因此天然自限幅，
    // 400px 的过冲只剩 20px，不需要额外的位移上限。
    expect(dampOverscroll(-100)).toBe(-10)
    expect(dampOverscroll(-400)).toBe(-20)
  })

  it('springOffsets 生成单调趋向目标的平滑轨迹采样', () => {
    const samples = springOffsets(100, 0, 0, SPRING_PRESETS.rebound)
    expect(samples.length).toBeGreaterThan(2)
    expect(samples[0]).toBe(100)
    expect(samples[samples.length - 1]).toBe(0)
  })
})

describe('shared/gesture attachDragGesture', () => {
  it('基本生命周期：pointerdown -> move -> up 正常派发并计算 delta', () => {
    const el = document.createElement('div')
    document.body.append(el)

    const onStart = vi.fn<() => void>()
    const onMove = vi.fn<(info: { deltaX: number }) => void>()
    const onEnd = vi.fn<(info: { deltaX: number }) => void>()

    const handle = attachDragGesture(el, {
      axis: 'x',
      onStart,
      onMove,
      onEnd
    })

    el.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: 100, clientY: 200, isPrimary: true }))
    expect(onStart).toHaveBeenCalledTimes(1)
    expect(handle.isDragging()).toBe(true)

    window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientX: 150, clientY: 200, isPrimary: true }))
    expect(onMove).toHaveBeenCalledTimes(1)
    expect(onMove.mock.calls[0][0].deltaX).toBe(50)

    window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, clientX: 150, clientY: 200, isPrimary: true }))
    expect(onEnd).toHaveBeenCalledTimes(1)
    expect(onEnd.mock.calls[0][0].deltaX).toBe(50)
    expect(handle.isDragging()).toBe(false)

    handle.destroy()
    el.remove()
  })

  it('onEnd 上报整段手势时长：区别于只描述最后一小段的滑动窗口速度', async () => {
    const el = document.createElement('div')
    document.body.append(el)

    const onEnd = vi.fn<(info: { deltaX: number; velocityX: number; duration: number }) => void>()
    const handle = attachDragGesture(el, { axis: 'x', onEnd })

    el.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: 100, clientY: 0, isPrimary: true }))
    await new Promise(resolve => setTimeout(resolve, 150))
    // 先反向拖出，再一次性快速扫回：滑动窗口只反映这段回扫，时长覆盖整段手势。
    window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientX: 60, clientY: 0, isPrimary: true }))
    await new Promise(resolve => setTimeout(resolve, 30))
    window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientX: 200, clientY: 0, isPrimary: true }))
    window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, clientX: 200, clientY: 0, isPrimary: true }))

    expect(onEnd).toHaveBeenCalledTimes(1)
    const info = onEnd.mock.calls[0][0]
    // 时长覆盖 pointerdown → pointerup 全程，可用于「整段手势的平均速度」。
    expect(info.duration).toBeGreaterThanOrEqual(150)
    // 同一时刻的滑窗速度很高，但它只描述最后 30ms 的回扫这一小段。
    expect(info.velocityX).toBeGreaterThan(1000)

    handle.destroy()
    el.remove()
  })

  it('有意图死区时 duration 从越阈那一刻起算，不含此前的悬停', async () => {
    const el = document.createElement('div')
    document.body.append(el)

    const onEnd = vi.fn<(info: { duration: number }) => void>()
    const handle = attachDragGesture(el, { axis: 'x', threshold: 10, onEnd })

    el.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: 100, clientY: 0, isPrimary: true }))
    // 死区内的悬停：不属于拖拽轨迹，不应计入 duration。
    await new Promise(resolve => setTimeout(resolve, 300))
    window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientX: 120, clientY: 0, isPrimary: true }))
    await new Promise(resolve => setTimeout(resolve, 40))
    window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, clientX: 120, clientY: 0, isPrimary: true }))

    expect(onEnd).toHaveBeenCalledTimes(1)
    // 时长只覆盖「越阈 → 松手」的 40ms 段，不含死区内的 300ms 悬停。
    expect(onEnd.mock.calls[0][0].duration).toBeLessThan(250)

    handle.destroy()
    el.remove()
  })

  it('calibrateOnFirstMove：首个 move 重置零点与时钟，按下到首个 move 之间的位移被吸收', async () => {
    const el = document.createElement('div')
    document.body.append(el)

    const deltas: number[] = []
    const onEnd = vi.fn<(info: { deltaX: number; duration: number }) => void>()
    const handle = attachDragGesture(el, {
      axis: 'x',
      calibrateOnFirstMove: true,
      onMove: info => deltas.push(info.deltaX),
      onEnd
    })

    el.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: 100, clientY: 0, isPrimary: true }))
    // 按下 → 首个 move 之间已偏移 60px：校准把它吸收，
    // 首个 move 的 delta 因此为 0，元素不会在首个 move 一次性跳出这 60px。
    window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientX: 160, clientY: 0, isPrimary: true }))
    window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientX: 220, clientY: 0, isPrimary: true }))
    expect(deltas).toEqual([0, 60])

    // 判定时钟同样自校准点起算：不含「按下 → 首个 move」的耗时。
    await new Promise(resolve => setTimeout(resolve, 30))
    window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, clientX: 220, clientY: 0, isPrimary: true }))

    expect(onEnd).toHaveBeenCalledTimes(1)
    const end = onEnd.mock.calls[0][0]
    // 220 - 160（校准点）= 60；按下点的 100 不参与。
    expect(end.deltaX).toBe(60)
    expect(end.duration).toBeGreaterThanOrEqual(30)
    expect(end.duration).toBeLessThan(300)

    handle.destroy()
    el.remove()
  })

  it('默认不校准：位移仍自 pointerdown 起算', () => {
    const el = document.createElement('div')
    document.body.append(el)

    const deltas: number[] = []
    const handle = attachDragGesture(el, { axis: 'x', onMove: info => deltas.push(info.deltaX) })

    el.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: 100, clientY: 0, isPrimary: true }))
    window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientX: 160, clientY: 0, isPrimary: true }))
    window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientX: 220, clientY: 0, isPrimary: true }))

    expect(deltas).toEqual([60, 120])

    handle.destroy()
    el.remove()
  })

  it('threshold 意图死区：移动距离不足 threshold 时不触发 onMove', () => {
    const el = document.createElement('div')
    document.body.append(el)

    const onMove = vi.fn<(info: { deltaX: number }) => void>()
    const onEnd = vi.fn<() => void>()
    const onTap = vi.fn<() => void>()
    const onCancel = vi.fn<() => void>()

    const handle = attachDragGesture(el, {
      axis: 'x',
      threshold: 10,
      onMove,
      onEnd,
      onTap,
      onCancel
    })

    el.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: 100, clientY: 100, isPrimary: true }))
    window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientX: 105, clientY: 100, isPrimary: true }))
    expect(onMove).not.toHaveBeenCalled()

    // 释放时未越过 threshold 触发 onCancel 而非 onEnd
    window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, clientX: 105, clientY: 100, isPrimary: true }))
    expect(onEnd).not.toHaveBeenCalled()
    expect(onTap).toHaveBeenCalledTimes(1)
    expect(onCancel).toHaveBeenCalledTimes(1)

    handle.destroy()
    el.remove()
  })

  it('触摸守护：按下即在命中链各层阻止 touchmove，window 不挂死代码', () => {
    const el = document.createElement('div')
    const child = document.createElement('div')
    el.append(child)
    document.body.append(el)

    const handle = attachDragGesture(el, { axis: 'x', threshold: 6 })

    el.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: 100, clientY: 100, isPrimary: true }))

    // 未越过 threshold 前：触摸落在目标元素的子元素（模拟 thumb 命中）时，命中链上的
    // capture 级非被动 touchmove 监听也要阻止默认滚动。
    const onChild = new Event('touchmove', { bubbles: true, cancelable: true })
    child.dispatchEvent(onChild)
    expect(onChild.defaultPrevented).toBe(true)

    const onEl = new Event('touchmove', { bubbles: true, cancelable: true })
    el.dispatchEvent(onEl)
    expect(onEl.defaultPrevented).toBe(true)

    // document/window 收不到 shadow 内 touchmove，挂上只是死代码：不挂。
    const onWindow = new Event('touchmove', { bubbles: true, cancelable: true })
    window.dispatchEvent(onWindow)
    expect(onWindow.defaultPrevented).toBe(false)

    handle.destroy()
    el.remove()
  })

  it('触摸守护：pointerup 后守护全部卸载', () => {
    const el = document.createElement('div')
    document.body.append(el)

    const handle = attachDragGesture(el, { axis: 'x', threshold: 6 })

    el.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: 100, clientY: 100, isPrimary: true }))
    window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientX: 110, clientY: 100, isPrimary: true }))

    // 确认拖拽后命中链上仍被阻止
    const onEl = new Event('touchmove', { bubbles: true, cancelable: true })
    el.dispatchEvent(onEl)
    expect(onEl.defaultPrevented).toBe(true)

    window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, clientX: 110, clientY: 100, isPrimary: true }))

    const onTargetAfter = new Event('touchmove', { bubbles: true, cancelable: true })
    el.dispatchEvent(onTargetAfter)
    expect(onTargetAfter.defaultPrevented).toBe(false)

    handle.destroy()
    el.remove()
  })

  it('触摸守护：pointercancel 打断后守护同样卸载', () => {
    const el = document.createElement('div')
    document.body.append(el)

    const handle = attachDragGesture(el, { axis: 'x', threshold: 6 })

    el.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: 100, clientY: 100, isPrimary: true }))
    window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientX: 110, clientY: 100, isPrimary: true }))
    window.dispatchEvent(
      new PointerEvent('pointercancel', { pointerId: 1, clientX: 110, clientY: 100, isPrimary: true })
    )

    const onEl = new Event('touchmove', { bubbles: true, cancelable: true })
    el.dispatchEvent(onEl)
    expect(onEl.defaultPrevented).toBe(false)

    handle.destroy()
    el.remove()
  })

  it('触摸守护：无意图死区（threshold 0）时按下即挂载', () => {
    const el = document.createElement('div')
    document.body.append(el)

    const handle = attachDragGesture(el, { axis: 'x' })

    el.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: 100, clientY: 100, isPrimary: true }))

    const onEl = new Event('touchmove', { bubbles: true, cancelable: true })
    el.dispatchEvent(onEl)
    expect(onEl.defaultPrevented).toBe(true)

    window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, clientX: 100, clientY: 100, isPrimary: true }))
    const onElAfter = new Event('touchmove', { bubbles: true, cancelable: true })
    el.dispatchEvent(onElAfter)
    expect(onElAfter.defaultPrevented).toBe(false)

    handle.destroy()
    el.remove()
  })

  it('触摸守护：touchmove 目标在嵌套 shadow root 内时，composedPath 各层可拦截非 composed 事件', () => {
    // 结构模拟 web-ui-segmented > (shadow) > web-ui-segmented-trigger > (shadow) > 内容
    const host = document.createElement('div')
    document.body.append(host)
    const hostShadow = host.attachShadow({ mode: 'open' })
    const triggerHost = document.createElement('div')
    hostShadow.append(triggerHost)
    const triggerShadow = triggerHost.attachShadow({ mode: 'open' })
    const inner = document.createElement('div')
    triggerShadow.append(inner)

    const handle = attachDragGesture(host, { axis: 'x', threshold: 6 })

    // 真实 pointerdown 沿 composed 路径冒泡到手势元素；touch 落点在 trigger 的 shadow 内容上。
    let path: EventTarget[] = []
    host.addEventListener('pointerdown', e => {
      path = e.composedPath()
    })
    const down = new PointerEvent('pointerdown', {
      bubbles: true,
      composed: true,
      pointerId: 1,
      clientX: 100,
      clientY: 100,
      isPrimary: true
    })
    inner.dispatchEvent(down)
    expect(path).toContain(host)
    expect(path).toContain(triggerHost)
    expect(path).toContain(inner)

    // 非 composed touchmove 只在落点 shadow tree 内传播（不到 host）；composedPath 挂载
    // 保证路径上必有守护节点 → preventDefault 生效。
    const onInner = new Event('touchmove', { bubbles: true, cancelable: true, composed: false })
    inner.dispatchEvent(onInner)
    expect(onInner.defaultPrevented).toBe(true)

    const onTriggerHost = new Event('touchmove', { bubbles: true, cancelable: true, composed: false })
    triggerHost.dispatchEvent(onTriggerHost)
    expect(onTriggerHost.defaultPrevented).toBe(true)

    // composed touchmove（若浏览器实现为可组合）同样被命中链上的守护拦截。
    const onInnerComposed = new Event('touchmove', { bubbles: true, cancelable: true, composed: true })
    inner.dispatchEvent(onInnerComposed)
    expect(onInnerComposed.defaultPrevented).toBe(true)

    // 松手后全部卸载：同一落点的 touchmove 不再被阻止。
    window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, clientX: 100, clientY: 100, isPrimary: true }))
    const onInnerAfter = new Event('touchmove', { bubbles: true, cancelable: true, composed: false })
    inner.dispatchEvent(onInnerAfter)
    expect(onInnerAfter.defaultPrevented).toBe(false)

    handle.destroy()
    host.remove()
  })

  it('捕获转手：pointerdown 目标被 setPointerCapture 抢走后 lostpointercapture 不取消拖拽', () => {
    const el = document.createElement('div')
    const child = document.createElement('div')
    el.append(child)
    document.body.append(el)

    const onMove = vi.fn<(info: { deltaX: number }) => void>()
    const onEnd = vi.fn<() => void>()
    const onCancel = vi.fn<() => void>()
    const handle = attachDragGesture(el, { axis: 'x', threshold: 0, onMove, onEnd, onCancel })

    // 触摸落在子元素（命中元素 A = child），threshold=0 使组件立即 setPointerCapture(el)。
    child.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, clientX: 100, clientY: 100, isPrimary: true })
    )
    expect(handle.isDragging()).toBe(true)

    // 浏览器把捕获从命中元素转手到手势元素：命中元素先收到 lostpointercapture——必须忽略。
    child.dispatchEvent(new PointerEvent('lostpointercapture', { bubbles: true, pointerId: 1 }))

    expect(handle.isDragging()).toBe(true)
    expect(onCancel).not.toHaveBeenCalled()

    // onMove 持续跟手。
    window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientX: 150, clientY: 100 }))
    expect(onMove).toHaveBeenCalledTimes(1)
    expect(onMove.mock.calls[0][0].deltaX).toBe(50)

    window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, clientX: 150, clientY: 100 }))
    expect(onEnd).toHaveBeenCalledTimes(1)
    expect(onCancel).not.toHaveBeenCalled()

    handle.destroy()
    el.remove()
  })

  it('捕获丢失：手势元素自身意外 lostpointercapture 才取消拖拽', () => {
    const el = document.createElement('div')
    document.body.append(el)

    const onCancel = vi.fn<() => void>()
    const handle = attachDragGesture(el, { axis: 'x', threshold: 0, onCancel })

    el.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, clientX: 100, clientY: 100, isPrimary: true })
    )
    expect(handle.isDragging()).toBe(true)

    el.dispatchEvent(new PointerEvent('lostpointercapture', { bubbles: true, pointerId: 1 }))
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(handle.isDragging()).toBe(false)

    handle.destroy()
    el.remove()
  })

  it('捕获转手：pointerup 后释放捕获产生的 lostpointercapture 不误伤', () => {
    const el = document.createElement('div')
    document.body.append(el)

    const onCancel = vi.fn<() => void>()
    const handle = attachDragGesture(el, { axis: 'x', threshold: 0, onCancel })

    el.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, clientX: 100, clientY: 100, isPrimary: true })
    )
    window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, clientX: 100, clientY: 100, isPrimary: true }))

    // resetState 里 releasePointerCapture 触发的 lostpointercapture 在 activePointerId
    // 置空后异步到达：pointerId 守卫直接忽略，不触发二次取消。
    el.dispatchEvent(new PointerEvent('lostpointercapture', { bubbles: true, pointerId: 1 }))
    expect(onCancel).not.toHaveBeenCalled()
    expect(handle.isDragging()).toBe(false)

    handle.destroy()
    el.remove()
  })
})

describe('shared/gesture attachPinchGesture', () => {
  function pointer(type: string, init: PointerEventInit): PointerEvent {
    return new PointerEvent(type, { bubbles: true, cancelable: true, pointerType: 'touch', ...init })
  }

  it('基本生命周期：两指就位后按距离比例产出 ratio 与中点位移', () => {
    const el = document.createElement('div')
    document.body.append(el)

    const onStart = vi.fn<(info: { distance: number }) => void>()
    const onMove = vi.fn<(info: { ratio: number; deltaX: number }) => void>()
    const onEnd = vi.fn<() => void>()

    const handle = attachPinchGesture(el, { onStart, onMove, onEnd })

    el.dispatchEvent(pointer('pointerdown', { pointerId: 1, clientX: 100, clientY: 100 }))
    expect(handle.isPinching()).toBe(false)

    el.dispatchEvent(pointer('pointerdown', { pointerId: 2, clientX: 200, clientY: 100 }))
    expect(handle.isPinching()).toBe(true)
    expect(onStart).toHaveBeenCalledTimes(1)
    expect(onStart.mock.calls[0][0].distance).toBe(100)

    // 距离翻倍，中点同时右移 50px；每个被追踪指针的移动各产出一次几何。
    window.dispatchEvent(pointer('pointermove', { pointerId: 1, clientX: 100, clientY: 100 }))
    window.dispatchEvent(pointer('pointermove', { pointerId: 2, clientX: 300, clientY: 100 }))
    expect(onMove).toHaveBeenCalledTimes(2)
    expect(onMove.mock.calls[1][0].ratio).toBe(2)
    expect(onMove.mock.calls[1][0].deltaX).toBe(50)

    // 少于两指就位即结束（剩下一指不再能维持捏合）。
    window.dispatchEvent(pointer('pointerup', { pointerId: 1, clientX: 100, clientY: 100 }))
    expect(onEnd).toHaveBeenCalledTimes(1)
    expect(handle.isPinching()).toBe(false)

    window.dispatchEvent(pointer('pointerup', { pointerId: 2, clientX: 300, clientY: 100 }))
    expect(onEnd).toHaveBeenCalledTimes(1)

    handle.destroy()
    el.remove()
  })

  it('起始距离过近时不产出比例，等两指拉开后以新基准重新开始', () => {
    const el = document.createElement('div')
    document.body.append(el)

    const onStart = vi.fn<(info: { distance: number }) => void>()
    const onMove = vi.fn<(info: { ratio: number }) => void>()
    const handle = attachPinchGesture(el, { onStart, onMove })

    el.dispatchEvent(pointer('pointerdown', { pointerId: 1, clientX: 100, clientY: 100 }))
    el.dispatchEvent(pointer('pointerdown', { pointerId: 2, clientX: 110, clientY: 100 }))
    expect(onStart).not.toHaveBeenCalled()

    window.dispatchEvent(pointer('pointermove', { pointerId: 2, clientX: 130, clientY: 100 }))
    expect(onStart).toHaveBeenCalledTimes(1)
    expect(onStart.mock.calls[0][0].distance).toBe(30)
    expect(onMove).not.toHaveBeenCalled()

    window.dispatchEvent(pointer('pointermove', { pointerId: 2, clientX: 160, clientY: 100 }))
    expect(onMove).toHaveBeenCalledTimes(1)
    expect(onMove.mock.calls[0][0].ratio).toBe(2)

    handle.destroy()
    el.remove()
  })

  it('第三个指针不参与捏合，抬回两指后重建基准', () => {
    const el = document.createElement('div')
    document.body.append(el)

    const onStart = vi.fn<(info: { distance: number }) => void>()
    const onMove = vi.fn<(info: { ratio: number }) => void>()
    const handle = attachPinchGesture(el, { onStart, onMove })

    el.dispatchEvent(pointer('pointerdown', { pointerId: 1, clientX: 100, clientY: 100 }))
    el.dispatchEvent(pointer('pointerdown', { pointerId: 2, clientX: 200, clientY: 100 }))
    expect(onStart).toHaveBeenCalledTimes(1)

    // 第三指就位后不再产出几何，也不产生比例。
    el.dispatchEvent(pointer('pointerdown', { pointerId: 3, clientX: 300, clientY: 100 }))
    window.dispatchEvent(pointer('pointermove', { pointerId: 2, clientX: 250, clientY: 100 }))
    expect(onMove).not.toHaveBeenCalled()

    window.dispatchEvent(pointer('pointerup', { pointerId: 3, clientX: 300, clientY: 100 }))
    expect(onStart).toHaveBeenCalledTimes(2)
    expect(onStart.mock.calls[1][0].distance).toBe(150)

    window.dispatchEvent(pointer('pointermove', { pointerId: 2, clientX: 400, clientY: 100 }))
    expect(onMove).toHaveBeenCalledTimes(1)
    expect(onMove.mock.calls[0][0].ratio).toBe(2)

    handle.destroy()
    el.remove()
  })

  it('destroy 打断进行中的手势并触发 onCancel', () => {
    const el = document.createElement('div')
    document.body.append(el)

    const onCancel = vi.fn<() => void>()
    const handle = attachPinchGesture(el, { onCancel })

    el.dispatchEvent(pointer('pointerdown', { pointerId: 1, clientX: 100, clientY: 100 }))
    el.dispatchEvent(pointer('pointerdown', { pointerId: 2, clientX: 200, clientY: 100 }))
    expect(handle.isPinching()).toBe(true)

    handle.destroy()
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(handle.isPinching()).toBe(false)

    el.remove()
  })
})
