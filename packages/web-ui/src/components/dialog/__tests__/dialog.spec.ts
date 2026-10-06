import { afterEach, describe, expect, it } from 'vite-plus/test'

import '..'
import { cleanupElement, spyEvents, waitForUpdate } from '@/shared/test-utils'

import type { WebUiDialog } from '..'

function createDialog(slots = ''): WebUiDialog {
  const el = document.createElement('web-ui-dialog')
  if (slots) el.innerHTML = slots
  document.body.appendChild(el)
  return el
}

/** 打开态的内部原生 dialog —— 遮罩点击的落点。 */
function panelOf(el: WebUiDialog): HTMLDialogElement | null {
  return el.shadowRoot?.querySelector('dialog') ?? null
}

afterEach(() => document.body.replaceChildren())

describe('WebUiDialog', () => {
  describe('open 反射与程序化开关', () => {
    it('open 属性反射到 host 元素', async () => {
      const el = createDialog()

      el.open = true
      await waitForUpdate(el)
      expect(el.hasAttribute('open')).toBe(true)

      el.open = false
      await waitForUpdate(el)
      expect(el.hasAttribute('open')).toBe(false)
      cleanupElement(el)
    })

    it('程序设置 open 不触发 open-change', async () => {
      const el = createDialog()
      const [events] = spyEvents<CustomEvent<{ open: boolean }>>(el, 'open-change')

      el.open = true
      await waitForUpdate(el)

      expect(events).toHaveLength(0)
      cleanupElement(el)
    })

    it('程序设置 open 为已打开的同值不触发 open-change', async () => {
      const el = createDialog()
      el.open = true
      await waitForUpdate(el)

      const [events] = spyEvents<CustomEvent<{ open: boolean }>>(el, 'open-change')

      el.open = true
      await waitForUpdate(el)

      expect(events).toHaveLength(0)
      cleanupElement(el)
    })

    it('showModal() 打开但不触发 open-change', async () => {
      const el = createDialog()
      const [events] = spyEvents<CustomEvent<{ open: boolean }>>(el, 'open-change')

      el.showModal()
      await waitForUpdate(el)

      expect(el.open).toBe(true)
      expect(events).toHaveLength(0)
      cleanupElement(el)
    })

    // 幂等性：已打开时重复调用 showModal() 既不重派事件也不关掉面板。
    // 少了这条，重复调用导致的「重复 showModal」回归无人看守。
    it('已打开时再次调用 showModal() 不重复触发、也不关闭', async () => {
      const el = createDialog()
      el.open = true
      await waitForUpdate(el)

      const [events] = spyEvents<CustomEvent<{ open: boolean }>>(el, 'open-change')

      el.showModal()
      await waitForUpdate(el)

      expect(events).toHaveLength(0)
      expect(el.open).toBe(true)
      cleanupElement(el)
    })

    it('close() 关闭但不触发 open-change', async () => {
      const el = createDialog()
      el.open = true
      await waitForUpdate(el)

      const [events] = spyEvents<CustomEvent<{ open: boolean }>>(el, 'open-change')

      el.close()
      await waitForUpdate(el)

      expect(el.open).toBe(false)
      expect(events).toHaveLength(0)
      cleanupElement(el)
    })
  })

  describe('滚动锁', () => {
    // 文档级副作用是滚动锁唯一的观察面（组件自身 DOM 里读不到）。
    it('默认打开时锁定背景滚动，关闭后恢复', async () => {
      const el = createDialog()

      el.open = true
      await waitForUpdate(el)
      expect(document.documentElement.style.overflow).toBe('hidden')

      el.close()
      await waitForUpdate(el)
      expect(document.documentElement.style.overflow).toBe('')
      cleanupElement(el)
    })

    it('no-scroll-lock 为 true 时不锁定背景滚动', async () => {
      const el = createDialog()
      el.noScrollLock = true

      el.open = true
      await waitForUpdate(el)

      expect(document.documentElement.style.overflow).toBe('')
      cleanupElement(el)
    })

    it('打开期间切换 no-scroll-lock 立即释放滚动锁', async () => {
      const el = createDialog()
      el.open = true
      await waitForUpdate(el)
      expect(document.documentElement.style.overflow).toBe('hidden')

      el.noScrollLock = true
      await waitForUpdate(el)

      expect(document.documentElement.style.overflow).toBe('')
      cleanupElement(el)
    })
  })

  describe('布尔属性语义', () => {
    // `="false"` 仍为真——Boolean 反射契约，不是「字符串解析成假值」。
    const cases = [
      ['noEscapeClose', 'no-escape-close'],
      ['noBackdropClose', 'no-backdrop-close'],
      ['controlled', 'controlled']
    ] as const

    for (const [prop, attr] of cases) {
      it(`${prop} 按 Boolean 语义双向同步`, async () => {
        const el = createDialog()

        el[prop] = true
        await waitForUpdate(el)
        expect(el.hasAttribute(attr)).toBe(true)

        el[prop] = false
        await waitForUpdate(el)
        expect(el.hasAttribute(attr)).toBe(false)

        el.setAttribute(attr, 'false')
        await waitForUpdate(el)
        expect(el[prop]).toBe(true)
        cleanupElement(el)
      })
    }
  })

  describe('遮罩点击关闭', () => {
    it('默认允许点击遮罩关闭对话框', async () => {
      const el = createDialog()
      el.open = true
      await waitForUpdate(el)

      panelOf(el)?.click()
      await waitForUpdate(el)

      expect(el.open).toBe(false)
      cleanupElement(el)
    })

    it('no-backdrop-close 存在时点击遮罩不关闭', async () => {
      const el = createDialog()
      el.noBackdropClose = true
      el.open = true
      await waitForUpdate(el)

      panelOf(el)?.click()
      await waitForUpdate(el)

      expect(el.open).toBe(true)
      cleanupElement(el)
    })

    // `no-backdrop-close="false"` 仍是「存在」（Boolean 反射语义），用户后果是同一个：
    // 点遮罩不关闭。表驱动那条只读属性，这里钉行为——只钉属性的话，某天反射对了
    // 但遮罩点击闸门失效，这条不会红。
    it('no-backdrop-close="false" 仍禁用遮罩关闭', async () => {
      const el = createDialog()
      el.setAttribute('no-backdrop-close', 'false')
      el.open = true
      await waitForUpdate(el)

      panelOf(el)?.click()
      await waitForUpdate(el)

      expect(el.noBackdropClose).toBe(true)
      expect(el.open).toBe(true)
      cleanupElement(el)
    })
  })

  describe('controlled 模式', () => {
    // 关键用户流程：受控下组件只发请求，改不改 open 由 consumer 决定。
    it('点击遮罩只派发 open-change(false) 请求，不修改 open', async () => {
      const el = createDialog()
      el.controlled = true
      el.open = true
      await waitForUpdate(el)
      const [events] = spyEvents<CustomEvent<{ open: boolean }>>(el, 'open-change')

      panelOf(el)?.click()
      await waitForUpdate(el)

      expect(el.open).toBe(true)
      expect(events).toHaveLength(1)
      expect(events[0]?.detail).toEqual({ open: false })
      cleanupElement(el)
    })

    it('程序化 close() 直通关闭，不派发 open-change', async () => {
      const el = createDialog()
      el.controlled = true
      el.open = true
      await waitForUpdate(el)
      const [events] = spyEvents<CustomEvent<{ open: boolean }>>(el, 'open-change')

      el.close()
      await waitForUpdate(el)

      expect(el.open).toBe(false)
      expect(events).toHaveLength(0)
      cleanupElement(el)
    })
  })
})
