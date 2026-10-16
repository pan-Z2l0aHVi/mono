<script setup lang="ts">
import type { Component } from 'vue'
import { computed, defineAsyncComponent } from 'vue'

import { exampleDocs, type ExampleApiSection } from '@/generated/examples'

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

// 异步组件在模块作用域建一次：setup 里每次新建会让示例被反复卸载重建，拖到一半的滑块状态当场丢失。
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

/**
 * 四列小节（Props / Options）的每一行都带类型与默认值——列形状由配置声明，解析器据此给出带 `type`
 * 的行。渲染端按行的形状决定是否多渲染两列，因此不需要知道哪些小节是四列的。
 */
function hasTypeColumns(section: ExampleApiSection) {
  return section.rows.some(row => row.type !== undefined)
}
</script>

<template>
  <section v-if="doc" class="mt-8 flex flex-col gap-4" :data-example-doc="doc.component">
    <!-- 生成器把 markdown 渲染成 HTML 片段（纯文本已在生成时转义），不是运行时拼的用户输入。 -->
    <p class="m-0 text-(--wui-color-text)" data-example-intro v-html="doc.introHtml"></p>

    <h2>示例代码</h2>
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
    <div v-for="section in doc.api" :key="section.key" class="flex flex-col gap-3" :data-example-api="section.key">
      <h3 class="m-0">{{ section.title }}</h3>
      <table class="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th class="border-b border-(--wui-color-border) px-3 py-2 text-left align-top font-semibold text-gray-500">
              名称
            </th>
            <template v-if="hasTypeColumns(section)">
              <th
                class="border-b border-(--wui-color-border) px-3 py-2 text-left align-top font-semibold text-gray-500"
              >
                类型
              </th>
              <th
                class="border-b border-(--wui-color-border) px-3 py-2 text-left align-top font-semibold text-gray-500"
              >
                默认值
              </th>
            </template>
            <th class="border-b border-(--wui-color-border) px-3 py-2 text-left align-top font-semibold text-gray-500">
              说明
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in section.rows" :key="row.name">
            <td class="border-b border-(--wui-color-border) px-3 py-2 align-top font-mono whitespace-nowrap">
              {{ row.name }}
            </td>
            <template v-if="hasTypeColumns(section)">
              <td
                class="border-b border-(--wui-color-border) px-3 py-2 align-top font-mono whitespace-nowrap text-gray-500"
              >
                {{ row.type }}
              </td>
              <td
                class="border-b border-(--wui-color-border) px-3 py-2 align-top font-mono whitespace-nowrap text-gray-500"
              >
                {{ row.default }}
              </td>
            </template>
            <td class="border-b border-(--wui-color-border) px-3 py-2 align-top" v-html="row.descriptionHtml"></td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
