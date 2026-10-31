<route lang="json">
{
  "meta": {
    "title": "Changelog"
  }
}
</route>

<script setup lang="ts">
import { markdownToHtml } from '@greypan/md-to-comp/markdown'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import changelogSource from '../../../../packages/web-ui/CHANGELOG.md?raw'

const VERSION_PAGE_SIZE = 8

interface ChangelogVersion {
  version: string
  html: string
}

function renderMarkdown(markdown: string): string {
  return markdownToHtml(markdown).replace(/<(h[1-6])>/g, '<$1 class="mdc-heading">')
}

function splitVersions(source: string): ChangelogVersion[] {
  return source
    .replace(/^# [^\n]*\n+/, '')
    .split(/\n(?=## )/)
    .filter(block => block.trim())
    .map(block => ({
      version: block.match(/^##\s+([^\n]+)/)?.[1] ?? '',
      html: renderMarkdown(block)
    }))
}

const versions = splitVersions(changelogSource)
const visibleCount = ref(VERSION_PAGE_SIZE)
const visibleVersions = computed(() => versions.slice(0, visibleCount.value))
const hasMore = computed(() => visibleCount.value < versions.length)
const sentinel = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | undefined

function observeSentinel() {
  observer?.disconnect()
  observer = undefined
  if (!sentinel.value || !hasMore.value) return

  observer = new IntersectionObserver(
    entries => {
      if (!entries.some(entry => entry.isIntersecting)) return
      visibleCount.value = Math.min(visibleCount.value + VERSION_PAGE_SIZE, versions.length)
    },
    { rootMargin: '0px 0px 400px 0px' }
  )
  observer.observe(sentinel.value)
}

onMounted(observeSentinel)
watch(visibleCount, async () => {
  await nextTick()
  observeSentinel()
})
onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <article class="mx-auto flex max-w-4xl flex-col gap-10">
    <header>
      <h1 class="m-0 text-2xl font-semibold">更新日志</h1>
      <p class="mt-2 text-sm text-(--wui-color-text-secondary)">组件库各版本的变更记录。</p>
    </header>
    <section
      v-for="entry in visibleVersions"
      :key="entry.version"
      class="mdc-markdown flex flex-col gap-4 [&>*]:my-0 [contain-intrinsic-size:auto_600px] [content-visibility:auto]"
      :data-changelog-version="entry.version"
      v-html="entry.html"
    ></section>
    <div v-if="hasMore" ref="sentinel" class="h-px w-full" aria-hidden="true"></div>
  </article>
</template>
