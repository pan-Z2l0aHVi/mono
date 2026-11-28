/**
 * 应用壳与页面级视图布局的持久化状态。
 *
 * 仅承载纯前端视图记忆（侧边栏折叠、侧边栏宽度、资源库筛选排序面板展开态），
 * 与 Go 侧 `backend/settings`（显式应用设置）分治：Go 不消费这些状态，前端经
 * `@greypan/browser-kit/storage` 同步读写 `localStorage` 即可实现首帧零闪烁，
 * 且任意组件与顶部菜单均可直接命令式调用。
 */
import { defineLocal } from '@greypan/browser-kit/storage'
import { defineStore } from 'pinia'

export const SIDEBAR_MIN_WIDTH = 160
export const SIDEBAR_MAX_WIDTH = 320
export const SIDEBAR_DEFAULT_WIDTH = 240

export const LAYOUT_STORAGE_NAMESPACE = 'interweave:layout'
const KEY_SIDEBAR_COLLAPSED = 'sidebarCollapsed'
const KEY_SIDEBAR_WIDTH = 'sidebarWidth'
const KEY_LIBRARY_FILTER_OPEN = 'libraryFilterOpen'

const layoutStorage = defineLocal(LAYOUT_STORAGE_NAMESPACE)

/**
 * 将宽度输入（数字或带 px 单位的字符串）归一为整数像素，并钳位到合法区间。
 * 缺失、非有限数或 `<= 0` 回落默认宽度，其余越界值钳位到 `[SIDEBAR_MIN_WIDTH, SIDEBAR_MAX_WIDTH]`。
 */
export function clampSidebarWidth(value: number | string): number {
  const numeric = typeof value === 'number' ? value : Number.parseFloat(value)
  if (!Number.isFinite(numeric) || numeric <= 0) return SIDEBAR_DEFAULT_WIDTH
  return Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, Math.round(numeric)))
}

function readBoolean(key: string, fallback: boolean): boolean {
  const value = layoutStorage.get<unknown>(key)
  return typeof value === 'boolean' ? value : fallback
}

function readSidebarWidth(): number {
  const value = layoutStorage.get<unknown>(KEY_SIDEBAR_WIDTH)
  if (typeof value !== 'number') return SIDEBAR_DEFAULT_WIDTH
  return clampSidebarWidth(value)
}

export const useLayoutStore = defineStore('layout', {
  state: () => ({
    /** 桌面端侧边栏折叠偏好（移动端抽屉保持临时态，不入此处）。 */
    sidebarCollapsed: readBoolean(KEY_SIDEBAR_COLLAPSED, false),
    /** 桌面端侧边栏展开宽度（整数 px，收敛在 `[SIDEBAR_MIN_WIDTH, SIDEBAR_MAX_WIDTH]`）。 */
    sidebarWidth: readSidebarWidth(),
    /** 资源库筛选与排序面板的展开状态（桌面端与移动端共用）。 */
    libraryFilterOpen: readBoolean(KEY_LIBRARY_FILTER_OPEN, false)
  }),
  getters: {
    sidebarWidthCss: state => `${state.sidebarWidth}px`
  },
  actions: {
    setSidebarCollapsed(collapsed: boolean) {
      const next = Boolean(collapsed)
      this.sidebarCollapsed = next
      layoutStorage.set(KEY_SIDEBAR_COLLAPSED, next)
    },
    toggleSidebarCollapsed() {
      this.setSidebarCollapsed(!this.sidebarCollapsed)
    },
    setSidebarWidth(width: number | string) {
      const next = clampSidebarWidth(width)
      this.sidebarWidth = next
      layoutStorage.set(KEY_SIDEBAR_WIDTH, next)
    },
    setLibraryFilterOpen(open: boolean) {
      const next = Boolean(open)
      this.libraryFilterOpen = next
      layoutStorage.set(KEY_LIBRARY_FILTER_OPEN, next)
    },
    toggleLibraryFilterOpen() {
      this.setLibraryFilterOpen(!this.libraryFilterOpen)
    }
  }
})
