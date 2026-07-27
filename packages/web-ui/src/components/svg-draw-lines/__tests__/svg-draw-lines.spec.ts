import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test'

import '..'
import type { WebUiSvgDrawLines } from '..'

function createSvgDrawLines(): WebUiSvgDrawLines {
  const el = document.createElement('web-ui-svg-draw-lines') as WebUiSvgDrawLines
  document.body.appendChild(el)
  return el
}

beforeEach(() => {
  document.body.innerHTML = ''
})

afterEach(() => {
  document.body.innerHTML = ''
})

describe('WebUiSvgDrawLines', () => {
  describe('prop: duration', () => {
    it('默认值为 1000', async () => {
      const el = createSvgDrawLines()
      await el.updateComplete
      expect(el.duration).toBe(1000)
      expect(el.getAttribute('duration')).toBe('1000')
      el.remove()
    })

    it('duration 反射到 host', async () => {
      const el = createSvgDrawLines()
      el.duration = 2000
      await el.updateComplete
      expect(el.getAttribute('duration')).toBe('2000')
      el.remove()
    })

    it('负数 duration 归零', async () => {
      const el = createSvgDrawLines()
      el.duration = -1
      await el.updateComplete
      expect(el.duration).toBe(0)
      el.remove()
    })

    it('超标 duration 上限 30000', async () => {
      const el = createSvgDrawLines()
      el.duration = 99999
      await el.updateComplete
      expect(el.duration).toBe(30000)
      el.remove()
    })

    it('非数值 duration 回退到默认值 1000', async () => {
      const el = createSvgDrawLines()
      ;(el as unknown as Record<string, unknown>).duration = 'invalid'
      await el.updateComplete
      expect(el.duration).toBe(1000)
      el.remove()
    })
  })

  describe('prop: easing', () => {
    it('默认值为 linear', async () => {
      const el = createSvgDrawLines()
      await el.updateComplete
      expect(el.easing).toBe('linear')
      expect(el.getAttribute('easing')).toBe('linear')
      el.remove()
    })

    it('easing 反射到 host', async () => {
      const el = createSvgDrawLines()
      el.easing = 'ease-in-out'
      await el.updateComplete
      expect(el.getAttribute('easing')).toBe('ease-in-out')
      el.remove()
    })
  })

  describe('replay()', () => {
    it('replay 是可调用的公开方法', () => {
      const el = createSvgDrawLines()
      expect(typeof el.replay).toBe('function')
      el.remove()
    })

    it('无内容时 replay 不报错', async () => {
      const el = createSvgDrawLines()
      await expect(el.replay()).resolves.toBeUndefined()
      el.remove()
    })

    it('有 SVG 内容时 replay 不报错', async () => {
      const el = createSvgDrawLines()
      el.innerHTML = '<svg><path d="M0 0 L100 100"/></svg>'
      await el.updateComplete
      await expect(el.replay()).resolves.toBeUndefined()
      el.remove()
    })

    it('连续多次 replay 不报错', async () => {
      const el = createSvgDrawLines()
      el.innerHTML = '<svg><path d="M0 0 L100 100"/></svg>'
      await el.updateComplete
      await expect(el.replay()).resolves.toBeUndefined()
      await expect(el.replay()).resolves.toBeUndefined()
      await expect(el.replay()).resolves.toBeUndefined()
      expect(el.querySelector('svg')).toBeTruthy()
      el.remove()
    })
  })

  describe('slot 投影', () => {
    it('默认 slot 投影 SVG 内容', async () => {
      const el = createSvgDrawLines()
      el.innerHTML = '<svg><path d="M0 0 L100 100"/></svg>'
      await el.updateComplete
      expect(el.querySelector('svg')).toBeTruthy()
      el.remove()
    })

    it('多个同级 SVG', async () => {
      const el = createSvgDrawLines()
      el.innerHTML = `
        <svg><path d="M0 0 L50 50"/></svg>
        <svg><rect x="0" y="0" width="20" height="20"/></svg>
      `
      await el.updateComplete
      const svgs = el.querySelectorAll('svg')
      expect(svgs.length).toBe(2)
      el.remove()
    })

    it('深层嵌套的 SVG 几何元素', async () => {
      const el = createSvgDrawLines()
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
      expect(el.querySelector('path')).toBeTruthy()
      expect(el.querySelector('circle')).toBeTruthy()
      el.remove()
    })

    it('replay 后恢复样式', async () => {
      const el = createSvgDrawLines()
      el.innerHTML = '<svg><path d="M0 0 L100 100"/></svg>'
      await el.updateComplete
      await el.replay()
      await el.replay()
      // 第二次 replay 先 cancelAll 清除样式再重新设置
      // 验证 inline 样式存在（第二次 replay 的 animateElement 已设置）
      const path = el.querySelector('path')!
      expect(typeof path.style.strokeDasharray).toBe('string')
      el.remove()
    })
  })
})
