<script setup lang="ts">
import { findComponentRoute } from '@greypan/doc-demo-kit'
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import ExampleDoc from '@/components/example-doc/index.vue'
import NotFound from '@/components/not-found/index.vue'

const route = useRoute('/components/[component]')
const entry = computed(() =>
  typeof route.params.component === 'string' ? findComponentRoute(route.params.component) : undefined
)
</script>

<template>
  <template v-if="entry">
    <ExampleDoc v-for="doc in entry.docs" :key="doc" :component="doc" />
  </template>
  <NotFound v-else />
</template>
