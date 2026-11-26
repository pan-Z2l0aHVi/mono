import {
  lucideAccessibility,
  lucideBoxes,
  lucideCode,
  lucideKeyboard,
  lucideLayoutGrid,
  lucideSlidersHorizontal,
  icBaselinePhonelink,
  lucideSparkles,
  tablerBrandTypescript
} from '@greypan/web-ui/icons'
import { Fragment } from 'react'

import Codeblock from '@/components/codeblock'
import QuickLinkCard from '@/components/quick-link-card'

const INSTALL_COMMANDS = [
  ['npm', 'npm install @greypan/web-ui'],
  ['pnpm', 'pnpm add @greypan/web-ui'],
  ['bun', 'bun add @greypan/web-ui'],
  ['yarn', 'yarn add @greypan/web-ui']
].map(([name, command]) => ({
  value: name!,
  label: name!,
  node: {
    label: 'codeblock' as const,
    lang: name,
    content: `<pre class="shiki mdm-code"><code><span class="line"><span class="line-number">1</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0">${name}</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF">${command!.slice(name!.length)}</span></span></code></pre>`
  }
}))

// 产品名、图片替代文本与组件名都是专有名词，中英两版保持一致，因此不进 wuchale 语料。
const PRODUCT_NAME = 'Web UI'
const LOGO_ALT = 'Bo Logo'

// 组件名是专有名词，中英两版一致。留在模块级还有一层原因：wuchale 只提取组件体内的文案，
// 这些标识不该进语料，放进渲染体就会被当成待译壳文案。
const QUICK_LINK_LABELS = {
  button: 'Button',
  input: 'Input',
  switch: 'Switch',
  segmented: 'Segmented',
  dialog: 'Dialog',
  drawer: 'Drawer',
  select: 'Select',
  tooltip: 'Tooltip',
  toast: 'Toast',
  imagePreview: 'ImagePreview',
  spinner: 'Spinner',
  layout: 'Layout',
  theme: 'Theme'
} as const

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

function Home() {
  /*
   * 标题与描述在组件体内求值，而不是放在模块级常量里：wuchale 的译文随当前语种变化，
   * 模块初始化只求值一次；而 React Compiler 又会把「模块级常量上的函数调用」当成无依赖
   * 的纯计算缓存住，切语种后这些文案会停在首帧语言。放进渲染体后，注入的 runtime 读取
   * 成为组件的依赖，语种变化时随其它壳文案一起重算。
   */
  const quickLinkGroups: QuickLinkGroup[] = [
    {
      id: 'core',
      title: () => '基础控件',
      description: () => '点击、输入、选择、切换',
      links: [
        { path: '/components/button', label: QUICK_LINK_LABELS.button, desc: () => '变体、尺寸、图标、加载状态' },
        { path: '/components/input', label: QUICK_LINK_LABELS.input, desc: () => '输入、清除、前后缀' },
        { path: '/components/switch', label: QUICK_LINK_LABELS.switch, desc: () => '开关状态、拖拽切换' },
        { path: '/components/segmented', label: QUICK_LINK_LABELS.segmented, desc: () => '分段选择、拖拽切换' }
      ]
    },
    {
      id: 'overlay',
      title: () => '交互与浮层',
      description: () => '对话框、抽屉、浮层',
      links: [
        { path: '/components/dialog', label: QUICK_LINK_LABELS.dialog, desc: () => '弹窗、确认、信息展示' },
        { path: '/components/drawer', label: QUICK_LINK_LABELS.drawer, desc: () => '侧滑面板、拖拽关闭' },
        { path: '/components/select', label: QUICK_LINK_LABELS.select, desc: () => '下拉选择、键盘导航' },
        { path: '/components/tooltip', label: QUICK_LINK_LABELS.tooltip, desc: () => '悬停提示、焦点说明' }
      ]
    },
    {
      id: 'imperative',
      title: () => '命令式',
      description: () => '函数调用触发',
      links: [
        { path: '/components/toast', label: QUICK_LINK_LABELS.toast, desc: () => '轻量、响应式的全局通知' },
        {
          path: '/components/image-preview',
          label: QUICK_LINK_LABELS.imagePreview,
          desc: () => '多图预览、滑动切换、手势缩放'
        },
        { path: '/components/spinner', label: QUICK_LINK_LABELS.spinner, desc: () => '加载中的等待提示' }
      ]
    },
    {
      id: 'foundation',
      title: () => '应用基础',
      description: () => '页面骨架、外观偏好',
      links: [
        { path: '/components/layout', label: QUICK_LINK_LABELS.layout, desc: () => '响应式布局' },
        { path: '/components/theme', label: QUICK_LINK_LABELS.theme, desc: () => '深浅外观、动效偏好' }
      ]
    }
  ]

  // 能力项与卡片文案同一理由：在渲染体内求值，wuchale runtime 才是组件的依赖。
  const features = [
    { id: 'cross-framework', icon: lucideCode, label: () => '跨框架一致' },
    { id: 'typescript', icon: tablerBrandTypescript, label: () => 'TypeScript 类型安全' },
    { id: 'atomic', icon: lucideBoxes, label: () => '原子组件' },
    { id: 'pointer', icon: icBaselinePhonelink, label: () => '响应式设计' },
    { id: 'touch', icon: lucideSlidersHorizontal, label: () => '支持触摸&手势' },
    { id: 'accessibility', icon: lucideAccessibility, label: () => '无障碍' },
    { id: 'keyboard', icon: lucideKeyboard, label: () => '键盘友好' },
    { id: 'motion', icon: lucideSparkles, label: () => '丝滑动效' }
  ]

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 flex flex-col items-center text-center">
      <div className="relative group mb-8">
        <div className="absolute -inset-1.5 rounded-[36px] bg-linear-to-tr from-(--wui-color-accent) to-(--wui-color-accent) opacity-40 blur-xl transition-all duration-[calc(var(--wui-duration-focus,200ms)*2.5)] group-hover:opacity-75"></div>
        <img
          src={`${import.meta.env.BASE_URL}bo-transparent.png`}
          alt={LOGO_ALT}
          className="relative h-28 w-28 rounded-[28px] sm:h-36 sm:w-36 sm:rounded-[32px] shadow-2xl border border-(--wui-color-border) object-cover bg-(--wui-color-surface) transition-transform duration-[calc(var(--wui-duration-focus,200ms)*1.5)] group-hover:scale-105"
        />
      </div>

      <h1 className="text-[32px] font-bold tracking-tight text-(--wui-color-text) mb-4">{PRODUCT_NAME}</h1>
      <p className="text-base md:text-lg text-(--wui-color-text-secondary) max-w-2xl leading-relaxed mb-8">
        以 Web Components 为内核的跨框架 UI 组件库。轻量、精致，适配 React、Vue。
      </p>

      <section className="mb-12 w-full text-left" aria-label="安装">
        <Codeblock nodes={[]} preview={false} variants={INSTALL_COMMANDS} switchLabel="包管理器" />
      </section>

      <div className="grid w-full grid-cols-1 gap-x-6 gap-y-3 mb-12 text-left md:grid-cols-2 xl:grid-cols-4">
        {features.map(feature => (
          <div key={feature.id} className="flex items-center gap-2.5 text-xs text-(--wui-color-text-secondary)">
            <web-ui-icon icon={feature.icon} className="shrink-0 text-(--wui-color-accent)"></web-ui-icon>
            <span className="whitespace-nowrap font-medium leading-tight text-(--wui-color-text)">
              {feature.label()}
            </span>
          </div>
        ))}
      </div>

      <div className="w-full text-left">
        <div className="flex items-center justify-center gap-2 mb-10 text-[16px] font-semibold uppercase tracking-wider text-(--wui-color-text-secondary)">
          <web-ui-icon icon={lucideLayoutGrid}></web-ui-icon>
          <span>快速预览</span>
        </div>

        <div data-testid="home-quick-links-grid" className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
          {quickLinkGroups.map(group => (
            <Fragment key={group.id}>
              <div className="col-span-full flex flex-col items-start gap-y-2 pt-4 first:pt-0">
                <h2 className="text-[20px] font-semibold text-(--wui-color-text)">{group.title()}</h2>
                <span className="text-xs text-(--wui-color-text-tertiary)">{group.description()}</span>
              </div>

              {group.links.map(link => (
                <QuickLinkCard key={link.path} path={link.path} label={link.label} desc={link.desc()} />
              ))}
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Home
