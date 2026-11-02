<route lang="json">
{
  "meta": {
    "title": "Changelog"
  }
}
</route>

<script setup lang="ts">
import changelogMeta from '@/generated/CHANGELOG.meta'

import { MetaComp } from '../components/meta'
</script>

<template>
  <section class="mdm-markdown mx-auto flex max-w-4xl flex-col gap-4 [&>*]:my-0">
    <MetaComp :nodes="changelogMeta" :preview="false" />
  </section>
</template>
