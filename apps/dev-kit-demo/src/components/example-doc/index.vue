<script setup lang="ts">
import { computed, watchEffect } from 'vue'

import { resolveDocLinks } from '@/i18n/examples'
import { currentDocs, ensureExampleDoc, registerExampleDoc } from '@/i18n/locale'

import { MetaComp } from '../meta'

const props = withDefaults(
  defineProps<{
    component: string
    preview?: boolean
  }>(),
  { preview: true }
)

const docNodes = computed(() => {
  const nodes = currentDocs.value.get(props.component)
  return nodes ? resolveDocLinks(props.component, nodes) : null
})

watchEffect(onCleanup => onCleanup(registerExampleDoc(props.component)))
watchEffect(() => {
  void ensureExampleDoc(props.component).catch(error => {
    console.error(`Unable to load example doc: ${props.component}`, error)
  })
})
</script>

<template>
  <section
    v-if="docNodes"
    class="mdm-markdown mt-4 flex flex-col gap-4 [&>*]:my-0"
    aria-label="示例文档"
    :data-example-doc="component"
  >
    <MetaComp :nodes="docNodes" :preview="preview" :doc-key="component" />
  </section>
</template>
