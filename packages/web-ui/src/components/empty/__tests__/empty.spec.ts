import { describe, expect, it } from 'vite-plus/test'

import { cleanupElement, waitForUpdate } from '@/shared/test-utils'

import '..'
import type { WebUiEmpty } from '..'

const createEmpty = (attrs?: Record<string, string>, content?: string): WebUiEmpty => {
  const el = document.createElement('web-ui-empty')
  if (attrs) {
    for (const [name, value] of Object.entries(attrs)) {
      el.setAttribute(name, value)
    }
  }
  if (content) el.innerHTML = content
  document.body.appendChild(el)
  return el
}

describe('WebUiEmpty 组件', () => {
  describe('默认属性与反射（合并）', () => {
    it('默认值符合契约', async () => {
      const el = createEmpty()
      await waitForUpdate(el)
      expect(el.title).toBe('')
      expect(el.description).toBe('')
      expect(el.size).toBe('medium')
      cleanupElement(el)
    })

    it.each([
      ['title', '暂无内容'],
      ['description', '暂无可展示的数据'],
      ['size', 'small']
    ] as const)('%s 反射到宿主 attribute', async (prop, value) => {
      const el = createEmpty()
      await waitForUpdate(el)
      ;(el as any)[prop] = value
      await waitForUpdate(el)
      expect(el.getAttribute(prop)).toBe(value)
      cleanupElement(el)
    })
  })

  describe('size 枚举', () => {
    it.each(['small', 'medium', 'large'] as const)('%s 尺寸设置和反射', async size => {
      const el = createEmpty({ size })
      await waitForUpdate(el)
      expect(el.size).toBe(size)
      expect(el.getAttribute('size')).toBe(size)
      cleanupElement(el)
    })

    it('非法 size 值回退为 medium', async () => {
      const el = createEmpty()
      await waitForUpdate(el)
      el.setAttribute('size', 'extra-large')
      await waitForUpdate(el)
      expect(el.size).toBe('medium')
      expect(el.getAttribute('size')).toBe('medium')
      cleanupElement(el)
    })
  })

  describe('插槽投影', () => {
    it('默认 slot 内容优先于 title prop', async () => {
      const el = createEmpty({ title: 'prop 标题' }, '<strong>slot 标题</strong>')
      await waitForUpdate(el)
      expect(el.querySelector('strong')?.textContent).toBe('slot 标题')
      cleanupElement(el)
    })

    it('description slot 内容优先于 description prop', async () => {
      const el = createEmpty({ description: 'prop 说明' }, '<span slot="description">slot 说明</span>')
      await waitForUpdate(el)
      expect(el.querySelector('[slot="description"]')?.textContent).toBe('slot 说明')
      cleanupElement(el)
    })

    it('支持自定义 icon slot', async () => {
      const el = createEmpty(undefined, '<span slot="icon">自定义图标</span>')
      await waitForUpdate(el)
      expect(el.querySelector('[slot="icon"]')?.textContent).toBe('自定义图标')
      cleanupElement(el)
    })

    it('支持 action slot', async () => {
      const el = createEmpty(undefined, '<button slot="action">重新加载</button>')
      await waitForUpdate(el)
      expect(el.querySelector('[slot="action"]')?.textContent).toBe('重新加载')
      cleanupElement(el)
    })
  })
})
