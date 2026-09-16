import { describe, expect, it } from 'vite-plus/test'

import '..'
import { cleanupElement, contractEvent, queryA11y, waitForUpdate } from '@/shared/test-utils'

import type { WebUiSegmentedTrigger } from '..'

const createTrigger = (): WebUiSegmentedTrigger => {
  const el = document.createElement('web-ui-segmented-trigger') as WebUiSegmentedTrigger
  document.body.appendChild(el)
  return el
}

/** 点击 role="option" 的公开语义元素（不依赖内部 class 结构）。 */
const clickControl = (el: WebUiSegmentedTrigger) => {
  const control = queryA11y(el, '[role="option"]')
  if (control instanceof HTMLElement) control.click()
}

const pressKey = (el: WebUiSegmentedTrigger, key: string) => {
  const control = queryA11y(el, '[role="option"]')
  if (control instanceof HTMLElement) {
    control.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
  }
}

describe('WebUiSegmentedTrigger 组件', () => {
  describe('属性：checked', () => {
    it('checked 属性反映到 host 元素', async () => {
      const el = createTrigger()
      await waitForUpdate(el)
      expect(el.hasAttribute('checked')).toBe(false)

      el.checked = true
      await waitForUpdate(el)
      expect(el.hasAttribute('checked')).toBe(true)

      el.checked = false
      await waitForUpdate(el)
      expect(el.hasAttribute('checked')).toBe(false)

      cleanupElement(el)
    })
  })

  describe('属性：disabled', () => {
    it('disabled 属性反映到 host 元素并移出 Tab 序列', async () => {
      const el = createTrigger()
      await waitForUpdate(el)
      expect(el.hasAttribute('disabled')).toBe(false)

      el.disabled = true
      await waitForUpdate(el)
      expect(el.hasAttribute('disabled')).toBe(true)

      const control = queryA11y(el, '[role="option"]')
      expect(control?.getAttribute('aria-disabled')).toBe('true')
      expect(control?.getAttribute('tabindex')).toBe('-1')

      cleanupElement(el)
    })
  })

  contractEvent('WebUiSegmentedTrigger 事件契约', () => createTrigger(), [
    {
      title: '点击触发 change 事件',
      act: el => clickControl(el),
      counts: { change: 1 }
    },
    {
      title: '已选中时不重复触发 change 事件',
      act: el => {
        el.checked = true
        clickControl(el)
      },
      counts: { change: 0 }
    },
    {
      title: '禁用时不触发 change 事件',
      act: el => {
        el.disabled = true
        clickControl(el)
      },
      counts: { change: 0 }
    },
    {
      title: '设置属性不触发 change 事件',
      act: el => {
        el.checked = true
        el.value = 'test'
      },
      counts: { change: 0 }
    },
    {
      title: 'Enter 键触发 change',
      act: el => pressKey(el, 'Enter'),
      counts: { change: 1 }
    },
    {
      title: 'Space 键触发 change',
      act: el => pressKey(el, ' '),
      counts: { change: 1 }
    },
    {
      title: '其他键不触发 change',
      act: el => pressKey(el, 'Tab'),
      counts: { change: 0 }
    }
  ])

  describe('可访问性', () => {
    it('拥有 role="option" 和正确的 aria-selected', async () => {
      const el = createTrigger()
      await waitForUpdate(el)

      const control = queryA11y(el, '[role="option"]')
      expect(control?.getAttribute('aria-selected')).toBe('false')

      el.checked = true
      await waitForUpdate(el)

      expect(queryA11y(el, '[role="option"]')?.getAttribute('aria-selected')).toBe('true')

      cleanupElement(el)
    })
  })
})
