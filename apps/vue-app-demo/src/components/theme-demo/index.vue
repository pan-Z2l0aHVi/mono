<script setup lang="ts">
import { ref } from 'vue'

const appearance = ref<'light' | 'dark' | 'system'>('light')
const innerAppearance = ref<'light' | 'dark'>('dark')
const innermostAppearance = ref<'light' | 'dark'>('light')
</script>

<template>
  <div>
    <h1>Theme</h1>
    <p class="mb-4 text-[var(--wui-color-text-muted)]">
      web-ui-theme 支持多层嵌套，每一层独立控制外观。内层主题优先于外层。
    </p>

    <h2>基本用法（单层）</h2>
    <div class="mb-6 flex gap-2">
      <web-ui-button variant="secondary" @click="appearance = 'light'">Light</web-ui-button>
      <web-ui-button variant="secondary" @click="appearance = 'dark'">Dark</web-ui-button>
      <web-ui-button variant="secondary" @click="appearance = 'system'">System</web-ui-button>
    </div>

    <web-ui-theme
      :appearance="appearance"
      class="block rounded-xl border p-6"
      style="border-color: var(--wui-color-border)"
    >
      <section style="background: var(--wui-color-page)">
        <div class="flex flex-wrap gap-3">
          <web-ui-button variant="primary">Primary</web-ui-button>
          <web-ui-button variant="secondary">Secondary</web-ui-button>
          <web-ui-button variant="danger">Danger</web-ui-button>
          <web-ui-input value="Theme scope"></web-ui-input>
          <web-ui-switch checked></web-ui-switch>
        </div>
      </section>
    </web-ui-theme>

    <h2>多层嵌套</h2>
    <p class="mb-4 text-sm text-[var(--wui-color-text-muted)]">
      外层 Light → 内层 Dark → 最内层 Light，每层独立控制，互不干扰。
    </p>

    <div class="mb-4 flex gap-2">
      <web-ui-button variant="secondary" @click="innerAppearance = 'dark'">内层 Dark</web-ui-button>
      <web-ui-button variant="secondary" @click="innerAppearance = 'light'">内层 Light</web-ui-button>
      <web-ui-button variant="secondary" @click="innermostAppearance = 'light'">最内层 Light</web-ui-button>
      <web-ui-button variant="secondary" @click="innermostAppearance = 'dark'">最内层 Dark</web-ui-button>
    </div>

    <web-ui-theme appearance="light" class="block rounded-xl border p-6" style="border-color: var(--wui-color-border)">
      <section style="background: var(--wui-color-page)">
        <p class="mb-2 text-xs text-[var(--wui-color-text-muted)]">外层（Light）</p>
        <div class="flex flex-wrap gap-3">
          <web-ui-button variant="primary">外层按钮</web-ui-button>
          <web-ui-switch checked></web-ui-switch>
        </div>

        <web-ui-theme
          :appearance="innerAppearance"
          class="mt-4 block rounded-xl border p-6"
          style="border-color: var(--wui-color-border)"
        >
          <section style="background: var(--wui-color-page)">
            <p class="mb-2 text-xs text-[var(--wui-color-text-muted)]">内层（可切换）</p>
            <div class="flex flex-wrap gap-3">
              <web-ui-button variant="primary">内层按钮</web-ui-button>
              <web-ui-input value="内层输入"></web-ui-input>
              <web-ui-switch checked></web-ui-switch>
            </div>

            <web-ui-theme
              :appearance="innermostAppearance"
              class="mt-4 block rounded-xl border p-6"
              style="border-color: var(--wui-color-border)"
            >
              <section style="background: var(--wui-color-page)">
                <p class="mb-2 text-xs text-[var(--wui-color-text-muted)]">最内层（可切换）</p>
                <div class="flex flex-wrap gap-3">
                  <web-ui-button variant="primary">最内层按钮</web-ui-button>
                  <web-ui-switch checked></web-ui-switch>
                </div>
              </section>
            </web-ui-theme>
          </section>
        </web-ui-theme>
      </section>
    </web-ui-theme>
  </div>
</template>
