<script setup lang="ts">
import appScrollbarsOptions from '@greypan/app-scrollbars'
import {
  COPY_FEEDBACK_DURATION,
  FLAVORS,
  FLAVOR_ICON_CLASS,
  FLAVOR_LABELS,
  FLAVOR_ICONS,
  PEEK_HEIGHT,
  PACKAGE_MANAGER_ICONS,
  codeFrameText,
  codeScrollbarsEvents,
  createCopyFeedback,
  createThunkCache,
  flavorOf,
  isCodeCollapsible,
  resetCodeScroll,
  type CodeblockVariant,
  type DemoThunk,
  type Flavor
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
import { computed, defineAsyncComponent, onBeforeUnmount, shallowRef, useId, ref, type Component } from 'vue'

// 本站框架既是切换器的第一项，也是打开页面时显示的源码；其余顺序由 kit 的 FLAVORS 决定。
const NATIVE_FLAVOR: Flavor = 'vue'
const FLAVOR_ORDER: readonly Flavor[] = [NATIVE_FLAVOR, ...FLAVORS.filter(flavor => flavor !== NATIVE_FLAVOR)]

/*
 * `load` 按函数身份缓存异步组件（kit 的 thunk 缓存）：重渲染与再进入页面都不会换掉组件身份、
 * 重置示例自己的状态。
 */
const demoOf = createThunkCache((load: DemoThunk) =>
  defineAsyncComponent(() => load().then(module => (module as { default: Component }).default))
)

/**
 * 一条围栏：命中 `exec` 的围栏带 `load`，先渲染真实组件预览，再挂源码卡；其余只显示源码。
 * 源码来自 `node.content`（生成期的高亮 HTML），与 markdown 围栏逐字相同。
 *
 * 一卡两稿时预览始终跑本站框架：带 `load` 的那份与当前选中的源码无关。
 */
const props = defineProps<{
  /**
   * 同一份示例的围栏：相邻的 `tsx` 与 `vue` 围栏合成一张卡，工具条切换显示哪一份；单围栏只有一项。
   */
  nodes: readonly MetaNode[]
  /** 有 `load` 且允许预览时渲染真实组件；否则只显示源码。 */
  preview: boolean
  variants?: readonly CodeblockVariant[]
  switchLabel?: string
}>()

const panelId = `codeblock-${useId()}`
const flavor = ref<string>(props.variants?.[0]?.value ?? NATIVE_FLAVOR)
const expanded = ref(false)

const active = computed(
  () =>
    props.variants?.find(item => item.value === flavor.value)?.node ??
    props.nodes.find(node => flavorOf(node.lang) === flavor.value) ??
    props.nodes[0]
)
const loadable = computed(() => props.nodes.find(node => node.load))
const demo = () => (props.preview && loadable.value?.load ? demoOf(loadable.value.load) : null)
const collapsible = computed(() => isCodeCollapsible(active.value?.content ?? ''))

function resetPanelScroll() {
  const panel = document.getElementById(panelId)
  if (panel) resetCodeScroll(panel)
}

// 换一份源码就回到顶部：两稿的行数不同，停在上次读到的位置会落到另一份的中段。
function selectFlavor(value: string) {
  const next = props.variants
    ? props.variants.find(item => item.value === value)?.value
    : FLAVOR_ORDER.find(item => item === value)
  if (!next || next === flavor.value) return
  flavor.value = next
  resetPanelScroll()
}

function selectFlavorFromEvent(event: Event) {
  const target = event.currentTarget as { value?: string } | null
  if (target?.value) selectFlavor(target.value)
}

function toggleExpanded() {
  const next = !expanded.value
  expanded.value = next
  // 收起后代码区回到顶部，与从未展开时一致；否则再次展开会停在上次读到的位置。
  if (!next) resetPanelScroll()
}

// 收起态的代码预览是第二块展开触发区；展开后同一次点击落在这块上只做滚动，不收回去。
function expandFromPeek() {
  if (expanded.value) return
  toggleExpanded()
}

/*
 * 复制反馈状态机在 kit：双通道剪贴板、成功/失败发布与回 idle 的定时都在那边。
 * snapshot 只在发布时整体换引用，shallowRef 按引用比较接进 Vue；行号槽按 kit 封装的
 * `@greypan/md-to-meta` 行号类名摘掉，剪贴板拿的是围栏原文。
 */
const copyFeedback = createCopyFeedback({
  readText: () => {
    const panel = document.getElementById(panelId)
    return panel ? codeFrameText(panel) : ''
  }
})
const copyState = shallowRef(copyFeedback.getSnapshot())
copyFeedback.subscribe(() => {
  copyState.value = copyFeedback.getSnapshot()
})
onBeforeUnmount(() => copyFeedback.dispose())
const copied = computed(() => copyState.value.status)
// 每次复制都换 key，让成功态的描边与 scale 动画重新挂载、各播一次。
const copyRun = computed(() => copyState.value.run)

function copyCode() {
  void copyFeedback.copy()
}

const copyLabel = () => (copied.value === 'copied' ? '已复制' : copied.value === 'failed' ? '复制失败' : '复制代码')
const copyIcon = () => (copied.value === 'failed' ? lucideCircleAlert : lucideCopy)
const copyAnnouncement = () => (copied.value === 'idle' ? '' : copyLabel())
</script>

<template>
  <article
    class="flex flex-col gap-3 [--codeblock-radius:calc(var(--wui-radius-menu)_+_var(--wui-space-3))]"
    :data-codeblock="active?.lang || 'text'"
  >
    <!--
      预览区只是层级占位（`relative z-20`）：select / dropdown / autocomplete 不开 `portal` 时
      面板是宿主内的 `position: absolute`（`--wui-layer-inline-overlay` 只有 10），向下溢出预览区
      就会被工具条盖掉；抬到 20 让整块预览（含溢出的面板）画在代码卡之上。
    -->
    <div v-if="demo()" class="relative z-20 flex flex-wrap items-center gap-3 px-4 py-8" data-codeblock-preview>
      <component :is="demo()" />
    </div>

    <!--
      `isolate` 让这张卡自己成一个 stacking context：工具条的 z-10 只在卡内比较，
      既压得住下方代码区，也不会越过页面 header（`--wui-layer-header` 也是 100，
      卡外比大小就会被后画的工具条盖住）。

      这一层**不铺底色**。`--wui-color-page` 的实色底和页面同色，肉眼看不出来，却是这一带
      唯一的一堵墙：工具条里向上溢出的东西（tooltip 气泡的投影）要跨过卡片上沿才摆得下，
      落到这块同色实底后面就被拦腰截断。
    -->
    <div class="isolate">
      <!--
        这一层只画边框和圆角，**不裁剪**：工具条里的控件才能把按压态画全。

        外框圆角按同心半径取：内圈小圆角（`--wui-radius-menu`）+ 卡片横向内边距
        （`--wui-space-3`），两圈曲率才贴合。
      -->
      <div class="rounded-[var(--codeblock-radius)] border border-(--wui-color-border)">
        <!--
          工具条左右两件对齐到同一条中线：切换器用组件默认高度（track 36px、内圈 28px），
          单围栏的语言标签做成同高的 36px 胶囊，两者都靠 `items-center`；横向 12px 与代码区一致。
        -->
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
            v-else-if="nodes.length > 1"
            :value="flavor"
            variant="inset"
            data-flavor-switch
            aria-label="示例代码框架"
            class="[--wui-font-size:12px] [--wui-segmented-trigger-px:10px]"
            @input="selectFlavorFromEvent"
          >
            <web-ui-segmented-trigger v-for="item in FLAVOR_ORDER" :key="item" :value="item">
              <span class="flex items-center gap-1.5">
                <web-ui-icon :icon="FLAVOR_ICONS[item]" :size="13" :class="FLAVOR_ICON_CLASS[item]" />
                {{ FLAVOR_LABELS[item] }}
              </span>
            </web-ui-segmented-trigger>
          </web-ui-segmented>

          <span
            v-else
            class="px-1 font-mono text-[11px] leading-none tracking-wide text-(--wui-color-text-secondary) uppercase"
          >
            {{ active?.lang || 'text' }}
          </span>

          <div class="flex items-center">
            <span class="sr-only" aria-live="polite">{{ copyAnnouncement() }}</span>
            <web-ui-button-group>
              <web-ui-tooltip :content="copyLabel()">
                <web-ui-button icon variant="ghost" data-copy :aria-label="copyLabel()" @click="copyCode()">
                  <!-- 成功态才包进描边宿主：`web-ui-svg-draw-lines` 在 slot 内容稳定时自动播一次；
                    key 跟着每次复制递增，重复复制也会重新挂载并重播描边与 scale。 -->
                  <web-ui-svg-draw-lines
                    v-if="copied === 'copied'"
                    :key="copyRun"
                    class="demo-copy-pop"
                    :duration="COPY_FEEDBACK_DURATION"
                  >
                    <web-ui-icon :icon="akarIconsCircleCheck" :size="15" class="text-(--wui-color-success)" />
                  </web-ui-svg-draw-lines>
                  <web-ui-icon
                    v-else
                    :icon="copyIcon()"
                    :size="15"
                    :class="copied === 'failed' ? 'text-(--wui-color-danger)' : ''"
                  />
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
                  @click="toggleExpanded()"
                >
                  <web-ui-icon :icon="expanded ? lucideChevronUp : lucideChevronDown" :size="15" />
                </web-ui-button>
              </web-ui-tooltip>
            </web-ui-button-group>
          </div>
        </div>

        <!--
          关闭态露出 128px：5 行 24px 加第 6 行的 8px。末端渐隐/晕染带取
          peek 的 60%（76.8px），「下面还有内容」由一整段发虚说出来，而不是只把最后一行切一半。

          收起态这块露出的代码就是展开触发区（点哪一行都算），展开后它退化成一段可滚动的正文，
          点击不再改状态——否则读到一半想选中一个标识符，整块代码会当场收回去。

          只有超过 PEEK_LINES 的卡才挂折叠：更短的代码没有可裁掉的部分，渐隐只会盖住正文。
        -->
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
            class="overflow-x-auto rounded-b-[var(--codeblock-radius)] bg-(--wui-color-page) p-3 pt-0 font-mono text-xs leading-6"
            data-code
          >
            <!-- 生成期的高亮 HTML，不是运行时拼的用户输入。 -->
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
          <!-- 生成期的高亮 HTML，不是运行时拼的用户输入。 -->
          <div v-html="active?.content ?? ''"></div>
        </OverlayScrollbarsComponent>
      </div>
    </div>
  </article>
</template>
