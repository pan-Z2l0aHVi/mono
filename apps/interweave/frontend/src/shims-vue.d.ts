/*
 * 给非 vue-tsc 的类型检查器（vp check 背后的 oxlint type-aware）兜底 .vue 模块解析。
 * vue-tsc 自己解析 SFC，不依赖这条通配声明；搬进 __tests__ 的 spec 由它检查时需要它。
 */
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, never>, Record<string, never>, unknown>
  export default component
}
