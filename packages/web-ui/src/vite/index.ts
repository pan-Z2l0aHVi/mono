/**
 * 消费方 Vite 配置里 `optimizeDeps.include` 要补的 web-ui 运行时依赖。
 *
 * web-ui 的组件从自己的 dist 里带出 `lit`、`@lit/context`、`@floating-ui/dom` 这些裸依赖。它们不在
 * 应用的 dependencies 里，应用自己解析不到，写裸名会被 Vite 静默跳过，于是 Vite 直到请求模块时才
 * 发现它们并打印 `optimized dependencies changed. reloading`，那一次模块加载就失败了（症状是
 * `Failed to fetch dynamically imported module`）。条目里的 `>` 是 Vite 的「从某个包的角度解析」
 * 写法，让它们按 web-ui 的依赖树解析。
 *
 * 应用的依赖扫描器看不穿 web-ui 的组件图时才需要这份清单。典型场景是路由或页面由虚拟模块加载，
 * 比如 file-based routing（`vue-router/vite`）或 `import.meta.glob`，扫描器进不去那些模块，路由页里
 * 由组件库生成的导入就不可见。反过来，启动入口静态 import 到每个组件模块的应用，扫描器自己就能
 * 发现这些裸依赖，不必列出。
 *
 * ```ts
 * import { webUiOptimizeDeps } from '@greypan/web-ui/vite'
 *
 * export default {
 *   optimizeDeps: {
 *     include: [...webUiOptimizeDeps]
 *   }
 * }
 * ```
 *
 * 这份清单只影响 dev 期的依赖预打包，构建不受影响。web-ui 增删运行时依赖时清单要跟着改，所以应用
 * 直接引用它，不要复制条目。
 */
export const webUiOptimizeDeps: string[] = [
  '@greypan/web-ui > lit',
  '@greypan/web-ui > @lit/context',
  '@greypan/web-ui > @floating-ui/dom',
  '@greypan/web-ui > lit/decorators.js',
  '@greypan/web-ui > lit/directives/class-map.js',
  '@greypan/web-ui > lit/directives/if-defined.js',
  '@greypan/web-ui > lit/directives/repeat.js',
  '@greypan/web-ui > lit/directives/style-map.js',
  '@greypan/web-ui > lit/directives/unsafe-svg.js'
]
