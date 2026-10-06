import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test'

import '..'
import { mountElement, waitForUpdate } from '@/shared/test-utils'

import type { WebUiSvgDrawLines } from '..'

function createSvgDrawLines(): WebUiSvgDrawLines {
  return mountElement<WebUiSvgDrawLines>('web-ui-svg-draw-lines')
}

beforeEach(() => {
  document.body.replaceChildren()
})

afterEach(() => {
  document.body.replaceChildren()
})

describe('WebUiSvgDrawLines 组件', () => {
  describe('属性：duration', () => {
    it('默认值为 1000', async () => {
      const el = createSvgDrawLines()
      await waitForUpdate(el)
      expect(el.duration).toBe(1000)
      expect(el.getAttribute('duration')).toBe('1000')
      el.remove()
    })

    it('duration 反射到 host', async () => {
      const el = createSvgDrawLines()
      el.duration = 2000
      await waitForUpdate(el)
      expect(el.getAttribute('duration')).toBe('2000')
      el.remove()
    })

    it('负数 duration 归零', async () => {
      const el = createSvgDrawLines()
      el.duration = -1
      await waitForUpdate(el)
      expect(el.duration).toBe(0)
      el.remove()
    })

    it('超标 duration 上限 30000', async () => {
      const el = createSvgDrawLines()
      el.duration = 99999
      await waitForUpdate(el)
      expect(el.duration).toBe(30000)
      el.remove()
    })

    it('非数值 duration 回退到默认值 1000', async () => {
      const el = createSvgDrawLines()
      ;(el as unknown as Record<string, unknown>).duration = 'invalid'
      await waitForUpdate(el)
      expect(el.duration).toBe(1000)
      el.remove()
    })
  })

  describe('属性：easing', () => {
    it('默认值为 linear', async () => {
      const el = createSvgDrawLines()
      await waitForUpdate(el)
      expect(el.easing).toBe('linear')
      expect(el.getAttribute('easing')).toBe('linear')
      el.remove()
    })

    it('easing 反射到 host', async () => {
      const el = createSvgDrawLines()
      el.easing = 'ease-in-out'
      await waitForUpdate(el)
      expect(el.getAttribute('easing')).toBe('ease-in-out')
      el.remove()
    })
  })

  describe('属性：no-autoplay', () => {
    it('默认值为 false 且不带 attribute', async () => {
      const el = createSvgDrawLines()
      await waitForUpdate(el)
      expect(el.noAutoplay).toBe(false)
      expect(el.hasAttribute('no-autoplay')).toBe(false)
      el.remove()
    })

    it('写入 true 反射到宿主 attribute', async () => {
      const el = createSvgDrawLines()
      el.noAutoplay = true
      await waitForUpdate(el)
      expect(el.getAttribute('no-autoplay')).toBe('')
      el.remove()
    })

    it('attribute 存在即为 true', async () => {
      const el = mountElement<WebUiSvgDrawLines>('web-ui-svg-draw-lines', { attrs: { 'no-autoplay': '' } })
      await waitForUpdate(el)
      expect(el.noAutoplay).toBe(true)
      el.remove()
    })
  })

  describe('方法：replay()', () => {
    it('无内容时 replay 提前 resolve，不报错', async () => {
      const el = createSvgDrawLines()
      await expect(el.replay()).resolves.toBeUndefined()
      el.remove()
    })
  })
})
