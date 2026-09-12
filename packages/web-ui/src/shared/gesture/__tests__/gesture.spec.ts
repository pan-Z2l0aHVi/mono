import { describe, expect, it, vi } from 'vite-plus/test'

import { attachDragGesture } from '../drag-gesture'
import { clamp, normalizeProgress, rubberband, snapToNearest, springOffsets, SPRING_PRESETS } from '../physics'
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

  it('rubberband 正向位移保持原值，负向拉伸施加阻尼并受最大距离限制', () => {
    expect(rubberband(50, 100)).toBe(50)
    expect(rubberband(0, 100)).toBe(0)
    // 负向拉伸：-100 * 0.15 = -15
    expect(rubberband(-100, 100, 0.15)).toBe(-15)
    // 超过最大拉伸距离：clamp 到 -maxDistance
    expect(rubberband(-1000, 50, 0.15)).toBe(-50)
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

  it('threshold 意图死区：移动距离不足 threshold 时不触发 onMove', () => {
    const el = document.createElement('div')
    document.body.append(el)

    const onMove = vi.fn<() => void>()
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
    // 小位移 (5px < 10px) 不触发 onMove
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
