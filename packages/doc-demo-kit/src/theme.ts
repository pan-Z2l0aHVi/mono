export type ThemeAppearance = 'light' | 'dark' | 'system'
export type ThemeMotion = 'full' | 'reduced' | 'system'

/*
 * 存储键与合法值两端相同，读写机制不同：React 直接读写 localStorage 并以 JSON 编解码，
 * Vue 走 `@greypan/browser-kit` 的 `local`。落盘编码不统合，所以这里只放键名与校验。
 */
export const THEME_APPEARANCE_STORAGE_KEY = 'theme-appearance'
export const THEME_MOTION_STORAGE_KEY = 'theme-motion'
export const SIDEBAR_WIDTH_STORAGE_KEY = 'sidebar-width'

/** 侧栏默认宽度（px）。 */
export const DEFAULT_SIDEBAR_WIDTH = 240
/** 直接写进 layout `sidebar-width` 的 CSS 长度。 */
export const DEFAULT_SIDEBAR_WIDTH_PX = `${DEFAULT_SIDEBAR_WIDTH}px`

const THEME_APPEARANCES: ReadonlySet<string> = new Set(['light', 'dark', 'system'])
const THEME_MOTIONS: ReadonlySet<string> = new Set(['full', 'reduced', 'system'])
const SIDEBAR_WIDTH_PATTERN = /^\d+(\.\d+)?px$/

export function isThemeAppearance(value: unknown): value is ThemeAppearance {
  return typeof value === 'string' && THEME_APPEARANCES.has(value)
}

export function isThemeMotion(value: unknown): value is ThemeMotion {
  return typeof value === 'string' && THEME_MOTIONS.has(value)
}

/** 只接受 `px` 长度（`240px`、`12.5px`）：layout 的受控值与拖拽回写都用这个形态。 */
export function isSidebarWidth(value: unknown): value is string {
  return typeof value === 'string' && SIDEBAR_WIDTH_PATTERN.test(value)
}
