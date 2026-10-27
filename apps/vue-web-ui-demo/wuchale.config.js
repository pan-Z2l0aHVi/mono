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
      heuristic: (text, file) => (/\p{Script=Han}/u.test(text.body) ? defaultHeuristic(text, file) : false),
      componentAttributes: { 'web-ui-option': ['label'], 'web-ui-tooltip': ['content'] }
    })
  },
  dev: 'read',
  ai: null
})
