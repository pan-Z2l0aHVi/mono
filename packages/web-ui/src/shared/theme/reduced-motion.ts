import { findNearestTheme } from '@/shared/overlay/theme-overlay-scope'

/**
 * 元素所在主题范围是否要求减少动效：优先 `web-ui-theme` 的 motion 档位，
 * 无主题范围时回退系统 `prefers-reduced-motion`。jsdom 等无 matchMedia 的环境按完整动效处理。
 *
 * 供「CSS 时长会被主题归零、但 JS 动画要自己决定跑不跑」的调用点共用（如 WAAPI 前置判断）。
 */
export function prefersReducedMotion(el: Element): boolean {
  const theme = findNearestTheme(el)
  if (theme) return theme.isReducedMotion()
  try {
    return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}
