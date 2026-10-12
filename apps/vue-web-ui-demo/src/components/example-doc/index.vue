<script setup lang="ts">
import { exampleDocs } from '@/generated/web-ui-examples'

/**
 * 由 markdown 与组件源码生成的示例文档：示例代码（语法高亮）+ API 表。
 *
 * 数据全部来自 `docs/examples/web-ui/<name>.md` 与 `packages/web-ui/src/components/<name>/index.ts`，
 * 生成物由 `node scripts/generate-web-ui-examples.mjs` 维护。这里只负责渲染，不写死任何字段。
 */
const props = defineProps<{ component: string; flavor?: 'react' | 'vue' }>()

const flavor = computed(() => props.flavor ?? 'vue')
const doc = computed(() => exampleDocs.find(candidate => candidate.component === props.component))
</script>

<template>
  <!-- v-html 的内容是生成器产出的高亮 HTML（纯文本已在生成时转义），不是运行时拼的用户输入。 -->
  <section v-if="doc" class="mt-8 flex flex-col gap-4" :data-example-doc="doc.component">
    <p class="m-0 text-(--wui-color-text)" data-example-intro>{{ doc.intro }}</p>

    <h2>示例代码</h2>
    <div
      v-for="sample in doc.samples"
      :key="sample.title"
      class="flex flex-col gap-2"
      :data-example-sample="sample.title"
    >
      <h3 class="m-0">{{ sample.title }}</h3>
      <p class="m-0 text-gray-500">{{ sample.description }}</p>
      <pre
        class="m-0 overflow-x-auto rounded-lg border border-(--wui-color-border) bg-(--wui-color-surface-raised) p-3 font-mono text-sm leading-5"
      ><code v-html="sample.html[flavor]"></code></pre>
    </div>

    <h2>API</h2>
    <div v-for="section in doc.api" :key="section.key" class="flex flex-col gap-3" :data-example-api="section.key">
      <h3 class="m-0">{{ section.title }}</h3>
      <table class="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th class="border-b border-(--wui-color-border) px-3 py-2 text-left align-top font-semibold text-gray-500">
              名称
            </th>
            <template v-if="section.key === 'props'">
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
            <template v-if="section.key === 'props'">
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
            <td class="border-b border-(--wui-color-border) px-3 py-2 align-top">{{ row.description }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
