<script setup lang="ts">
import { RouterLink, useRouter } from 'vue-router'
import type { RouteLocationRaw } from 'vue-router'

import { prefetchRouteIntent } from '@/router/prefetch'

const props = defineProps<{ to: RouteLocationRaw }>()
const router = useRouter()

function prefetch() {
  prefetchRouteIntent(router, props.to)
}
</script>

<template>
  <RouterLink :to="to" @mouseenter="prefetch" @focus="prefetch" @touchstart.passive="prefetch">
    <slot />
  </RouterLink>
</template>
