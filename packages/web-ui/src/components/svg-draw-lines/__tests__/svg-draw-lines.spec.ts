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

  describe('slot 投影', () => {
    it('默认 slot 投影 SVG 内容', async () => {
      const el = createSvgDrawLines()
      el.innerHTML = '<svg><path d="M0 0 L100 100"/></svg>'
      await el.updateComplete
      expect(el.querySelector('svg')).toBeTruthy()
      el.remove()
    })
  })
})
