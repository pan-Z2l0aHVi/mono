/// <reference types="vite-plus/client" />
/// <reference types="vue-router/auto" />
/// <reference types="@greypan/web-ui/types/vue" />

// loader 由 wuchale 在 Vite 启动时生成；vue-tsc 先于 Vite 运行，只声明这个 side-effect 入口。
declare module '@/locales/main.loader.js' {}

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent
  export default component
}
