import { adapter as jsx } from '@wuchale/jsx'
import { defineConfig } from 'wuchale'

// 壳文案（导航之外的界面文字）中文为源、英文为译文。文档正文与示例代码由 md-to-comp 按语种
// 生成，不经 wuchale 抽取，所以这里的 include 必须把它们排除在外。
export default defineConfig({
  locales: ['zh-CN', 'en'],
  adapters: {
    main: jsx({
      loader: 'react',
      files: {
        include: 'src/**/*.{ts,tsx}',
        ignore: ['**/*.d.ts', 'src/generated/**', '**/__tests__/**', 'src/type-fixtures/**', 'src/routeTree.gen.ts']
      }
    })
  },
  ai: null
})
