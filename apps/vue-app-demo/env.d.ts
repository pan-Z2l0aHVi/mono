/// <reference types="vite/client" />
/// <reference types="unplugin-vue-router/client" />
import type { WebUiComponents } from '@mono/web-ui/types/vue'

export {}

declare module 'vue' {
  export interface GlobalComponents extends WebUiComponents {}
}
