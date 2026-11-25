import type { OverlayArbitration } from '@/shared/overlay/open-overlay'

export interface MenuSurface {
  readonly panel: HTMLElement
  readonly content: HTMLElement
}

export interface MenuSurfaceAdapter<TSurface extends MenuSurface> {
  createRoot(): TSurface | undefined
  createSubmenu(ctx: { level: number; parentItem: HTMLElement }): TSurface | undefined
  positionRoot(surface: TSurface, options: { isInstant: boolean }): void
  positionSubmenu(surface: TSurface, parentItem: HTMLElement, level: number, options: { isInstant: boolean }): void
  disposeSurface(surface: TSurface, level: number): void
}

export interface MenuOpenOptions {
  isInstant: boolean
  takeFocus: boolean
  suppressFocusVisible: boolean
  /** 首项聚焦的最大尝试次数（含首次）；默认 1。 */
  focusRetryAttempts?: number
  /** 是否在刷新后再延后一帧聚焦首项（如 showModal 后避开 UA dialog focusing steps）；默认 false。 */
  deferFocusFrame?: boolean
}

export interface MenuCloseOptions {
  isInstant?: boolean
  skipFocusRestore?: boolean
  restoreFocusTo?: HTMLElement
}

export type MenuCloseReason = 'escape' | 'leaf-click' | 'emptied'

export interface MenuEventInsideOptions {
  /** 是否将宿主本身视为内部；默认 true。传 false 仅检查已登记的 panel 子树。 */
  includeHost?: boolean
  /** 是否把「刚打开同帧的 outside-click 武装窗口」也视为内部；默认 false。 */
  respectOpenArm?: boolean
}

export interface MenuSessionOptions<TSurface extends MenuSurface> {
  host: HTMLElement
  markerText: string
  hiddenSlot: string
  surface: MenuSurfaceAdapter<TSurface>
  isScrollLockDisabled: () => boolean
  getArbitration?: () => OverlayArbitration
  onRequestClose: (reason: MenuCloseReason) => void
  closeOnLeafClick: boolean
  closeWhenEmptied?: boolean
  /** 根 panel 创建时机：'sync' 在 open() 当场建好（context-menu），'frame' 在下一帧建（dropdown）。默认 'sync'。 */
  createRootTiming?: 'sync' | 'frame'
  /** 是否把宿主一级 menu 项也标记 hiddenSlot（context-menu 需要；dropdown 默认 slot 未渲染不需要）。 */
  hideHostChildren?: boolean
  /** 是否持续观察宿主子树变更（dropdown 需要；context-menu 通过 slotchange 触发 syncHostState）。 */
  observeHost?: boolean
  /** 是否拦截打开期间 panel 外的 wheel/touchmove 滚动（context-menu 需要）。 */
  preventBackgroundScroll?: boolean
  /** 是否由 session 记录并归还关闭前焦点（dropdown 需要；context-menu 由 scrim dialog UA 负责）。 */
  manageFocusRestore?: boolean
  /** 关闭清理时是否复位宿主所有 menu item 的 tabIndex（dropdown 需要）。 */
  resetTabStopsOnCleanup?: boolean
  /** 根 panel 退场完毕、归还项与移除 panel 之前调用（context-menu 用于先关闭 scrim）。 */
  beforeRootCleanup?: (root: TSurface) => void
  /** 根 panel 创建或销毁后回调（dropdown 用于回写 trigger 的 aria-controls）。 */
  onRootSurfaceChange?: (root: TSurface | undefined) => void
}

export interface MenuSession<TSurface extends MenuSurface> {
  open(options: MenuOpenOptions): void
  close(options?: MenuCloseOptions): void
  claimPlaceholder(): void
  syncHostState(): void
  handleKeydown(event: KeyboardEvent): void
  isEventInside(event: Event, options?: MenuEventInsideOptions): boolean
  hasContent(): boolean
  getRootSurface(): TSurface | undefined
  hasFocusWithin(): boolean
  connect(): void
  disconnect(): void
}
