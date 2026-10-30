import path from 'node:path'

import { defineShellI18nCatalog } from '@greypan/monorepo-kit'
import { expect, it } from 'vite-plus/test'

// 语种与 PO 目录是应用自己的事实：中文是源语种，英文随 PO 入库。
const shellI18nCatalog = defineShellI18nCatalog({
  locales: { source: 'zh-CN', targets: ['en'] },
  directory: 'src/locales'
})

it('壳文案译文完整，且与当前源码抽取一致', async () => {
  const detail = await shellI18nCatalog.run({
    root: path.resolve(import.meta.dirname, '../../../../..'),
    app: 'apps/vue-web-ui-demo'
  })
  expect(detail).toMatch(/条壳文案，en 译文齐全且与代码抽取一致/)
})
