import type { IconifyIcon } from '@iconify/types'
import { afterEach, describe, expect, it } from 'vite-plus/test'

import {
  cleanupElement,
  contractReflection,
  expectReflected,
  mountElement,
  queryA11y,
  waitForUpdate
} from '@/shared/test-utils'

import '..'
import type { WebUiIcon } from '..'

const aIcon: IconifyIcon = { body: '<path d="M3 2h18v20H3z"/>' }

const createIcon = (): WebUiIcon => {
  const el = mountElement<WebUiIcon>('web-ui-icon')
  el.icon = aIcon
  return el
}

describe('WebUiIcon 组件', () => {
  afterEach(() => {
    document.body.replaceChildren()
  })

  describe('属性：icon', () => {
    it('无 icon 时不渲染 SVG', async () => {
      const el = mountElement<WebUiIcon>('web-ui-icon')
      await waitForUpdate(el)

      expect(queryA11y(el, '[aria-hidden="true"]')).toBeNull()
      cleanupElement(el)
    })

    it('有 icon 时渲染带 aria-hidden 的 SVG', async () => {
      const el = createIcon()
      await waitForUpdate(el)

      expect(queryA11y(el, '[aria-hidden="true"]')).toBeTruthy()
      cleanupElement(el)
    })

    it('未声明尺寸时按 Iconify 默认的 16×16 画布取景', async () => {
      const el = createIcon()
      await waitForUpdate(el)

      expect(el.shadowRoot?.querySelector('svg')?.getAttribute('viewBox')).toBe('0 0 16 16')
      cleanupElement(el)
    })

    it('声明了尺寸时用图标自带画布，不套默认值', async () => {
      const el = mountElement<WebUiIcon>('web-ui-icon')
      el.icon = { body: '<path d="M4 6h16v2H4z"/>', width: 24, height: 24 }
      await waitForUpdate(el)

      expect(el.shadowRoot?.querySelector('svg')?.getAttribute('viewBox')).toBe('0 0 24 24')
      cleanupElement(el)
    })
  })

  describe('默认属性与反射', () => {
    it('默认值符合契约', async () => {
      const el = mountElement<WebUiIcon>('web-ui-icon')
      await waitForUpdate(el)
      expect(el.size).toBe(18)
      expect(el.spin).toBe(false)
      expectReflected(el, 'spin', false)
      cleanupElement(el)
    })

    contractReflection('property 写入后同步到宿主 attribute', () => createIcon(), [
      ['size', 32, 'size', '32'],
      ['color', 'red', 'color', 'red']
    ])

    it('size attribute 写入反映到 property', async () => {
      const el = createIcon()
      await waitForUpdate(el)
      el.setAttribute('size', '32')
      await waitForUpdate(el)
      expect(el.size).toBe(32)
      cleanupElement(el)
    })

    it('spin 布尔存在语义', async () => {
      const el = createIcon()
      await waitForUpdate(el)
      el.spin = true
      await waitForUpdate(el)
      expect(el.spin).toBe(true)
      expectReflected(el, 'spin', true)
      el.spin = false
      await waitForUpdate(el)
      expect(el.spin).toBe(false)
      expectReflected(el, 'spin', false)
      cleanupElement(el)
    })
  })
})
