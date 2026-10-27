<template>
  <div class="flex flex-col items-start gap-3">
    <div class="flex flex-wrap items-center gap-3">
      <web-ui-button variant="secondary" @click="menu?.openMenu()">Call openMenu()</web-ui-button>
      <web-ui-button variant="secondary" @click="menu?.closeAll()">Call closeAll()</web-ui-button>
    </div>

    <div class="flex flex-wrap items-start gap-3">
      <web-ui-dropdown ref="menu">
        <web-ui-button slot="trigger" variant="secondary">Imperative menu</web-ui-button>
        <web-ui-dropdown-item value="edit">Edit</web-ui-dropdown-item>
        <web-ui-dropdown-item submenu>
          More
          <web-ui-dropdown-item value="archive">Archive</web-ui-dropdown-item>
        </web-ui-dropdown-item>
      </web-ui-dropdown>

      <web-ui-dropdown disabled>
        <web-ui-button slot="trigger" variant="secondary">Disabled menu</web-ui-button>
        <web-ui-dropdown-item>Cannot be opened</web-ui-dropdown-item>
      </web-ui-dropdown>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { WebUiDropdown } from '@greypan/web-ui'
import { useTemplateRef } from 'vue'

const menu = useTemplateRef<WebUiDropdown>('menu')
</script>
