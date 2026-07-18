<script setup lang="ts"></script>

<template>
  <div>
    <h1>按钮</h1>
    <h2>变体</h2>
    <div class="mb-12px flex gap-8px">
      <web-ui-button variant="primary">Primary</web-ui-button>
      <web-ui-button variant="secondary">Secondary</web-ui-button>
      <web-ui-button variant="ghost">Ghost</web-ui-button>
      <web-ui-button variant="danger">Danger</web-ui-button>
      <web-ui-button variant="glass">Glass</web-ui-button>
    </div>

    <h2>禁用与加载</h2>
    <div class="mb-12px flex gap-8px">
      <web-ui-button disabled>Disabled</web-ui-button>
      <web-ui-button variant="primary" disabled>Disabled</web-ui-button>
      <web-ui-button loading>Loading</web-ui-button>
      <web-ui-button variant="primary" loading>Loading</web-ui-button>
    </div>

    <h2>全宽</h2>
    <div class="mb-12px">
      <web-ui-button full>Full Width</web-ui-button>
    </div>

    <h2>插槽</h2>
    <div class="mb-12px flex gap-8px">
      <web-ui-button>
        <span slot="prefix">prefix</span>
        按钮
        <span slot="suffix">suffix</span>
      </web-ui-button>
    </div>

    <h2>图标模式</h2>
    <div class="mb-12px flex gap-8px">
      <web-ui-button icon>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
          <path fill="currentColor" d="M11 2v7H4v2h7v7h2v-7h7v-2h-7V2z" />
        </svg>
      </web-ui-button>
      <web-ui-button variant="secondary" icon>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
          <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6z" />
        </svg>
      </web-ui-button>
      <web-ui-button variant="glass" icon>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M19.14 12.94a7 7 0 0 0 .06-.94c0-.32-.02-.64-.06-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 0 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.3-.06.63-.06.94s.02.64.06.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61zM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2"
          />
        </svg>
      </web-ui-button>
    </div>
  </div>
</template>
