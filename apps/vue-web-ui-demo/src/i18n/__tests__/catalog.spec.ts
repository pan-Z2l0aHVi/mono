import path from 'node:path'

import { checkApp } from '@greypan/monorepo-kit/policy/shell-i18n-catalog'
import { expect, it } from 'vite-plus/test'

it('壳文案译文完整，且与当前源码抽取一致', async () => {
  const detail = await checkApp({
    root: path.resolve(import.meta.dirname, '../../../../..'),
    app: 'apps/vue-web-ui-demo'
  })
  expect(detail).toMatch(/条壳文案，en 译文齐全且与代码抽取一致/)
})
