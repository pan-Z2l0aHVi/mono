<template>
  <div
    class="h-[420px] overflow-auto rounded-lg border border-(--wui-color-border) [--wui-layout-viewport-height:420px]"
  >
    <web-ui-layout no-sidebar header-glow>
      <div slot="header" class="flex items-center px-4 py-2 text-sm font-medium">Header</div>
      <div class="p-4">
        <p class="m-0 text-sm">
          With no-sidebar there is no aside, Toggle, or Drawer, so the content column fills the row.
        </p>
        <div class="mt-3 h-[420px] rounded-md bg-(--wui-color-surface-control)" />
      </div>
      <div slot="tabbar" class="flex justify-center p-2">
        <web-ui-segmented aria-label="Bottom navigation" :value="tab" @input="tab = $event.currentTarget.value">
          <web-ui-segmented-trigger value="home" aria-label="Home"
            ><web-ui-icon :icon="lucideHouse"
          /></web-ui-segmented-trigger>
          <web-ui-segmented-trigger value="orders" aria-label="Orders"
            ><web-ui-icon :icon="lucideFileText"
          /></web-ui-segmented-trigger>
          <web-ui-segmented-trigger value="cart" aria-label="Cart"
            ><web-ui-icon :icon="lucideShoppingCart"
          /></web-ui-segmented-trigger>
          <web-ui-segmented-trigger value="account" aria-label="Account"
            ><web-ui-icon :icon="lucideUser"
          /></web-ui-segmented-trigger>
        </web-ui-segmented>
      </div>
    </web-ui-layout>
  </div>
</template>

<script setup lang="ts">
import { lucideFileText, lucideHouse, lucideShoppingCart, lucideUser } from '@greypan/web-ui/icons'
import { ref } from 'vue'

const tab = ref('home')
</script>
