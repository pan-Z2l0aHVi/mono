import { describe, expect, it } from 'vite-plus/test'

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
 * 默认图形是 icon slot 的 fallback：一个直出的 `svg`。这里只读结构与颜色关键字，
 * 不摸实现细节——尺寸与颜色都是 CSS 的事，交给 browser 档去量。
 */
const defaultGlyph = (el: WebUiEmpty): SVGSVGElement | null => el.shadowRoot?.querySelector('.empty-glyph') ?? null

describe('WebUiEmpty 组件', () => {
  contractReflection('property 写入后同步到宿主 attribute', () => createEmpty(), [
    ['title', '暂无内容', 'title', '暂无内容'],
    ['description', '暂无可展示的数据', 'description', '暂无可展示的数据']
  ])

  describe('默认图形', () => {
    it('渲染一个 aria-hidden 的 svg，画布 24×24', async () => {
      const el = createEmpty()
      await waitForUpdate(el)

      const glyph = defaultGlyph(el)
      expect(glyph).not.toBeNull()
      expect(glyph?.getAttribute('viewBox')).toBe('0 0 24 24')
      expect(glyph?.getAttribute('aria-hidden')).toBe('true')
      cleanupElement(el)
    })

    // 图形资产用 currentColor 描边与填充，颜色才能只由 CSS 的 color 决定；
    // 资产若写成固定色，--wui-empty-icon-color 会静默失效。
    it('图形用 currentColor 绘制', async () => {
      const el = createEmpty()
      await waitForUpdate(el)

      expect(defaultGlyph(el)?.innerHTML).toContain('currentColor')
      cleanupElement(el)
    })

    // `size` 不是公开属性：图形、留白与字号都由 CSS 变量决定。
    // 写 size 属性不该有任何作用。
    it('不再声明 size 属性，写 size="72" 也不改图形边长', async () => {
      const el = createEmpty({ size: '72' })
      const baseline = createEmpty()
      await Promise.all([waitForUpdate(el), waitForUpdate(baseline)])

      expect('size' in el).toBe(false)
      // 图形边长只由版面变量决定；写 size 与不写必须落在同一档，不在这里钉当前数值。
      expect(defaultGlyph(el)?.getAttribute('width')).toBe(defaultGlyph(baseline)?.getAttribute('width'))
      cleanupElement(el)
      cleanupElement(baseline)
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

    it('自定义 icon slot 取代默认 icon', async () => {
      const el = createEmpty(undefined, '<span slot="icon">自定义 icon</span>')
      await waitForUpdate(el)
      await flushSlotChange(el)

      const slot = queryA11y(el, 'slot[name="icon"]') as HTMLSlotElement
      expect(slot.assignedElements().map(node => node.textContent)).toEqual(['自定义 icon'])
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
