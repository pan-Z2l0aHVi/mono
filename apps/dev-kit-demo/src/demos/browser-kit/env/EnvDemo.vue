<script setup lang="ts">
import { env } from '@greypan/browser-kit'

const entries = [
  { key: 'isBrowser', value: env.isBrowser },
  { key: 'isSsr', value: env.isSsr },
  { key: 'isMobile', value: env.isMobile },
  { key: 'isDesktop', value: env.isDesktop },
  { key: 'isTouchSupported', value: env.isTouchSupported },
  { key: 'isChrome', value: env.isChrome },
  { key: 'isSafari', value: env.isSafari },
  { key: 'isFirefox', value: env.isFirefox },
  { key: 'isAndroid', value: env.isAndroid },
  { key: 'isIos', value: env.isIos },
  { key: 'isIpadOs', value: env.isIpadOs },
  { key: 'isIframe', value: env.isIframe },
  { key: 'isPWA', value: env.isPWA },
  { key: 'isWebview', value: env.isWebview },
  { key: 'isWeChat', value: env.isWeChat },
  { key: 'isAlipay', value: env.isAlipay },
  { key: 'isDingTalk', value: env.isDingTalk }
]
</script>

<template>
  <div class="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3 md:grid-cols-4">
    <div
      v-for="item in entries"
      :key="item.key"
      class="flex items-center justify-between rounded-md border border-border/60 px-2.5 py-1.5 font-mono"
    >
      <span>{{ item.key }}</span>
      <span :class="item.value ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-muted-foreground'">
        {{ item.value }}
      </span>
    </div>
  </div>
</template>
