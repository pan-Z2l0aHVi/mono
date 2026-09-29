import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

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

// Vite 会把 `new URL(relative, import.meta.url)` 字面量重写为 dev-server 资产 URL，
// jsdom 下 fileURLToPath 会因非 file scheme 抛错。先取出 file:// 形式的模块 URL 再解析
// 包根目录，CSS 改从磁盘读取：`?inline` 导入在 jsdom 项目下返回空串，
// 经 `WebUiEmpty.styles` 读到的 `cssText` 同样是空的。
const here = import.meta.url
const packageRoot = fileURLToPath(new URL('../../../../', here))

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

/** 组件样式表原文，供 CSS 契约断言使用。 */
const componentStyleText = (): string => fs.readFileSync(`${packageRoot}src/components/empty/style.css`, 'utf8')

/** 去掉全部空白，让断言链不受 stylelint 怎么折行影响。 */
const squeezedStyleText = (): string => componentStyleText().replace(/\s+/g, '')

/** 宿主 inline style 上由 `size` 派生的整套度量。 */
const DERIVED_TOKENS = [
  '--wui-internal-empty-size',
  '--wui-internal-empty-min-height',
  '--wui-internal-empty-padding-block',
  '--wui-internal-empty-padding-inline',
  '--wui-internal-empty-title-font-size',
  '--wui-internal-empty-description-font-size'
] as const

const derivedMetrics = (el: WebUiEmpty): Record<string, string> =>
  Object.fromEntries(DERIVED_TOKENS.map(token => [token, el.style.getPropertyValue(token)]))

/** 40 / 56 / 72 三档由 `size` 派生的目标度量：图标盒、min-height、padding 块/行、字号。 */
const EXPECTED_METRICS: Record<string, Record<string, string>> = {
  '40': {
    '--wui-internal-empty-size': '40px',
    '--wui-internal-empty-min-height': '171px',
    '--wui-internal-empty-padding-block': '23px',
    '--wui-internal-empty-padding-inline': '17px',
    '--wui-internal-empty-title-font-size': '14px',
    '--wui-internal-empty-description-font-size': '13px'
  },
  '56': {
    '--wui-internal-empty-size': '56px',
    '--wui-internal-empty-min-height': '240px',
    '--wui-internal-empty-padding-block': '32px',
    '--wui-internal-empty-padding-inline': '24px',
    '--wui-internal-empty-title-font-size': '16px',
    '--wui-internal-empty-description-font-size': '14px'
  },
  '72': {
    '--wui-internal-empty-size': '72px',
    '--wui-internal-empty-min-height': '309px',
    '--wui-internal-empty-padding-block': '41px',
    '--wui-internal-empty-padding-inline': '31px',
    '--wui-internal-empty-title-font-size': '16px',
    '--wui-internal-empty-description-font-size': '14px'
  }
}

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
    ])('非法输入 size="%s"（%s）让整套度量回退默认档 56', async raw => {
      const el = createEmpty({ size: raw })
      await waitForUpdate(el)
      expect(el.size).toBe(56)
      expect(defaultIcon(el)?.size).toBe(24)
      // 整套度量都按 56 算：只有边长回退而留白与字号按 NaN 算，盒与排版都会变成垃圾值
      expect(derivedMetrics(el)).toEqual(EXPECTED_METRICS['56'])
      expect(el.getAttribute('size')).toBe('56')
      cleanupElement(el)
    })

    it('有限小数边长原样采用，不被夹到整数或默认值', async () => {
      const el = createEmpty({ size: '40.5' })
      await waitForUpdate(el)
      expect(el.size).toBe(40.5)
      expect(el.style.getPropertyValue('--wui-internal-empty-size')).toBe('40.5px')
      // 派生度量各自取整，不跟着带上小数
      expect(el.style.getPropertyValue('--wui-internal-empty-min-height')).toBe('174px')
      expect(el.style.getPropertyValue('--wui-internal-empty-padding-block')).toBe('23px')
      expect(el.style.getPropertyValue('--wui-internal-empty-padding-inline')).toBe('17px')
      cleanupElement(el)
    })
  })

  describe('size 驱动整套版面度量', () => {
    it('不再有 small / large 档位选择器', () => {
      const css = componentStyleText()
      expect(css).not.toContain("[size='small']")
      expect(css).not.toContain("[size='large']")
    })

    it.each([40, 56, 72])('size=%i 派生图标盒、min-height、padding 与两档字号', async size => {
      const el = createEmpty({ size: String(size) })
      await waitForUpdate(el)
      expect(derivedMetrics(el)).toEqual(EXPECTED_METRICS[String(size)])
      cleanupElement(el)
    })

    it('未写 size 的默认实例也带全套派生值，而不是只靠 CSS 兜底', async () => {
      const el = createEmpty()
      await waitForUpdate(el)
      expect(derivedMetrics(el)).toEqual(EXPECTED_METRICS['56'])
      cleanupElement(el)
    })

    it.each([
      [55, '14px', '13px'],
      [56, '16px', '14px'],
      [72, '16px', '14px']
    ])('size=%i 的字号为 %s / %s', async (size, title, description) => {
      const el = createEmpty({ size: String(size) })
      await waitForUpdate(el)
      expect(el.style.getPropertyValue('--wui-internal-empty-title-font-size')).toBe(title)
      expect(el.style.getPropertyValue('--wui-internal-empty-description-font-size')).toBe(description)
      cleanupElement(el)
    })

    it('每条度量都把公开 token 放在派生值之上', () => {
      const css = squeezedStyleText()
      expect(css).toContain('var(--wui-empty-min-height,var(--wui-internal-empty-min-height,240px))')
      expect(css).toContain(
        '--wui-empty-padding,var(--wui-internal-empty-padding-block,32px)var(--wui-internal-empty-padding-inline,24px)'
      )
      expect(css).toContain('var(--wui-empty-icon-size,var(--wui-internal-empty-size,56px))')
      expect(css).toContain('var(--wui-empty-title-font-size,var(--wui-internal-empty-title-font-size,16px))')
      expect(css).toContain(
        'var(--wui-empty-description-font-size,var(--wui-internal-empty-description-font-size,14px))'
      )
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
