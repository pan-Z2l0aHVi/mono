<script setup lang="ts">
import {
  lucideChevronDown,
  lucideChevronLeft,
  lucideChevronRight,
  lucideChevronUp,
  lucideMinus,
  lucidePlus,
  lucideSearch
} from '@greypan/web-ui/icons'
</script>

<template>
  <div>
    <h1>按钮</h1>
    <h2>变体</h2>
    <div class="mb-3 flex gap-2">
      <web-ui-button variant="primary">Primary</web-ui-button>
      <web-ui-button variant="secondary">Secondary</web-ui-button>
      <web-ui-button variant="ghost">Ghost</web-ui-button>
      <web-ui-button variant="danger">Danger</web-ui-button>
      <web-ui-button variant="glass">Glass</web-ui-button>
    </div>

    <h2>禁用与加载</h2>
    <div class="mb-3 flex gap-2">
      <web-ui-button disabled>Disabled</web-ui-button>
      <web-ui-button variant="primary" disabled>Disabled</web-ui-button>
      <web-ui-button loading>Loading</web-ui-button>
      <web-ui-button variant="primary" loading>Loading</web-ui-button>
    </div>

    <h2>全宽</h2>
    <div class="mb-3">
      <web-ui-button full>Full Width</web-ui-button>
      <div class="my-2"></div>
      <web-ui-button full :variant="'primary'">Full Width</web-ui-button>
    </div>

    <h2>插槽</h2>
    <div class="mb-3 flex gap-2">
      <web-ui-button>
        <span slot="prefix">prefix</span>
        按钮
        <span slot="suffix">suffix</span>
      </web-ui-button>
      <web-ui-button>
        <svg slot="prefix" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
          <path fill="currentColor" d="M11 2v7H4v2h7v7h2v-7h7v-2h-7V2z" />
        </svg>
        按钮
      </web-ui-button>
    </div>

    <h2>图标模式</h2>
    <div class="mb-3 flex gap-2">
      <web-ui-button icon>
        <web-ui-icon :icon="lucideSearch"></web-ui-icon>
      </web-ui-button>
      <web-ui-button icon variant="primary">
        <web-ui-icon :icon="lucideSearch"></web-ui-icon>
      </web-ui-button>
      <web-ui-button icon variant="secondary">
        <web-ui-icon :icon="lucideSearch"></web-ui-icon>
      </web-ui-button>
      <web-ui-button icon variant="ghost">
        <web-ui-icon :icon="lucideSearch"></web-ui-icon>
      </web-ui-button>
      <web-ui-button icon variant="danger">
        <web-ui-icon :icon="lucideSearch"></web-ui-icon>
      </web-ui-button>

      <web-ui-button icon>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
          <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6z" />
        </svg>
      </web-ui-button>
    </div>

    <h2>按钮组</h2>
    <div class="mb-3 flex flex-col gap-4">
      <h3>纯文字</h3>
      <web-ui-button-group>
        <web-ui-button>Tab 1</web-ui-button>
        <web-ui-button>Tab 2</web-ui-button>
        <web-ui-button>Tab 3</web-ui-button>
      </web-ui-button-group>

      <h3>纯图标</h3>
      <web-ui-button-group>
        <web-ui-button icon><web-ui-icon :icon="lucideChevronLeft"></web-ui-icon></web-ui-button>
        <web-ui-button icon><web-ui-icon :icon="lucideChevronRight"></web-ui-icon></web-ui-button>
      </web-ui-button-group>

      <h3>图标 + 文字</h3>
      <web-ui-button-group>
        <web-ui-button>
          <web-ui-icon slot="prefix" :icon="lucideChevronLeft"></web-ui-icon>
          上一页
        </web-ui-button>
        <web-ui-button>
          下一页
          <web-ui-icon slot="suffix" :icon="lucideChevronRight"></web-ui-icon>
        </web-ui-button>
      </web-ui-button-group>

      <h3>混合内容</h3>
      <web-ui-button-group>
        <web-ui-button icon><web-ui-icon :icon="lucideChevronLeft"></web-ui-icon></web-ui-button>
        <web-ui-button>搜索</web-ui-button>
        <web-ui-button icon><web-ui-icon :icon="lucideSearch"></web-ui-icon></web-ui-button>
      </web-ui-button-group>

      <h3>垂直排列</h3>
      <web-ui-button-group orientation="vertical">
        <web-ui-button icon><web-ui-icon :icon="lucidePlus"></web-ui-icon></web-ui-button>
        <web-ui-button icon><web-ui-icon :icon="lucideMinus"></web-ui-icon></web-ui-button>
      </web-ui-button-group>
    </div>
  </div>
</template>
