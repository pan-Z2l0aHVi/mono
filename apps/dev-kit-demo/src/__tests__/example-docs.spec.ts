import path from 'node:path'

import { parseDemoId } from '@greypan/doc-demo-kit'
import { runExampleDocsContractTests, runNavCorpusContractTests } from '@greypan/doc-demo-kit/testing'
import { describe, expect, it } from 'vite-plus/test'

import { DEMO_REGISTRY } from '../demos/registry'
import { loadMeta } from '../i18n/examples'
import {
  BROWSER_KIT_NAV_SECTION,
  DEPS_RELOAD_NAV_SECTION,
  type DevKitPkg,
  JS_KIT_NAV_SECTION,
  UNPLUGIN_WEB_COMPONENTS_NAV_SECTION
} from '../nav'

const jsKitDocsDir = path.resolve(import.meta.dirname, '../../../../packages/js-kit/docs')
const browserKitDocsDir = path.resolve(import.meta.dirname, '../../../../packages/browser-kit/docs')
const depsReloadDocsDir = path.resolve(import.meta.dirname, '../../../../packages/deps-reload/docs')
const unpluginWebComponentsDocsDir = path.resolve(
  import.meta.dirname,
  '../../../../packages/unplugin-web-components/docs'
)

runExampleDocsContractTests({
  loadMeta: (locale, name) => loadMeta(locale, `js-kit/${name}`),
  docsDir: jsKitDocsDir,
  generatedDir: path.resolve(import.meta.dirname, '../generated/js-kit'),
  execLanguage: null
})

runExampleDocsContractTests({
  loadMeta: (locale, name) => loadMeta(locale, `browser-kit/${name}`),
  docsDir: browserKitDocsDir,
  generatedDir: path.resolve(import.meta.dirname, '../generated/browser-kit'),
  execLanguage: null
})

runExampleDocsContractTests({
  loadMeta: (locale, name) => loadMeta(locale, `deps-reload/${name}`),
  docsDir: depsReloadDocsDir,
  generatedDir: path.resolve(import.meta.dirname, '../generated/deps-reload'),
  execLanguage: null
})

runExampleDocsContractTests({
  loadMeta: (locale, name) => loadMeta(locale, `unplugin-web-components/${name}`),
  docsDir: unpluginWebComponentsDocsDir,
  generatedDir: path.resolve(import.meta.dirname, '../generated/unplugin-web-components'),
  execLanguage: null
})

runNavCorpusContractTests({
  docsDir: jsKitDocsDir,
  sections: [JS_KIT_NAV_SECTION],
  basenameOf: item => item.path.split('/').at(-1)!
})

runNavCorpusContractTests({
  docsDir: browserKitDocsDir,
  sections: [BROWSER_KIT_NAV_SECTION],
  basenameOf: item => item.path.split('/').at(-1)!
})

runNavCorpusContractTests({
  docsDir: depsReloadDocsDir,
  sections: [DEPS_RELOAD_NAV_SECTION],
  basenameOf: item => item.path.split('/').at(-1)!
})

runNavCorpusContractTests({
  docsDir: unpluginWebComponentsDocsDir,
  sections: [UNPLUGIN_WEB_COMPONENTS_NAV_SECTION],
  basenameOf: item => item.path.split('/').at(-1)!
})

describe('三方 demoId 契约（.md / .CN.md / DEMO_REGISTRY）', () => {
  it('每个中英文模块文档中的 demo=<id> 一一对应且全部在 DEMO_REGISTRY 中注册，无孤儿项', async () => {
    const referencedKeys = new Set<string>()
    const allModules: Array<{ pkg: DevKitPkg; slug: string }> = [
      ...JS_KIT_NAV_SECTION.items.map(item => ({ pkg: 'js-kit' as const, slug: item.path.split('/').at(-1)! })),
      ...BROWSER_KIT_NAV_SECTION.items.map(item => ({
        pkg: 'browser-kit' as const,
        slug: item.path.split('/').at(-1)!
      })),
      ...DEPS_RELOAD_NAV_SECTION.items.map(item => ({
        pkg: 'deps-reload' as const,
        slug: item.path.split('/').at(-1)!
      })),
      ...UNPLUGIN_WEB_COMPONENTS_NAV_SECTION.items.map(item => ({
        pkg: 'unplugin-web-components' as const,
        slug: item.path.split('/').at(-1)!
      }))
    ]

    for (const { pkg, slug } of allModules) {
      const key = `${pkg}/${slug}`
      const [enNodes, zhNodes] = await Promise.all([loadMeta('en', key), loadMeta('zh-CN', key)])
      const enIds = enNodes
        .filter(n => n.label === 'codeblock')
        .map(n => parseDemoId(n.meta))
        .filter((id): id is string => typeof id === 'string')
      const zhIds = zhNodes
        .filter(n => n.label === 'codeblock')
        .map(n => parseDemoId(n.meta))
        .filter((id): id is string => typeof id === 'string')

      expect(zhIds, `${key} 中英文 demo=<id> 顺序与集合必须一致`).toEqual(enIds)
      for (const id of enIds) {
        const registryKey = `${key}#${id}`
        expect(DEMO_REGISTRY[registryKey], `缺少 DEMO_REGISTRY 注册项：${registryKey}`).toBeTypeOf('function')
        referencedKeys.add(registryKey)
      }
    }

    expect([...referencedKeys].sort()).toEqual(Object.keys(DEMO_REGISTRY).sort())
  })
})
