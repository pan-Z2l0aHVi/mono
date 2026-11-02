import { adapter } from '@greypan/wuchale-vue'
import { defaultHeuristic, defineConfig } from 'wuchale'

export default defineConfig({
  locales: ['zh-CN', 'en'],
  adapters: {
    main: adapter({
      files: {
        include: 'src/**/*.vue',
        ignore: ['src/generated/**', '**/__tests__/**', 'src/type-fixtures/**', 'src/app/boot-error.vue']
      },
      // 模板与属性里的 Button、English 等英文是产品名，不能进 catalog；仓库约定中文是唯一源语言，只抽取含汉字的文本。
      heuristic: (text, file) => (/\p{Script=Han}/u.test(text.body) ? defaultHeuristic(text, file) : false)
    })
  },
  dev: 'read',
  ai: null
})
