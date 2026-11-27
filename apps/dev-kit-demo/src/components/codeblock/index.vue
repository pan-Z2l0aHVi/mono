<script setup lang="ts">
import appScrollbarsOptions from '@greypan/app-scrollbars'
import {
  codeScrollbarsEvents,
  createCodeblockController,
  fenceGroupInfo,
  PACKAGE_MANAGER_ICONS,
  PEEK_HEIGHT,
  TS_JS_FLAVOR_ICON_CLASS,
  TS_JS_FLAVOR_ICONS,
  TS_JS_FLAVOR_LABELS,
  TS_JS_FLAVORS,
  tsJsFlavorOf,
  type CodeblockVariant,
  type TsJsFlavor
} from '@greypan/doc-demo-kit'
import type { MetaNode } from '@greypan/md-to-meta'
import {
  akarIconsCircleCheck,
  lucideChevronDown,
  lucideChevronUp,
  lucideCircleAlert,
  lucideCopy
} from '@greypan/web-ui/icons'
import { OverlayScrollbarsComponent } from 'overlayscrollbars-vue'
import { computed, onBeforeUnmount, shallowRef, useId, watch, type Component } from 'vue'

import { resolveDemoComponent } from '@/demos/registry'

import PressDrawIcon from '../PressDrawIcon.vue'

const NATIVE_FLAVOR: TsJsFlavor = 'ts'
const FLAVOR_ORDER: readonly TsJsFlavor[] = TS_JS_FLAVORS

const props = defineProps<{
  nodes: readonly MetaNode[]
  preview: boolean
  docKey?: string
  variants?: readonly CodeblockVariant[]
  switchLabel?: string
}>()

const panelId = `codeblock-${useId()}`
const controller = createCodeblockController({
  nodes: props.nodes,
  variants: props.variants,
  nativeFlavor: NATIVE_FLAVOR,
  flavors: TS_JS_FLAVORS,
  flavorOf: tsJsFlavorOf,
  getPanel: () => document.getElementById(panelId)
})

const snapshot = shallowRef(controller.getSnapshot())
controller.subscribe(() => {
  snapshot.value = controller.getSnapshot()
})
watch([() => props.nodes, () => props.variants], ([nodes, variants]) => {
  controller.setInputs({ nodes, variants })
  snapshot.value = controller.getSnapshot()
})
onBeforeUnmount(() => controller.dispose())

const groupInfo = computed(() => fenceGroupInfo(props.nodes, tsJsFlavorOf))
const demoComponent = computed<Component | null>(() => {
  if (!props.preview || !props.docKey || !groupInfo.value.demoId) return null
  return resolveDemoComponent(`${props.docKey}#${groupInfo.value.demoId}`)
})

const flavor = computed(() => snapshot.value.flavor)
const expanded = computed(() => snapshot.value.expanded)
const active = computed(() => snapshot.value.active)
const collapsible = computed(() => snapshot.value.collapsible)
const copied = computed(() => snapshot.value.copy.status)
const showFlavorSwitch = computed(() => !props.variants && !groupInfo.value.singleFlavor && props.nodes.length > 1)

function selectFlavorFromEvent(event: Event) {
  const target = event.currentTarget as { value?: string } | null
  if (target?.value) controller.selectFlavor(target.value)
}

function expandFromPeek() {
  if (expanded.value) return
  controller.toggleExpanded()
}

function copyCode() {
  void controller.copy()
}

const copyLabel = () => (copied.value === 'copied' ? '已复制' : copied.value === 'failed' ? '复制失败' : '复制代码')
const copyIcon = () => (copied.value === 'failed' ? lucideCircleAlert : lucideCopy)
const copyAnnouncement = () => (copied.value === 'idle' ? '' : copyLabel())
</script>

<template>
  <article
    class="flex flex-col gap-3 [--codeblock-radius:calc(var(--wui-radius-menu)_+_var(--wui-space-3))]"
    :data-codeblock="active?.lang || 'text'"
    :data-demo-id="groupInfo.demoId || undefined"
  >
    <div v-if="demoComponent" class="relative z-20 px-1 py-4" data-codeblock-preview>
      <component :is="demoComponent" />
    </div>

    <div class="isolate">
      <div class="rounded-[var(--codeblock-radius)] border border-(--wui-color-border)">
        <div
          class="z-10 flex flex-wrap items-center justify-between gap-3 rounded-t-[var(--codeblock-radius)] p-3"
          :class="collapsible && expanded ? 'sticky top-[52px]' : 'relative'"
        >
          <web-ui-segmented
            v-if="variants && variants.length > 1"
            :value="flavor"
            variant="inset"
            :aria-label="switchLabel"
            class="[--wui-font-size:12px] [--wui-segmented-trigger-px:6px]"
            @input="selectFlavorFromEvent"
          >
            <web-ui-segmented-trigger v-for="item in variants" :key="item.value" :value="item.value">
              <span class="flex items-center gap-1.5">
                <web-ui-icon
                  v-if="PACKAGE_MANAGER_ICONS[item.value]"
                  :icon="PACKAGE_MANAGER_ICONS[item.value]"
                  :size="13"
                />
                {{ item.label }}
              </span>
            </web-ui-segmented-trigger>
          </web-ui-segmented>
          <web-ui-segmented
            v-else-if="showFlavorSwitch"
            :value="flavor"
            variant="inset"
            data-flavor-switch
            aria-label="示例代码语言"
            class="[--wui-font-size:12px] [--wui-segmented-trigger-px:10px]"
            @input="selectFlavorFromEvent"
          >
            <web-ui-segmented-trigger v-for="item in FLAVOR_ORDER" :key="item" :value="item">
              <span class="flex items-center gap-1.5">
                <web-ui-icon :icon="TS_JS_FLAVOR_ICONS[item]" :size="13" :class="TS_JS_FLAVOR_ICON_CLASS[item]" />
                {{ TS_JS_FLAVOR_LABELS[item] }}
              </span>
            </web-ui-segmented-trigger>
          </web-ui-segmented>

          <span
            v-else
            class="pl-3 pr-1 font-mono text-[11px] leading-none tracking-wide text-(--wui-color-text-secondary) uppercase"
          >
            {{ active?.lang || 'text' }}
          </span>

          <div class="flex items-center">
            <span class="sr-only" aria-live="polite">{{ copyAnnouncement() }}</span>
            <web-ui-button-group>
              <web-ui-tooltip :content="copyLabel()">
                <web-ui-button icon variant="ghost" data-copy :aria-label="copyLabel()" @click="copyCode()">
                  <PressDrawIcon>
                    <web-ui-icon
                      v-if="copied === 'copied'"
                      :icon="akarIconsCircleCheck"
                      :size="15"
                      class="text-(--wui-color-success)"
                    />
                    <web-ui-icon
                      v-else
                      :icon="copyIcon()"
                      :size="15"
                      :class="copied === 'failed' ? 'text-(--wui-color-danger)' : ''"
                    />
                  </PressDrawIcon>
                </web-ui-button>
              </web-ui-tooltip>
              <web-ui-tooltip v-if="collapsible" :content="expanded ? '收起代码' : '展开代码'">
                <web-ui-button
                  icon
                  variant="ghost"
                  data-toggle-code
                  :aria-label="expanded ? '收起代码' : '展开代码'"
                  :aria-expanded="expanded"
                  :aria-controls="panelId"
                  @click="controller.toggleExpanded()"
                >
                  <web-ui-icon :icon="expanded ? lucideChevronUp : lucideChevronDown" :size="15" />
                </web-ui-button>
              </web-ui-tooltip>
            </web-ui-button-group>
          </div>
        </div>

        <web-ui-collapse
          v-if="collapsible"
          :open="expanded"
          :peek="`${PEEK_HEIGHT}px`"
          class="rounded-b-[var(--codeblock-radius)] bg-(--wui-color-page) [--wui-collapse-peek-edge-ratio:0.6]"
          @click="expandFromPeek()"
        >
          <OverlayScrollbarsComponent
            slot="content"
            :id="panelId"
            :options="appScrollbarsOptions"
            :events="codeScrollbarsEvents"
            class="contain-inline-size overflow-x-auto rounded-b-[var(--codeblock-radius)] bg-(--wui-color-page) p-3 pt-0 font-mono text-xs leading-6"
            data-code
          >
            <div v-html="active?.content ?? ''"></div>
          </OverlayScrollbarsComponent>
        </web-ui-collapse>

        <OverlayScrollbarsComponent
          v-else
          :id="panelId"
          :options="appScrollbarsOptions"
          :events="codeScrollbarsEvents"
          class="overflow-x-auto rounded-b-[var(--codeblock-radius)] bg-(--wui-color-page) p-3 pt-0 font-mono text-xs leading-6"
          data-code
        >
          <div v-html="active?.content ?? ''"></div>
        </OverlayScrollbarsComponent>
      </div>
    </div>
  </article>
</template>
