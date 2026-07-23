<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router'

const route = useRoute()

interface NavItem {
  path: string
  label: string
}

const navItems: NavItem[] = [
  { path: '/home', label: '首页' },
  { path: '/components/button', label: '按钮' },
  { path: '/components/icon', label: '图标' },
  { path: '/components/input', label: '输入框' },
  { path: '/components/input-number', label: '数字输入框' },
  { path: '/components/select', label: '下拉选择' },
  { path: '/components/dropdown', label: '下拉菜单' },
  { path: '/components/dialog', label: '对话框' },
  { path: '/components/drawer', label: '抽屉' },
  { path: '/components/tooltip', label: '工具提示' },
  { path: '/components/switch', label: '开关' },
  { path: '/components/radio', label: '单选框' },
  { path: '/components/checkbox', label: '复选框' }
]
</script>

<template>
  <web-ui-layout>
    <div slot="sidebar">
      <nav class="px-2 py-3">
        <div class="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">组件列表</div>
        <RouterLink
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          class="block rounded-full px-3 py-2 text-sm transition-colors"
          :class="route.path === item.path ? 'bg-blue-500 text-white' : 'text-gray-700 hover:bg-gray-200'"
        >
          {{ item.label }}
        </RouterLink>
      </nav>
    </div>

    <RouterView />
  </web-ui-layout>
  <web-ui-back-top></web-ui-back-top>
</template>
