import { describe, expect, it, vi } from 'vite-plus/test'

import '..'
import type { WebUiBadge } from '..'

const createBadge = (attrs?: Record<string, string>, slotContent?: string): WebUiBadge => {
  const el = document.createElement('web-ui-badge') as WebUiBadge
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      el.setAttribute(k, v)
    }
  }
  if (slotContent) el.innerHTML = slotContent
  document.body.appendChild(el)
  return el
}

describe('WebUiBadge', () => {
  describe('基础渲染', () => {
    it('渲染 badge 容器', async () => {
      const el = createBadge()
      await el.updateComplete

      const wrapper = el.shadowRoot?.querySelector('.badge-wrapper')
      expect(wrapper).toBeTruthy()

      el.remove()
    })

    it('默认 count 为 0，不显示徽章', async () => {
      const el = createBadge()
      await el.updateComplete

      const badge = el.shadowRoot?.querySelector('.badge')
      expect(badge).toBeNull()

      el.remove()
    })

    it('默认 max 为 99', async () => {
      const el = createBadge()
      await el.updateComplete

      expect(el.max).toBe(99)

      el.remove()
    })

    it('默认 placement 为 top-right', async () => {
      const el = createBadge()
      await el.updateComplete

      expect(el.placement).toBe('top-right')

      el.remove()
    })
  })

  describe('prop: count', () => {
    it('count > 0 时显示徽章', async () => {
      const el = createBadge({ count: '5' })
      await el.updateComplete

      const badge = el.shadowRoot?.querySelector('.badge')
      expect(badge).toBeTruthy()
      expect(badge?.textContent?.trim()).toBe('5')

      el.remove()
    })

    it('count 为 0 时默认不显示', async () => {
      const el = createBadge({ count: '0' })
      await el.updateComplete

      const badge = el.shadowRoot?.querySelector('.badge')
      expect(badge).toBeNull()

      el.remove()
    })

    it('count 显示为数字文本', async () => {
      const el = createBadge({ count: '42' })
      await el.updateComplete

      const badge = el.shadowRoot?.querySelector('.badge')
      expect(badge?.textContent?.trim()).toBe('42')

      el.remove()
    })
  })

  describe('prop: max', () => {
    it('count 超过 max 时显示 max+', async () => {
      const el = createBadge({ count: '100', max: '99' })
      await el.updateComplete

      const badge = el.shadowRoot?.querySelector('.badge')
      expect(badge?.textContent?.trim()).toBe('99+')

      el.remove()
    })

    it('count 等于 max 时显示数字', async () => {
      const el = createBadge({ count: '99', max: '99' })
      await el.updateComplete

      const badge = el.shadowRoot?.querySelector('.badge')
      expect(badge?.textContent?.trim()).toBe('99')

      el.remove()
    })

    it('count 小于 max 时显示数字', async () => {
      const el = createBadge({ count: '50', max: '99' })
      await el.updateComplete

      const badge = el.shadowRoot?.querySelector('.badge')
      expect(badge?.textContent?.trim()).toBe('50')

      el.remove()
    })

    it('自定义 max 值', async () => {
      const el = createBadge({ count: '10', max: '9' })
      await el.updateComplete

      const badge = el.shadowRoot?.querySelector('.badge')
      expect(badge?.textContent?.trim()).toBe('9+')

      el.remove()
    })

    it('极大数字正确截断', async () => {
      const el = createBadge({ count: '99999', max: '999' })
      await el.updateComplete

      const badge = el.shadowRoot?.querySelector('.badge')
      expect(badge?.textContent?.trim()).toBe('999+')

      el.remove()
    })
  })

  describe('prop: show-zero', () => {
    it('show-zero 时 count=0 显示 0', async () => {
      const el = createBadge({ count: '0', 'show-zero': '' })
      await el.updateComplete

      const badge = el.shadowRoot?.querySelector('.badge')
      expect(badge).toBeTruthy()
      expect(badge?.textContent?.trim()).toBe('0')

      el.remove()
    })

    it('show-zero 为 false 时 count=0 不显示', async () => {
      const el = createBadge({ count: '0' })
      await el.updateComplete

      const badge = el.shadowRoot?.querySelector('.badge')
      expect(badge).toBeNull()

      el.remove()
    })
  })

  describe('prop: badge-hidden', () => {
    it('badge-hidden 时徽章不显示且保留包裹内容', async () => {
      const el = createBadge({ count: '5', 'badge-hidden': '' }, '<button>隐藏徽标</button>')
      await el.updateComplete

      const badge = el.shadowRoot?.querySelector('.badge')
      expect(badge).toBeNull()
      expect(el.querySelector('button')?.textContent).toBe('隐藏徽标')
      expect(el.hidden).toBe(false)

      el.remove()
    })

    it('badge-hidden 时 dot 也不显示', async () => {
      const el = createBadge({ dot: '', 'badge-hidden': '' })
      await el.updateComplete

      const badge = el.shadowRoot?.querySelector('.badge')
      expect(badge).toBeNull()

      el.remove()
    })
  })

  describe('prop: dot', () => {
    it('dot 模式显示圆点', async () => {
      const el = createBadge({ dot: '' })
      await el.updateComplete

      const badge = el.shadowRoot?.querySelector('.badge')
      expect(badge).toBeTruthy()
      expect(badge?.textContent?.trim()).toBe('')
      expect(badge?.classList.contains('badge-dot')).toBe(true)

      el.remove()
    })

    it('dot 模式不显示数字', async () => {
      const el = createBadge({ count: '5', dot: '' })
      await el.updateComplete

      const badge = el.shadowRoot?.querySelector('.badge')
      expect(badge?.textContent?.trim()).toBe('')
      expect(badge?.classList.contains('badge-dot')).toBe(true)

      el.remove()
    })

    it('dot 模式即使 count=0 也显示', async () => {
      const el = createBadge({ count: '0', dot: '' })
      await el.updateComplete

      const badge = el.shadowRoot?.querySelector('.badge')
      expect(badge).toBeTruthy()

      el.remove()
    })
  })

  describe('dot 与 count 互斥', () => {
    it('dot=true 优先于 count，显示圆点', async () => {
      const el = createBadge({ count: '10', dot: '' })
      await el.updateComplete

      const badge = el.shadowRoot?.querySelector('.badge')
      expect(badge?.classList.contains('badge-dot')).toBe(true)
      expect(badge?.textContent?.trim()).toBe('')

      el.remove()
    })

    it('dot=false 时正常显示 count', async () => {
      const el = createBadge({ count: '10' })
      await el.updateComplete

      const badge = el.shadowRoot?.querySelector('.badge')
      expect(badge?.classList.contains('badge-dot')).toBe(false)
      expect(badge?.textContent?.trim()).toBe('10')

      el.remove()
    })
  })

  describe('prop: placement', () => {
    it('top-left placement 反射到 host', async () => {
      const el = createBadge({ count: '1', placement: 'top-left' })
      await el.updateComplete

      expect(el.getAttribute('placement')).toBe('top-left')

      el.remove()
    })

    it('bottom-right placement 反射到 host', async () => {
      const el = createBadge({ count: '1', placement: 'bottom-right' })
      await el.updateComplete

      expect(el.getAttribute('placement')).toBe('bottom-right')

      el.remove()
    })

    it('bottom-left placement 反射到 host', async () => {
      const el = createBadge({ count: '1', placement: 'bottom-left' })
      await el.updateComplete

      expect(el.getAttribute('placement')).toBe('bottom-left')

      el.remove()
    })
  })

  describe('prop: offset-x / offset-y', () => {
    it('声明式 offset-x 和 offset-y 映射为数值属性', async () => {
      const el = createBadge({ count: '1', 'offset-x': '-4', 'offset-y': '6' })
      await el.updateComplete

      expect(el.offsetX).toBe(-4)
      expect(el.offsetY).toBe(6)

      el.remove()
    })

    it('偏移量通过 CSS 变量传递给徽标', async () => {
      const el = createBadge({ count: '1', 'offset-x': '-4', 'offset-y': '6' }, '<span>通知</span>')
      await el.updateComplete

      const badge = el.shadowRoot?.querySelector('.badge') as HTMLElement
      expect(badge.style.getPropertyValue('--badge-offset-x')).toBe('-4px')
      expect(badge.style.getPropertyValue('--badge-offset-y')).toBe('6px')

      el.remove()
    })
  })

  describe('独立使用（无 slot）', () => {
    it('无 slot 时徽章正常显示', async () => {
      const el = createBadge({ count: '3' })
      await el.updateComplete

      const badge = el.shadowRoot?.querySelector('.badge')
      expect(badge).toBeTruthy()
      expect(badge?.textContent?.trim()).toBe('3')

      el.remove()
    })

    it('无 slot 时 dot 正常显示', async () => {
      const el = createBadge({ dot: '' })
      await el.updateComplete

      const badge = el.shadowRoot?.querySelector('.badge')
      expect(badge).toBeTruthy()

      el.remove()
    })

    it('无 slot 时徽章不使用 fixed 布局', async () => {
      const el = createBadge({ count: '3' })
      await el.updateComplete

      const badge = el.shadowRoot?.querySelector('.badge') as HTMLElement
      expect(badge.classList.contains('badge-fixed')).toBe(false)

      el.remove()
    })
  })

  describe('包裹内容（有 slot）', () => {
    it('有 slot 内容时徽章叠加显示', async () => {
      const el = createBadge({ count: '3' }, '<button>消息</button>')
      await el.updateComplete

      const badge = el.shadowRoot?.querySelector('.badge')
      expect(badge).toBeTruthy()
      expect(badge?.classList.contains('badge-fixed')).toBe(true)

      el.remove()
    })

    it('slot 内容存在时 badge 有 fixed 类', async () => {
      const el = createBadge({ count: '1' }, '<span>通知</span>')
      await el.updateComplete

      const badge = el.shadowRoot?.querySelector('.badge')
      expect(badge?.classList.contains('badge-fixed')).toBe(true)

      el.remove()
    })

    it('包裹内容时徽章使用 fixed 布局', async () => {
      const el = createBadge({ count: '1' }, '<span>通知</span>')
      await el.updateComplete

      const badge = el.shadowRoot?.querySelector('.badge') as HTMLElement
      expect(badge.classList.contains('badge-fixed')).toBe(true)

      el.remove()
    })

    it('圆点模式保留 bottom-left placement 属性', async () => {
      const el = createBadge({ dot: '', placement: 'bottom-left' }, '<span>通知</span>')
      await el.updateComplete

      const badge = el.shadowRoot?.querySelector('.badge') as HTMLElement
      expect(badge.classList.contains('badge-dot')).toBe(true)
      expect(el.getAttribute('placement')).toBe('bottom-left')

      el.remove()
    })
  })

  describe('a11y', () => {
    it('count 模式 aria-label 为"N 条未读消息"', async () => {
      const el = createBadge({ count: '3' })
      await el.updateComplete

      const badge = el.shadowRoot?.querySelector('.badge') as HTMLElement
      expect(badge.getAttribute('aria-label')).toBe('3 条未读消息')

      el.remove()
    })

    it('dot 模式 aria-label 为"未读"', async () => {
      const el = createBadge({ dot: '' })
      await el.updateComplete

      const badge = el.shadowRoot?.querySelector('.badge') as HTMLElement
      expect(badge.getAttribute('aria-label')).toBe('未读')

      el.remove()
    })

    it('show-zero 时 aria-label 为"无未读消息"', async () => {
      const el = createBadge()
      el.count = 0
      el.showZero = true
      await el.updateComplete

      const badge = el.shadowRoot?.querySelector('.badge') as HTMLElement
      expect(badge.getAttribute('aria-label')).toBe('无未读消息')

      el.remove()
    })

    it('徽章有 role="status"', async () => {
      const el = createBadge({ count: '1' })
      await el.updateComplete

      const badge = el.shadowRoot?.querySelector('.badge') as HTMLElement
      expect(badge.getAttribute('role')).toBe('status')

      el.remove()
    })

    it('badge-hidden 时无 aria 元素', async () => {
      const el = createBadge({ count: '5', 'badge-hidden': '' })
      await el.updateComplete

      const badge = el.shadowRoot?.querySelector('.badge')
      expect(badge).toBeNull()

      el.remove()
    })
  })

  describe('极端值', () => {
    it('极大 count 值正确显示', async () => {
      const el = createBadge({ count: '999999' })
      await el.updateComplete

      const badge = el.shadowRoot?.querySelector('.badge')
      expect(badge?.textContent?.trim()).toBe('99+')

      el.remove()
    })

    it('负数 count 不显示徽章', async () => {
      const el = createBadge({ count: '-1' })
      await el.updateComplete

      const badge = el.shadowRoot?.querySelector('.badge')
      expect(badge).toBeNull()

      el.remove()
    })

    it('max=0 时所有正数都显示 0+', async () => {
      const el = createBadge({ count: '5', max: '0' })
      await el.updateComplete

      const badge = el.shadowRoot?.querySelector('.badge')
      expect(badge?.textContent?.trim()).toBe('0+')

      el.remove()
    })
  })
})
