import { describe, expect, it } from 'vite-plus/test'

import {
  cleanupElement,
  contractReflection,
  flushSlotChange,
  mountElement,
  queryA11y,
  waitForUpdate
} from '@/shared/test-utils'

import '..'
import type { WebUiEmpty } from '..'

const createEmpty = (attrs?: Record<string, string>, content?: string): WebUiEmpty =>
  mountElement<WebUiEmpty>('web-ui-empty', { attrs, html: content })

/** 渲染输出中的可见文本（属性分支没有 slot 时，文本由 slot fallback 承载）。 */
const renderedText = (el: WebUiEmpty): string => el.shadowRoot?.textContent?.trim() ?? ''

describe('WebUiEmpty 组件', () => {
  describe('默认属性与反射', () => {
    it('默认值符合契约', async () => {
      const el = createEmpty()
      await waitForUpdate(el)
      expect(el.title).toBe('')
      expect(el.description).toBe('')
      expect(el.size).toBe('medium')
      cleanupElement(el)
    })

    contractReflection('property 写入后同步到宿主 attribute', () => createEmpty(), [
      ['title', '暂无内容', 'title', '暂无内容'],
      ['description', '暂无可展示的数据', 'description', '暂无可展示的数据'],
      ['size', 'small', 'size', 'small']
    ])
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

  describe('属性文本渲染', () => {
    it('title/description 属性在无 slot 时渲染为文本', async () => {
      const el = createEmpty({ title: '暂无内容', description: '暂无可展示的数据' })
      await waitForUpdate(el)
      expect(renderedText(el)).toContain('暂无内容')
      expect(renderedText(el)).toContain('暂无可展示的数据')
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

    it('icon slot 内容被投影并取代默认图标', async () => {
      const el = createEmpty(undefined, '<span slot="icon">自定义图标</span>')
      await waitForUpdate(el)
      await flushSlotChange(el)
      const slot = queryA11y(el, 'slot[name="icon"]') as HTMLSlotElement
      expect(slot).toBeTruthy()
      expect(slot.assignedElements()).toHaveLength(1)
      expect(slot.assignedElements()[0]?.textContent).toBe('自定义图标')
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
