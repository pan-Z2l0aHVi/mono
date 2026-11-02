<template>
  <div class="flex flex-col items-start gap-3">
    <div class="flex flex-wrap items-center gap-3">
      <web-ui-button variant="secondary" @click="open = !open">
        {{ open ? '关闭菜单' : '打开菜单' }}
      </web-ui-button>
      <output class="text-sm text-(--wui-color-text-secondary)">
        状态：{{ open ? 'open' : 'closed' }} · 最近选择：{{ last }}
      </output>
    </div>

    <web-ui-dropdown :open="open" @open-change="open = $event.detail.open">
      <web-ui-button slot="trigger" variant="secondary">受控菜单</web-ui-button>
      <web-ui-dropdown-item value="edit" @click="select('编辑')">编辑</web-ui-dropdown-item>
      <web-ui-dropdown-item value="copy" @click="select('复制')">复制</web-ui-dropdown-item>
      <web-ui-dropdown-item value="archive" @click="select('归档')">归档</web-ui-dropdown-item>
    </web-ui-dropdown>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const open = ref(false)
const last = ref('—')

function select(label: string) {
  last.value = label
  open.value = false
}
</script>
