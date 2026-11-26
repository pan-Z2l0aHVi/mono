import { defineCatch, defineRunner, defineShellI18nCatalog, getWorkspaceRoot } from '@greypan/monorepo-kit'
import { expect, it } from 'vite-plus/test'

const shellI18nCatalog = defineShellI18nCatalog({
  app: 'apps/dev-kit-demo',
  locales: { source: 'zh-CN', targets: ['en'] },
  directory: 'src/locales'
})

it('壳文案译文完整，且与当前源码抽取一致', async () => {
  const kit = defineRunner()
    .use(shellI18nCatalog)
    .use(defineCatch())
    .make({ root: getWorkspaceRoot(import.meta.dirname), env: process.env })
  const result = await kit.run()
  expect(result.ok ? '' : result.error).toBe('')
})
