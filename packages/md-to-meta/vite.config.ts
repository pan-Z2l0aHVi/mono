import type { UserConfig } from 'vite-plus'

export default {
  pack: [
    {
      entry: 'src/index.ts',
      dts: true
    },
    // 纯契约子路径：类名常量与 visibleText/lineCountOf，零运行时依赖，
    // 宿主运行时与浏览器测试只引它，不经根入口拖入 shiki/tinyglobby。
    {
      entry: 'src/contract.ts',
      dts: true
    },
    // 浏览器运行时子路径：parseMarkdown（hash/highlight 可注入）+ highlightRuntime + 契约常量。
    // 模块图不得触及 node: 与 vite/fs——`runtime-graph` 测试钉住这条边界。
    {
      entry: 'src/runtime.ts',
      dts: true
    },
    // headless CLI：`md-to-meta check|write <app-dir>`，bin 指到 dist/cli.mjs。
    {
      entry: 'src/cli.ts'
    }
  ]
} satisfies UserConfig
