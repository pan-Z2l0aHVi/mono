import { afterEach, describe, expect, it, vi } from 'vite-plus/test'

import { fadeShadow, pointerOffset, renderTilt, resetTilt, shadowLayer, tiltEnabled } from '../quick-link'

const GLASS_SHADOW_PROPERTY = '--wui-internal-glass-shadow'

/** 只替身倾斜数学真正写到的 inline style；断言的是写进去的几何值。 */
function fakeVisual() {
  const properties = new Map<string, string>()
  const style = {
    transform: '',
    transitionDuration: '',
    setProperty(name: string, value: string) {
      properties.set(name, value)
    },
    getPropertyValue(name: string) {
      return properties.get(name) ?? ''
    },
    removeProperty(name: string) {
      properties.delete(name)
    }
  }
  return { element: { style } as unknown as HTMLElement, style, properties }
}

function stubMatchMedia(hover: boolean, reduced: boolean) {
  vi.stubGlobal('window', {
    matchMedia: (query: string) => ({ matches: query.startsWith('(hover') ? hover : reduced })
  })
}

describe('倾斜启用条件', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('精确指针且未要求减少动效时启用', () => {
    stubMatchMedia(true, false)
    expect(tiltEnabled()).toBe(true)
    expect(tiltEnabled(false)).toBe(true)
  })

  it('「减少动态效果」偏好下保持静态', () => {
    stubMatchMedia(true, true)
    expect(tiltEnabled()).toBe(false)
  })

  it('主题动效设置优先于系统偏好', () => {
    stubMatchMedia(true, false)
    expect(tiltEnabled(false, true)).toBe(false)
    stubMatchMedia(true, true)
    expect(tiltEnabled(false, false)).toBe(true)
  })

  it('触屏等非精确指针下保持静态', () => {
    stubMatchMedia(false, false)
    expect(tiltEnabled()).toBe(false)
  })

  it('disabled 时不读媒体查询，直接关闭', () => {
    stubMatchMedia(true, false)
    expect(tiltEnabled(true)).toBe(false)
  })
})

describe('倾斜几何', () => {
  it('倾斜角度按 ±0.5 的指针位置映射到 ±TILT_MAX_DEGREES * 2', () => {
    const visual = fakeVisual()
    renderTilt(visual.element, 0.5, -0.5, '')
    expect(visual.style.transform).toBe('perspective(800px) rotateX(8.00deg) rotateY(8.00deg)')
  })

  it('指针在正中时回到零角度、零 lift，与未 hover 一致', () => {
    const visual = fakeVisual()
    renderTilt(visual.element, 0, 0, '')
    expect(visual.style.transform).toBe('perspective(800px) rotateX(0.00deg) rotateY(0.00deg)')
    expect(visual.properties.get(GLASS_SHADOW_PROPERTY)).toBe('0.0px 2.0px 12px rgb(0 0 0 / 0.00)')
  })

  it('抬起的边角上附加影最深，同时把主题原始阴影按 lift 调浅', () => {
    const visual = fakeVisual()
    renderTilt(visual.element, 0.5, -0.5, 'rgba(0, 0, 0, 0.4)')
    expect(visual.properties.get(GLASS_SHADOW_PROPERTY)).toBe(
      '-20.0px 22.0px 22px rgb(0 0 0 / 0.07), rgba(0, 0, 0, 0.140)'
    )
  })

  it('主题没有原始阴影时只写附加层', () => {
    const visual = fakeVisual()
    renderTilt(visual.element, 0.5, -0.5, '')
    expect(visual.properties.get(GLASS_SHADOW_PROPERTY)).toBe('-20.0px 22.0px 22px rgb(0 0 0 / 0.07)')
  })

  it('单层阴影按固定小数位拼接', () => {
    expect(shadowLayer(0, 2, 12, 0)).toBe('0.0px 2.0px 12px rgb(0 0 0 / 0.00)')
    expect(shadowLayer(-1.5, 0.444, 12.6, 0.036)).toBe('-1.5px 0.4px 13px rgb(0 0 0 / 0.04)')
  })

  it('指针偏移按卡片尺寸归一化并夹在 ±0.5', () => {
    const bounds = { left: 0, top: 0, width: 100, height: 200 }
    expect(pointerOffset(bounds, 50, 100)).toEqual({ x: 0, y: 0 })
    expect(pointerOffset(bounds, 0, 0)).toEqual({ x: -0.5, y: -0.5 })
    expect(pointerOffset(bounds, 100, 200)).toEqual({ x: 0.5, y: 0.5 })
    expect(pointerOffset(bounds, 75, 50)).toEqual({ x: 0.25, y: -0.25 })
    expect(pointerOffset(bounds, -40, 300)).toEqual({ x: -0.5, y: 0.5 })
  })
})

describe('阴影按比例调浅', () => {
  it('factor 不小于 1 时原样返回', () => {
    expect(fadeShadow('0 0 4px rgba(0, 0, 0, 0.4)', 1)).toBe('0 0 4px rgba(0, 0, 0, 0.4)')
  })

  it('8 位 hex 只缩放 alpha 通道，位宽保持两位', () => {
    expect(fadeShadow('#000000ff', 0.5)).toBe('#00000080')
    expect(fadeShadow('#11223344', 0.5)).toBe('#11223322')
  })

  it('3 位 hex 无法按比例调浅，原样保留', () => {
    expect(fadeShadow('#abc', 0.5)).toBe('#abc')
  })

  it('rgb()/rgba() 两种写法都统一落成 rgba', () => {
    expect(fadeShadow('rgba(0, 0, 0, 0.2)', 0.5)).toBe('rgba(0, 0, 0, 0.100)')
    expect(fadeShadow('0 0 12px rgb(0 0 0 / 0.4), 0 2px 4px rgba(10, 20, 30, 0.6)', 0.5)).toBe(
      '0 0 12px rgba(0, 0, 0, 0.200), 0 2px 4px rgba(10, 20, 30, 0.300)'
    )
  })
})

describe('倾斜复位', () => {
  it('没有写过内联样式时不动过渡', () => {
    const visual = fakeVisual()
    resetTilt(visual.element)
    expect(visual.style.transitionDuration).toBe('')
    expect(visual.style.transform).toBe('')
  })

  it('写过内联样式时清空 transform、阴影并停掉过渡', () => {
    const visual = fakeVisual()
    renderTilt(visual.element, 0.5, -0.5, 'rgba(0, 0, 0, 0.4)')
    resetTilt(visual.element)
    expect(visual.style.transform).toBe('')
    expect(visual.properties.has(GLASS_SHADOW_PROPERTY)).toBe(false)
    expect(visual.style.transitionDuration).toBe('0s')
  })
})
