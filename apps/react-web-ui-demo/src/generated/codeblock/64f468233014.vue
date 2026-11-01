<template>
  <div class="flex flex-col items-start gap-3">
    <div class="flex flex-wrap items-center gap-3">
      <web-ui-button variant="secondary" @click="menu?.openMenu()">调用 openMenu()</web-ui-button>
      <web-ui-button variant="secondary" @click="menu?.closeAll()">调用 closeAll()</web-ui-button>
    </div>

    <div class="flex flex-wrap items-start gap-3">
      <web-ui-dropdown ref="menu">
        <web-ui-button slot="trigger" variant="secondary">命令式菜单</web-ui-button>
        <web-ui-dropdown-item value="edit">编辑</web-ui-dropdown-item>
        <web-ui-dropdown-item submenu>
          更多
          <web-ui-dropdown-item value="archive">归档</web-ui-dropdown-item>
        </web-ui-dropdown-item>
      </web-ui-dropdown>

      <web-ui-dropdown disabled>
        <web-ui-button slot="trigger" variant="secondary">禁用菜单</web-ui-button>
        <web-ui-dropdown-item>不可打开</web-ui-dropdown-item>
      </web-ui-dropdown>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { WebUiDropdown } from '@greypan/web-ui'
import { useTemplateRef } from 'vue'

const menu = useTemplateRef<WebUiDropdown>('menu')
</script>
