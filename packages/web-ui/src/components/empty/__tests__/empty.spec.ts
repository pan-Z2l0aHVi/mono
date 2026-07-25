import { describe, expect, it } from 'vite-plus/test'

import '..'
import type { WebUiEmpty } from '..'

const createEmpty = (attrs?: Record<string, string>, content?: string): WebUiEmpty => {
  const el = document.createElement('web-ui-empty') as WebUiEmpty
  if (attrs) {
    for (const [name, value] of Object.entries(attrs)) {
      el.setAttribute(name, value)
    }
  }
  if (content) el.innerHTML = content
  document.body.appendChild(el)
  return el
}

describe('WebUiEmpty', () => {
  describe('基础渲染', () => {
    it('渲染空状态容器和装饰性默认图标', async () => {
      const el = createEmpty()
      await el.updateComplete

      const empty = el.shadowRoot?.querySelector('.empty')
      const icon = el.shadowRoot?.querySelector('.empty-icon')
      expect(empty?.tagName).toBe('SECTION')
      expect(icon?.getAttribute('aria-hidden')).toBe('true')
      expect(icon?.querySelector('web-ui-icon')).toBeTruthy()

      el.remove()
    })

    it('没有内容时不展示标题、说明和操作区域', async () => {
      const el = createEmpty()
      await el.updateComplete

      expect(el.shadowRoot?.querySelector('.empty-title')?.classList.contains('is-hidden')).toBe(true)
      expect(el.shadowRoot?.querySelector('.empty-description')?.classList.contains('is-hidden')).toBe(true)
      expect(el.shadowRoot?.querySelector('.empty-action')?.classList.contains('is-hidden')).toBe(true)

      el.remove()
    })
  })

  describe('prop: title', () => {
    it('展示标题文本', async () => {
      const el = createEmpty({ title: '暂无内容' })
      await el.updateComplete

      expect(el.shadowRoot?.querySelector('.empty-title')?.textContent?.trim()).toBe('暂无内容')

      el.remove()
    })

    it('动态更新标题文本', async () => {
      const el = createEmpty()
      await el.updateComplete

      el.title = '更新后的标题'
      await el.updateComplete

      expect(el.shadowRoot?.querySelector('.empty-title')?.textContent?.trim()).toBe('更新后的标题')

      el.remove()
    })
  })

  describe('prop: description', () => {
    it('展示说明文本', async () => {
      const el = createEmpty({ description: '暂无可展示的数据。' })
      await el.updateComplete

      expect(el.shadowRoot?.querySelector('.empty-description')?.textContent?.trim()).toBe('暂无可展示的数据。')

      el.remove()
    })

    it('支持长说明文本换行', async () => {
      const description = '很长的说明文本'.repeat(80)
      const el = createEmpty({ description })
      await el.updateComplete

      const descriptionElement = el.shadowRoot?.querySelector('.empty-description')
      expect(descriptionElement?.textContent?.trim()).toBe(description)

      el.remove()
    })
  })

  describe('prop: size', () => {
    it.each(['small', 'medium', 'large'] as const)('支持 %s 尺寸', async size => {
      const el = createEmpty({ size })
      await el.updateComplete

      expect(el.size).toBe(size)
      expect(el.getAttribute('size')).toBe(size)

      el.remove()
    })
  })

  describe('slots', () => {
    it('default slot 优先于 title prop', async () => {
      const el = createEmpty({ title: 'prop 标题' }, '<strong>slot 标题</strong>')
      await el.updateComplete

      const slot = el.shadowRoot?.querySelector<HTMLSlotElement>('.empty-title slot')
      expect(slot?.assignedElements()[0]?.textContent).toBe('slot 标题')

      el.remove()
    })

    it('仅 default slot 时展示自定义标题', async () => {
      const el = createEmpty(undefined, '<strong>仅 slot 标题</strong>')
      await el.updateComplete

      const slot = el.shadowRoot?.querySelector<HTMLSlotElement>('.empty-title slot')
      expect(slot?.assignedElements()[0]?.textContent).toBe('仅 slot 标题')
      expect(el.shadowRoot?.querySelector('.empty-title')?.classList.contains('is-hidden')).toBe(false)

      el.remove()
    })

    it('description slot 优先于 description prop', async () => {
      const el = createEmpty({ description: 'prop 说明' }, '<span slot="description">slot 说明</span>')
      await el.updateComplete

      const slot = el.shadowRoot?.querySelector<HTMLSlotElement>('slot[name="description"]')
      expect(slot?.assignedElements()[0]?.textContent).toBe('slot 说明')

      el.remove()
    })

    it('支持自定义 icon slot，且保持为装饰性内容', async () => {
      const el = createEmpty(undefined, '<span slot="icon">自定义图标</span>')
      await el.updateComplete

      const icon = el.shadowRoot?.querySelector('.empty-icon')
      const slot = icon?.querySelector<HTMLSlotElement>('slot[name="icon"]')
      expect(icon?.getAttribute('aria-hidden')).toBe('true')
      expect(slot?.assignedElements()[0]?.textContent).toBe('自定义图标')

      el.remove()
    })

    it('支持 action slot，并允许按钮获得键盘焦点', async () => {
      const el = createEmpty(undefined, '<button slot="action">重新加载</button>')
      await el.updateComplete

      const button = el.querySelector<HTMLButtonElement>('button')!
      button.focus()

      expect(document.activeElement).toBe(button)
      expect(el.shadowRoot?.querySelector('.empty-action')?.classList.contains('is-hidden')).toBe(false)

      el.remove()
    })

    it('动态插入和移除 action slot 时同步布局', async () => {
      const el = createEmpty()
      await el.updateComplete

      const button = document.createElement('button')
      button.slot = 'action'
      el.appendChild(button)
      await new Promise(process.nextTick)
      await el.updateComplete

      expect(el.shadowRoot?.querySelector('.empty-action')?.classList.contains('is-hidden')).toBe(false)

      button.remove()
      await new Promise(process.nextTick)
      await el.updateComplete

      expect(el.shadowRoot?.querySelector('.empty-action')?.classList.contains('is-hidden')).toBe(true)

      el.remove()
    })
  })

  describe('公开 API 与事件', () => {
    it('公开 title、description 和 size 属性，且不派发组件专属事件', async () => {
      const el = createEmpty()
      await el.updateComplete

      expect(el.title).toBe('')
      expect(el.description).toBe('')
      expect(el.size).toBe('medium')

      el.remove()
    })
  })
})
