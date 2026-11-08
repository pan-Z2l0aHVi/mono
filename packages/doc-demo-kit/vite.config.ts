import type { UserConfig } from 'vite-plus'

export default {
  pack: [
    {
      entry: 'src/index.ts',
      dts: true
    },
    {
      // 语料接线 contract test 的宿主装配入口：只有 demo 的 spec 消费，不进运行时主入口。
      entry: 'src/testing.ts',
      dts: true
    },
    {
      // browser mode 的视口设置点：与 testing 分开打包，node:fs 的 contract 入口不把
      // `vite-plus/test/browser` 拖进 jsdom spec 的模块图。
      entry: 'src/testing.viewport.ts',
      dts: true
    }
  ]
} satisfies UserConfig
