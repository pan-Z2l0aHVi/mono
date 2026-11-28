// @vitest-environment jsdom
import { defineLocal } from '@greypan/browser-kit/storage'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vite-plus/test'

import {
  clampSidebarWidth,
  LAYOUT_STORAGE_NAMESPACE,
  SIDEBAR_DEFAULT_WIDTH,
  SIDEBAR_MAX_WIDTH,
  SIDEBAR_MIN_WIDTH,
  useLayoutStore
} from '../layout'

const storage = defineLocal(LAYOUT_STORAGE_NAMESPACE)

describe('useLayoutStore', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('首次启动无持久化数据时使用默认值', () => {
    const layout = useLayoutStore()

    expect(layout.sidebarCollapsed).toBe(false)
    expect(layout.sidebarWidth).toBe(SIDEBAR_DEFAULT_WIDTH)
    expect(layout.sidebarWidthCss).toBe(`${SIDEBAR_DEFAULT_WIDTH}px`)
    expect(layout.libraryFilterOpen).toBe(false)
  })

  it('三项布局状态变更后写入独立 key，重新初始化 store 时完整恢复', () => {
    const first = useLayoutStore()
    first.setSidebarCollapsed(true)
    first.setSidebarWidth('288px')
    first.setLibraryFilterOpen(true)

    expect(storage.get('sidebarCollapsed')).toBe(true)
    expect(storage.get('sidebarWidth')).toBe(288)
    expect(storage.get('libraryFilterOpen')).toBe(true)

    // 模拟应用重启：新建 Pinia 实例重新读取 localStorage。
    setActivePinia(createPinia())
    const restored = useLayoutStore()
    expect(restored.sidebarCollapsed).toBe(true)
    expect(restored.sidebarWidth).toBe(288)
    expect(restored.sidebarWidthCss).toBe('288px')
    expect(restored.libraryFilterOpen).toBe(true)
  })

  it('命令式 toggle action 同步翻转并持久化状态', () => {
    const layout = useLayoutStore()

    layout.toggleSidebarCollapsed()
    layout.toggleLibraryFilterOpen()
    expect(layout.sidebarCollapsed).toBe(true)
    expect(layout.libraryFilterOpen).toBe(true)
    expect(storage.get('sidebarCollapsed')).toBe(true)
    expect(storage.get('libraryFilterOpen')).toBe(true)

    layout.toggleSidebarCollapsed()
    layout.toggleLibraryFilterOpen()
    expect(layout.sidebarCollapsed).toBe(false)
    expect(layout.libraryFilterOpen).toBe(false)
    expect(storage.get('sidebarCollapsed')).toBe(false)
    expect(storage.get('libraryFilterOpen')).toBe(false)
  })

  it('侧边栏宽度按整数收敛并钳位到合法区间', () => {
    expect(clampSidebarWidth(120)).toBe(SIDEBAR_MIN_WIDTH)
    expect(clampSidebarWidth(480)).toBe(SIDEBAR_MAX_WIDTH)
    expect(clampSidebarWidth('275.6px')).toBe(276)
    expect(clampSidebarWidth(0)).toBe(SIDEBAR_DEFAULT_WIDTH)
    expect(clampSidebarWidth(-20)).toBe(SIDEBAR_DEFAULT_WIDTH)
    expect(clampSidebarWidth('not-a-number')).toBe(SIDEBAR_DEFAULT_WIDTH)

    const layout = useLayoutStore()
    layout.setSidebarWidth(999)
    expect(layout.sidebarWidth).toBe(SIDEBAR_MAX_WIDTH)
    expect(storage.get('sidebarWidth')).toBe(SIDEBAR_MAX_WIDTH)

    layout.setSidebarWidth(80)
    expect(layout.sidebarWidth).toBe(SIDEBAR_MIN_WIDTH)
    expect(storage.get('sidebarWidth')).toBe(SIDEBAR_MIN_WIDTH)
  })

  it('存储内容损坏或类型不合法时单字段安全回落默认值，不影响其余字段', () => {
    localStorage.setItem(`${LAYOUT_STORAGE_NAMESPACE}:sidebarCollapsed`, 'not-json')
    localStorage.setItem(`${LAYOUT_STORAGE_NAMESPACE}:sidebarWidth`, JSON.stringify({ m: '_pkg', v: 'bad' }))
    storage.set('libraryFilterOpen', true)

    const layout = useLayoutStore()
    expect(layout.sidebarCollapsed).toBe(false)
    expect(layout.sidebarWidth).toBe(SIDEBAR_DEFAULT_WIDTH)
    expect(layout.libraryFilterOpen).toBe(true)
  })

  it('存储的侧边栏宽度越界时在初始化阶段自动钳位', () => {
    storage.set('sidebarWidth', 500)
    setActivePinia(createPinia())
    expect(useLayoutStore().sidebarWidth).toBe(SIDEBAR_MAX_WIDTH)

    storage.set('sidebarWidth', 90)
    setActivePinia(createPinia())
    expect(useLayoutStore().sidebarWidth).toBe(SIDEBAR_MIN_WIDTH)
  })
})
