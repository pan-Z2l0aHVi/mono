/// <reference types="vite/client" />
/// <reference types="vue-router/auto" />
import type { WebUiComponents } from '@mono/web-ui/types/vue'

export {}

declare module 'vue' {
  export interface GlobalComponents extends WebUiComponents {}
}
