import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import '..'
import '@/components/dropdown-item'
import { getMenuPanels, spyEvents, waitForUpdate } from '@/shared/test-utils'

import type { WebUiDropdown } from '..'

function createDropdown(attrs?: Record<string, string>, innerHtml = ''): WebUiDropdown {
  const el = document.createElement('web-ui-dropdown')
  for (const [name, value] of Object.entries(attrs ?? {})) el.setAttribute(name, value)
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

async function nextFrame() {
  await new Promise(resolve => requestAnimationFrame(resolve))
}

/** 面板以公开语义 role="menu" 挂载于 overlay 容器（见 @/shared/test-utils 的 getMenuPanels）。 */
const menuItems = (): HTMLElement[] => {
  const panel = getMenuPanels()[0]
  return panel ? [...panel.querySelectorAll<HTMLElement>('web-ui-dropdown-item')] : []
}

const itemTexts = (): string[] => menuItems().map(item => item.textContent?.trim() ?? '')

/** 子菜单面板：与根面板同为 role="menu"，用层级区分。 */
const submenuPanels = (): HTMLElement[] =>
  getMenuPanels().filter(panel => panel.dataset.level && panel.dataset.level !== '0')

beforeEach(() => {
  document.body.innerHTML = ''
})

afterEach(() => {
  document.body.innerHTML = ''
})

describe('WebUiDropdown 组件', () => {
  describe('trigger 的 ARIA 契约', () => {
    // 菜单型 trigger 必须自报 haspopup 与展开态；漏掉任何一个，AT 都读不出这是个菜单按钮。
    it('aria-haspopup 常驻，aria-expanded 跟随开合', async () => {
      const el = createDropdown({}, SIMPLE)
      await waitForUpdate(el)
      const trigger = el.querySelector<HTMLElement>('[slot="trigger"]')!

      expect(trigger.getAttribute('aria-haspopup')).toBe('menu')
      expect(trigger.getAttribute('aria-expanded')).toBe('false')

      clickTrigger(el)
      await waitForUpdate(el)
      await nextFrame()
      await waitForUpdate(el)

      expect(trigger.getAttribute('aria-expanded')).toBe('true')
      expect(trigger.getAttribute('aria-controls')).not.toBe('')
    })
  })

  describe('disabled', () => {
    it('disabled 时两条打开入口都被挡住', async () => {
      const el = createDropdown({ disabled: '' }, SIMPLE)
      await waitForUpdate(el)

      clickTrigger(el)
      await waitForUpdate(el)
      expect(el.isOpen).toBe(false)

      el.openMenu()
      await waitForUpdate(el)
      expect(el.isOpen).toBe(false)
    })
  })

  describe('打开与关闭', () => {
    it('openMenu() / closeAll() 切换公开的 open 与 isOpen', async () => {
      const el = createDropdown({}, SIMPLE)
      await waitForUpdate(el)

      el.openMenu()
      await waitForUpdate(el)
      expect(el.isOpen).toBe(true)
      expect(el.open).toBe(true)

      el.closeAll()
      await waitForUpdate(el)
      expect(el.isOpen).toBe(false)
      expect(el.open).toBe(false)
    })

    it('trigger 点击切换开合', async () => {
      const el = createDropdown({}, SIMPLE)
      await waitForUpdate(el)

      clickTrigger(el)
      await waitForUpdate(el)
      expect(el.isOpen).toBe(true)

      clickTrigger(el)
      await waitForUpdate(el)
      expect(el.isOpen).toBe(false)
    })

    // 打开菜单会锁住页面滚动；元素被卸载时若不释放，页面就永久滚不动。
    it('打开时锁定页面滚动，卸载后恢复', async () => {
      const el = createDropdown({}, SIMPLE)
      await waitForUpdate(el)

      el.openMenu()
      await waitForUpdate(el)
      expect(document.documentElement.style.overflow).toBe('hidden')

      el.remove()
      expect(document.documentElement.style.overflow).toBe('')
    })

    it('no-scroll-lock 时不锁定页面滚动', async () => {
      const el = createDropdown({ 'no-scroll-lock': '' }, SIMPLE)
      await waitForUpdate(el)

      el.openMenu()
      await waitForUpdate(el)

      expect(document.documentElement.style.overflow).toBe('')
    })

    it('打开后修改定位属性保持菜单可用', async () => {
      const el = createDropdown({}, SIMPLE)
      el.openMenu()
      await waitForUpdate(el)

      el.placement = 'top'
      el.offset = 12
      el.matchWidth = true
      await waitForUpdate(el)
      await nextFrame()

      expect(el.isOpen).toBe(true)
      expect(menuItems()).toHaveLength(2)
    })
  })

  describe('外部点击关闭', () => {
    it('点击面板外部关闭', async () => {
      const el = createDropdown({}, SIMPLE)
      await waitForUpdate(el)
      el.openMenu()
      await waitForUpdate(el)

      await new Promise(resolve => setTimeout(resolve))
      document.body.click()
      await waitForUpdate(el)

      expect(el.isOpen).toBe(false)
    })

    it('点击菜单项不关闭', async () => {
      const el = createDropdown({}, SIMPLE)
      await waitForUpdate(el)
      el.openMenu()
      await waitForUpdate(el)

      el.querySelector('web-ui-dropdown-item')!.click()
      await waitForUpdate(el)

      expect(el.isOpen).toBe(true)
    })

    // 打开面板的那次点击若被当成外部点击，菜单会「开了又关」，用户根本看不到它。
    it('打开菜单的同一次外部点击不关闭', async () => {
      const el = createDropdown({}, SIMPLE)
      await waitForUpdate(el)

      el.openMenu()
      document.body.click()
      await waitForUpdate(el)

      expect(el.isOpen).toBe(true)
    })

    it('外部设置 open=true 的同一点击周期不关闭菜单', async () => {
      const el = createDropdown({}, SIMPLE)
      await waitForUpdate(el)

      el.addEventListener('open-change', () => document.body.click(), { once: true })
      el.open = true
      await waitForUpdate(el)

      expect(el.isOpen).toBe(true)
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
    })

    // 占位层没被释放的话，宿主重挂载后它会重新成为候选并吞掉按键。
    it('面板未建好就卸载时不留下占位层：重挂载后 Escape 不被吞掉', async () => {
      const el = createDropdown({}, SIMPLE)
      await waitForUpdate(el)
      el.openMenu()
      expect(el.isOpen).toBe(true)

      // 同一任务内卸载：open 帧没机会跑，内部仍是空的。
      document.body.removeChild(el)
      await waitForUpdate(el)
      await nextFrame()

      document.body.append(el)
      await waitForUpdate(el)

      const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
      document.dispatchEvent(event)
      expect(event.defaultPrevented).toBe(false)
    })
  })

  /*
   * 重挂载对账：`open` 是公开 prop，卸载不改写它；Lit 又在 detach 期间不记
   * changedProperties，重连后 `updated()` 不再命中 open 分支。锁的是重连后
   * 「open 与真实打开态重新一致」这个不变量，只认公开面板与焦点落点。
   */
  describe('重挂载对账', () => {
    it('打开状态下重挂载会重建根面板与菜单项', async () => {
      const el = createDropdown({}, SIMPLE)
      await waitForUpdate(el)
      el.openMenu()
      await nextFrame()
      await nextFrame()
      expect(getMenuPanels()).toHaveLength(1)

      document.body.removeChild(el)
      await waitForUpdate(el)
      expect(getMenuPanels()).toHaveLength(0)

      document.body.append(el)
      await nextFrame()
      await nextFrame()

      expect(getMenuPanels()).toHaveLength(1)
      expect(itemTexts()).toEqual(['a', 'b'])
    })

    it('重挂载后 Escape 仍关得掉这一层', async () => {
      const el = createDropdown({}, SIMPLE)
      await waitForUpdate(el)
      el.openMenu()
      await nextFrame()
      await nextFrame()

      document.body.removeChild(el)
      await waitForUpdate(el)
      document.body.append(el)
      await nextFrame()
      await nextFrame()
      expect(getMenuPanels()).toHaveLength(1)

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
      await waitForUpdate(el)

      expect(el.isOpen).toBe(false)
    })

    // 重挂载后抢焦点会把用户正在用的地方顶掉，焦点已在别处时必须保持不动。
    it('detach 期间焦点已被别处持有时，重挂载重建面板但不抢焦点', async () => {
      const other = document.createElement('button')
      document.body.append(other)
      const el = createDropdown({}, SIMPLE)
      await waitForUpdate(el)
      el.openMenu()
      await nextFrame()
      await nextFrame()

      document.body.removeChild(el)
      await waitForUpdate(el)
      other.focus()
      expect(document.activeElement).toBe(other)

      document.body.append(el)
      await nextFrame()
      await nextFrame()

      expect(itemTexts()).toEqual(['a', 'b'])
      expect(document.activeElement).toBe(other)
    })

    it('关闭状态重挂载不会凭空打开面板', async () => {
      const el = createDropdown({}, SIMPLE)
      await waitForUpdate(el)

      document.body.removeChild(el)
      await waitForUpdate(el)
      document.body.append(el)
      await nextFrame()
      await nextFrame()

      expect(getMenuPanels()).toHaveLength(0)
    })
  })

  describe('子菜单', () => {
    // 触屏上 hover 是指针划过时的假象；按它开子菜单会让点击子项永远打不开。
    it('touch pointerenter 不打开子菜单', async () => {
      const el = createDropdown(
        {},
        '<button slot="trigger">M</button><web-ui-dropdown-item submenu>导出<web-ui-dropdown-item>PDF</web-ui-dropdown-item></web-ui-dropdown-item>'
      )
      await waitForUpdate(el)
      el.openMenu()
      await nextFrame()
      await nextFrame()

      vi.useFakeTimers()
      try {
        menuItems()[0]!.dispatchEvent(touchPointerEvent('pointerenter'))
        await vi.advanceTimersByTimeAsync(200)
        await el.updateComplete

        // 公开可观察后果是只有一级（根）面板，没有第二级子菜单面板。
        expect(getMenuPanels()).toHaveLength(1)
      } finally {
        vi.useRealTimers()
        el.remove()
      }
    })
  })

  /*
   * 条件渲染边界：framework 的 v-if 会随时增删菜单项。面板里的条目是托管出去的，
   * 源侧的变化必须同步到面板，否则用户点得到一个已经不在数据里的项。
   */
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
      await nextFrame()

      expect(itemTexts()).toEqual(['b', 'a'])
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
      await nextFrame()

      wrapper.remove()
      await waitForUpdate(el)
      await nextFrame()

      expect(itemTexts()).toEqual(['a'])

      getMenuPanels()[0]?.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }))
      await waitForUpdate(el)
      const items = menuItems()
      // 键盘导航仍然有效：删掉成员后剩下的首项仍能接住焦点，而不是导航链断掉。
      expect(items[0]?.shadowRoot?.activeElement, '剩余首项应接住键盘焦点').toBeTruthy()
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
      await nextFrame()

      getMenuPanels()[0]?.querySelector<HTMLElement>('web-ui-dropdown-item[submenu]')?.click()
      await waitForUpdate(el)
      await nextFrame()
      await nextFrame()

      wrapper.remove()
      await waitForUpdate(el)
      await nextFrame()

      // 子层面板里不应残留任何已经不在源侧的条目。
      expect(submenuPanels().flatMap(panel => [...panel.querySelectorAll('web-ui-dropdown-item')])).toEqual([])
    })
  })

  describe('程序式变更不派发 open-change', () => {
    it('open 属性与公开方法都是静默通道', async () => {
      const el = createDropdown({}, SIMPLE)
      await waitForUpdate(el)
      const [events] = spyEvents<CustomEvent<{ open: boolean }>>(el, 'open-change')

      el.openMenu()
      await waitForUpdate(el)
      el.closeAll()
      await waitForUpdate(el)

      expect(events).toHaveLength(0)
    })
  })
})
