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
    }
  ]
} satisfies UserConfig
