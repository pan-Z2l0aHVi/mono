<script setup lang="ts">
import {
  akarIconsCircleCheck,
  lucideChevronDown,
  lucideChevronUp,
  lucideCircleAlert,
  lucideCopy
} from '@greypan/web-ui/icons'
import type { Component } from 'vue'
import { computed, defineAsyncComponent, onBeforeUnmount, reactive, ref } from 'vue'

import { exampleDocs } from '@/generated/examples'

import { reactIcon, vueIcon } from './flavor-icons'

/**
 * 由示例文档 markdown 生成的页面主体：组件标题、简介、逐示例预览、双框架源码与 API 表。
 *
 * 数据全部来自 `packages/web-ui/docs/<name>.md`。带 `{#id}` 锚点的示例由生成器落成
 * `src/generated/demos/<component>--<id>.vue`，预览执行的字节与代码区显示的字节同源；
 * 没有锚点的语料只展示代码。
 *
 * 预览只运行当前站点框架；代码区始终提供 Vue / React 两份完整源码。
 */
const demoModules = import.meta.glob<{ default: Component }>('../../generated/demos/*.vue')
const DEMO_PREFIX = '../../generated/demos/'

// 异步组件在模块作用域建一次：setup 里每次新建会让示例被反复卸载重建，交互中途的状态会丢失。
const demoComponents = new Map(
  Object.entries(demoModules).map(([file, load]) => [
    file.slice(DEMO_PREFIX.length, -'.vue'.length),
    defineAsyncComponent(load)
  ])
)

type Flavor = 'react' | 'vue'

const FLAVOR_LABELS: Record<Flavor, string> = { vue: 'Vue', react: 'React' }
const FLAVOR_ICONS: Record<Flavor, typeof vueIcon | typeof reactIcon> = { vue: vueIcon, react: reactIcon }

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
const doc = computed(() => exampleDocs.find(candidate => candidate.component === props.component))

const ABBREVIATIONS: Record<string, string> = { api: 'API', svg: 'SVG', ui: 'UI' }
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

function sampleKey(sample: { id: string | null }, index: number) {
  return sample.id ?? `sample-${index}`
}

function activeFlavor(key: string): Flavor {
  return activeFlavors[key] ?? nativeFlavor.value
}

function selectFlavor(key: string, flavor: Flavor) {
  activeFlavors[key] = flavor
}

function panelId(key: string) {
  return `${props.component}-${key}-panel`
}

function demoComponent(demoKey: string | null) {
  return demoKey ? demoComponents.get(`${props.component}--${demoKey}`) : undefined
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
  if (panel) {
    panel.scrollTop = 0
    panel.scrollLeft = 0
  }
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
  const text = sample?.querySelector('[data-code] pre')?.textContent ?? ''
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

      <article
        v-for="(sample, index) in doc.samples"
        :key="sampleKey(sample, index)"
        class="flex flex-col gap-3"
        :data-sample="sample.title"
      >
        <component :is="`h${sampleHeadingLevel}`" class="mdc-heading">{{ sample.title }}</component>
        <!-- 说明也是生成器渲染好的 HTML 片段，不是运行时拼的用户输入。 -->
        <div class="mdc-markdown mdc-markdown-secondary" v-html="sample.descriptionHtml"></div>

        <!--
          `isolate` 让这张卡自己成一个 stacking context：工具条的 z-10 只在卡内比较，
          既压得住下方代码区，也不会越过页面 header（`--wui-layer-header` 也是 10，
          卡外比大小就会被后画的工具条盖住）。
          预览区 z-20 压过工具条：select / dropdown / autocomplete 不开 `portal` 时面板是
          宿主内的 `position: absolute`（`--wui-layer-inline-overlay` 只有 1），向下溢出预览区
          就会被工具条盖掉；抬到 20 让整块预览（含溢出的面板）画在代码卡之上。
          预览区不画边框、直接铺在页面上；边框与圆角只包住下方「工具条 + 代码区」。
        -->
        <div class="isolate" :data-current-flavor="activeFlavor(sampleKey(sample, index))">
          <div
            v-if="demoComponent(sample.demoKey)"
            class="relative z-20 flex flex-wrap items-center gap-3 bg-(--wui-color-page) px-4 py-8"
            :data-sample-preview="sample.demoKey ?? undefined"
          >
            <component :is="demoComponent(sample.demoKey)" />
          </div>

          <div class="overflow-hidden rounded-4xl border border-(--wui-color-border)">
            <!-- 整条工具条都是展开触发区；内部控件各自 stop，点它们不会顺带开合代码。
                 `relative z-10` 把工具条抬到下方代码区之上：segmented 长按时投影会向下溢出，
                 否则后绘制的折叠区会把阴影盖掉一截。这一层只在卡内比较，见上方 `isolate`。 -->
            <div
              class="relative z-10 flex cursor-pointer flex-wrap items-center justify-between gap-3 bg-(--wui-color-page) px-4 pt-4 pb-2"
              @click="toggleExpanded($event, sampleKey(sample, index))"
            >
              <web-ui-segmented
                :value="activeFlavor(sampleKey(sample, index))"
                variant="raised"
                data-flavor-switch
                aria-label="示例代码框架"
                @click.stop
                @input="onFlavorInput($event, sampleKey(sample, index))"
              >
                <web-ui-segmented-trigger v-for="flavor in flavors" :key="flavor" :value="flavor">
                  <span class="flex items-center gap-1.5">
                    <web-ui-icon :icon="FLAVOR_ICONS[flavor]" :size="14"></web-ui-icon>
                    {{ FLAVOR_LABELS[flavor] }}
                  </span>
                </web-ui-segmented-trigger>
              </web-ui-segmented>

              <div class="flex items-center" @click.stop>
                <span class="sr-only" aria-live="polite">{{ copyAnnouncement(sampleKey(sample, index)) }}</span>
                <web-ui-button-group>
                  <web-ui-tooltip :content="copyLabel(sampleKey(sample, index))">
                    <web-ui-button
                      icon
                      variant="ghost"
                      data-copy
                      :aria-label="copyLabel(sampleKey(sample, index))"
                      @click="copyCode($event, sampleKey(sample, index))"
                    >
                      <!-- 成功态才包进描边宿主：`web-ui-svg-draw-lines` 在 slot 内容稳定时自动播一次，
                         所以每次复制都会重新画出勾与圆，而不是淡入一张现成的图。 -->
                      <web-ui-svg-draw-lines v-if="copyState(sampleKey(sample, index)) === 'copied'" :duration="300">
                        <web-ui-icon
                          :icon="akarIconsCircleCheck"
                          :size="15"
                          class="text-(--wui-color-success)"
                        ></web-ui-icon>
                      </web-ui-svg-draw-lines>
                      <web-ui-icon
                        v-else
                        :icon="copyIcon(sampleKey(sample, index))"
                        :size="15"
                        :class="copyState(sampleKey(sample, index)) === 'failed' ? 'text-(--wui-color-danger)' : ''"
                      ></web-ui-icon>
                    </web-ui-button>
                  </web-ui-tooltip>
                  <web-ui-tooltip :content="expanded[sampleKey(sample, index)] ? '收起代码' : '展开代码'">
                    <web-ui-button
                      icon
                      variant="ghost"
                      data-toggle-code
                      :aria-label="expanded[sampleKey(sample, index)] ? '收起代码' : '展开代码'"
                      :aria-expanded="expanded[sampleKey(sample, index)] ?? false"
                      :aria-controls="panelId(sampleKey(sample, index))"
                      @click="toggleExpanded($event, sampleKey(sample, index))"
                    >
                      <web-ui-icon
                        :icon="expanded[sampleKey(sample, index)] ? lucideChevronUp : lucideChevronDown"
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
            -->
            <web-ui-collapse
              :open="expanded[sampleKey(sample, index)] ?? false"
              peek="128px"
              class="bg-(--wui-color-page) [--wui-collapse-peek-edge-ratio:0.6]"
            >
              <div slot="content">
                <div
                  :id="panelId(sampleKey(sample, index))"
                  class="max-h-[32rem] overflow-auto bg-(--wui-color-page) px-4 pt-3 pb-4 font-mono text-xs leading-6"
                  data-code
                  tabindex="0"
                  v-html="sample.html[activeFlavor(sampleKey(sample, index))]"
                ></div>
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
                <td v-if="column.kind === 'html'" v-html="row[index]"></td>
                <td v-else>{{ row[index] }}</td>
              </template>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </section>
</template>
