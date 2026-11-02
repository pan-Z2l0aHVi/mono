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
      // 模板与属性里的 Button、English 等固定英文标识不能进 catalog；壳文案以中文为主，
      // 只抽取含汉字的文本，避免把组件名、语言名等非文案值当成待翻译内容。
      heuristic: (text, file) => (/\p{Script=Han}/u.test(text.body) ? defaultHeuristic(text, file) : false),
      componentAttributes: { 'web-ui-option': ['label'], 'web-ui-tooltip': ['content'], SidebarNavLink: ['label'] }
    })
  },
  dev: 'read',
  ai: null
})
