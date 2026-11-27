<route lang="json">
{
  "meta": {
    "title": "总览 — Dev Kit Demo"
  }
}
</route>

<script setup lang="ts">
import {
  lucideBoxes,
  lucideCode,
  lucideGlobe,
  lucideLayoutGrid,
  lucidePackage,
  tablerBrandTypescript
} from '@greypan/web-ui/icons'
import { useRouter } from 'vue-router'

import QuickLinkCard from '@/components/quick-link-card/index.vue'

const router = useRouter()

function go(path: string) {
  void router.push(path)
}

interface ModuleLink {
  path: string
  label: string
  desc: () => string
}

interface ModuleGroup {
  id: string
  title: string
  description: () => string
  links: ModuleLink[]
}

// 文案延迟到渲染期求值，确保切换中英文时卡片与特性列表同步刷新。
const features = [
  { id: 'zero-framework', icon: lucideCode, label: () => '零框架依赖' },
  { id: 'typescript', icon: tablerBrandTypescript, label: () => 'TypeScript 类型安全' },
  { id: 'esm-treeshake', icon: lucidePackage, label: () => 'ESM 与按需导出' },
  { id: 'composable', icon: lucideBoxes, label: () => '可组合插件架构' }
]

const moduleGroups: ModuleGroup[] = [
  {
    id: 'js-kit',
    title: '@greypan/js-kit',
    description: () => '适用于浏览器、Node.js 与 Worker 的通用工具集',
    links: [
      { path: '/js-kit/plugin-system', label: 'plugin-system', desc: () => '插件组合、批量聚合事件与 ACK 确认队列' },
      { path: '/js-kit/url', label: 'url', desc: () => '查询参数解析、拼接与 URL 规范化' },
      { path: '/js-kit/number', label: 'number', desc: () => '范围裁剪、精度处理与数值格式化' },
      { path: '/js-kit/string', label: 'string', desc: () => '文件扩展名提取与常用字符串工具' },
      { path: '/js-kit/timer', label: 'timer', desc: () => '可取消防抖控制对象与可控定时器插件' },
      { path: '/js-kit/paradigm', label: 'paradigm', desc: () => 'Result 类型、错误兜底与异步链式组合' },
      { path: '/js-kit/shortcut', label: 'shortcut', desc: () => 'safeCall 同步/异步安全执行包装' },
      { path: '/js-kit/utility-types', label: 'utility-types', desc: () => '只读、深度可选与品牌类型工具集' }
    ]
  },
  {
    id: 'browser-kit',
    title: '@greypan/browser-kit',
    description: () => '面向现代浏览器的运行时与交互工具集',
    links: [
      { path: '/browser-kit/storage', label: 'storage', desc: () => '命名空间存储、TTL 过期与跨标签页监听' },
      { path: '/browser-kit/tracker', label: 'tracker', desc: () => '可组合埋点内核、自动采集插件与离线队列' },
      { path: '/browser-kit/env', label: 'env', desc: () => 'SSR 守卫、浏览器与设备环境检测' },
      { path: '/browser-kit/dom', label: 'dom', desc: () => '视口尺寸、滚动位置与基础 DOM 查询' },
      { path: '/browser-kit/file', label: 'file', desc: () => 'Base64 校验解析与浏览器文件下载' },
      { path: '/browser-kit/copy', label: 'copy', desc: () => '文本与 Blob 剪贴板写入及降级兜底' },
      { path: '/browser-kit/history-nav', label: 'history-nav', desc: () => '同文档导航拦截与前进后退状态管理' },
      { path: '/browser-kit/shortcut', label: 'shortcut', desc: () => '事件监听便捷绑定与解绑工具' }
    ]
  }
]

// 子路径部署（GITHUB_BASE_PATH）下必须带上 BASE_URL 前缀，避免图标 404。
const logoSrc = `${import.meta.env.BASE_URL}kit-transparent.png`
</script>

<template>
  <div class="mx-auto flex max-w-5xl flex-col items-center px-2 py-8 sm:px-4 sm:py-12">
    <header class="mb-10 flex flex-col items-center text-center">
      <div class="group relative mb-7">
        <div
          class="absolute -inset-1.5 rounded-[36px] bg-linear-to-tr from-[#d96bd9] via-[#9076f5] to-[#4e7ef5] opacity-35 blur-xl transition-all duration-[calc(var(--wui-duration-focus,200ms)*2.5)] group-hover:opacity-65"
        ></div>
        <img
          :src="logoSrc"
          alt="Dev Kit Logo"
          class="relative h-28 w-28 rounded-[28px] border border-(--wui-color-border) bg-(--wui-color-surface) object-contain p-3.5 shadow-xl transition-transform duration-[calc(var(--wui-duration-focus,200ms)*1.5)] group-hover:scale-105 sm:h-36 sm:w-36 sm:rounded-[32px] sm:p-4"
        />
      </div>

      <h1 class="mb-3 text-[32px] font-bold tracking-tight text-(--wui-color-text)">@greypan Dev Kit</h1>
      <p class="max-w-2xl text-base leading-relaxed text-(--wui-color-text-secondary) sm:text-lg">
        面向现代 TypeScript 与浏览器的零框架依赖工具集
      </p>
    </header>

    <div class="mb-12 grid w-full grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
      <div
        v-for="feature in features"
        :key="feature.id"
        class="flex items-center justify-center gap-2 px-2 py-1.5 text-sm text-(--wui-color-text-secondary)"
      >
        <web-ui-icon :icon="feature.icon" class="shrink-0 text-(--wui-color-accent)" :size="16"></web-ui-icon>
        <span class="truncate font-medium text-(--wui-color-text)">{{ feature.label() }}</span>
      </div>
    </div>

    <section class="mb-16 flex w-full flex-col gap-10" aria-label="工具包入口">
      <div class="flex flex-col gap-4">
        <h2 class="text-sm font-semibold tracking-wider text-(--wui-color-text-secondary)">工具库</h2>
        <div class="grid w-full gap-8 md:grid-cols-2">
          <article
            class="wui-glass flex flex-col justify-between gap-5 rounded-3xl p-6 [--wui-glass-corner-radius:24px]"
          >
            <div class="flex flex-col gap-2.5">
              <div class="flex items-center justify-between gap-2">
                <h3 class="text-xl font-semibold text-(--wui-color-text)">@greypan/js-kit</h3>
                <span
                  class="inline-flex items-center gap-1 rounded-full bg-(--wui-color-surface-control) px-2.5 py-0.5 text-xs text-(--wui-color-text-secondary)"
                >
                  <web-ui-icon :icon="lucidePackage" :size="12"></web-ui-icon>
                  8 个模块
                </span>
              </div>
              <p class="text-sm leading-relaxed text-(--wui-color-text-secondary)">
                通用 JavaScript / TypeScript 工具与可组合插件系统，适用于浏览器、Node.js 与 Worker。
              </p>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <web-ui-button variant="primary" size="32" @click="go('/js-kit/getting-started')">快速开始</web-ui-button>
              <web-ui-button variant="secondary" size="32" @click="go('/js-kit/plugin-system')">浏览模块</web-ui-button>
              <web-ui-button variant="ghost" size="32" @click="go('/js-kit/changelog')">更新日志</web-ui-button>
            </div>
          </article>

          <article
            class="wui-glass flex flex-col justify-between gap-5 rounded-3xl p-6 [--wui-glass-corner-radius:24px]"
          >
            <div class="flex flex-col gap-2.5">
              <div class="flex items-center justify-between gap-2">
                <h3 class="text-xl font-semibold text-(--wui-color-text)">@greypan/browser-kit</h3>
                <span
                  class="inline-flex items-center gap-1 rounded-full bg-(--wui-color-surface-control) px-2.5 py-0.5 text-xs text-(--wui-color-text-secondary)"
                >
                  <web-ui-icon :icon="lucideGlobe" :size="12"></web-ui-icon>
                  8 个模块
                </span>
              </div>
              <p class="text-sm leading-relaxed text-(--wui-color-text-secondary)">
                浏览器运行时工具集：带 TTL 的命名空间存储、可组合埋点、环境检测、文件下载、剪贴板与历史导航。
              </p>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <web-ui-button variant="primary" size="32" @click="go('/browser-kit/getting-started')">
                快速开始
              </web-ui-button>
              <web-ui-button variant="secondary" size="32" @click="go('/browser-kit/storage')">浏览模块</web-ui-button>
              <web-ui-button variant="ghost" size="32" @click="go('/browser-kit/changelog')">更新日志</web-ui-button>
            </div>
          </article>
        </div>
      </div>

      <div class="flex flex-col gap-4">
        <h2 class="text-sm font-semibold tracking-wider text-(--wui-color-text-secondary)">构建插件</h2>
        <div class="grid w-full gap-8 md:grid-cols-2">
          <article
            class="wui-glass flex flex-col justify-between gap-5 rounded-3xl p-6 [--wui-glass-corner-radius:24px]"
          >
            <div class="flex flex-col gap-2.5">
              <div class="flex items-center justify-between gap-2">
                <h3 class="text-xl font-semibold text-(--wui-color-text)">@greypan/deps-reload</h3>
                <span
                  class="inline-flex items-center gap-1 rounded-full bg-(--wui-color-surface-control) px-2.5 py-0.5 text-xs text-(--wui-color-text-secondary)"
                >
                  <web-ui-icon :icon="lucideCode" :size="12"></web-ui-icon>
                  2 篇文档
                </span>
              </div>
              <p class="text-sm leading-relaxed text-(--wui-color-text-secondary)">
                本地依赖构建产物变化时自动刷新页面，支持 Vite 与 Webpack，始终消费真实 dist 产物。
              </p>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <web-ui-button variant="primary" size="32" @click="go('/deps-reload/getting-started')">
                快速开始
              </web-ui-button>
              <web-ui-button variant="secondary" size="32" @click="go('/deps-reload/vite')">浏览文档</web-ui-button>
              <web-ui-button variant="ghost" size="32" @click="go('/deps-reload/changelog')">更新日志</web-ui-button>
            </div>
          </article>

          <article
            class="wui-glass flex flex-col justify-between gap-5 rounded-3xl p-6 [--wui-glass-corner-radius:24px]"
          >
            <div class="flex flex-col gap-2.5">
              <div class="flex items-center justify-between gap-2">
                <h3 class="text-xl font-semibold text-(--wui-color-text)">@greypan/unplugin-web-components</h3>
                <span
                  class="inline-flex items-center gap-1 rounded-full bg-(--wui-color-surface-control) px-2.5 py-0.5 text-xs text-(--wui-color-text-secondary)"
                >
                  <web-ui-icon :icon="lucideBoxes" :size="12"></web-ui-icon>
                  2 篇文档
                </span>
              </div>
              <p class="text-sm leading-relaxed text-(--wui-color-text-secondary)">
                在 Vue、React（JSX/TSX）与 Vite HTML 入口中按标签自动注入 Web Components 导入。
              </p>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <web-ui-button variant="primary" size="32" @click="go('/unplugin-web-components/getting-started')">
                快速开始
              </web-ui-button>
              <web-ui-button variant="secondary" size="32" @click="go('/unplugin-web-components/module-transforms')">
                浏览文档
              </web-ui-button>
              <web-ui-button variant="ghost" size="32" @click="go('/unplugin-web-components/changelog')">
                更新日志
              </web-ui-button>
            </div>
          </article>
        </div>
      </div>
    </section>

    <section class="w-full" aria-label="模块清单">
      <div
        class="mb-8 flex items-center justify-center gap-2 text-base font-semibold tracking-wider text-(--wui-color-text-secondary)"
      >
        <web-ui-icon :icon="lucideLayoutGrid" :size="18"></web-ui-icon>
        模块清单
      </div>

      <div class="flex flex-col gap-10">
        <div v-for="group in moduleGroups" :key="group.id" class="flex flex-col gap-4">
          <div class="flex flex-col items-start gap-1">
            <h2 class="text-lg font-semibold text-(--wui-color-text)">{{ group.title }}</h2>
            <span class="text-xs text-(--wui-color-text-tertiary)">{{ group.description() }}</span>
          </div>

          <div class="grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-3">
            <QuickLinkCard
              v-for="link in group.links"
              :key="link.path"
              :path="link.path"
              :label="link.label"
              :desc="link.desc()"
            />
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
