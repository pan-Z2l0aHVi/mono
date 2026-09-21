import { describe, expect, it, vi, afterEach, beforeEach } from 'vite-plus/test'

import '..'
import { cleanupElement, getMenuPanels, waitForUpdate } from '@/shared/test-utils'

import type { WebUiDropdown } from '..'

function createDropdown(attrs?: Record<string, string>, innerHtml = ''): WebUiDropdown {
  const el = document.createElement('web-ui-dropdown')
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      el.setAttribute(k, v)
    }
  }
  el.innerHTML = innerHtml
  document.body.appendChild(el)
  return el
}

const SIMPLE =
  '<button slot="trigger">M</button><web-ui-dropdown-item>a</web-ui-dropdown-item><web-ui-dropdown-item>b</web-ui-dropdown-item>'

const clickTrigger = (el: WebUiDropdown) => {
  el.querySelector<HTMLElement>('[slot="trigger"]')?.click()
}

function touchPointerEvent(type: string): PointerEvent {
  const event = new PointerEvent(type)
  Object.defineProperty(event, 'pointerType', { value: 'touch' })
  return event
}

// 面板以公开语义 role="menu" 挂载于 overlay 容器（见 @/shared/test-utils 的 getMenuPanels）；
// 不再依赖内部 class `.dropdown-overlay`。子菜单为额外的 `[role="menu"]` 面板（data-level 递增）。
function getMenuItem(): HTMLElement | null {
  return getMenuPanels()[0]?.querySelector<HTMLElement>('web-ui-dropdown-item') ?? null
}

function getMenuItems(): HTMLElement[] {
  const panel = getMenuPanels()[0]
  return panel ? [...panel.querySelectorAll<HTMLElement>('web-ui-dropdown-item')] : []
}

beforeEach(() => {
  document.body.innerHTML = ''
})

afterEach(() => {
  document.body.innerHTML = ''
})

describe('WebUiDropdown 组件', () => {
  describe('基础渲染', () => {
    it('默认关闭', async () => {
      const el = createDropdown({}, SIMPLE)
      await waitForUpdate(el)
      expect(el.isOpen).toBe(false)
      cleanupElement(el)
    })

    it('aria-haspopup / aria-expanded 回写到 trigger 元素', async () => {
      const el = createDropdown({}, SIMPLE)
      await waitForUpdate(el)

      const trigger = el.querySelector<HTMLElement>('[slot="trigger"]')!
      expect(trigger.getAttribute('aria-haspopup')).toBe('menu')
      expect(trigger.getAttribute('aria-expanded')).toBe('false')
      // 未打开时面板尚未创建，不写 aria-controls
      expect(trigger.hasAttribute('aria-controls')).toBe(false)

      clickTrigger(el)
      await waitForUpdate(el)
      await new Promise(resolve => requestAnimationFrame(resolve))
      await waitForUpdate(el)

      expect(trigger.getAttribute('aria-expanded')).toBe('true')
      expect(trigger.getAttribute('aria-controls')).not.toBe('')

      cleanupElement(el)
    })
  })

  describe('属性：open', () => {
    it('open 属性反射到 host', async () => {
      const el = createDropdown({}, SIMPLE)
      el.open = true
      await waitForUpdate(el)
      expect(el.hasAttribute('open')).toBe(true)

      el.open = false
      await waitForUpdate(el)
      expect(el.hasAttribute('open')).toBe(false)

      cleanupElement(el)
    })

    it('设置 open=true 打开菜单', async () => {
      const el = createDropdown({}, SIMPLE)
      el.open = true
      await waitForUpdate(el)
      expect(el.isOpen).toBe(true)
      cleanupElement(el)
    })

    it('设置 open=false 关闭菜单', async () => {
      const el = createDropdown({}, SIMPLE)
      el.open = true
      await waitForUpdate(el)
      expect(el.isOpen).toBe(true)

      el.open = false
      await waitForUpdate(el)
      expect(el.isOpen).toBe(false)
      cleanupElement(el)
    })
  })

  describe('属性：disabled', () => {
    it('disabled 反射到 host', async () => {
      const el = createDropdown({ disabled: '' }, SIMPLE)
      await waitForUpdate(el)
      expect(el.hasAttribute('disabled')).toBe(true)
      cleanupElement(el)
    })

    it('disabled 时 openMenu() 不生效', async () => {
      const el = createDropdown({ disabled: '' }, SIMPLE)
      await waitForUpdate(el)
      el.openMenu()
      await waitForUpdate(el)
      expect(el.isOpen).toBe(false)
      cleanupElement(el)
    })

    it('disabled 时 trigger 点击不打开', async () => {
      const el = createDropdown({ disabled: '' }, SIMPLE)
      await waitForUpdate(el)

      clickTrigger(el)
      await waitForUpdate(el)
      expect(el.isOpen).toBe(false)
      cleanupElement(el)
    })
  })

  describe('属性：placement / offset', () => {
    it('match-width 映射到 matchWidth', async () => {
      const el = createDropdown({ 'match-width': '' }, SIMPLE)
      await waitForUpdate(el)
      expect(el.matchWidth).toBe(true)
      cleanupElement(el)
    })

    it('placement 反射到 host', async () => {
      const el = createDropdown({ placement: 'top-end' }, SIMPLE)
      await waitForUpdate(el)
      expect(el.getAttribute('placement')).toBe('top-end')
      cleanupElement(el)
    })

    it('placement 默认值为 bottom-start', async () => {
      const el = createDropdown({}, SIMPLE)
      expect(el.placement).toBe('bottom-start')
      cleanupElement(el)
    })

    it('offset 默认值为 4', () => {
      const el = createDropdown({}, SIMPLE)
      expect(el.offset).toBe(4)
      cleanupElement(el)
    })

    it('offset 支持自定义', () => {
      const el = createDropdown({}, SIMPLE)
      el.offset = 16
      expect(el.offset).toBe(16)
      cleanupElement(el)
    })

    it('打开后修改定位属性保持菜单可用', async () => {
      const el = createDropdown({}, SIMPLE)
      el.openMenu()
      await waitForUpdate(el)
      el.placement = 'top'
      el.offset = 12
      el.matchWidth = true
      await waitForUpdate(el)
      await new Promise(resolve => requestAnimationFrame(resolve))

      expect(el.isOpen).toBe(true)
      expect(getMenuItem()).toBeTruthy()
      cleanupElement(el)
    })
  })

  describe('打开/关闭', () => {
    it('卸载打开的菜单时恢复页面滚动', async () => {
      const el = createDropdown({}, SIMPLE)
      await waitForUpdate(el)

      el.openMenu()
      await waitForUpdate(el)
      expect(document.body.style.position).toBe('fixed')

      cleanupElement(el)

      expect(document.body.style.position).toBe('')
    })

    it('no-scroll-lock 为 true 时打开不锁定页面滚动', async () => {
      const el = createDropdown({ 'no-scroll-lock': '' }, SIMPLE)
      await waitForUpdate(el)
      el.openMenu()
      await waitForUpdate(el)

      expect(document.body.style.position).toBe('')
      cleanupElement(el)
    })

    it('openMenu() 打开菜单', async () => {
      const el = createDropdown({}, SIMPLE)
      await waitForUpdate(el)
      el.openMenu()
      await waitForUpdate(el)
      expect(el.isOpen).toBe(true)
      expect(el.open).toBe(true)
      cleanupElement(el)
    })

    it('closeAll() 关闭菜单', async () => {
      const el = createDropdown({}, SIMPLE)
      await waitForUpdate(el)
      el.openMenu()
      await waitForUpdate(el)
      el.closeAll()
      await waitForUpdate(el)
      expect(el.isOpen).toBe(false)
      expect(el.open).toBe(false)
      cleanupElement(el)
    })

    it('trigger 点击切换打开/关闭', async () => {
      const el = createDropdown({}, SIMPLE)
      await waitForUpdate(el)

      clickTrigger(el)
      await waitForUpdate(el)
      expect(el.isOpen).toBe(true)

      clickTrigger(el)
      await waitForUpdate(el)
      expect(el.isOpen).toBe(false)
      cleanupElement(el)
    })
  })

  describe('外部点击关闭', () => {
    it('外部设置 open=true 的同一点击周期不关闭菜单', async () => {
      const el = createDropdown({}, SIMPLE)
      await waitForUpdate(el)

      el.addEventListener('open-change', () => document.body.click(), { once: true })
      el.open = true
      await waitForUpdate(el)

      expect(el.isOpen).toBe(true)
      cleanupElement(el)
    })

    it('打开菜单的同一次外部点击不关闭', async () => {
      const el = createDropdown({}, SIMPLE)
      await waitForUpdate(el)

      el.openMenu()
      document.body.click()
      await waitForUpdate(el)

      expect(el.isOpen).toBe(true)
      cleanupElement(el)
    })

    it('点击面板内部不关闭', async () => {
      const el = createDropdown({}, SIMPLE)
      await waitForUpdate(el)

      el.openMenu()
      await waitForUpdate(el)
      const item = el.querySelector('web-ui-dropdown-item')!
      item.click()
      await waitForUpdate(el)

      expect(el.isOpen).toBe(true)
      cleanupElement(el)
    })

    it('点击外部关闭', async () => {
      const el = createDropdown({}, SIMPLE)
      await waitForUpdate(el)

      el.openMenu()
      await waitForUpdate(el)
      expect(el.isOpen).toBe(true)

      await new Promise(resolve => setTimeout(resolve))
      document.body.click()
      await waitForUpdate(el)
      expect(el.isOpen).toBe(false)
      cleanupElement(el)
    })
  })

  describe('键盘', () => {
    it('Escape 关闭菜单', async () => {
      const el = createDropdown({}, SIMPLE)
      await waitForUpdate(el)
      el.openMenu()
      await waitForUpdate(el)
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      await waitForUpdate(el)
      expect(el.isOpen).toBe(false)
      cleanupElement(el)
    })

    it('面板还没建好就卸载时不留下占位层：重挂载后 Escape 不被吞掉', async () => {
      const el = createDropdown({}, SIMPLE)
      await waitForUpdate(el)

      // 占位会话：真实面板要等一帧才建好，_openMenu 先用宿主当 panel claim 一次。
      el.openMenu()
      expect(el.isOpen).toBe(true)

      // 同一任务内卸载：open 帧没机会跑，_overlays 仍是空的。
      document.body.removeChild(el)
      await waitForUpdate(el)
      await new Promise(resolve => requestAnimationFrame(resolve))

      document.body.append(el)
      await waitForUpdate(el)

      // 占位层若没被释放，宿主重挂载后它会重新成为候选并吞掉按键。
      const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
      document.dispatchEvent(event)
      expect(event.defaultPrevented).toBe(false)

      cleanupElement(el)
    })
  })

  describe('重挂载对账', () => {
    /*
     * issue #120：`disconnectedCallback` 拆面板、把菜单项迁回宿主，但 `open` 是公开 prop，
     * 不因卸载而改写；Lit 又在 detach 期间不记 changedProperties，重连后 `updated()` 不再
     * 命中 open 分支。下面几条锁的是重连后「open 与真实打开态重新一致」这个不变量，只认
     * 公开面板（role="menu"）、`isOpen` 与焦点落点，不读 `_overlays` 等内部结构。
     */
    it('打开状态下重挂载会重建根面板', async () => {
      const el = createDropdown({}, SIMPLE)
      await waitForUpdate(el)
      el.openMenu()
      await new Promise(resolve => requestAnimationFrame(resolve))
      await new Promise(resolve => requestAnimationFrame(resolve))
      expect(getMenuPanels()).toHaveLength(1)

      document.body.removeChild(el)
      await waitForUpdate(el)
      expect(getMenuPanels()).toHaveLength(0)

      document.body.append(el)
      await new Promise(resolve => requestAnimationFrame(resolve))
      await new Promise(resolve => requestAnimationFrame(resolve))
      expect(getMenuPanels()).toHaveLength(1)
      expect(getMenuItems()).toHaveLength(2)
      cleanupElement(el)
    })

    it('重挂载后 Escape 关得掉这一层', async () => {
      const el = createDropdown({}, SIMPLE)
      await waitForUpdate(el)
      el.openMenu()
      await new Promise(resolve => requestAnimationFrame(resolve))
      await new Promise(resolve => requestAnimationFrame(resolve))

      document.body.removeChild(el)
      await waitForUpdate(el)
      document.body.append(el)
      await new Promise(resolve => requestAnimationFrame(resolve))
      await new Promise(resolve => requestAnimationFrame(resolve))
      expect(getMenuPanels()).toHaveLength(1)

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
      await waitForUpdate(el)
      expect(el.isOpen).toBe(false)
      cleanupElement(el)
    })

    it('detach 期间焦点已被别处持有时，重挂载重建面板但不抢焦点', async () => {
      const other = document.createElement('button')
      document.body.append(other)
      const el = createDropdown({}, SIMPLE)
      await waitForUpdate(el)
      el.openMenu()
      await new Promise(resolve => requestAnimationFrame(resolve))
      await new Promise(resolve => requestAnimationFrame(resolve))

      document.body.removeChild(el)
      await waitForUpdate(el)
      other.focus()
      expect(document.activeElement).toBe(other)

      document.body.append(el)
      await new Promise(resolve => requestAnimationFrame(resolve))
      await new Promise(resolve => requestAnimationFrame(resolve))
      expect(getMenuItems()).toHaveLength(2)
      expect(document.activeElement).toBe(other)
      cleanupElement(el)
    })

    it('关闭状态重挂载不会凭空打开面板', async () => {
      const el = createDropdown({}, SIMPLE)
      await waitForUpdate(el)

      document.body.removeChild(el)
      await waitForUpdate(el)
      document.body.append(el)
      await new Promise(resolve => requestAnimationFrame(resolve))
      await new Promise(resolve => requestAnimationFrame(resolve))
      expect(getMenuPanels()).toHaveLength(0)
      cleanupElement(el)
    })
  })

  describe('子菜单悬停', () => {
    it('touch pointerenter 不打开子菜单', async () => {
      const el = createDropdown(
        {},
        '<button slot="trigger">M</button><web-ui-dropdown-item submenu>导出<web-ui-dropdown-item>PDF</web-ui-dropdown-item></web-ui-dropdown-item>'
      )
      await waitForUpdate(el)
      el.openMenu()
      await new Promise(resolve => requestAnimationFrame(resolve))
      await new Promise(resolve => requestAnimationFrame(resolve))

      vi.useFakeTimers()
      try {
        const item = getMenuItem()!
        item.dispatchEvent(touchPointerEvent('pointerenter'))
        await vi.advanceTimersByTimeAsync(200)
        await el.updateComplete

        // touch pointerenter 不应打开子菜单：公开可观察后果是仅存在一级（根）菜单面板，
        // 不出现第二级（data-level="1"）子菜单面板。`active` 是组件写给子项的内部状态标记，
        // 非 web-ui-dropdown-item 的公开 @property（见 dropdown-item/index.ts:13-16），故改判面板数。
        expect(getMenuPanels()).toHaveLength(1)

        cleanupElement(el)
      } finally {
        vi.useRealTimers()
      }
    })
  })

  describe('条件渲染边界', () => {
    it('关闭状态把注释锚点替换为 wrapper 后，新成员进入菜单', async () => {
      const el = createDropdown(
        {},
        '<button slot="trigger">M</button><!--items--><web-ui-dropdown-item>a</web-ui-dropdown-item>'
      )
      await waitForUpdate(el)

      const comment = [...el.childNodes].find(node => node.nodeType === Node.COMMENT_NODE) as Comment
      const wrapper = document.createElement('div')
      wrapper.innerHTML = '<web-ui-dropdown-item>b</web-ui-dropdown-item>'
      el.replaceChild(wrapper, comment)
      await waitForUpdate(el)

      el.openMenu()
      await waitForUpdate(el)
      await new Promise(resolve => requestAnimationFrame(resolve))

      expect(getMenuItems().map(item => item.textContent?.trim())).toEqual(['b', 'a'])

      cleanupElement(el)
    })

    it('打开时删除 wrapper 后立即从菜单移除成员并保持键盘导航有效', async () => {
      const el = createDropdown(
        {},
        '<button slot="trigger">M</button><web-ui-dropdown-item>a</web-ui-dropdown-item><div><web-ui-dropdown-item>b</web-ui-dropdown-item></div>'
      )
      await waitForUpdate(el)
      const wrapper = el.querySelector('div')!
      el.openMenu()
      await waitForUpdate(el)
      await new Promise(resolve => requestAnimationFrame(resolve))

      wrapper.remove()
      await waitForUpdate(el)
      await new Promise(resolve => requestAnimationFrame(resolve))

      expect(getMenuItems().map(item => item.textContent?.trim())).toEqual(['a'])

      const overlay = getMenuPanels()[0]
      overlay?.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }))
      await waitForUpdate(el)
      const items = getMenuItems()
      const focusedItem = items.find(item => item.shadowRoot?.activeElement)
      expect(focusedItem).toBe(items[0])

      cleanupElement(el)
    })

    it('打开时删除嵌套子菜单 wrapper 后同步移除子成员', async () => {
      const el = createDropdown(
        {},
        '<button slot="trigger">M</button><web-ui-dropdown-item submenu>导出<div><web-ui-dropdown-item>PDF</web-ui-dropdown-item></div></web-ui-dropdown-item>'
      )
      await waitForUpdate(el)

      const wrapper = el.querySelector('web-ui-dropdown-item div')!
      el.openMenu()
      await waitForUpdate(el)
      await new Promise(resolve => requestAnimationFrame(resolve))

      const parent = getMenuPanels()[0]?.querySelector<HTMLElement>('web-ui-dropdown-item[submenu]')
      parent?.click()
      await waitForUpdate(el)
      await new Promise(resolve => requestAnimationFrame(resolve))
      await new Promise(resolve => requestAnimationFrame(resolve))

      wrapper.remove()
      await waitForUpdate(el)
      await new Promise(resolve => requestAnimationFrame(resolve))

      // 删除嵌套子菜单源 wrapper 后，第二级（data-level !== "0"）菜单面板内不应残留任何条目。
      const submenuItems = getMenuPanels()
        .filter(panel => panel.dataset.level && panel.dataset.level !== '0')
        .flatMap(panel => [...panel.querySelectorAll<HTMLElement>('web-ui-dropdown-item')])
      expect(submenuItems).toEqual([])

      cleanupElement(el)
    })
  })
})
