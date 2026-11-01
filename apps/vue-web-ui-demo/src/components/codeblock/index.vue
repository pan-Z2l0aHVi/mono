<script setup lang="ts">
import appScrollbarsOptions from '@greypan/app-scrollbars'
import type { MetaNode } from '@greypan/md-to-meta'
import {
  akarIconsCircleCheck,
  lucideChevronDown,
  lucideChevronUp,
  lucideCircleAlert,
  lucideCopy
} from '@greypan/web-ui/icons'
import { OverlayScrollbars } from 'overlayscrollbars'
import { OverlayScrollbarsComponent } from 'overlayscrollbars-vue'
import { computed, defineAsyncComponent, onBeforeUnmount, ref, useId, type Component } from 'vue'

import { FLAVOR_ICON_CLASS, FLAVOR_LABELS, FLAVOR_ICONS, flavorOf, type Flavor } from './flavor'

// 复制成功的描边与 scale 反馈共用同一时长；CSS 里的 `demo-copy-pop` 要同步。
const COPY_FEEDBACK_DURATION = 500

// 本站框架既是切换器的第一项，也是打开页面时显示的源码。
const NATIVE_FLAVOR: Flavor = 'vue'
const FLAVOR_ORDER: readonly Flavor[] = ['vue', 'react']

/*
 * 关闭态露出 128px，内容不超过这个高度时整段代码本来就看全了：再挂折叠只会让末端的
 * 渐隐带盖住正文，所以这种卡直接铺开，也收起工具条里的展开按钮。
 * 每行 24px 来自代码区的 `leading-6`，四侧内边距各 12px 来自 `pt-3 pb-3 px-3`。
 */
const PEEK_HEIGHT = 128
const CODE_LINE_HEIGHT = 24
const CODE_PADDING_HEIGHT = 24
const PEEK_LINES = Math.floor((PEEK_HEIGHT - CODE_PADDING_HEIGHT) / CODE_LINE_HEIGHT)

/** 生成期高亮 HTML 每行一个 `<span class="line">`，数行不必解析整棵树。 */
function lineCountOf(content: string): number {
  return content.match(/<span class="line"/g)?.length ?? 0
}

/*
 * `load` 是生成器写进 meta 的字面 thunk，同一份 meta 模块里引用同一个函数，所以按函数身份缓存
 * 就能让异步组件只建一次：重渲染与再进入页面都不会换掉组件身份、重置示例自己的状态。
 */
const demoCache = new WeakMap<NonNullable<MetaNode['load']>, Component>()

function demoOf(load: NonNullable<MetaNode['load']>) {
  let demo = demoCache.get(load)
  if (!demo) {
    demo = defineAsyncComponent(() => load().then(module => (module as { default: Component }).default))
    demoCache.set(load, demo)
  }
  return demo
}

/*
 * 代码区由 OverlayScrollbars 接管后，`[data-code]` 这一层成了 `overflow: hidden` 的 host，
 * 真正滚动的是实例的 viewport 元素，所以滚动复位必须打在它上面。
 * 实例还没建好（首帧、jsdom）时退回 host 本身，此时 host 上的 `overflow-auto` 就是它自身的原生滚动。
 */
function resetCodeScroll(panel: HTMLElement) {
  const scroller = OverlayScrollbars(panel)?.elements().viewport ?? panel
  scroller.scrollTop = 0
  scroller.scrollLeft = 0
}

/*
 * 同一个理由也管焦点：库把 target 变成 `overflow: hidden` 的 host 之后，target 上的 tabindex 不再
 * 带来键盘滚动。textarea 场景库自己会把 tabindex 从 target 搬到 viewport，div 场景不会，所以在这里
 * 补上同一步——焦点和方向键都落在真正的滚动元素上。
 */
const codeScrollbarsEvents = {
  initialized: (instance: OverlayScrollbars) => {
    instance.elements().viewport.tabIndex = 0
  }
}

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
}>()

const panelId = `codeblock-${useId()}`
const flavor = ref<Flavor>(NATIVE_FLAVOR)
const expanded = ref(false)
const copied = ref<'idle' | 'copied' | 'failed'>('idle')
// 每次复制都换 key，让成功态的描边与 scale 动画重新挂载、各播一次。
const copyRun = ref(0)
let copyTimer: ReturnType<typeof setTimeout> | undefined

onBeforeUnmount(() => clearTimeout(copyTimer))

const active = computed(() => props.nodes.find(node => flavorOf(node.lang) === flavor.value) ?? props.nodes[0])
const loadable = computed(() => props.nodes.find(node => node.load))
const demo = () => (props.preview && loadable.value?.load ? demoOf(loadable.value.load) : null)
const collapsible = computed(() => lineCountOf(active.value?.content ?? '') > PEEK_LINES)

function resetPanelScroll() {
  const panel = document.getElementById(panelId)
  if (panel) resetCodeScroll(panel)
}

// 换一份源码就回到顶部：两稿的行数不同，停在上次读到的位置会落到另一份的中段。
function selectFlavor(value: string) {
  const next = FLAVOR_ORDER.find(item => item === value)
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
 * 剪贴板是双通道的：安全上下文且有焦点时走 Async Clipboard API；非安全上下文、
 * 文档失焦或权限被拒时它会直接抛，落到 textarea + execCommand 的同步通道。
 */
async function writeClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // 继续走兜底通道。
  }

  const focused = document.activeElement
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.top = '0'
  textarea.style.left = '-9999px'
  textarea.style.opacity = '0'
  document.body.append(textarea)
  textarea.select()

  let ok = false
  try {
    ok = document.execCommand('copy')
  } catch {
    ok = false
  }

  textarea.remove()
  if (focused instanceof HTMLElement) focused.focus()
  return ok
}

async function copyCode() {
  const frame = document.getElementById(panelId)?.querySelector<HTMLElement>('pre')?.cloneNode(true) as
    | HTMLElement
    | undefined
  // 行号槽是生成期塞在每行前面的文本，剪贴板要的是围栏原文，所以克隆一份摘掉它再取文本。
  frame?.querySelectorAll('.line-number').forEach(node => node.remove())
  const text = frame?.textContent ?? ''
  const ok = text !== '' && (await writeClipboard(text))
  copied.value = ok ? 'copied' : 'failed'
  copyRun.value += 1
  clearTimeout(copyTimer)
  copyTimer = setTimeout(() => {
    copied.value = 'idle'
  }, 1600)
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
      面板是宿主内的 `position: absolute`（`--wui-layer-inline-overlay` 只有 1），向下溢出预览区
      就会被工具条盖掉；抬到 20 让整块预览（含溢出的面板）画在代码卡之上。
    -->
    <div v-if="demo()" class="relative z-20 flex flex-wrap items-center gap-3 px-4 py-8" data-codeblock-preview>
      <component :is="demo()" />
    </div>

    <!--
      `isolate` 让这张卡自己成一个 stacking context：工具条的 z-10 只在卡内比较，
      既压得住下方代码区，也不会越过页面 header（`--wui-layer-header` 也是 10，
      卡外比大小就会被后画的工具条盖住）。

      这一层**不铺底色**。`--wui-color-page` 的实色底和页面同色，肉眼看不出来，却是这一带
      唯一的一堵墙：工具条里向上溢出的东西（tooltip 气泡的投影）要跨过卡片上沿才摆得下，
      落到这块同色实底后面就被拦腰截断。
    -->
    <div class="isolate">
      <!--
        这一层只画边框和圆角，**不裁剪**：工具条里的控件才能把按压态画全。
        顶部圆角补在工具条这一层：外层不裁剪，工具条的白底会自己溢出到圆角之外。

        外框圆角按同心半径取：内圈小圆角（`--wui-radius-menu`）+ 卡片横向内边距
        （`--wui-space-3`），两圈曲率才贴合。
      -->
      <div class="rounded-[var(--codeblock-radius)] border border-(--wui-color-border)">
        <!--
          工具条左右两件对齐到同一条中线：切换器用组件默认高度（track 36px、内圈 28px），
          单围栏的语言标签做成同高的 36px 胶囊，两者都靠 `items-center`；横向 12px 与代码区一致。
        -->
        <div
          class="relative z-10 flex flex-wrap items-center justify-between gap-3 rounded-t-[var(--codeblock-radius)] bg-(--wui-color-page) p-3"
        >
          <web-ui-segmented
            v-if="nodes.length > 1"
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
            class="inline-flex h-9 items-center rounded-full border border-(--wui-color-border) bg-(--wui-color-surface) px-2 font-mono text-[11px] leading-none tracking-wide text-(--wui-color-text-secondary) uppercase"
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
          关闭态露出 128px：12px 上边距 + 4 行 24px + 第 5 行的 20px。末端渐隐/晕染带取
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
            class="max-h-[512px] overflow-auto rounded-b-[var(--codeblock-radius)] bg-(--wui-color-page) p-3 font-mono text-xs leading-6"
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
          class="max-h-[512px] overflow-auto rounded-b-[var(--codeblock-radius)] bg-(--wui-color-page) p-3 font-mono text-xs leading-6"
          data-code
        >
          <!-- 生成期的高亮 HTML，不是运行时拼的用户输入。 -->
          <div v-html="active?.content ?? ''"></div>
        </OverlayScrollbarsComponent>
      </div>
    </div>
  </article>
</template>
