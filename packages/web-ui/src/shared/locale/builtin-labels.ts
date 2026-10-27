import type { ReactiveController, ReactiveControllerHost } from 'lit'

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

type Locale = 'en' | 'zh'

const LABELS: Record<Locale, Record<BuiltinLabelKey, string>> = {
  en: {
    clear: 'Clear',
    decrease: 'Decrease',
    increase: 'Increase',
    close: 'Close',
    backToTop: 'Back to top',
    collapseSidebar: 'Collapse sidebar',
    expandSidebar: 'Expand sidebar',
    resizeSidebar: 'Resize sidebar',
    openNavigationMenu: 'Open navigation menu',
    mainNavigation: 'Main navigation'
  },
  zh: {
    clear: '清除',
    decrease: '减少',
    increase: '增加',
    close: '关闭',
    backToTop: '回到顶部',
    collapseSidebar: '折叠侧边栏',
    expandSidebar: '展开侧边栏',
    resizeSidebar: '调整侧边栏宽度',
    openNavigationMenu: '打开导航菜单',
    mainNavigation: '主导航'
  }
}

function readLang(host: HTMLElement): string {
  let current: Element | null = host
  while (current) {
    const lang = current.getAttribute('lang')?.trim()
    if (lang) return lang
    const root = current.getRootNode()
    current = current.parentElement ?? (root instanceof ShadowRoot ? root.host : null)
  }
  return host.ownerDocument?.documentElement.lang ?? ''
}

/**
 * 内置无障碍文案的语言：显式覆盖优先，否则跟随最近的 `lang`（最终回落到文档 `lang`）。
 * 未声明语言的文档仍输出英文。
 */
export function resolveBuiltinLabel(host: HTMLElement, key: BuiltinLabelKey, override?: string | null): string {
  const custom = override?.trim()
  if (custom) return custom
  return LABELS[readLang(host).toLowerCase().startsWith('zh') ? 'zh' : 'en'][key]
}

/**
 * 文档 `lang` 在运行期变化时触发宿主重渲染，避免内置文案停留在旧语言。
 * 祖先元素上的 `lang` 变化不在此列：它只在组件首次渲染时被读取。
 */
export class LocaleController implements ReactiveController {
  private observer: MutationObserver | null = null

  constructor(private readonly host: ReactiveControllerHost & HTMLElement) {
    host.addController(this)
  }

  hostConnected(): void {
    const documentElement = this.host.ownerDocument?.documentElement
    const Observer = this.host.ownerDocument?.defaultView?.MutationObserver
    if (!documentElement || !Observer) return
    this.observer = new Observer(() => this.host.requestUpdate())
    this.observer.observe(documentElement, { attributes: true, attributeFilter: ['lang'] })
  }

  hostDisconnected(): void {
    this.observer?.disconnect()
    this.observer = null
  }
}
