<script setup lang="ts">
import { computed, ref } from 'vue'

const NAV_ITEMS = [
  { label: '概览', short: '览' },
  { label: '组件', short: '组' },
  { label: '主题', short: '题' },
  { label: '设置', short: '设' }
]

const collapsed = ref(false)
const open = ref(false)
const sidebarWidth = ref('240px')
const mobile = ref(false)

// 折叠只收窄桌面端 aside；移动端 Drawer 承载同一份导航，套用折叠态会把标签挤成截断（issue #195）。
const navCollapsed = computed(() => collapsed.value && !mobile.value)
</script>

<template>
  <div>
    <h1>Layout 布局</h1>
    <p class="mb-3 text-sm text-gray-500">
      demo 把整屏布局装进一个固定高度的滚动框：Banner 随内容滚出，header 与 tabbar 各贴在框的上下缘，桌面端 sidebar
      右缘可拖拽调宽，折叠 Toggle 由 layout 自己渲染。
    </p>

    <div class="h-[520px] overflow-auto rounded-lg border border-(--wui-color-border)">
      <web-ui-layout
        header-glow
        sidebar-resizable
        :sidebarCollapsed="collapsed"
        :sidebarOpen="open"
        :sidebarWidth="sidebarWidth"
        sidebar-min-width="160px"
        sidebar-max-width="360px"
        @sidebar-collapsed-change="collapsed = $event.detail.collapsed"
        @sidebar-open-change="open = $event.detail.open"
        @sidebar-width-change="sidebarWidth = $event.detail.width"
        @mobile-change="mobile = $event.detail.mobile"
      >
        <div
          slot="banner"
          class="flex items-center justify-center bg-(--wui-color-accent) px-4 py-2 text-sm text-(--wui-color-on-accent)"
        >
          全宽 Banner
        </div>
        <div slot="header" class="flex items-center px-4 py-2 text-sm font-medium">Header</div>
        <nav slot="sidebar" class="flex h-full min-h-0 flex-col gap-1 overflow-y-auto p-2">
          <span
            v-for="item in NAV_ITEMS"
            :key="item.label"
            :class="navCollapsed ? 'rounded-md p-2 text-center text-xs' : 'rounded-md p-2 text-sm'"
          >
            {{ navCollapsed ? item.short : item.label }}
          </span>
        </nav>
        <div class="p-4">
          <p class="m-0 text-sm">内容区随框内滚动条滚动，header 与 tabbar 固定在框的上下缘。</p>
          <p class="mt-2 text-sm text-gray-500">
            拖 sidebar 右缘的手柄改宽度；用 Toggle 折叠侧边栏；把窗口收窄到 640px 及以下，布局会切到移动端分支，由
            header 里的 Toggle 打开 Drawer。
          </p>
          <div class="mt-3 h-[420px] rounded-md bg-(--wui-color-surface-control)" />
        </div>
        <div slot="tabbar" class="flex items-center justify-center px-4 py-2 text-xs">Tabbar</div>
      </web-ui-layout>
    </div>

    <p class="mt-3 text-sm text-gray-500">
      折叠：{{ collapsed ? '是' : '否' }} · 侧边栏宽度：{{ sidebarWidth }} · 视口判定：{{
        mobile ? '移动端' : '桌面端'
      }}
      · Drawer：{{ open ? '打开' : '关闭' }}
    </p>
  </div>
</template>
