<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import { highlightForPreview } from './previewRuntime'

/*
 * 代码预览：shiki 双主题高亮 + 行号（md-to-meta runtime，与 demo 同一条管线、同一份样式）。
 *
 * 输入上限是展示层规则：超过 128KB 或 5000 行的文本不再进入分词器（浏览器主线程对半兆文本
 * 无限时分会冻结 UI），退回纯文本展示并提示。这份上限独立于抽屉的 512KB 文本读取上限。
 */
const HIGHLIGHT_INPUT_BYTE_LIMIT = 128 * 1024
const HIGHLIGHT_INPUT_LINE_LIMIT = 5000

const props = defineProps<{
  code: string
  language?: string
}>()

const html = ref('')
const plain = ref(true)

const overLimit = computed(
  () =>
    new TextEncoder().encode(props.code).byteLength > HIGHLIGHT_INPUT_BYTE_LIMIT ||
    props.code.split('\n').length > HIGHLIGHT_INPUT_LINE_LIMIT
)

watch(
  () => [props.code, props.language] as const,
  ([code, language], previous) => {
    if (previous && previous[0] === code && previous[1] === language) return
    html.value = ''
    if (!language || overLimit.value) {
      // 白名单外或超大输入：不进着色器，直接按纯文本展示。
      plain.value = true
      return
    }
    plain.value = false
    highlightForPreview(code, language).then(rendered => {
      html.value = rendered
    })
  },
  { immediate: true }
)

// v-html 的内容是 highlightRuntime 的产物：shiki 输出里代码文本逐字转义，结构由我们自己的
// framePre 生成，不经过任何用户可控的 HTML 路径。
</script>

<template>
  <div class="min-h-full">
    <p
      v-if="overLimit"
      class="m-0 border-b border-black/6 bg-(--wui-color-surface) px-4 py-2 text-xs text-(--wui-color-text-secondary) dark:border-white/8"
    >
      文件过大，按纯文本显示开头部分，不着色。
    </p>
    <pre v-if="plain" class="m-0 overflow-x-auto p-4 pt-3 font-mono text-xs leading-6 whitespace-pre">{{ code }}</pre>
    <div
      v-else
      class="contain-inline-size overflow-x-auto p-4 pt-3 font-mono text-xs leading-6"
      data-code
      v-html="html"
    ></div>
  </div>
</template>
