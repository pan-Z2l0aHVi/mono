<script setup lang="ts">
import type { WebUiContextMenu } from '@greypan/web-ui'
import {
  lucideCopy,
  lucideScissors,
  lucideClipboardPaste,
  lucideTrash2,
  lucideFile,
  lucideFolder,
  lucideSettings
} from '@greypan/web-ui/icons'
import { ref } from 'vue'

const disabled = ref(false)

const handleOpenChange = (e: Event) => {
  const event = e as CustomEvent
  console.log('open-change:', event.detail.open)
}

const openApiMenu = () => {
  const menu = document.querySelector<WebUiContextMenu>('#demo-api-context-menu')
  menu?.openAt(200, 200)
}
</script>

<template>
  <div>
    <h1>右键菜单</h1>

    <h2>基础用法</h2>
    <p class="mb-4 text-sm text-gray-500">在下方区域右键点击打开菜单</p>
    <div class="mb-6">
      <web-ui-context-menu id="demo-context-menu" @open-change="handleOpenChange">
        <div
          class="flex h-48 w-full items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 text-gray-500"
        >
          在此区域右键点击
        </div>
        <web-ui-dropdown-item>
          <web-ui-icon slot="prefix" :size="14" :icon="lucideCopy"></web-ui-icon>
          复制
        </web-ui-dropdown-item>
        <web-ui-dropdown-item>
          <web-ui-icon slot="prefix" :size="14" :icon="lucideScissors"></web-ui-icon>
          剪切
        </web-ui-dropdown-item>
        <web-ui-dropdown-item>
          <web-ui-icon slot="prefix" :size="14" :icon="lucideClipboardPaste"></web-ui-icon>
          粘贴
        </web-ui-dropdown-item>
        <web-ui-dropdown-divider></web-ui-dropdown-divider>
        <web-ui-dropdown-item disabled>
          <web-ui-icon slot="prefix" :size="14" :icon="lucideTrash2"></web-ui-icon>
          删除
        </web-ui-dropdown-item>
      </web-ui-context-menu>
    </div>

    <h2>带图标和快捷键</h2>
    <p class="mb-4 text-sm text-gray-500">更丰富的菜单项展示</p>
    <div class="mb-6">
      <web-ui-context-menu>
        <div
          class="flex h-48 w-full items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 text-gray-500"
        >
          在此区域右键点击
        </div>
        <web-ui-dropdown-item>
          <web-ui-icon slot="prefix" :size="14" :icon="lucideFile"></web-ui-icon>
          新建文件
          <span class="opacity-40" slot="suffix">⌘N</span>
        </web-ui-dropdown-item>
        <web-ui-dropdown-item>
          <web-ui-icon slot="prefix" :size="14" :icon="lucideFolder"></web-ui-icon>
          新建文件夹
          <span class="opacity-40" slot="suffix">⇧⌘N</span>
        </web-ui-dropdown-item>
        <web-ui-dropdown-divider></web-ui-dropdown-divider>
        <web-ui-dropdown-item>
          <web-ui-icon slot="prefix" :size="14" :icon="lucideCopy"></web-ui-icon>
          复制
          <span class="opacity-40" slot="suffix">⌘C</span>
        </web-ui-dropdown-item>
        <web-ui-dropdown-item>
          <web-ui-icon slot="prefix" :size="14" :icon="lucideScissors"></web-ui-icon>
          剪切
          <span class="opacity-40" slot="suffix">⌘X</span>
        </web-ui-dropdown-item>
        <web-ui-dropdown-item>
          <web-ui-icon slot="prefix" :size="14" :icon="lucideClipboardPaste"></web-ui-icon>
          粘贴
          <span class="opacity-40" slot="suffix">⌘V</span>
        </web-ui-dropdown-item>
        <web-ui-dropdown-divider></web-ui-dropdown-divider>
        <web-ui-dropdown-item>
          <web-ui-icon slot="prefix" :size="14" :icon="lucideSettings"></web-ui-icon>
          偏好设置
          <span class="opacity-40" slot="suffix">⌘,</span>
        </web-ui-dropdown-item>
      </web-ui-context-menu>
    </div>

    <h2>禁用状态</h2>
    <p class="mb-4 text-sm text-gray-500">禁用时右键不会打开菜单</p>
    <div class="mb-6">
      <web-ui-context-menu :disabled="disabled">
        <div
          class="flex h-48 w-full items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 text-gray-500"
        >
          {{ disabled ? '菜单已禁用' : '右键点击试试' }}
        </div>
        <web-ui-dropdown-item>编辑</web-ui-dropdown-item>
        <web-ui-dropdown-item>复制</web-ui-dropdown-item>
      </web-ui-context-menu>
      <div class="mt-2">
        <web-ui-button variant="secondary" @click="disabled = !disabled">
          {{ disabled ? '启用菜单' : '禁用菜单' }}
        </web-ui-button>
      </div>
    </div>

    <h2>通过 API 调用</h2>
    <p class="mb-4 text-sm text-gray-500">使用 JavaScript API 在指定位置打开菜单</p>
    <div class="mb-6">
      <web-ui-button @click="openApiMenu"> 在 (200, 200) 打开菜单 </web-ui-button>
      <web-ui-context-menu id="demo-api-context-menu">
        <web-ui-dropdown-item>操作 1</web-ui-dropdown-item>
        <web-ui-dropdown-item>操作 2</web-ui-dropdown-item>
        <web-ui-dropdown-item>操作 3</web-ui-dropdown-item>
      </web-ui-context-menu>
    </div>

    <h2>嵌套菜单</h2>
    <p class="mb-4 text-sm text-gray-500">支持子菜单的右键菜单</p>
    <div class="mb-6">
      <web-ui-context-menu>
        <div
          class="flex h-48 w-full items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 text-gray-500"
        >
          在此区域右键点击
        </div>
        <web-ui-dropdown-item submenu>
          <web-ui-icon slot="prefix" :size="14" :icon="lucideFile"></web-ui-icon>
          导出为
          <web-ui-dropdown-item>导出为 PDF</web-ui-dropdown-item>
          <web-ui-dropdown-item>导出为 PNG</web-ui-dropdown-item>
          <web-ui-dropdown-item>导出为 SVG</web-ui-dropdown-item>
        </web-ui-dropdown-item>
        <web-ui-dropdown-item submenu>
          <web-ui-icon slot="prefix" :size="14" :icon="lucideFolder"></web-ui-icon>
          导入
          <web-ui-dropdown-item>从文件导入</web-ui-dropdown-item>
          <web-ui-dropdown-item>从剪贴板导入</web-ui-dropdown-item>
        </web-ui-dropdown-item>
        <web-ui-dropdown-divider></web-ui-dropdown-divider>
        <web-ui-dropdown-item>
          <web-ui-icon slot="prefix" :size="14" :icon="lucideSettings"></web-ui-icon>
          设置
        </web-ui-dropdown-item>
      </web-ui-context-menu>
    </div>

    <h2>macOS 风格</h2>
    <p class="mb-4 text-sm text-gray-500">类似 macOS Finder 的右键菜单</p>
    <div class="mb-6">
      <web-ui-context-menu>
        <div
          class="flex h-48 w-full items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 text-gray-500"
        >
          在此区域右键点击
        </div>
        <web-ui-dropdown-item>
          <web-ui-icon slot="prefix" :size="14" :icon="lucideCopy"></web-ui-icon>
          复制
          <span slot="suffix" class="opacity-40">⌘C</span>
        </web-ui-dropdown-item>
        <web-ui-dropdown-item>
          <web-ui-icon slot="prefix" :size="14" :icon="lucideScissors"></web-ui-icon>
          剪切
          <span slot="suffix" class="opacity-40">⌘X</span>
        </web-ui-dropdown-item>
        <web-ui-dropdown-item>
          <web-ui-icon slot="prefix" :size="14" :icon="lucideClipboardPaste"></web-ui-icon>
          粘贴
          <span slot="suffix" class="opacity-40">⌘V</span>
        </web-ui-dropdown-item>
        <web-ui-dropdown-divider></web-ui-dropdown-divider>
        <web-ui-dropdown-item disabled>
          <web-ui-icon slot="prefix" :size="14" :icon="lucideTrash2"></web-ui-icon>
          删除
          <span slot="suffix" class="opacity-40">⌫</span>
        </web-ui-dropdown-item>
        <web-ui-dropdown-divider></web-ui-dropdown-divider>
        <web-ui-dropdown-header>更多信息</web-ui-dropdown-header>
        <web-ui-dropdown-item>获取信息</web-ui-dropdown-item>
      </web-ui-context-menu>
    </div>
  </div>
</template>
