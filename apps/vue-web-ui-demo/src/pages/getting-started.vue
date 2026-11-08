<route lang="json">
{
  "meta": { "title": "Getting Started" }
}
</route>

<script setup lang="ts">
import { resolveReadmeLinks } from '@greypan/doc-demo-kit'

import readmeZh from '@/generated/readme/README.CN.meta'
import readmeEn from '@/generated/readme/README.meta'
import { currentLocale } from '@/i18n/locale'

import { MetaComp } from '../components/meta'

const base = 'https://github.com/pan-Z2l0aHVi/mono/blob/main/packages/web-ui'
const zh = resolveReadmeLinks(readmeZh, base)
const en = resolveReadmeLinks(readmeEn, base)
</script>

<template>
  <section class="mdm-markdown mx-auto flex max-w-4xl flex-col gap-4 [&>*]:my-0">
    <MetaComp :nodes="currentLocale === 'zh-CN' ? zh : en" :preview="false" variant-label="包管理器" />
  </section>
</template>
