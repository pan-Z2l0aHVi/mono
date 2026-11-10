<script setup lang="ts">
import type { WebUiDialog, WebUiEvent, WebUiSegmented, WebUiSwitch } from '@greypan/web-ui'
import { storeToRefs } from 'pinia'
import { ref, watch } from 'vue'

import { metadataLabelClass } from '@/components/library/presentation'
import { ACCENT_PRESETS, useSettingsStore, type ThemeAppearance } from '@/stores/settings'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const settings = useSettingsStore()
const { appearance, accent, reducedMotion } = storeToRefs(settings)
const settingsRowClass = 'flex min-w-0 items-center justify-between gap-4 py-2'

type SettingsTab = 'general' | 'appearance' | 'library'

/** panel 选择在会话内保持，不入存储：重开设置回到「常规」才是预期的落点。 */
const activeTab = ref<SettingsTab>('general')

watch(
  () => props.open,
  open => {
    if (open) activeTab.value = 'general'
  },
  { flush: 'sync' }
)

const THEME_APPEARANCES: readonly { value: ThemeAppearance; label: string }[] = [
  { value: 'light', label: '浅色' },
  { value: 'dark', label: '深色' },
  { value: 'system', label: '跟随系统' }
]

const TABS: readonly { value: SettingsTab; label: string }[] = [
  { value: 'general', label: '常规' },
  { value: 'appearance', label: '外观' },
  { value: 'library', label: '资源库' }
]

function isSettingsTab(value: string): value is SettingsTab {
  return TABS.some(tab => tab.value === value)
}

function isThemeAppearance(value: string): value is ThemeAppearance {
  return THEME_APPEARANCES.some(item => item.value === value)
}

function handleOpenChange(event: WebUiEvent<WebUiDialog, 'open-change'>) {
  if (event.target !== event.currentTarget) return
  emit('update:open', event.detail.open)
}

/*
 * web-ui-segmented 是纯受控组件：直接设 value 不派发事件，只有用户点中某个 trigger 才走
 * group controller 派一次 change。所以这两条路径都是「监听事件 → 读回新值 → 回写」，
 * 组件内部状态一概不碰。
 */
function handleTabChange(event: WebUiEvent<WebUiSegmented, 'change'>) {
  const next = event.currentTarget.value
  if (isSettingsTab(next)) activeTab.value = next
}

function handleAppearanceChange(event: WebUiEvent<WebUiSegmented, 'change'>) {
  const next = event.currentTarget.value
  if (isThemeAppearance(next)) settings.setAppearance(next)
}

function handleReducedMotionChange(event: Event) {
  settings.setReducedMotion((event.currentTarget as WebUiSwitch).checked)
}

function pickAccent(value: string) {
  settings.setAccent(value)
}
</script>

<template>
  <!--
    controlled：open 的唯一真相在宿主。Escape 与 backdrop 点击因此只派发关闭请求，由宿主回写 open
    才走退出动画——否则组件自行改 open，而 Vue 侧的 vdom 仍认为它是 true，两边就此分叉。

    挂载点是 AppLayout 里 web-ui-layout 的同级节点，不进它的 light DOM：未分配到任何 slot
    的 light 子节点在 shadow DOM 宿主下没有盒子，放进去反而不会渲染。侧边栏（含 ≤640px
    的 drawer）是 web-ui-layout 内部的子树，原生 dialog 提升进 top layer 后不受其 overflow、
    transform 与 aside 的 display:none 影响。

    closable：关闭 button 由组件渲染（绝对定位到卡片右上角的 26px icon button，偏移 20/20）。宿主不另画
    一条关闭入口——自绘那枚还得自己跟窄屏挤不挤、icon 尺寸对齐，整套几何归组件，宿主只留标题文字。
  -->
  <web-ui-dialog
    :open="open"
    controlled
    closable
    aria-dialog-label="设置"
    class="[--wui-dialog-width:min(90vw,480px)] [--wui-dialog-inline-padding:20px] [--wui-dialog-desc-focus-padding:24px] [--wui-dialog-max-height:max(0px,calc(min(90vh,408px)_-_160px))]"
    @open-change="handleOpenChange"
  >
    <div slot="header" class="-mr-[38px] flex w-[calc(100%+38px)] flex-col gap-4 font-normal">
      <h2 class="m-0 text-lg font-semibold text-(--wui-color-text)">设置</h2>
      <web-ui-segmented :value="activeTab" aria-label="设置分区" @change="handleTabChange">
        <web-ui-segmented-trigger v-for="tab in TABS" :key="tab.value" :value="tab.value">
          <span class="inline-block w-[calc((min(90vw,480px)_-_120px)/3)] text-center">{{ tab.label }}</span>
        </web-ui-segmented-trigger>
      </web-ui-segmented>
    </div>

    <div class="flex min-h-(--wui-dialog-max-height) flex-col">
      <!--
        通用：MCP switch 是纯静态占位。disabled 而非隐藏，是为了让「这一栏存在但还没做」在
        界面上可见；文案承担解释，控件本身不假装可用。
      -->
      <div v-if="activeTab === 'general'" :class="settingsRowClass">
        <div class="flex min-w-0 flex-col gap-0.5">
          <span class="text-sm text-(--wui-color-text)">MCP server</span>
          <span :class="metadataLabelClass">即将推出</span>
        </div>
        <web-ui-switch disabled aria-label="MCP server（即将推出）" />
      </div>

      <div v-else-if="activeTab === 'appearance'" class="flex flex-col">
        <!--
          主题三态切到 system 时 web-ui-theme 走自己的圆形揭示过渡：那个动画跟着
          resolved appearance 的变化跑，宿主只改 appearance attribute，不绕过它。
        -->
        <div :class="settingsRowClass">
          <span class="text-sm text-(--wui-color-text)">主题</span>
          <web-ui-segmented :value="appearance" aria-label="主题模式" variant="raised" @change="handleAppearanceChange">
            <web-ui-segmented-trigger v-for="item in THEME_APPEARANCES" :key="item.value" :value="item.value">
              {{ item.label }}
            </web-ui-segmented-trigger>
          </web-ui-segmented>
        </div>

        <fieldset class="flex flex-wrap items-center justify-between gap-3 border-0 px-0 py-2">
          <legend class="sr-only">颜色</legend>
          <span class="text-sm text-(--wui-color-text)" aria-hidden="true">颜色</span>
          <div class="flex flex-wrap items-center justify-end">
            <label
              v-for="preset in ACCENT_PRESETS"
              :key="preset.value"
              class="relative grid size-9 shrink-0 cursor-pointer place-items-center"
            >
              <input
                type="radio"
                name="accent"
                :value="preset.value"
                :checked="accent === preset.value"
                :tabindex="accent === preset.value ? 0 : -1"
                :aria-label="`强调色 ${preset.label}`"
                class="peer absolute inset-0 size-full cursor-pointer opacity-0"
                @change="pickAccent(preset.value)"
              />
              <span
                class="size-5 rounded-full peer-checked:outline-2 peer-checked:outline-offset-2 peer-checked:outline-(--wui-color-accent) peer-focus-visible:ring-3 peer-focus-visible:ring-(--wui-color-focus-ring) peer-focus-visible:ring-offset-4"
                :style="{ backgroundColor: preset.value }"
                aria-hidden="true"
              />
            </label>
          </div>
        </fieldset>
        <div :class="settingsRowClass">
          <span class="text-sm text-(--wui-color-text)">减少动画</span>
          <web-ui-switch :checked="reducedMotion" aria-label="减少动画" @change="handleReducedMotionChange" />
        </div>
      </div>

      <!-- 资源库设置尚未实现，与 pages/settings/index.vue 一样先占位。 -->
      <web-ui-empty
        v-else
        description="资源库设置尚未实现"
        :size="64"
        class="my-auto [--wui-empty-min-height:0] [--wui-empty-padding:0]"
      />
    </div>
  </web-ui-dialog>
</template>
