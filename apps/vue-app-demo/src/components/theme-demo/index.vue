<script setup lang="ts">
import { toast } from '@greypan/web-ui'
import { ref } from 'vue'

type ThemeMotion = 'full' | 'reduced' | 'system'

const appearance = ref<'light' | 'dark' | 'system'>('light')
const motion = ref<ThemeMotion>('system')
const innerAppearance = ref<'light' | 'dark'>('dark')
const innerMotion = ref<ThemeMotion>('full')
const innermostAppearance = ref<'light' | 'dark'>('light')
const innermostMotion = ref<ThemeMotion>('system')
const scopedSelectValue = ref('portal')
const scopedDialogOpen = ref(false)
const scopedToastTarget = ref<HTMLElement>()

function showScopedToast() {
  if (!scopedToastTarget.value) return

  toast.info('Toast 会挂载到当前 theme scope 的 overlay root。', {
    heading: 'Scoped toast',
    duration: 3000,
    target: scopedToastTarget.value
  })
}
</script>

<template>
  <div>
    <h1>Theme</h1>
    <p class="mb-4 text-[var(--wui-color-text-muted)]">
      web-ui-theme 支持多层嵌套，每一层独立控制外观与动效。内层主题优先于外层。
    </p>

    <h2>基本用法（单层）</h2>
    <h3>外观</h3>
    <div class="mb-4">
      <web-ui-segmented
        :value="appearance"
        aria-label="单层主题外观"
        @input="appearance = ($event.target as any).value"
      >
        <web-ui-segmented-trigger value="light">Light</web-ui-segmented-trigger>
        <web-ui-segmented-trigger value="dark">Dark</web-ui-segmented-trigger>
        <web-ui-segmented-trigger value="system">System</web-ui-segmented-trigger>
      </web-ui-segmented>
    </div>

    <h3>动效偏好</h3>
    <div class="mb-4">
      <web-ui-segmented :value="motion" aria-label="单层主题动效偏好" @input="motion = ($event.target as any).value">
        <web-ui-segmented-trigger value="full">Full</web-ui-segmented-trigger>
        <web-ui-segmented-trigger value="reduced">Reduced</web-ui-segmented-trigger>
        <web-ui-segmented-trigger value="system">System</web-ui-segmented-trigger>
      </web-ui-segmented>
    </div>

    <web-ui-theme
      :appearance="appearance"
      :motion="motion"
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

        <h3>浮层继承</h3>
        <p class="mb-3 text-sm text-[var(--wui-color-text-muted)]">
          Portal Select、Toast 与 Dialog 均继承当前主题范围的外观和动效 token。
        </p>
        <div class="flex flex-wrap items-center gap-3">
          <web-ui-select v-model="scopedSelectValue" portal aria-label="主题范围 Portal Select">
            <web-ui-option value="portal" label="Portal overlay">Portal overlay</web-ui-option>
            <web-ui-option value="theme" label="Theme tokens">Theme tokens</web-ui-option>
            <web-ui-option value="motion" label="Motion tokens">Motion tokens</web-ui-option>
          </web-ui-select>
          <web-ui-button ref="scopedToastTarget" variant="secondary" @click="showScopedToast">显示 Toast</web-ui-button>
          <web-ui-button variant="secondary" @click="scopedDialogOpen = true">打开 Dialog</web-ui-button>
        </div>

        <web-ui-dialog :open="scopedDialogOpen" @open-change="scopedDialogOpen = $event.detail.open">
          <span slot="title">Scoped dialog</span>
          Dialog 位于原生 top layer，仍继承当前 theme scope 的颜色与动效 token。
          <web-ui-button slot="footer" variant="primary" full @click="scopedDialogOpen = false">关闭</web-ui-button>
        </web-ui-dialog>
      </section>
    </web-ui-theme>

    <h2>多层嵌套</h2>
    <p class="mb-4 text-sm text-[var(--wui-color-text-muted)]">
      外层 Light / Reduced → 内层 Dark / Full → 最内层 Light / System，每层独立控制，互不干扰。
    </p>

    <div class="mb-4 flex flex-wrap items-center gap-4">
      <div class="flex items-center gap-2">
        <span class="text-sm text-[var(--wui-color-text-muted)]">内层外观</span>
        <web-ui-segmented
          :value="innerAppearance"
          aria-label="内层主题外观"
          @input="innerAppearance = ($event.target as any).value"
        >
          <web-ui-segmented-trigger value="light">Light</web-ui-segmented-trigger>
          <web-ui-segmented-trigger value="dark">Dark</web-ui-segmented-trigger>
        </web-ui-segmented>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-sm text-[var(--wui-color-text-muted)]">最内层外观</span>
        <web-ui-segmented
          :value="innermostAppearance"
          aria-label="最内层主题外观"
          @input="innermostAppearance = ($event.target as any).value"
        >
          <web-ui-segmented-trigger value="light">Light</web-ui-segmented-trigger>
          <web-ui-segmented-trigger value="dark">Dark</web-ui-segmented-trigger>
        </web-ui-segmented>
      </div>
    </div>

    <div class="mb-4 flex flex-wrap items-center gap-4">
      <div class="flex items-center gap-2">
        <span class="text-sm text-[var(--wui-color-text-muted)]">内层动效</span>
        <web-ui-segmented
          :value="innerMotion"
          aria-label="内层主题动效偏好"
          @input="innerMotion = ($event.target as any).value"
        >
          <web-ui-segmented-trigger value="system">System</web-ui-segmented-trigger>
          <web-ui-segmented-trigger value="full">Full</web-ui-segmented-trigger>
          <web-ui-segmented-trigger value="reduced">Reduced</web-ui-segmented-trigger>
        </web-ui-segmented>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-sm text-[var(--wui-color-text-muted)]">最内层动效</span>
        <web-ui-segmented
          :value="innermostMotion"
          aria-label="最内层主题动效偏好"
          @input="innermostMotion = ($event.target as any).value"
        >
          <web-ui-segmented-trigger value="system">System</web-ui-segmented-trigger>
          <web-ui-segmented-trigger value="full">Full</web-ui-segmented-trigger>
          <web-ui-segmented-trigger value="reduced">Reduced</web-ui-segmented-trigger>
        </web-ui-segmented>
      </div>
    </div>

    <web-ui-theme
      appearance="light"
      motion="reduced"
      class="block rounded-xl border p-6"
      style="border-color: var(--wui-color-border)"
    >
      <section style="background: var(--wui-color-page)">
        <p class="mb-2 text-xs text-[var(--wui-color-text-muted)]">外层（Light / Reduced）</p>
        <div class="flex flex-wrap gap-3">
          <web-ui-button variant="primary">外层按钮</web-ui-button>
          <web-ui-switch checked></web-ui-switch>
        </div>

        <web-ui-theme
          :appearance="innerAppearance"
          :motion="innerMotion"
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
              :motion="innermostMotion"
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
