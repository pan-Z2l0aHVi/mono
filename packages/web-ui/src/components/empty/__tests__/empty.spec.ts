import { describe, expect, it } from 'vite-plus/test'

import type { WebUiIcon } from '@/components/icon'
import {
  cleanupElement,
  contractReflection,
  flushSlotChange,
  mountElement,
  queryA11y,
  waitForUpdate
} from '@/shared/test-utils'

import { WebUiEmpty } from '..'

const createEmpty = (attrs?: Record<string, string>, content?: string): WebUiEmpty =>
  mountElement<WebUiEmpty>('web-ui-empty', { attrs, html: content })

/** 渲染输出中的可见文本（属性分支没有 slot 时，文本由 slot fallback 承载）。 */
const renderedText = (el: WebUiEmpty): string => el.shadowRoot?.textContent?.trim() ?? ''

/**
 * 默认图标是 icon slot 的 fallback 内容。`web-ui-icon` 是公开组件、`size` 是它的公开
 * property，所以读它不算摸内部实现。
 */
const defaultIcon = (el: WebUiEmpty): WebUiIcon | null =>
  el.shadowRoot?.querySelector('web-ui-icon') as WebUiIcon | null

describe('WebUiEmpty 组件', () => {
  contractReflection('property 写入后同步到宿主 attribute', () => createEmpty(), [
    ['title', '暂无内容', 'title', '暂无内容'],
    ['description', '暂无可展示的数据', 'description', '暂无可展示的数据'],
    ['size', 40, 'size', '40']
  ])

  describe('size 数值', () => {
    it.each([40, 56, 72])('size=%i 作为数字读取并反射回同值', async size => {
      const el = createEmpty({ size: String(size) })
      await waitForUpdate(el)

      expect(el.size).toBe(size)
      expect(typeof el.size).toBe('number')
      expect(el.getAttribute('size')).toBe(String(size))
      cleanupElement(el)
    })

    // size 会同时写进 CSS 自定义属性：`"abc"` 产出失效的 `NaNpx`（盒退回 unset），
    // `"0"` 产出 `0px`（图标不可见）。回退边长本身，整套派生度量因此一起回默认档 56；
    // 只回退边长而留白按 NaN 计算，盒与排版都会变成垃圾值。
    it.each([
      ['非数值', 'abc'],
      ['空串', ''],
      ['零', '0'],
      ['负数', '-5'],
      ['Infinity', 'Infinity'],
      ['NaN', 'NaN']
    ])('非法 size="%s" 回退到默认档 56', async (_label, raw) => {
      const el = createEmpty({ size: raw })
      await waitForUpdate(el)

      expect(el.size).toBe(56)
      expect(defaultIcon(el)?.size).toBe(24)
      expect(el.getAttribute('size')).toBe('56')
      cleanupElement(el)
    })

    it('有限小数边长原样采用，不被夹到整数或默认值', async () => {
      const el = createEmpty({ size: '40.5' })
      await waitForUpdate(el)

      expect(el.size).toBe(40.5)
      cleanupElement(el)
    })
  })

  describe('文本与插槽投影', () => {
    it('title / description 属性在无 slot 时渲染为文本', async () => {
      const el = createEmpty({ title: '暂无内容', description: '暂无可展示的数据' })
      await waitForUpdate(el)

      expect(renderedText(el)).toContain('暂无内容')
      expect(renderedText(el)).toContain('暂无可展示的数据')
      cleanupElement(el)
    })

    // 消费者给了 slot 内容就不再回退到属性文案；两套同时给时 slot 优先。
    it('默认 slot 内容优先于 title 属性', async () => {
      const el = createEmpty({ title: 'prop 标题' }, '<strong>slot 标题</strong>')
      await waitForUpdate(el)

      expect(el.querySelector('strong')?.textContent).toBe('slot 标题')
      cleanupElement(el)
    })

    it('description slot 内容优先于 description 属性', async () => {
      const el = createEmpty({ description: 'prop 说明' }, '<span slot="description">slot 说明</span>')
      await waitForUpdate(el)

      expect(el.querySelector('[slot="description"]')?.textContent).toBe('slot 说明')
      cleanupElement(el)
    })

    it('自定义 icon slot 取代默认图标', async () => {
      const el = createEmpty(undefined, '<span slot="icon">自定义图标</span>')
      await waitForUpdate(el)
      await flushSlotChange(el)

      const slot = queryA11y(el, 'slot[name="icon"]') as HTMLSlotElement
      expect(slot.assignedElements().map(node => node.textContent)).toEqual(['自定义图标'])
      cleanupElement(el)
    })

    it('action slot 内容被投影', async () => {
      const el = createEmpty(undefined, '<button slot="action">重新加载</button>')
      await waitForUpdate(el)

      expect(el.querySelector('[slot="action"]')?.textContent).toBe('重新加载')
      cleanupElement(el)
    })
  })
})
