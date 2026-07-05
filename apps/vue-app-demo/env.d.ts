/// <reference types="vite-plus/client" />
/// <reference types="vue-router/auto" />
/// <reference types="@greypan/web-ui/vue" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent
  export default component
}
