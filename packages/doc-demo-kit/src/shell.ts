import { local } from '@greypan/browser-kit'

import {
  DEFAULT_SIDEBAR_WIDTH_PX,
  isSidebarWidth,
  isThemeAppearance,
  isThemeMotion,
  SIDEBAR_WIDTH_STORAGE_KEY,
  THEME_APPEARANCE_STORAGE_KEY,
  THEME_MOTION_STORAGE_KEY,
  type ThemeAppearance,
  type ThemeMotion
} from './theme'

/** 移动端 drawer 的宽度：shell 状态统一派生，两端不再各写一份字面量。 */
export const MOBILE_SIDEBAR_WIDTH = 'min(320px, 80vw)'

export interface ShellStateSnapshot {
  appearance: ThemeAppearance
  motion: ThemeMotion
  sidebarCollapsed: boolean
  sidebarOpen: boolean
  sidebarWidth: string
  /** 折叠是桌面端的密度偏好：移动端 drawer 恒以展开态呈现（`web-ui-layout` 的契约）。 */
  navCollapsed: boolean
}

export interface ShellStateController {
  /**
   * 状态快照：整体引用只在提交时更换，框架侧按引用相等跳过无关渲染
   * （React `useSyncExternalStore` 要求 getSnapshot 稳定，Vue 侧按同一约定同步 ref）。
   */
  getSnapshot: () => ShellStateSnapshot
  subscribe: (listener: () => void) => () => void
  /** select 的 change 值原样进来：合法才提交并持久化，非法静默忽略（受控宿主保持已提交值）。 */
  setAppearance: (value: unknown) => void
  setMotion: (value: unknown) => void
  /** 拖拽调宽的受控回写 + 持久化；只接受 `px` 长度（判据见 theme 的校验用例）。 */
  setSidebarWidth: (value: unknown) => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setSidebarOpen: (open: boolean) => void
  /**
   * 断点判定留在 app（ADR-0023）：`useMobile` / `useLayoutMobile` 的结论由这里消费，
   * 只用于派生 `navCollapsed` 与移动端 drawer 宽度，不落盘。
   */
  setMobile: (mobile: boolean) => void
  /** layout 三个 sidebar 事件的统一入口：先过 `isOwnLayoutEvent`，再按事件类型分发。 */
  applyLayoutEvent: (event: Event) => void
}

/**
 * layout 的四个 `*-change` 都是 `bubbles: true, composed: true`，而文档页里示例的 `web-ui-layout` 就挂在
 * 本站侧栏的子树内，它一翻转事件就顺着冒到 shell。只采信自己这一层：窄视口下点示例的 Toggle，本站
 * drawer 会跟着打开（实测 `shellDrawerOpen: true`，命中的那条事件 `target` 是示例元素）。
 */
export function isOwnLayoutEvent(event: Event): boolean {
  return event.target === event.currentTarget
}

/*
 * 落盘统一走 `@greypan/browser-kit` 的 `local`（SecurityError 与损坏数据都已在那一层降级）。
 * React 旧版以 JSON 字串编码（`"dark"`、`"240px"`），读取处兼容一次解包；下一次提交会写成
 * `local` 的统一编码。
 */
function readStoredValue(key: string): unknown {
  const raw = local.get<string | null>(key)
  if (typeof raw !== 'string' || !raw.startsWith('"')) return raw
  try {
    const parsed: unknown = JSON.parse(raw)
    return typeof parsed === 'string' ? parsed : raw
  } catch {
    return raw
  }
}

/** 创建 shell 状态机：appearance / motion / sidebar 的持久化、校验、事件过滤与派生都在这一份实现里。 */
export function createShellState(): ShellStateController {
  function readValidated<T>(key: string, validate: (value: unknown) => value is T, fallback: T): T {
    const value = readStoredValue(key)
    return validate(value) ? value : fallback
  }

  let appearance = readValidated(THEME_APPEARANCE_STORAGE_KEY, isThemeAppearance, 'light' as const)
  let motion = readValidated(THEME_MOTION_STORAGE_KEY, isThemeMotion, 'system' as const)
  let sidebarCollapsed = false
  let sidebarOpen = false
  let desktopSidebarWidth = readValidated(SIDEBAR_WIDTH_STORAGE_KEY, isSidebarWidth, DEFAULT_SIDEBAR_WIDTH_PX)
  let mobile = false

  let snapshot: ShellStateSnapshot
  const listeners = new Set<() => void>()

  function recompute() {
    snapshot = Object.freeze({
      appearance,
      motion,
      sidebarCollapsed,
      sidebarOpen,
      sidebarWidth: mobile ? MOBILE_SIDEBAR_WIDTH : desktopSidebarWidth,
      navCollapsed: sidebarCollapsed && !mobile
    })
  }
  recompute()

  function publish() {
    recompute()
    listeners.forEach(listener => listener())
  }

  function persist(key: string, value: string) {
    local.set(key, value)
  }

  function setAppearance(value: unknown) {
    if (!isThemeAppearance(value) || value === appearance) return
    appearance = value
    persist(THEME_APPEARANCE_STORAGE_KEY, value)
    publish()
  }

  function setMotion(value: unknown) {
    if (!isThemeMotion(value) || value === motion) return
    motion = value
    persist(THEME_MOTION_STORAGE_KEY, value)
    publish()
  }

  function setSidebarWidth(value: unknown) {
    if (!isSidebarWidth(value) || value === desktopSidebarWidth) return
    desktopSidebarWidth = value
    persist(SIDEBAR_WIDTH_STORAGE_KEY, value)
    publish()
  }

  function setSidebarCollapsed(collapsed: boolean) {
    if (collapsed === sidebarCollapsed) return
    sidebarCollapsed = collapsed
    publish()
  }

  function setSidebarOpen(open: boolean) {
    if (open === sidebarOpen) return
    sidebarOpen = open
    publish()
  }

  function setMobile(next: boolean) {
    if (next === mobile) return
    mobile = next
    publish()
  }

  function applyLayoutEvent(event: Event) {
    if (!isOwnLayoutEvent(event)) return
    const detail = (event as CustomEvent<{ collapsed?: unknown; open?: unknown; width?: unknown }>).detail
    switch (event.type) {
      case 'sidebar-collapsed-change':
        if (typeof detail?.collapsed === 'boolean') setSidebarCollapsed(detail.collapsed)
        return
      case 'sidebar-open-change':
        if (typeof detail?.open === 'boolean') setSidebarOpen(detail.open)
        return
      case 'sidebar-width-change':
        setSidebarWidth(detail?.width)
        return
    }
  }

  return {
    getSnapshot: () => snapshot,
    subscribe: listener => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    setAppearance,
    setMotion,
    setSidebarWidth,
    setSidebarCollapsed,
    setSidebarOpen,
    setMobile,
    applyLayoutEvent
  }
}
