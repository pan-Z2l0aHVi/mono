<script setup lang="ts">
import { computed, watchEffect } from 'vue'

import { currentDocs, ensureExampleDoc, registerExampleDoc } from '@/i18n/locale'

import { MetaComp } from '../meta'

const props = defineProps<{
  component: string
}>()

const docNodes = computed(() => currentDocs.value.get(props.component) ?? null)

watchEffect(onCleanup => onCleanup(registerExampleDoc(props.component)))
// 页面切换会带来新组件：语种提交只覆盖当时注册的那批，这里单独补齐当前页。
watchEffect(() => {
  void ensureExampleDoc(props.component).catch(error => {
    console.error(`Unable to load example doc: ${props.component}`, error)
  })
})
</script>

<template>
  <!--
    根节点这条字面量 aria-label 同时是 wuchale 的锚点：组件作用域里没有其它文案时，它才会在
    组件顶部生成运行时初始化；否则嵌套标题会引用到回调作用域里那个未定义的 `_w_runtime_`。
    正文块自带 margin，与 gap 叠加会双倍，所以这一层逐个清零。
  -->
  <section
    v-if="docNodes"
    class="mdm-markdown mt-10 flex flex-col gap-4 [&>*]:my-0"
    aria-label="示例文档"
    :data-example-doc="component"
  >
    <MetaComp :nodes="docNodes" />
  </section>
</template>
