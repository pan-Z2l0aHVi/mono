import { defineCatch, defineRunner, defineShellI18nCatalog, getWorkspaceRoot } from '@greypan/monorepo-kit'
import { expect, it } from 'vite-plus/test'

// 语种与 PO 目录是应用自己的事实：中文是源语种，英文随 PO 入库。
const shellI18nCatalog = defineShellI18nCatalog({
  app: 'apps/react-web-ui-demo',
  locales: { source: 'zh-CN', targets: ['en'] },
  directory: 'src/locales'
})

it('壳文案译文完整，且与当前源码抽取一致', async () => {
  const kit = defineRunner()
    .use(shellI18nCatalog)
    .use(defineCatch())
    .make({ root: getWorkspaceRoot(import.meta.dirname), env: process.env })
  const result = await kit.run()
  // 断言整个 Result：失败时 diff 里带着 `i18n:` 那行原因，不用再拼一遍。
  expect(result.ok ? '' : result.error).toBe('')
})
