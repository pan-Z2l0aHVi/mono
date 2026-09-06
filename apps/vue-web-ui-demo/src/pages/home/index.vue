<route lang="json">
{
  "meta": {
    "title": "首页"
  }
}
</route>

<script setup lang="ts">
import {
  lucideCode,
  lucideLayoutGrid,
  lucidePackage,
  lucideSettings,
  lucideSlidersHorizontal
} from '@greypan/web-ui/icons'
import { RouterLink } from 'vue-router'

const quickLinks = [
  { path: '/components/button', label: 'Button 按钮', desc: '支持多种变体、尺寸、图标与加载态' },
  { path: '/components/dialog', label: 'Dialog 对话框', desc: '模态与无障碍对齐的对话框交互' },
  { path: '/components/drawer', label: 'Drawer 抽屉', desc: '支持手势拖拽关闭与悬浮卡片形态' },
  { path: '/components/theme', label: 'Theme 主题', desc: '深浅色切换与减弱动效策略' },
  { path: '/components/select', label: 'Select 下拉选择', desc: '基于 Floating UI 的下拉弹层与选项' },
  { path: '/components/toast', label: 'Toast 通知', desc: '轻量响应式全局通知提示' }
]
</script>

<template>
  <div class="max-w-4xl mx-auto px-6 py-12 flex flex-col items-center text-center">
    <!-- Big Logo -->
    <div class="relative group mb-8">
      <div
        class="absolute -inset-1.5 rounded-[2.5rem] bg-gradient-to-tr from-[var(--wui-color-accent)] to-[var(--wui-color-accent)] opacity-40 blur-xl transition-all duration-500 group-hover:opacity-75"
      ></div>
      <img
        src="/bo.svg"
        alt="Bo Logo"
        class="relative w-36 h-36 md:w-44 md:h-44 rounded-[2rem] shadow-2xl border border-[var(--wui-color-border)] object-cover bg-[var(--wui-color-surface)] transition-transform duration-300 group-hover:scale-105"
      />
    </div>

    <!-- Title & Tagline -->
    <h1 class="text-3xl md:text-5xl font-bold tracking-tight text-[var(--wui-color-text)] mb-4">Web UI</h1>
    <p class="text-base md:text-lg text-[var(--wui-color-text-secondary)] max-w-2xl leading-relaxed mb-8">
      基于 Web Components 的跨框架现代 UI 组件库。一套轻量、精致的核心设计系统，原生支持 Vue、React 以及任意前端技术栈。
    </p>

    <!-- Badges / Features -->
    <div class="flex flex-wrap justify-center gap-3 mb-12">
      <span
        class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[var(--wui-color-accent)] text-[var(--wui-color-on-accent)] shadow-sm"
      >
        <web-ui-icon :icon="lucidePackage" :size="14"></web-ui-icon>
        Web Components 原生
      </span>
      <span
        class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[var(--wui-color-surface-raised)] border border-[var(--wui-color-border)] text-[var(--wui-color-text)]"
      >
        <web-ui-icon :icon="lucideCode" :size="14"></web-ui-icon>
        跨框架无缝适配
      </span>
      <span
        class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[var(--wui-color-surface-raised)] border border-[var(--wui-color-border)] text-[var(--wui-color-text)]"
      >
        <web-ui-icon :icon="lucideSlidersHorizontal" :size="14"></web-ui-icon>
        语义化设计 Token
      </span>
      <span
        class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[var(--wui-color-surface-raised)] border border-[var(--wui-color-border)] text-[var(--wui-color-text)]"
      >
        <web-ui-icon :icon="lucideSettings" :size="14"></web-ui-icon>
        深浅色 & 动效偏好
      </span>
    </div>

    <!-- Quick Links Header -->
    <div class="w-full text-left">
      <div
        class="flex items-center gap-2 mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--wui-color-text-secondary)]"
      >
        <web-ui-icon :icon="lucideLayoutGrid" :size="16"></web-ui-icon>
        常用组件快速预览
      </div>

      <!-- Component Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <RouterLink
          v-for="link in quickLinks"
          :key="link.path"
          :to="link.path"
          class="group p-4 rounded-xl border border-[var(--wui-color-border)] bg-[var(--wui-color-surface)] hover:bg-[var(--wui-color-surface-raised)] hover:border-[var(--wui-color-accent)] transition-all duration-200 text-left flex flex-col justify-between"
        >
          <div>
            <div
              class="font-medium text-[var(--wui-color-text)] group-hover:text-[var(--wui-color-accent)] transition-colors"
            >
              {{ link.label }}
            </div>
            <div class="text-xs text-[var(--wui-color-text-secondary)] mt-1.5 line-clamp-2">
              {{ link.desc }}
            </div>
          </div>
          <div
            class="mt-3 text-xs font-medium text-[var(--wui-color-accent)] flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            查看演示 →
          </div>
        </RouterLink>
      </div>
    </div>
  </div>
</template>
