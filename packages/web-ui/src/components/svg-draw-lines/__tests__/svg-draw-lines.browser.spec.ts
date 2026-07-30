import { afterEach, describe, expect, it, vi } from 'vite-plus/test'

import '..'
import type { WebUiTheme } from '@/components/theme'
import '@/components/theme'

import type { WebUiSvgDrawLines } from '..'

function createEl(): WebUiSvgDrawLines {
  const el = document.createElement('web-ui-svg-draw-lines') as WebUiSvgDrawLines
  document.body.appendChild(el)
  return el
}

afterEach(() => document.body.replaceChildren())

describe('WebUiSvgDrawLines browser', () => {
  it('直接 light DOM SVG 完成后恢复原始内联样式', async () => {
    const el = createEl()
    el.duration = 50
    el.innerHTML = '<svg><path d="M0 0 L100 100" style="stroke-dasharray: 4; stroke-dashoffset: 2"/></svg>'
    await el.updateComplete
    const path = el.querySelector('path')!

    await el.replay()

    expect(path.style.strokeDasharray).toBe('4')
    expect(path.style.strokeDashoffset).toBe('2')
    el.remove()
  })

  it('多个同级 SVG 并行动画', async () => {
    const el = createEl()
    el.duration = 50
    el.innerHTML = `
      <svg><path d="M0 0 L50 50"/></svg>
      <svg><rect x="0" y="0" width="20" height="20"/></svg>
    `
    await el.updateComplete

    await el.replay()

    const paths = el.querySelectorAll('path')
    const rects = el.querySelectorAll('rect')
    expect(paths.length).toBe(1)
    expect(rects.length).toBe(1)
    expect(paths[0].style.strokeDasharray).toBe('')
    expect(rects[0].style.strokeDasharray).toBe('')
    el.remove()
  })

  it('深层嵌套 SVG 内的几何元素被收集并动画', async () => {
    const el = createEl()
    el.duration = 50
    // <g> 层级嵌套，path 在多级 <g> 内部
    el.innerHTML = `
      <svg viewBox="0 0 100 100">
        <g>
          <g>
            <path d="M10 10 L90 90" />
            <circle cx="50" cy="50" r="30" />
          </g>
        </g>
      </svg>
    `
    await el.updateComplete

    await el.replay()

    const path = el.querySelector('path')!
    const circle = el.querySelector('circle')!
    expect(path.style.strokeDasharray).toBe('')
    expect(circle.style.strokeDasharray).toBe('')
    el.remove()
  })

  it('重播中断旧动画并重新开始', async () => {
    const el = createEl()
    el.duration = 500 // 足够长的 duration 确保不会在连续调用前自动完成
    el.innerHTML = '<svg><path d="M0 0 L100 100"/></svg>'
    await el.updateComplete

    // 第一次开始
    const first = el.replay()
    // 立即中断并重播
    const second = el.replay()

    await second
    expect(el.querySelector('path')!.style.strokeDasharray).toBe('')
    el.remove()
  })

  it('无内容时 replay 立即 resolve', async () => {
    const el = createEl()
    await expect(el.replay()).resolves.toBeUndefined()
    el.remove()
  })

  it('空 SVG 无几何元素时 replay 不报错', async () => {
    const el = createEl()
    el.innerHTML = '<svg></svg>'
    await el.updateComplete
    await expect(el.replay()).resolves.toBeUndefined()
    el.remove()
  })

  it('最近的嵌套 theme motion 决定是否播放', async () => {
    const outer = document.createElement('web-ui-theme') as WebUiTheme
    outer.appearance = 'light'
    outer.motion = 'reduced'
    const inner = document.createElement('web-ui-theme') as WebUiTheme
    inner.appearance = 'dark'
    inner.motion = 'full'
    const el = document.createElement('web-ui-svg-draw-lines') as WebUiSvgDrawLines
    el.duration = 20
    el.innerHTML = '<svg><path d="M0 0 L100 100" /></svg>'

    inner.appendChild(el)
    outer.appendChild(inner)
    document.body.appendChild(outer)
    await outer.updateComplete
    await inner.updateComplete
    await el.updateComplete

    const path = el.querySelector('path')!
    const animate = vi.spyOn(path, 'animate')

    await el.replay()
    expect(animate).toHaveBeenCalledOnce()

    animate.mockClear()
    inner.motion = 'reduced'
    await inner.updateComplete

    await expect(el.replay()).resolves.toBeUndefined()
    expect(animate).not.toHaveBeenCalled()
  })
})
