import '@/assets/global.css'
import '@greypan/web-ui'

import { afterEach, describe, expect, it } from 'vite-plus/test'
import { createApp, h, nextTick } from 'vue'

import Toolbar from '../library/Toolbar.vue'

const hosts: HTMLElement[] = []

afterEach(() => {
  for (const host of hosts.splice(0)) host.remove()
})

/** 拖动区是 CSS 契约：`--wails-draggable` 只被 Wails 运行时读取，必须读真实计算值。 */
function draggableValue(element: Element | null): string {
  if (!element) throw new Error('element not found')
  return getComputedStyle(element).getPropertyValue('--wails-draggable').trim()
}

async function mountToolbar() {
  const host = document.createElement('div')
  document.body.append(host)
  hosts.push(host)

  const app = createApp({
    render: () =>
      h(Toolbar, {
        searchQuery: '',
        filterSource: 'all',
        filterKind: 'all',
        filterAvailability: 'all',
        filterTag: '',
        sort: 'createdAt',
        sortDirection: 'desc',
        allTagNames: [],
        hasActiveFilter: false,
        filterOpen: false,
        searchOpen: false,
        selectionMode: false,
        selectedCount: 0,
        visibleCount: 0,
        allVisibleSelected: false,
        mobile: false,
        canGoBack: false,
        canGoForward: false,
        canRestore: false
      })
  })
  app.mount(host)
  await nextTick()

  return {
    host,
    find: <T extends Element>(selector: string) => host.querySelector<T>(selector),
    unmount: () => {
      app.unmount()
      host.remove()
    }
  }
}

/*
 * jsdom 不算层叠、也不解读自定义属性继承，所以「按住 header 上的按钮不会拖走窗口」只能在
 * 真实浏览器里读计算值验证：行内的透明底是 drag，行本身与所有控件都不是。Wails 只读事件
 * 目标自己的计算值，所以每类可能被按下的目标都要单独断言。
 */
describe('Toolbar：窗口拖动区（真实读数，浏览器）', () => {
  it('只有行内那层透明底拖动窗口，行与控件都不拖', async () => {
    const mounted = await mountToolbar()

    try {
      const dragSurface = mounted.find('.relative > [data-window-drag]')
      expect(draggableValue(dragSurface)).toBe('drag')
      // 拖动区不是文本，I 形光标会让空白看起来可以选字。
      expect(getComputedStyle(dragSurface!).cursor).toBe('default')

      // 行本身不再是拖动区：它是控件的父级，如果带 drag 会一路继承下去。
      expect(draggableValue(mounted.find('.relative'))).toBe('')

      // 两簇控件：容器与按钮宿主各自都不是拖动区，控件之间的空隙同样不是。
      expect(draggableValue(mounted.find('[aria-label="页面导航"]'))).toBe('')
      expect(draggableValue(mounted.find('web-ui-button[aria-label="后退"]'))).toBe('')
      expect(draggableValue(mounted.find('web-ui-button[aria-label="前进"]'))).toBe('')
      expect(draggableValue(mounted.find('.ml-auto'))).toBe('')
      expect(draggableValue(mounted.find('web-ui-button[aria-label="导入资源"]'))).toBe('')
      expect(draggableValue(mounted.find('web-ui-button[aria-label="筛选和排序"]'))).toBe('')
      expect(draggableValue(mounted.find('web-ui-button[aria-label="搜索"]'))).toBe('')

      // 筛选面板在拖动底之外：整块保持默认值。
      expect(draggableValue(mounted.find('#library-filter-panel'))).toBe('')
    } finally {
      mounted.unmount()
    }
  })
})
