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
 * 只读公开渲染面：默认图标是 icon slot 的 fallback 内容，标签 `web-ui-icon` 是公开组件，
 * 其 `size` 是公开 property。不依赖内部 class。
 */
const defaultIcon = (el: WebUiEmpty): WebUiIcon | null =>
  el.shadowRoot?.querySelector('web-ui-icon') as WebUiIcon | null

/** 组件实际生效的样式表文本，供 CSS 契约断言使用。 */
const componentStyleText = (): string =>
  WebUiEmpty.styles.map(entry => ('cssText' in entry ? String(entry.cssText) : '')).join('\n')

describe('WebUiEmpty 组件', () => {
  describe('默认属性与反射', () => {
    it('默认值符合契约', async () => {
      const el = createEmpty()
      await waitForUpdate(el)
      expect(el.title).toBe('')
      expect(el.description).toBe('')
      expect(el.size).toBe(56)
      cleanupElement(el)
    })

    contractReflection('property 写入后同步到宿主 attribute', () => createEmpty(), [
      ['title', '暂无内容', 'title', '暂无内容'],
      ['description', '暂无可展示的数据', 'description', '暂无可展示的数据'],
      ['size', 40, 'size', '40']
    ])
  })

  describe('size 数值', () => {
    it.each([40, 56, 72])('size=%i 作为数字读取并反射回同值', async size => {
      const el = createEmpty({ size: String(size) })
      await waitForUpdate(el)
      expect(el.size).toBe(size)
      expect(typeof el.size).toBe('number')
      expect(el.getAttribute('size')).toBe(String(size))
      cleanupElement(el)
    })

    it('默认 size 为 56 时默认字形为 24', async () => {
      const el = createEmpty()
      await waitForUpdate(el)
      expect(el.size).toBe(56)
      expect(defaultIcon(el)?.size).toBe(24)
      cleanupElement(el)
    })

    it.each([
      [40, 17],
      [72, 31]
    ])('size=%i 时字形为 round(size * 3 / 7) = %i', async (size, glyph) => {
      const el = createEmpty({ size: String(size) })
      await waitForUpdate(el)
      expect(defaultIcon(el)?.size).toBe(glyph)
      cleanupElement(el)
    })

    it.each([
      ['abc', '非数值'],
      ['', '空串'],
      ['0', '零'],
      ['-5', '负数'],
      ['Infinity', 'Infinity']
    ])('非法输入 size="%s"（%s）回退默认边长 56 与字形 24', async raw => {
      const el = createEmpty({ size: raw })
      await waitForUpdate(el)
      expect(el.size).toBe(56)
      expect(defaultIcon(el)?.size).toBe(24)
      // 边长变量不能是 NaNpx / 0px，否则盒会退回 unset 或塌成 0×0
      expect(el.style.getPropertyValue('--wui-internal-empty-size')).toBe('56px')
      expect(el.getAttribute('size')).toBe('56')
      cleanupElement(el)
    })

    it('有限小数边长原样采用，不被夹到整数或默认值', async () => {
      const el = createEmpty({ size: '40.5' })
      await waitForUpdate(el)
      expect(el.size).toBe(40.5)
      expect(el.style.getPropertyValue('--wui-internal-empty-size')).toBe('40.5px')
      cleanupElement(el)
    })
  })

  describe('size 不再驱动版面度量', () => {
    it('不再有 small / large 档位选择器', () => {
      const css = componentStyleText()
      expect(css).not.toContain("[size='small']")
      expect(css).not.toContain("[size='large']")
    })

    it('图标容器边长跟随 size 写入 --wui-internal-empty-size', async () => {
      const el = createEmpty({ size: '72' })
      await waitForUpdate(el)
      expect(el.style.getPropertyValue('--wui-internal-empty-size')).toBe('72px')
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
