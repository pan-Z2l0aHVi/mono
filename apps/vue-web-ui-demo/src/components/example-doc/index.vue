<script setup lang="ts">
import type { Component } from 'vue'
import { computed, defineAsyncComponent } from 'vue'

import { exampleDocs } from '@/generated/examples'

/**
 * 由示例文档 markdown 生成的示例文档：可交互示例 + 示例代码（语法高亮）+ API 表。
 *
 * 数据全部来自 `packages/web-ui/docs/<name>.md`：示例代码、以及 API 表的名称 / 说明 / 类型 / 默认值都
 * 手写在那份 markdown 里，组件源码不参与生成。`src/generated/**` 由 `@greypan/md-to-comp` 的 Vite
 * 插件在 dev 与 build 时生成，这里只负责渲染，不写死任何字段。
 *
 * markdown 里带 `{#id}` 锚点的示例会被生成器原样落成 `src/generated/demos/<component>--<id>.vue`，
 * 也就是下面 glob 到的这份 SFC——`<pre>` 里显示的字节和屏幕上被执行的字节是同一份。
 * 没有锚点的示例只有代码块。
 */
const demoModules = import.meta.glob<{ default: Component }>('../../generated/demos/*.vue')
const DEMO_PREFIX = '../../generated/demos/'

// 异步组件在模块作用域建一次：setup 里每次新建会让示例被反复卸载重建，拖到一半的 slider 状态当场丢失。
const demoComponents = new Map(
  Object.entries(demoModules).map(([file, load]) => [
    file.slice(DEMO_PREFIX.length, -'.vue'.length),
    defineAsyncComponent(load)
  ])
)

const props = defineProps<{ component: string; flavor?: 'react' | 'vue' }>()

const flavor = computed(() => props.flavor ?? 'vue')
const doc = computed(() => exampleDocs.find(candidate => candidate.component === props.component))

function demoComponent(demoKey: string | null) {
  return demoKey ? demoComponents.get(`${props.component}--${demoKey}`) : undefined
}
</script>

<template>
  <section v-if="doc" class="mt-8 flex flex-col gap-4" :data-example-doc="doc.component">
    <!-- 生成器把 markdown 渲染成 HTML 片段（纯文本已在生成时转义），不是运行时拼的用户输入。 -->
    <p class="m-0 text-(--wui-color-text)" data-example-intro v-html="doc.introHtml"></p>

    <h2>Example code</h2>
    <div v-for="sample in doc.samples" :key="sample.title" class="flex flex-col gap-2" :data-sample="sample.title">
      <h3 class="m-0">{{ sample.title }}</h3>
      <p class="m-0 text-gray-500" v-html="sample.descriptionHtml"></p>
      <div
        v-if="demoComponent(sample.demoKey)"
        class="flex flex-wrap items-center gap-4 rounded-lg border border-(--wui-color-border) bg-(--wui-color-surface) p-4"
        :data-sample-preview="sample.demoKey ?? undefined"
      >
        <component :is="demoComponent(sample.demoKey)" />
      </div>
      <div
        class="overflow-x-auto rounded-lg border border-(--wui-color-border) bg-(--wui-color-surface-raised) p-3 font-mono text-sm leading-5"
        v-html="sample.html[flavor]"
      ></div>
    </div>

    <!-- 没有 `## API` 小节的语料（纯展示的子组件）不留一个空标题。 -->
    <h2 v-if="doc.api.length > 0">API</h2>
    <!-- API 小节有两型：登记过表头的是表（列形状完全由生成的 columns 决定），其余是散文。 -->
    <div v-for="section in doc.api" :key="section.key" class="flex flex-col gap-3" :data-example-api="section.key">
      <h3 class="m-0">{{ section.title }}</h3>
      <!-- 散文正文是生成器渲染好的 HTML 片段，不是运行时拼的用户输入。表格用 flex 间距，
           列表要显式补回 preflight 清掉的记号与缩进。 -->
      <div
        v-if="section.kind === 'prose'"
        class="flex flex-col gap-3 text-(--wui-color-text) [&_ol]:list-decimal [&_ol]:ps-5 [&_ul]:list-disc [&_ul]:ps-5"
        v-html="section.html"
      ></div>
      <table v-else class="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th
              v-for="column in section.columns"
              :key="column.title"
              class="border-b border-(--wui-color-border) px-3 py-2 text-left align-top font-semibold text-gray-500"
            >
              {{ column.title }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in section.rows" :key="row[0]">
            <template v-for="(column, index) in section.columns" :key="column.title">
              <td
                v-if="column.kind === 'html'"
                class="border-b border-(--wui-color-border) px-3 py-2 align-top"
                v-html="row[index]"
              ></td>
              <!-- 名称列是这一行的身份，值列是回填量：后者弱一档，与表格外框的灰阶一致。 -->
              <td
                v-else
                class="border-b border-(--wui-color-border) px-3 py-2 align-top font-mono whitespace-nowrap"
                :class="column.kind === 'code' ? 'text-gray-500' : ''"
              >
                {{ row[index] }}
              </td>
            </template>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
