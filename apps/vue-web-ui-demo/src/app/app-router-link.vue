<script setup lang="ts">
import { RouterLink, useRouter } from 'vue-router'
import type { RouteLocationRaw } from 'vue-router'

import { prefetchRouteIntent } from '@/router/prefetch'
import { queryClient } from '@/router/query-client'

const props = defineProps<{ to: RouteLocationRaw }>()

const router = useRouter()

// 意图预取：hover / focus / touchstart 时提前下载目标页 chunk 并预热数据，不触发顶部进度。
function prefetch() {
  prefetchRouteIntent(router, queryClient, props.to)
}
</script>

<template>
  <RouterLink :to="to" @mouseenter="prefetch" @focus="prefetch" @touchstart.passive="prefetch">
    <slot />
  </RouterLink>
</template>
