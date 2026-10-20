<script setup lang="ts">
import { toast, type WebUiEvent, type WebUiSegmented } from '@greypan/web-ui'
import { ref } from 'vue'

type ThemeAppearance = 'light' | 'dark' | 'system'
type ThemeMotion = 'full' | 'reduced' | 'system'

const APPEARANCES = new Set<ThemeAppearance>(['light', 'dark', 'system'])
const MOTIONS = new Set<ThemeMotion>(['full', 'reduced', 'system'])

function isAppearance(value: string): value is ThemeAppearance {
  return APPEARANCES.has(value as ThemeAppearance)
}
function isMotion(value: string): value is ThemeMotion {
  return MOTIONS.has(value as ThemeMotion)
}

const appearance = ref<ThemeAppearance>('light')
const motion = ref<ThemeMotion>('system')
const innerAppearance = ref<'light' | 'dark'>('dark')
const innerMotion = ref<ThemeMotion>('full')
const innermostAppearance = ref<'light' | 'dark'>('light')
const innermostMotion = ref<ThemeMotion>('system')
const scopedSelectValue = ref('portal')
const scopedDialogOpen = ref(false)
const scopedToastTarget = ref<HTMLElement>()

// 字面量 union 不伪造泛型推导，由应用级 type guard 验证组件返回的 string。
function setAppearance(e: WebUiEvent<WebUiSegmented, 'input'>) {
  const value = e.target.value
  if (isAppearance(value)) appearance.value = value
}
function setMotion(e: WebUiEvent<WebUiSegmented, 'input'>) {
  const value = e.target.value
  if (isMotion(value)) motion.value = value
}
function setInnerAppearance(e: WebUiEvent<WebUiSegmented, 'input'>) {
  const value = e.target.value
  if (isAppearance(value) && value !== 'system') innerAppearance.value = value
}
function setInnermostAppearance(e: WebUiEvent<WebUiSegmented, 'input'>) {
  const value = e.target.value
  if (isAppearance(value) && value !== 'system') innermostAppearance.value = value
}
function setInnerMotion(e: WebUiEvent<WebUiSegmented, 'input'>) {
  const value = e.target.value
  if (isMotion(value)) innerMotion.value = value
}
function setInnermostMotion(e: WebUiEvent<WebUiSegmented, 'input'>) {
  const value = e.target.value
  if (isMotion(value)) innermostMotion.value = value
}

function showScopedToast() {
  if (!scopedToastTarget.value) return

  toast.info('Toast mounts into the overlay root of the current theme scope.', {
    heading: 'Scoped toast',
    duration: 3000,
    target: scopedToastTarget.value
  })
}
</script>

<template>
  <div>
    <h1>Theme</h1>
    <p class="mb-4 text-(--wui-color-text-secondary)">
      web-ui-theme 支持多层嵌套，每一层独立控制外观与动效。内层主题优先于外层。
    </p>

    <h2>Basic usage (single level)</h2>

    <web-ui-theme
      :appearance="appearance"
      :motion="motion"
      class="block rounded-xl border p-6"
      style="border-color: var(--wui-color-border)"
    >
      <section style="background: var(--wui-color-page)">
        <div class="mb-4 flex flex-wrap items-center gap-4">
          <div class="flex items-center gap-2">
            <span class="text-sm text-(--wui-color-text-secondary)">Appearance</span>
            <web-ui-segmented :value="appearance" aria-label="Single-level theme appearance" @input="setAppearance">
              <web-ui-segmented-trigger value="light">Light</web-ui-segmented-trigger>
              <web-ui-segmented-trigger value="dark">Dark</web-ui-segmented-trigger>
              <web-ui-segmented-trigger value="system">System</web-ui-segmented-trigger>
            </web-ui-segmented>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-sm text-(--wui-color-text-secondary)">Motion preference</span>
            <web-ui-segmented :value="motion" aria-label="Single-level theme motion preference" @input="setMotion">
              <web-ui-segmented-trigger value="full">Full</web-ui-segmented-trigger>
              <web-ui-segmented-trigger value="reduced">Reduced</web-ui-segmented-trigger>
              <web-ui-segmented-trigger value="system">System</web-ui-segmented-trigger>
            </web-ui-segmented>
          </div>
        </div>

        <div class="flex flex-wrap gap-3">
          <web-ui-button variant="primary">Primary</web-ui-button>
          <web-ui-button variant="secondary">Secondary</web-ui-button>
          <web-ui-button variant="danger">Danger</web-ui-button>
          <web-ui-input value="Theme scope"></web-ui-input>
          <web-ui-switch checked></web-ui-switch>
        </div>

        <h3>Inherited from the overlay</h3>
        <p class="mb-3 text-sm text-(--wui-color-text-secondary)">
          Portal Select、Toast 与 Dialog 均继承当前主题范围的外观和动效 token。
        </p>
        <div class="flex flex-wrap items-center gap-3">
          <web-ui-select v-model="scopedSelectValue" portal aria-label="Theme-scoped portal select">
            <web-ui-option value="portal" label="Portal overlay">Portal overlay</web-ui-option>
            <web-ui-option value="theme" label="Theme tokens">Theme tokens</web-ui-option>
            <web-ui-option value="motion" label="Motion tokens">Motion tokens</web-ui-option>
          </web-ui-select>
          <web-ui-button ref="scopedToastTarget" variant="secondary" @click="showScopedToast"
            >Show a toast</web-ui-button
          >
          <web-ui-button variant="secondary" @click="scopedDialogOpen = true">Open a dialog</web-ui-button>
        </div>

        <web-ui-dialog :open="scopedDialogOpen" @open-change="scopedDialogOpen = $event.detail.open">
          <span slot="header">Scoped dialog</span>
          Dialog 位于原生 top layer，仍继承当前 theme scope 的颜色与动效 token。
          <web-ui-button slot="footer" variant="primary" full @click="scopedDialogOpen = false">Close</web-ui-button>
        </web-ui-dialog>
      </section>
    </web-ui-theme>

    <h2>Nested levels</h2>
    <p class="mb-4 text-sm text-(--wui-color-text-secondary)">
      外层 Light / Reduced → 内层 Dark / Full → 最内层 Light / System，每层独立控制，互不干扰。
    </p>

    <web-ui-theme
      appearance="light"
      motion="reduced"
      class="block rounded-xl border p-6"
      style="border-color: var(--wui-color-border)"
    >
      <section style="background: var(--wui-color-page)">
        <p class="mb-2 text-xs text-(--wui-color-text-secondary)">Outer (Light / Reduced)</p>
        <div class="flex flex-wrap gap-3">
          <web-ui-button variant="primary">Outer button</web-ui-button>
          <web-ui-switch checked></web-ui-switch>
        </div>

        <web-ui-theme
          :appearance="innerAppearance"
          :motion="innerMotion"
          class="mt-4 block rounded-xl border p-6"
          style="border-color: var(--wui-color-border)"
        >
          <section style="background: var(--wui-color-page)">
            <p class="mb-2 text-xs text-(--wui-color-text-secondary)">Inner (toggleable)</p>
            <div class="mb-4 flex flex-wrap items-center gap-4">
              <div class="flex items-center gap-2">
                <span class="text-sm text-(--wui-color-text-secondary)">Inner appearance</span>
                <web-ui-segmented
                  :value="innerAppearance"
                  aria-label="Inner theme appearance"
                  @input="setInnerAppearance"
                >
                  <web-ui-segmented-trigger value="light">Light</web-ui-segmented-trigger>
                  <web-ui-segmented-trigger value="dark">Dark</web-ui-segmented-trigger>
                </web-ui-segmented>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-sm text-(--wui-color-text-secondary)">Inner motion</span>
                <web-ui-segmented
                  :value="innerMotion"
                  aria-label="Inner theme motion preference"
                  @input="setInnerMotion"
                >
                  <web-ui-segmented-trigger value="system">System</web-ui-segmented-trigger>
                  <web-ui-segmented-trigger value="full">Full</web-ui-segmented-trigger>
                  <web-ui-segmented-trigger value="reduced">Reduced</web-ui-segmented-trigger>
                </web-ui-segmented>
              </div>
            </div>

            <div class="flex flex-wrap gap-3">
              <web-ui-button variant="primary">Inner button</web-ui-button>
              <web-ui-input value="Inner input"></web-ui-input>
              <web-ui-switch checked></web-ui-switch>
            </div>

            <web-ui-theme
              :appearance="innermostAppearance"
              :motion="innermostMotion"
              class="mt-4 block rounded-xl border p-6"
              style="border-color: var(--wui-color-border)"
            >
              <section style="background: var(--wui-color-page)">
                <p class="mb-2 text-xs text-(--wui-color-text-secondary)">Innermost (toggleable)</p>
                <div class="mb-4 flex flex-wrap items-center gap-4">
                  <div class="flex items-center gap-2">
                    <span class="text-sm text-(--wui-color-text-secondary)">Innermost appearance</span>
                    <web-ui-segmented
                      :value="innermostAppearance"
                      aria-label="Innermost theme appearance"
                      @input="setInnermostAppearance"
                    >
                      <web-ui-segmented-trigger value="light">Light</web-ui-segmented-trigger>
                      <web-ui-segmented-trigger value="dark">Dark</web-ui-segmented-trigger>
                    </web-ui-segmented>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="text-sm text-(--wui-color-text-secondary)">Innermost motion</span>
                    <web-ui-segmented
                      :value="innermostMotion"
                      aria-label="Innermost theme motion preference"
                      @input="setInnermostMotion"
                    >
                      <web-ui-segmented-trigger value="system">System</web-ui-segmented-trigger>
                      <web-ui-segmented-trigger value="full">Full</web-ui-segmented-trigger>
                      <web-ui-segmented-trigger value="reduced">Reduced</web-ui-segmented-trigger>
                    </web-ui-segmented>
                  </div>
                </div>

                <div class="flex flex-wrap gap-3">
                  <web-ui-button variant="primary">Innermost button</web-ui-button>
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
