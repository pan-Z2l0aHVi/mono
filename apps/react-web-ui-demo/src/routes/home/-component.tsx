import {
  lucideAccessibility,
  lucideBoxes,
  lucideCode,
  lucideKeyboard,
  lucideLayoutGrid,
  lucidePackage,
  icBaselinePhonelink,
  lucideSparkles,
  tablerBrandTypescript
} from '@greypan/web-ui/icons'
import { Link } from '@tanstack/react-router'
import { Fragment } from 'react'

// 产品名、图片替代文本与组件名都是专有名词，中英两版保持一致，因此不进 wuchale 语料。
const PRODUCT_NAME = 'Web UI'
const LOGO_ALT = 'Bo Logo'

interface QuickLink {
  path: string
  label: string
  desc: () => string
}

interface QuickLinkGroup {
  id: string
  title: () => string
  description: () => string
  links: QuickLink[]
}

// 标题与描述延迟到渲染期求值：wuchale 的译文随当前语种变化，模块初始化的常量不会跟着更新。
const quickLinkGroups: QuickLinkGroup[] = [
  {
    id: 'core',
    title: () => '基础控件',
    description: () => '点击、输入、选择、切换',
    links: [
      { path: '/components/button', label: 'Button', desc: () => '变体、尺寸、图标、加载状态' },
      { path: '/components/input', label: 'Input', desc: () => '输入、清除、前后缀' },
      { path: '/components/switch', label: 'Switch', desc: () => '开关状态、拖拽切换' },
      { path: '/components/segmented', label: 'Segmented', desc: () => '分段选择、拖拽切换' }
    ]
  },
  {
    id: 'overlay',
    title: () => '交互与浮层',
    description: () => '对话框、抽屉、浮层',
    links: [
      { path: '/components/dialog', label: 'Dialog', desc: () => '弹窗、确认、信息展示' },
      { path: '/components/drawer', label: 'Drawer', desc: () => '侧滑面板、拖拽关闭' },
      { path: '/components/select', label: 'Select', desc: () => '下拉选择、键盘导航' },
      { path: '/components/tooltip', label: 'Tooltip', desc: () => '悬停提示、焦点说明' }
    ]
  },
  {
    id: 'imperative',
    title: () => '命令式组件',
    description: () => '函数调用触发的全局反馈',
    links: [
      { path: '/components/toast', label: 'Toast', desc: () => '轻量、响应式的全局通知' },
      { path: '/components/image-preview', label: 'ImagePreview', desc: () => '多图预览、滑动切换、手势缩放' },
      { path: '/components/spinner', label: 'Spinner', desc: () => '加载中的等待提示' }
    ]
  },
  {
    id: 'foundation',
    title: () => '应用基础',
    description: () => '页面骨架、外观偏好',
    links: [
      { path: '/components/layout', label: 'Layout', desc: () => '响应式布局' },
      { path: '/components/theme', label: 'Theme', desc: () => '深浅外观、动效偏好' }
    ]
  }
]

// 能力项同样延迟到渲染期取文案，切语种时随页面重新求值。
const features = [
  { id: 'web-components', icon: lucidePackage, label: () => 'Web Components' },
  { id: 'cross-framework', icon: lucideCode, label: () => '跨框架一致' },
  { id: 'typescript', icon: tablerBrandTypescript, label: () => 'TypeScript 类型安全' },
  { id: 'atomic', icon: lucideBoxes, label: () => '原子组件' },
  { id: 'motion', icon: lucideSparkles, label: () => '丝滑动效' },
  { id: 'accessibility', icon: lucideAccessibility, label: () => '无障碍' },
  { id: 'keyboard', icon: lucideKeyboard, label: () => '键盘友好' },
  { id: 'pointer', icon: icBaselinePhonelink, label: () => '响应式设计' }
]

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
        以 Web Components 为内核的跨框架 UI 组件库。轻量、精致，适配 React、Vue。
      </p>

      <div className="grid w-full max-w-3xl grid-cols-1 gap-x-6 gap-y-3 mb-12 text-left md:grid-cols-2 xl:grid-cols-4">
        {features.map(feature => (
          <div key={feature.id} className="flex items-center gap-2.5 text-xs text-(--wui-color-text-secondary)">
            <web-ui-icon icon={feature.icon} size={16} className="shrink-0 text-(--wui-color-accent)"></web-ui-icon>
            <span className="whitespace-nowrap font-medium leading-tight text-(--wui-color-text)">
              {feature.label()}
            </span>
          </div>
        ))}
      </div>

      <div className="w-full text-left">
        <div className="flex items-center gap-2 mb-5 text-sm font-semibold uppercase tracking-wider text-(--wui-color-text-secondary)">
          <web-ui-icon icon={lucideLayoutGrid} size={16}></web-ui-icon>
          <span>快速预览</span>
        </div>

        <div data-testid="home-quick-links-grid" className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {quickLinkGroups.map(group => (
            <Fragment key={group.id}>
              <div className="col-span-full flex flex-col items-start gap-y-1 pt-2 first:pt-0">
                <h2 className="text-2xl md:text-4xl font-semibold text-(--wui-color-text)">{group.title()}</h2>
                <span className="text-xs text-(--wui-color-text-tertiary)">{group.description()}</span>
              </div>

              {group.links.map(link => (
                <Link
                  key={link.path}
                  to={link.path}
                  className="wui-glass group flex min-h-32 flex-col justify-between rounded-3xl p-5 text-left transition-all duration-200 [--wui-glass-corner-radius:24px] hover:[--wui-color-glass-ring:var(--wui-color-accent)]"
                >
                  <div>
                    <div className="font-semibold text-(--wui-color-text) group-hover:text-(--wui-color-accent) transition-colors">
                      {link.label}
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-(--wui-color-text-secondary) line-clamp-2">
                      {link.desc()}
                    </p>
                  </div>
                  <div className="mt-4 flex items-center gap-1 text-xs font-medium text-(--wui-color-accent) opacity-70 transition-opacity duration-200 group-hover:opacity-100">
                    查看演示 →
                  </div>
                </Link>
              ))}
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Home
