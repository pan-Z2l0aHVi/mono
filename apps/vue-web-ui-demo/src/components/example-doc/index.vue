<script setup lang="ts">
import appScrollbarsOptions from '@greypan/app-scrollbars'
import {
  akarIconsCircleCheck,
  lucideChevronDown,
  lucideChevronUp,
  lucideCircleAlert,
  lucideCopy
} from '@greypan/web-ui/icons'
import { OverlayScrollbars } from 'overlayscrollbars'
import { OverlayScrollbarsComponent } from 'overlayscrollbars-vue'
import { computed, onBeforeUnmount, reactive, ref, watchEffect } from 'vue'

import { getDemo } from '@/i18n/examples'
import { currentDocs, currentLocale, registerExampleDoc } from '@/i18n/locale'

import { reactIcon, vueIcon } from './flavor-icons'

/**
 * 由示例文档 markdown 生成的页面主体：组件标题、简介、逐示例预览、双框架源码与 API 表。
 *
 * 数据来自 `packages/web-ui/docs/<name>.CN.md` 与 `<name>.md`，由当前语言选择。每条示例按标题派生的 id
 * 由生成器落成对应语言目录下的 `demos/<component>--<id>.vue`，预览执行的字节与代码区显示的字节同源；
 * 标题两侧同文（英文专业术语），页面显示的也是它。
 *
 * 预览只运行当前站点框架；代码区始终提供 Vue / React 两份完整源码。
 */
type Flavor = 'react' | 'vue'

const FLAVOR_LABELS: Record<Flavor, string> = { vue: 'Vue', react: 'React' }
const FLAVOR_ICONS: Record<Flavor, typeof vueIcon | typeof reactIcon> = { vue: vueIcon, react: reactIcon }
// 只有凹进来的 React 标要走宿主取色（形状画成 currentColor，见 flavor-icons.ts）；Vue 的官方双色
// 写在 body 的字面量里，缺省即可。类名放这里而不是 flavor-icons.ts，是让 Tailwind 在组件源文件里扫到。
const FLAVOR_ICON_CLASS: Partial<Record<Flavor, string>> = { react: 'text-[#087eae] dark:text-[#61dafb]' }

const props = defineProps<{
  component: string
  /** 预览与默认代码 tab 使用的框架；默认 Vue 站。 */
  nativeFlavor?: Flavor
  /** 主文档用 primary，多文档页的后续文档用 secondary；不传时不渲染组件标题。 */
  level?: 'primary' | 'secondary'
}>()

const nativeFlavor = computed<Flavor>(() => props.nativeFlavor ?? 'vue')
// 本站框架在前：segmented 的第一项就是这份代码默认展示的运行时。
const flavors = computed<Flavor[]>(() => (nativeFlavor.value === 'vue' ? ['vue', 'react'] : ['react', 'vue']))
const doc = computed(() => currentDocs.value.find(candidate => candidate.component === props.component))
watchEffect(onCleanup => onCleanup(registerExampleDoc(props.component)))

const ABBREVIATIONS: Record<string, string> = { api: 'API', svg: 'SVG', ui: 'UI' }
// 「没有默认值」在语料里落成 em dash 占位符，它是散文不是字面量，所以即便落在值列也不实行内代码。
const NO_DEFAULT_VALUE = '—'
const displayName = computed(() =>
  props.component
    .split('-')
    .map(part => ABBREVIATIONS[part] ?? part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
)

const sectionHeadingLevel = computed(() => (props.level === 'secondary' ? 3 : 2))
const sampleHeadingLevel = computed(() => (props.level === 'secondary' ? 4 : 3))

const activeFlavors = reactive<Record<string, Flavor>>({})
const expanded = reactive<Record<string, boolean>>({})
const copied = ref<{ key: string; ok: boolean } | null>(null)
let copyTimer: ReturnType<typeof setTimeout> | undefined

onBeforeUnmount(() => clearTimeout(copyTimer))

function activeFlavor(key: string): Flavor {
  return activeFlavors[key] ?? nativeFlavor.value
}

function selectFlavor(key: string, flavor: Flavor) {
  activeFlavors[key] = flavor
}

function panelId(key: string) {
  return `${props.component}-${key}-panel`
}

function demoComponent(demoKey: string) {
  return getDemo(currentLocale.value, props.component, demoKey)
}

/*
 * 代码区由 OverlayScrollbars 接管后，`[data-code]` 这一层成了 `overflow: hidden` 的 host，
 * 真正滚动的是实例的 viewport 元素，所以滚动复位必须打在它上面。
 * 实例还没建好（首帧、jsdom）时退回 host 本身，此时 host 上的 `overflow-auto` 就是原来的原生滚动。
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

function onFlavorInput(event: Event, key: string) {
  const value = (event.currentTarget as { value?: string } | null)?.value
  if (value === 'vue' || value === 'react') selectFlavor(key, value)
}

function toggleExpanded(event: Event, key: string) {
  const next = !(expanded[key] ?? false)
  expanded[key] = next
  if (next) return

  // 收起后代码区回到顶部，与从未展开时一致；否则再次展开会停在上次读到的位置。
  const panel = (event.currentTarget as HTMLElement | null)
    ?.closest('[data-sample]')
    ?.querySelector<HTMLElement>('[data-code]')
  if (panel) resetCodeScroll(panel)
}

// 收起态的代码预览是第二块展开触发区；展开后同一次点击落在这块上只做滚动，不收回去。
function expandFromPeek(event: Event, key: string) {
  if (expanded[key] ?? false) return
  toggleExpanded(event, key)
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

  const active = document.activeElement
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
  if (active instanceof HTMLElement) active.focus()
  return ok
}

async function copyCode(event: Event, key: string) {
  const sample = (event.currentTarget as HTMLElement | null)?.closest('[data-sample]')
  // 行号槽是生成器往每行前面塞的文本，剪贴板要的是围栏原文，所以克隆一份摘掉它再取文本。
  const frame = sample?.querySelector<HTMLElement>('[data-code] pre')?.cloneNode(true) as HTMLElement | undefined
  frame?.querySelectorAll('.line-number').forEach(node => node.remove())
  const text = frame?.textContent ?? ''
  copied.value = { key, ok: text !== '' && (await writeClipboard(text)) }
  clearTimeout(copyTimer)
  copyTimer = setTimeout(() => {
    copied.value = null
  }, 1600)
}

function copyState(key: string): 'idle' | 'copied' | 'failed' {
  if (copied.value?.key !== key) return 'idle'
  return copied.value.ok ? 'copied' : 'failed'
}

function copyLabel(key: string) {
  const state = copyState(key)
  return state === 'copied' ? '已复制' : state === 'failed' ? '复制失败' : '复制代码'
}

function copyIcon(key: string) {
  return copyState(key) === 'failed' ? lucideCircleAlert : lucideCopy
}

function copyAnnouncement(key: string) {
  return copyState(key) === 'idle' ? '' : copyLabel(key)
}
</script>

<template>
  <section v-if="doc" class="mt-10 flex flex-col gap-8" :data-example-doc="doc.component">
    <header class="flex flex-col gap-2">
      <h1 v-if="level === 'primary'" class="mdc-heading">{{ displayName }}</h1>
      <h2 v-else-if="level === 'secondary'" class="mdc-heading">{{ displayName }}</h2>
      <!-- 生成器把 markdown 渲染成 HTML 片段（纯文本已在生成时转义），不是运行时拼的用户输入。 -->
      <div class="mdc-markdown" data-example-intro v-html="doc.introHtml"></div>
    </header>

    <section class="flex flex-col gap-6">
      <component :is="`h${sectionHeadingLevel}`" class="mdc-heading">示例</component>

      <article v-for="sample in doc.samples" :key="sample.id" class="flex flex-col gap-3" :data-sample="sample.title">
        <component :is="`h${sampleHeadingLevel}`" class="mdc-heading">{{ sample.title }}</component>
        <!-- 说明也是生成器渲染好的 HTML 片段，不是运行时拼的用户输入。 -->
        <div class="mdc-markdown mdc-markdown-secondary" v-html="sample.descriptionHtml"></div>

        <!--
          `isolate` 让这张卡自己成一个 stacking context：工具条的 z-10 只在卡内比较，
          既压得住下方代码区，也不会越过页面 header（`--wui-layer-header` 也是 10，
          卡外比大小就会被后画的工具条盖住）。

          预览区只是个层级占位（`relative z-20`）：select / dropdown / autocomplete 不开 `portal` 时
          面板是宿主内的 `position: absolute`（`--wui-layer-inline-overlay` 只有 1），向下溢出预览区
          就会被工具条盖掉；抬到 20 让整块预览（含溢出的面板）画在代码卡之上。
          边框与圆角只包住下方「工具条 + 代码区」。

          这一层**不铺底色**。`--wui-color-page` 的实色底和页面同色，肉眼看不出来，却是这一带
          唯一的一堵墙：工具条里向上溢出的东西（tooltip 气泡、segmented 按压态的上方投影）
          要跨过卡片上沿 17px 才摆得下，落到这块同色实底后面就被拦腰截断——看着像被裁剪，
          实际整条祖先链上连一个 `overflow: hidden` 都没有。
        -->
        <div class="isolate" :data-current-flavor="activeFlavor(sample.id)">
          <div
            v-if="demoComponent(sample.demoKey)"
            class="relative z-20 flex flex-wrap items-center gap-3 px-4 py-8"
            :data-sample-preview="sample.demoKey"
          >
            <component :is="demoComponent(sample.demoKey)" :key="`${currentLocale}:${sample.demoKey}`" />
          </div>

          <!--
            这一层只画边框和圆角，**不裁剪**：工具条里的 segmented 才能把按压态画全。
            按压/拖拽态的 indicator 会 scale(1.5) 并带一枚 `0 2px 20px` 的柔投影，
            横向需要约 16px（放大外扩）+ 22px（投影可见半径）的余量，而工具条只留了
            `px-4`；在这里裁就会把药丸的左半圆和左侧投影一起切平，看着像「长按时阴影
            被吃掉一截」。
          -->
          <div class="rounded-4xl border border-(--wui-color-border)">
            <!-- 工具条只摆控件，不接管开合：展开由右侧 chevron 按钮和收起态那块代码预览负责。
                 `relative z-10` 把工具条抬到下方代码区之上：segmented 的投影朝下溢出（凹变种是 track
                 的常驻外投影，凸变种是 indicator 的柔投影），否则后绘制的折叠区会把阴影盖掉一截。
                 这一层只在卡内比较，见上方 `isolate`。
                 顶部圆角补在这一层：外层不再裁剪，工具条的白底会自己溢出到圆角之外。 -->
            <div
              class="relative z-10 flex flex-wrap items-center justify-between gap-3 rounded-t-4xl bg-(--wui-color-page) px-4 pt-4 pb-2"
            >
              <web-ui-segmented
                :value="activeFlavor(sample.id)"
                variant="inset"
                data-flavor-switch
                aria-label="示例代码框架"
                @input="onFlavorInput($event, sample.id)"
              >
                <web-ui-segmented-trigger v-for="flavor in flavors" :key="flavor" :value="flavor">
                  <span class="flex items-center gap-1.5">
                    <web-ui-icon
                      :icon="FLAVOR_ICONS[flavor]"
                      :size="14"
                      :class="FLAVOR_ICON_CLASS[flavor]"
                    ></web-ui-icon>
                    {{ FLAVOR_LABELS[flavor] }}
                  </span>
                </web-ui-segmented-trigger>
              </web-ui-segmented>

              <div class="flex items-center">
                <span class="sr-only" aria-live="polite">{{ copyAnnouncement(sample.id) }}</span>
                <web-ui-button-group>
                  <web-ui-tooltip :content="copyLabel(sample.id)">
                    <web-ui-button
                      icon
                      variant="ghost"
                      data-copy
                      :aria-label="copyLabel(sample.id)"
                      @click="copyCode($event, sample.id)"
                    >
                      <!-- 成功态才包进描边宿主：`web-ui-svg-draw-lines` 在 slot 内容稳定时自动播一次，
                         所以每次复制都会重新画出勾与圆，而不是淡入一张现成的图。 -->
                      <web-ui-svg-draw-lines v-if="copyState(sample.id) === 'copied'" :duration="300">
                        <web-ui-icon
                          :icon="akarIconsCircleCheck"
                          :size="15"
                          class="text-(--wui-color-success)"
                        ></web-ui-icon>
                      </web-ui-svg-draw-lines>
                      <web-ui-icon
                        v-else
                        :icon="copyIcon(sample.id)"
                        :size="15"
                        :class="copyState(sample.id) === 'failed' ? 'text-(--wui-color-danger)' : ''"
                      ></web-ui-icon>
                    </web-ui-button>
                  </web-ui-tooltip>
                  <web-ui-tooltip :content="expanded[sample.id] ? '收起代码' : '展开代码'">
                    <web-ui-button
                      icon
                      variant="ghost"
                      data-toggle-code
                      :aria-label="expanded[sample.id] ? '收起代码' : '展开代码'"
                      :aria-expanded="expanded[sample.id] ?? false"
                      :aria-controls="panelId(sample.id)"
                      @click="toggleExpanded($event, sample.id)"
                    >
                      <web-ui-icon
                        :icon="expanded[sample.id] ? lucideChevronUp : lucideChevronDown"
                        :size="15"
                      ></web-ui-icon>
                    </web-ui-button>
                  </web-ui-tooltip>
                </web-ui-button-group>
              </div>
            </div>

            <!--
              关闭态露出 128px：12px 上边距 + 4 行 24px + 第 5 行的 20px。末端渐隐/晕染带取
              peek 的 60%（76.8px），「下面还有内容」由一整段发虚说出来，而不是只把最后一行切一半。
              这个比例的前提是 128px 还没顶到晕染带上限 `--wui-collapse-peek-edge-max`（112px）：
              peek 抬高到 187px 以上，带子会被上限掐住、遮挡比例跌破 60%。

              收起态这块露出的代码就是展开触发区（点哪一行都算），展开后它退化成一段可滚动的正文，
              点击不再改状态——否则读到一半想选中一个标识符，整块代码会当场收回去。
            -->
            <!--
              底部圆角不另起一层裁剪，而是骑在**本来就会裁自己内容**的两层上：
              collapse 宿主（画白底那层）和滚动容器（OverlayScrollbars 会把 host 改成
              `overflow: hidden`，圆角随之成为它自己的裁剪形状）。再套一层 `overflow: hidden`
              只为圆角，等于给以后所有浮层/阴影埋一颗雷——被裁的人永远找不到是哪一层干的。

              收起态的底线不是圆角所在的那条边：那里是 peek 的直切，由 collapse 的渐隐带
              收尾（末端 alpha 归零），落不到圆角上。
            -->
            <web-ui-collapse
              :open="expanded[sample.id] ?? false"
              peek="128px"
              class="rounded-b-4xl bg-(--wui-color-page) [--wui-collapse-peek-edge-ratio:0.6]"
              @click="expandFromPeek($event, sample.id)"
            >
              <div slot="content">
                <OverlayScrollbarsComponent
                  :id="panelId(sample.id)"
                  :options="appScrollbarsOptions"
                  :events="codeScrollbarsEvents"
                  class="max-h-[32rem] overflow-auto rounded-b-4xl bg-(--wui-color-page) px-4 pt-3 pb-4 font-mono text-xs leading-6"
                  data-code
                >
                  <div v-html="sample.html[activeFlavor(sample.id)]"></div>
                </OverlayScrollbarsComponent>
              </div>
            </web-ui-collapse>
          </div>
        </div>
      </article>
    </section>

    <section v-if="doc.api.length > 0" class="flex flex-col gap-6">
      <component :is="`h${sectionHeadingLevel}`" class="mdc-heading">API</component>

      <!-- API 小节有两型：登记过表头的是表（列形状完全由生成的 columns 决定），其余是散文。
           `.mdc-markdown` 也挂在这一层：散文与表格共用同一套 Notion 标签样式。 -->
      <div
        v-for="section in doc.api"
        :key="section.key"
        class="mdc-markdown flex flex-col gap-3"
        :data-example-api="section.key"
      >
        <component :is="`h${sampleHeadingLevel}`" class="mdc-heading">{{ section.title }}</component>
        <!-- 散文正文是生成器渲染好的 HTML 片段，不是运行时拼的用户输入。 -->
        <div v-if="section.kind === 'prose'" v-html="section.html"></div>
        <table v-else>
          <thead>
            <tr>
              <th v-for="column in section.columns" :key="column.title">
                {{ column.title }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in section.rows" :key="row[0]">
              <template v-for="(column, index) in section.columns" :key="column.title">
                <!-- 值列（类型 / 默认值）由生成器标成 'code'：它们是字面量，不是散文。 -->
                <td v-if="column.kind === 'html'" v-html="row[index]"></td>
                <td v-else-if="column.kind === 'code' && row[index] !== NO_DEFAULT_VALUE">
                  <code>{{ row[index] }}</code>
                </td>
                <td v-else>{{ row[index] }}</td>
              </template>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </section>
</template>
