<route lang="json">
{
  "meta": {
    "title": "Changelog"
  }
}
</route>

<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query'
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import changelogMeta from '@/generated/CHANGELOG.meta'
import { changelogSummaryQuery, parseFakeFetchOptions } from '@/queries/changelog'

import { MetaComp } from '../components/meta'

// 该 query 已由路由守卫在跳转前预取，进入页面时直接命中缓存；页面内只做次要展示，不阻塞正文。
const route = useRoute()
const { data: summary, isPending } = useQuery(computed(() => changelogSummaryQuery(parseFakeFetchOptions(route.query))))
const syncedAt = computed(() => (summary.value ? new Date(summary.value.fetchedAt).toLocaleTimeString() : ''))
</script>

<template>
  <section class="mdm-markdown mx-auto flex max-w-4xl flex-col gap-4 [&>*]:my-0">
    <p class="text-sm text-(--wui-color-text-secondary)" data-testid="changelog-sync" aria-live="polite">
      <template v-if="isPending">正在同步更新状态…</template>
      <template v-else>已同步于 {{ syncedAt }}</template>
    </p>
    <MetaComp :nodes="changelogMeta" :preview="false" />
  </section>
</template>
