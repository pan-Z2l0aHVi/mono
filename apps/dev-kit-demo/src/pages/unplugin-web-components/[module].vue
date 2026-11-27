<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import ExampleDoc from '@/components/example-doc/index.vue'
import { isValidModule } from '@/nav'
import NotFound from '@/pages/[...all]/index.vue'

const route = useRoute()
const slug = computed(() => String((route.params as { module?: string }).module ?? ''))
const valid = computed(() => isValidModule('unplugin-web-components', slug.value))
</script>

<template>
  <ExampleDoc v-if="valid" :component="`unplugin-web-components/${slug}`" :preview="false" />
  <NotFound v-else />
</template>
