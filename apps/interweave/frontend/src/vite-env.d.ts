/// <reference types="vite-plus/client" />
/// <reference types="@greypan/web-ui/types/vue" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent
  export default component
}
