import { describe, expect, it } from 'vite-plus/test'

import { cleanupElement, expectReflected, mountElement, spyEvents, waitForUpdate } from '@/shared/test-utils'

import '..'
import type { WebUiButton } from '..'

const createButton = (text = ''): WebUiButton => {
  const el = mountElement<WebUiButton>('web-ui-button')
  if (text) el.textContent = text
  return el
}

/**
 * 只读公开渲染面：spinner 是 shadow 内渲染的 web-ui-icon（公开组件标签），
 * 默认 slot 用于断言"消费者内容是否被投影"。不依赖内部 class。
 */
const parts = (el: WebUiButton) => ({
  spinner: el.shadowRoot?.querySelector('web-ui-icon') ?? null,
  defaultSlot: el.shadowRoot?.querySelector<HTMLSlotElement>('slot:not([name])') ?? null
})

const projectsMine = (el: WebUiButton): boolean => {
  const slot = parts(el).defaultSlot
  return (slot?.assignedNodes({ flatten: true }) ?? []).some(
    n => n instanceof Element && n.matches('[data-role="mine"]')
  )
}

describe('WebUiButton 组件', () => {
  describe('属性: variant', () => {
    it('默认值为 glass，非法输入回退到默认值', async () => {
      const el = createButton()
      await waitForUpdate(el)
      expect(el.variant).toBe('glass')

      ;(el as unknown as Record<string, unknown>).variant = 'unknown'
      await waitForUpdate(el)
      expect(el.variant).toBe('glass')

      cleanupElement(el)
    })

    it('设置后反射到 host 属性', async () => {
      const el = createButton()
      el.variant = 'primary'
      await waitForUpdate(el)
      expect(el.getAttribute('variant')).toBe('primary')

      el.variant = 'danger'
      await waitForUpdate(el)
      expect(el.getAttribute('variant')).toBe('danger')

      cleanupElement(el)
    })

    it('所有合法 variant 值生效', async () => {
      const values = ['primary', 'secondary', 'ghost', 'danger', 'glass'] as const
      for (const v of values) {
        const el = createButton()
        el.variant = v
        await waitForUpdate(el)
        expect(el.variant).toBe(v)
        expect(el.getAttribute('variant')).toBe(v)
        cleanupElement(el)
      }
    })
  })

  describe('原生按钮契约', () => {
    it('type 默认 button，非法值规范化为 button 并映射到内部按钮', async () => {
      const el = createButton('OK')
      await waitForUpdate(el)
      const inner = el.shadowRoot?.querySelector('button')
      expect(el.type).toBe('button')
      expect(inner?.type).toBe('button')

      ;(el as unknown as Record<string, unknown>).type = 'invalid'
      await waitForUpdate(el)
      expect(el.type).toBe('button')
      expect(el.getAttribute('type')).toBe('button')
      expect(inner?.type).toBe('button')

      el.type = 'submit'
      await waitForUpdate(el)
      expect(inner?.type).toBe('submit')
      cleanupElement(el)
    })

    it('将文档化的可访问名称映射到内部按钮', async () => {
      const el = createButton()
      el.setAttribute('aria-label', 'Close')
      await waitForUpdate(el)
      const inner = el.shadowRoot?.querySelector('button')
      expect(inner?.getAttribute('aria-label')).toBe('Close')
      cleanupElement(el)
    })

    it('将 data-* 保留在组件宿主而不复制到内部按钮', async () => {
      const el = createButton()
      el.setAttribute('data-testid', 'save')
      await waitForUpdate(el)
      expect(el.getAttribute('data-testid')).toBe('save')
      expect(el.shadowRoot?.querySelector('button')?.hasAttribute('data-testid')).toBe(false)
      cleanupElement(el)
    })
  })

  describe('属性: disabled', () => {
    it('属性反射到 host，初始值为 false', async () => {
      const el = createButton()
      expectReflected(el, 'disabled', false)
      expect(el.disabled).toBe(false)

      el.disabled = true
      await waitForUpdate(el)
      expectReflected(el, 'disabled', true)
      expect(el.disabled).toBe(true)

      cleanupElement(el)
    })

    it('disabled 为 true 时阻止 click 事件', async () => {
      const el = createButton('OK')
      el.disabled = true
      await waitForUpdate(el)

      const [events] = spyEvents(el, 'click')
      el.shadowRoot?.querySelector('button')?.click()
      expect(events).toHaveLength(0)

      cleanupElement(el)
    })
  })

  describe('属性: loading', () => {
    it('loading 属性反射到 host', async () => {
      const el = createButton()
      expectReflected(el, 'loading', false)
      expect(el.loading).toBe(false)

      el.loading = true
      await waitForUpdate(el)
      expectReflected(el, 'loading', true)
      expect(el.loading).toBe(true)

      cleanupElement(el)
    })

    it('loading 为 true 时阻止 click 事件', async () => {
      const el = createButton('OK')
      el.loading = true
      await waitForUpdate(el)

      const [events] = spyEvents(el, 'click')
      el.shadowRoot?.querySelector('button')?.click()
      expect(events).toHaveLength(0)

      cleanupElement(el)
    })
  })

  describe('属性: icon', () => {
    it('icon 属性反射到 host', async () => {
      const el = createButton()
      expectReflected(el, 'icon', false)
      expect(el.icon).toBe(false)

      el.icon = true
      await waitForUpdate(el)
      expectReflected(el, 'icon', true)
      expect(el.icon).toBe(true)

      cleanupElement(el)
    })
  })

  describe('组合: icon + loading', () => {
    it('icon 模式下 loading spinner 替换默认 slot 内容，只渲染 spinner', async () => {
      const el = createButton()
      el.setAttribute('icon', '')
      el.innerHTML = '<web-ui-icon data-role="mine"></web-ui-icon>'
      el.loading = true
      await waitForUpdate(el)

      const { spinner, defaultSlot } = parts(el)
      expect(spinner).toBeTruthy()
      expect(defaultSlot).toBeNull()
      cleanupElement(el)
    })

    it('icon 模式未 loading 时仍投影默认 slot 且不渲染 spinner', async () => {
      const el = createButton()
      el.setAttribute('icon', '')
      el.innerHTML = '<web-ui-icon data-role="mine"></web-ui-icon>'
      await waitForUpdate(el)

      const { spinner, defaultSlot } = parts(el)
      expect(spinner).toBeNull()
      expect(defaultSlot).toBeTruthy()
      expect(projectsMine(el)).toBe(true)
      cleanupElement(el)
    })

    it('icon + loading 恢复 false 后默认 slot 内容恢复投影', async () => {
      const el = createButton()
      el.setAttribute('icon', '')
      el.innerHTML = '<web-ui-icon data-role="mine"></web-ui-icon>'
      el.loading = true
      await waitForUpdate(el)
      expect(parts(el).spinner).toBeTruthy()

      el.loading = false
      await waitForUpdate(el)

      expect(parts(el).spinner).toBeNull()
      expect(parts(el).defaultSlot).toBeTruthy()
      expect(projectsMine(el)).toBe(true)
      cleanupElement(el)
    })

    it('非 icon 模式 loading 时 spinner 与默认 slot 并存', async () => {
      const el = createButton('Loading')
      el.loading = true
      await waitForUpdate(el)

      const { spinner, defaultSlot } = parts(el)
      expect(spinner).toBeTruthy()
      expect(defaultSlot).toBeTruthy()
      cleanupElement(el)
    })

    it('icon + loading 阻断 click，保持不可点击语义', async () => {
      const el = createButton()
      el.setAttribute('icon', '')
      el.loading = true
      await waitForUpdate(el)

      const [events] = spyEvents(el, 'click')
      el.shadowRoot?.querySelector('button')?.click()
      expect(events).toHaveLength(0)

      const inner = el.shadowRoot?.querySelector('button')
      expect(inner?.disabled).toBe(true)
      cleanupElement(el)
    })

    it('disabled + icon + loading 仍阻断 click', async () => {
      const el = createButton()
      el.setAttribute('icon', '')
      el.disabled = true
      el.loading = true
      await waitForUpdate(el)

      const [events] = spyEvents(el, 'click')
      el.shadowRoot?.querySelector('button')?.click()
      expect(events).toHaveLength(0)
      cleanupElement(el)
    })
  })

  describe('属性: full', () => {
    it('full 属性反射到 host', async () => {
      const el = createButton()
      expectReflected(el, 'full', false)
      expect(el.full).toBe(false)

      el.full = true
      await waitForUpdate(el)
      expectReflected(el, 'full', true)
      expect(el.full).toBe(true)

      cleanupElement(el)
    })
  })

  describe('事件: click', () => {
    it('点击触发 click 事件', async () => {
      const el = createButton('OK')
      await waitForUpdate(el)

      const [events] = spyEvents(el, 'click')
      el.shadowRoot?.querySelector('button')?.click()
      expect(events).toHaveLength(1)

      cleanupElement(el)
    })
  })

  describe('键盘操作', () => {
    it('内联按钮的 click 方法触发宿主事件', async () => {
      const el = createButton('OK')
      await waitForUpdate(el)

      const [events] = spyEvents(el, 'click')
      const btn = el.shadowRoot?.querySelector('button')
      btn?.click()
      expect(events).toHaveLength(1)

      cleanupElement(el)
    })
  })

  describe('插槽', () => {
    it('slot 内容可通过 textContent 访问', async () => {
      const el = createButton('Click Me')
      await waitForUpdate(el)
      expect(el.textContent).toBe('Click Me')

      cleanupElement(el)
    })

    it('投影 prefix 与 suffix 命名 slot', async () => {
      const el = createButton()
      el.innerHTML = '<span slot="prefix">前</span>OK<span slot="suffix">后</span>'
      await waitForUpdate(el)

      const prefix = el.shadowRoot?.querySelector<HTMLSlotElement>('slot[name="prefix"]')
      const suffix = el.shadowRoot?.querySelector<HTMLSlotElement>('slot[name="suffix"]')
      expect(prefix?.assignedElements()[0]?.textContent).toBe('前')
      expect(suffix?.assignedElements()[0]?.textContent).toBe('后')

      cleanupElement(el)
    })
  })
})
