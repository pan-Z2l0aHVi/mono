<route lang="json">
{
  "meta": {
    "title": "Home"
  }
}
</route>

<script setup lang="ts">
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
import { RouterLink } from 'vue-router'

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
  { id: 'atomic', icon: lucideBoxes, label: () => '原子化组件' },
  { id: 'motion', icon: lucideSparkles, label: () => '丝滑动效' },
  { id: 'accessibility', icon: lucideAccessibility, label: () => '无障碍' },
  { id: 'keyboard', icon: lucideKeyboard, label: () => '键盘友好' },
  { id: 'pointer', icon: icBaselinePhonelink, label: () => '响应式设计' }
]

// 子路径部署（GITHUB_BASE_PATH）下写死的绝对路径会 404，logo 必须带上 base 前缀。
const logoSrc = `${import.meta.env.BASE_URL}bo-transparent.png`
</script>

<template>
  <div class="max-w-4xl mx-auto px-6 py-12 flex flex-col items-center text-center">
    <div class="relative group mb-8">
      <div
        class="absolute -inset-1.5 rounded-[40px] bg-linear-to-tr from-(--wui-color-accent) to-(--wui-color-accent) opacity-40 blur-xl transition-all duration-500 group-hover:opacity-75"
      ></div>
      <img
        :src="logoSrc"
        alt="Bo Logo"
        class="relative w-36 h-36 md:w-44 md:h-44 rounded-[32px] shadow-2xl border border-(--wui-color-border) object-cover bg-(--wui-color-surface) transition-transform duration-300 group-hover:scale-105"
      />
    </div>

    <h1 class="text-3xl md:text-5xl font-bold tracking-tight text-(--wui-color-text) mb-4">Web UI</h1>
    <p class="text-base md:text-lg text-(--wui-color-text-secondary) max-w-2xl leading-relaxed mb-8">
      以 Web Components 为内核的跨框架 UI 组件库。轻量、精致，适配 React、Vue。
    </p>

    <div class="grid w-full max-w-3xl grid-cols-1 gap-x-6 gap-y-3 mb-12 text-left md:grid-cols-2 xl:grid-cols-4">
      <div
        v-for="feature in features"
        :key="feature.id"
        class="flex items-center gap-2.5 text-sm text-(--wui-color-text-secondary)"
      >
        <web-ui-icon :icon="feature.icon" :size="16" class="shrink-0 text-(--wui-color-accent)"></web-ui-icon>
        <span class="whitespace-nowrap font-medium leading-tight text-(--wui-color-text)">{{ feature.label() }}</span>
      </div>
    </div>

    <div class="w-full text-left">
      <div
        class="flex items-center gap-2 mb-5 text-sm font-semibold uppercase tracking-wider text-(--wui-color-text-secondary)"
      >
        <web-ui-icon :icon="lucideLayoutGrid" :size="16"></web-ui-icon>
        快速预览
      </div>

      <div data-testid="home-quick-links-grid" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <template v-for="group in quickLinkGroups" :key="group.id">
          <div class="col-span-full flex flex-wrap items-baseline gap-x-3 gap-y-1 pt-2 first:pt-0">
            <h2 class="text-sm font-semibold text-(--wui-color-text)">{{ group.title() }}</h2>
            <span class="text-xs text-(--wui-color-text-tertiary)">{{ group.description() }}</span>
            <span
              class="ms-auto inline-flex min-w-6 items-center justify-center rounded-full border border-(--wui-color-border) bg-(--wui-color-surface-raised) px-2 py-0.5 text-xs font-medium tabular-nums text-(--wui-color-text-secondary)"
            >
              {{ group.links.length }}
            </span>
          </div>

          <RouterLink
            v-for="link in group.links"
            :key="link.path"
            :to="link.path"
            class="wui-glass group flex min-h-32 flex-col justify-between rounded-3xl p-5 text-left transition-all duration-200 [--wui-glass-corner-radius:24px] hover:[--wui-color-glass-ring:var(--wui-color-accent)]"
          >
            <div>
              <div
                class="font-semibold text-(--wui-color-text) group-hover:text-(--wui-color-accent) transition-colors"
              >
                {{ link.label }}
              </div>
              <p class="mt-2 text-xs leading-relaxed text-(--wui-color-text-secondary) line-clamp-2">
                {{ link.desc() }}
              </p>
            </div>
            <div
              class="mt-4 flex items-center gap-1 text-xs font-medium text-(--wui-color-accent) opacity-70 transition-opacity duration-200 group-hover:opacity-100"
            >
              查看演示 →
            </div>
          </RouterLink>
        </template>
      </div>
    </div>
  </div>
</template>
