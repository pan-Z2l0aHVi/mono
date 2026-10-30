/**
 * 内置无障碍文案的唯一样表：图标控件的可访问名必须有值（无名称的图标按钮是
 * 默认的无障碍违规），内容文案不属于这里，始终由外部传入。
 *
 * fallback 固定英文，不跟随运行环境语言；需要其他语言时经覆盖通道改写——
 * 单标签组件用专用 attribute（`aria-close-label` 这类），多 key 成套组件用
 * `ariaLabels` 对象 property。分界规则见 ADR-0016。
 */
export type BuiltinLabelKey =
  | 'clear'
  | 'decrease'
  | 'increase'
  | 'close'
  | 'backToTop'
  | 'collapseSidebar'
  | 'expandSidebar'
  | 'resizeSidebar'
  | 'openNavigationMenu'
  | 'mainNavigation'
  | 'unread'
  | 'unreadCount'
  | 'noUnread'
  | 'previousImage'
  | 'nextImage'
  | 'zoomIn'
  | 'zoomOut'
  | 'resetZoom'

const LABELS: Record<BuiltinLabelKey, string> = {
  clear: 'Clear',
  decrease: 'Decrease',
  increase: 'Increase',
  close: 'Close',
  backToTop: 'Back to top',
  collapseSidebar: 'Collapse sidebar',
  expandSidebar: 'Expand sidebar',
  resizeSidebar: 'Resize sidebar',
  openNavigationMenu: 'Open navigation menu',
  mainNavigation: 'Main navigation',
  unread: 'Unread',
  unreadCount: '{count} unread messages',
  noUnread: 'No unread messages',
  previousImage: 'Previous image',
  nextImage: 'Next image',
  zoomIn: 'Zoom in',
  zoomOut: 'Zoom out',
  resetZoom: 'Reset zoom'
}

/** 显式覆盖优先（trim 后非空才生效）；否则回退内置英文文案。 */
export function resolveBuiltinLabel(key: BuiltinLabelKey, override?: string | null): string {
  const custom = override?.trim()
  if (custom) return custom
  return LABELS[key]
}

/** 成组覆盖（`ariaLabels` 对象 property）里取单个 key；未提供的 key 回退内置英文。 */
export function resolveBuiltinLabelSet<K extends BuiltinLabelKey>(
  labels: Partial<Record<K, string>> | undefined,
  key: K
): string {
  return resolveBuiltinLabel(key, labels?.[key])
}

/** 把 `{count}` 这类占位替换成实参；没有对应实参的占位原样保留。 */
export function formatBuiltinLabel(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match))
}
