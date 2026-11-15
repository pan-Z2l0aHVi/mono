import { afterEach, describe, expect, it } from 'vite-plus/test'
import { createApp, h, nextTick } from 'vue'

import Toolbar from '../Toolbar.vue'

const hosts: HTMLElement[] = []

afterEach(() => {
  for (const host of hosts.splice(0)) host.remove()
})

async function mountToolbar(onSearchOpen: (value: boolean) => void) {
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
        // 搜索框展开态：用例关心的就是它的收起时机。
        searchOpen: true,
        selectionMode: false,
        selectedCount: 0,
        visibleCount: 0,
        allVisibleSelected: false,
        mobile: false,
        canGoBack: false,
        canGoForward: false,
        canRestore: false,
        'onUpdate:searchOpen': onSearchOpen
      })
  })
  app.mount(host)
  await nextTick()

  return {
    host,
    searchInput: () => host.querySelector<HTMLElement>('web-ui-input'),
    unmount: () => {
      app.unmount()
      host.remove()
    }
  }
}

/*
 * 搜索框收起会把输入框换回搜索按钮、让右侧簇整排位移。若在 focusout 里当场收起，这次点击的
 * mouseup 就落在挪走的元素上，click 不触发——点别的按钮等于只关掉搜索框。用例钉住的是：
 * 按在操作簇里时保持展开，按在簇外或键盘离开时才收起。
 */
describe('Toolbar：搜索框的收起时机', () => {
  function pressPointerDownOn(element: Element) {
    element.dispatchEvent(new Event('pointerdown', { bubbles: true }))
  }

  function blurSearchInput(mounted: { searchInput: () => HTMLElement | null }) {
    mounted.searchInput()!.dispatchEvent(new FocusEvent('focusout'))
  }

  it('按在操作簇里的控件上时不收起，搜索框继续留着', async () => {
    const closes: boolean[] = []
    const mounted = await mountToolbar(value => closes.push(value))

    try {
      pressPointerDownOn(mounted.host.querySelector('[aria-label="筛选和排序"]')!)
      blurSearchInput(mounted)
      await nextTick()

      expect(closes).toEqual([])
    } finally {
      mounted.unmount()
    }
  })

  it('按在簇外时（列表、空白）照常收起', async () => {
    const closes: boolean[] = []
    const mounted = await mountToolbar(value => closes.push(value))

    try {
      // 簇外按下不会经过操作簇的 pointerdown，focusout 就是「真的离开了」。
      pressPointerDownOn(document.body)
      blurSearchInput(mounted)
      await nextTick()

      expect(closes).toEqual([false])
    } finally {
      mounted.unmount()
    }
  })

  it('Escape 收起搜索框', async () => {
    const closes: boolean[] = []
    const mounted = await mountToolbar(value => closes.push(value))

    try {
      mounted.searchInput()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      await nextTick()

      expect(closes).toEqual([false])
    } finally {
      mounted.unmount()
    }
  })

  it('没有按下时（Tab 离开）立刻收起', async () => {
    const closes: boolean[] = []
    const mounted = await mountToolbar(value => closes.push(value))

    try {
      blurSearchInput(mounted)
      await nextTick()

      expect(closes).toEqual([false])
    } finally {
      mounted.unmount()
    }
  })

  // 簇内那一次交互结束后标记要清掉，否则下一次「真的离开」会被吞掉一次。
  it('簇内点击结束后清掉标记，后续离开输入框仍会收起', async () => {
    const closes: boolean[] = []
    const mounted = await mountToolbar(value => closes.push(value))

    try {
      pressPointerDownOn(mounted.host.querySelector('[aria-label="筛选和排序"]')!)
      mounted.host.querySelector('[aria-label="筛选和排序"]')!.dispatchEvent(new Event('click', { bubbles: true }))
      await nextTick()

      blurSearchInput(mounted)
      await nextTick()

      expect(closes).toEqual([false])
    } finally {
      mounted.unmount()
    }
  })
})
