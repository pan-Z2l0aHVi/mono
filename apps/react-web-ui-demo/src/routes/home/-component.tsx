import {
  lucideCode,
  lucideLayoutGrid,
  lucidePackage,
  lucideSettings,
  lucideSlidersHorizontal
} from '@greypan/web-ui/icons'
import { Link } from '@tanstack/react-router'

// 产品名、图片替代文本与组件名都是专有名词，中英两版保持一致，因此不进 wuchale 语料。
const PRODUCT_NAME = 'Web UI'
const LOGO_ALT = 'Bo Logo'

const quickLinks = [
  { path: '/components/button', label: 'Button' },
  { path: '/components/dialog', label: 'Dialog' },
  { path: '/components/drawer', label: 'Drawer' },
  { path: '/components/theme', label: 'Theme' },
  { path: '/components/select', label: 'Select' },
  { path: '/components/toast', label: 'Toast' },
  { path: '/components/progress', label: 'Progress' },
  { path: '/components/input', label: 'Input' }
]

// 描述在渲染期取，切语种时随 Home 的运行时重新求值；放在模块顶层会让文案被抽成非响应式常量。
function quickLinkDescription(path: string) {
  switch (path) {
    case '/components/button':
      return '变体、尺寸、图标与加载状态'
    case '/components/dialog':
      return '遵循无障碍规范的模态对话框行为'
    case '/components/drawer':
      return '手势拖拽关闭与浮动卡片形态'
    case '/components/theme':
      return '深浅外观切换与减弱动效'
    case '/components/select':
      return '基于 Floating UI 的下拉浮层与选项'
    case '/components/toast':
      return '轻量、响应式的全局通知'
    case '/components/progress':
      return '确定进度与不可确定状态'
    case '/components/input':
      return '受控输入、清除与前缀后缀'
    default:
      return ''
  }
}

function Home() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12 flex flex-col items-center text-center">
      <div className="relative group mb-8">
        <div className="absolute -inset-1.5 rounded-[40px] bg-linear-to-tr from-(--wui-color-accent) to-(--wui-color-accent) opacity-40 blur-xl transition-all duration-500 group-hover:opacity-75"></div>
        <img
          src={`${import.meta.env.BASE_URL}bo-transparent.png`}
          alt={LOGO_ALT}
          className="relative w-36 h-36 md:w-44 md:h-44 rounded-[32px] shadow-2xl border border-(--wui-color-border) object-cover bg-(--wui-color-surface) transition-transform duration-300 group-hover:scale-105"
        />
      </div>

      <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-(--wui-color-text) mb-4">{PRODUCT_NAME}</h1>
      <p className="text-base md:text-lg text-(--wui-color-text-secondary) max-w-2xl leading-relaxed mb-8">
        基于 Web Components 的跨框架现代 UI 组件库。一套轻量、精致的核心设计系统，原生支持 Vue、React
        以及任意前端技术栈。
      </p>

      <div className="flex flex-wrap justify-center gap-3 mb-12">
        {/* 每项的文字都各自包一层：图标和文字若并成同一个抽取单元，msgid 会带进 `<0/>` 插槽，
            wuchale 运行时把它们摊成无 key 的子节点数组，React 于是在控制台报列表缺 key。 */}
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-(--wui-color-accent) text-(--wui-color-on-accent) shadow-sm">
          <web-ui-icon icon={lucidePackage} size={14}></web-ui-icon>
          <span>Web Components 原生</span>
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-(--wui-color-surface-raised) border border-(--wui-color-border) text-(--wui-color-text)">
          <web-ui-icon icon={lucideCode} size={14}></web-ui-icon>
          <span>跨框架无缝适配</span>
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-(--wui-color-surface-raised) border border-(--wui-color-border) text-(--wui-color-text)">
          <web-ui-icon icon={lucideSlidersHorizontal} size={14}></web-ui-icon>
          <span>语义化设计 Token</span>
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-(--wui-color-surface-raised) border border-(--wui-color-border) text-(--wui-color-text)">
          <web-ui-icon icon={lucideSettings} size={14}></web-ui-icon>
          <span>深浅色 & 动效偏好</span>
        </span>
      </div>

      <div className="w-full text-left">
        <div className="flex items-center gap-2 mb-4 text-sm font-semibold uppercase tracking-wider text-(--wui-color-text-secondary)">
          <web-ui-icon icon={lucideLayoutGrid} size={16}></web-ui-icon>
          <span>常用组件快速预览</span>
        </div>

        <div data-testid="home-quick-links-grid" className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {quickLinks.map(link => (
            <Link
              key={link.path}
              to={link.path}
              className="wui-glass group rounded-xl p-4 text-left flex flex-col justify-between transition-all duration-200 [--wui-glass-corner-radius:12px] hover:[--wui-color-glass-ring:var(--wui-color-accent)]"
            >
              <div>
                <div className="font-medium text-(--wui-color-text) group-hover:text-(--wui-color-accent) transition-colors">
                  {link.label}
                </div>
                <div className="text-xs text-(--wui-color-text-secondary) mt-1.5 line-clamp-2">
                  {quickLinkDescription(link.path)}
                </div>
              </div>
              <div className="mt-3 text-xs font-medium text-(--wui-color-accent) flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                查看演示 →
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Home
