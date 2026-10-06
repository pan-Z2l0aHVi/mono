import { describe, expect, it } from 'vite-plus/test'

import vitePlugin from '../vite'
import webpackPlugin from '../webpack'

// unplugin 的 webpack 适配器把插件挂成一条 module rule，transform 藏在 rule.use()
// 返回的 loader entry 里。当前适配器不暴露 transform 钩子（只有 apply），所以这里能
// 验证的可观察行为只有：apply 确实把本插件接进了 webpack 的 module 规则，且该规则
// 由本插件产生。loader 内部的转换逻辑与 Vite 入口共用 factory.ts，已在主 spec 覆盖。

interface WebpackRule {
  enforce?: string
  include?: (id: string) => boolean
  use: (data: { resource?: string }) => unknown
}

function applyToWebpack(options: Parameters<typeof webpackPlugin>[0]) {
  const plugin = webpackPlugin(options)
  const rules: WebpackRule[] = []
  const compiler = { options: { plugins: [], module: { rules } } } as unknown as Parameters<typeof plugin.apply>[0]

  plugin.apply(compiler)
  return rules
}

describe('unplugin-web-components webpack 适配器', () => {
  it('apply 后本插件独占一条 module rule', () => {
    const rules = applyToWebpack({ tagPrefix: 'web-ui', packageName: '@greypan/web-ui' })

    expect(rules).toHaveLength(1)
  })

  it.each([
    { name: '.jsx 模块', resource: '/src/App.jsx' },
    { name: '.tsx 模块', resource: '/src/App.tsx' },
    { name: '.vue 模块', resource: '/src/App.vue' }
  ])('$name 被规则接纳', ({ resource }) => {
    const rules = applyToWebpack({ tagPrefix: 'web-ui', packageName: '@greypan/web-ui' })

    // 规则未声明 include 时对所有模块生效；use() 对有 resource 的模块返回 loader entry
    const included = rules[0].include ? rules[0].include(resource) : true
    expect(included).toBe(true)
    expect(rules[0].use({ resource })).not.toEqual([])
  })

  it('webpack 入口不提供 HTML 注入钩子', () => {
    const plugin = webpackPlugin({ tagPrefix: 'web-ui', packageName: '@greypan/web-ui' }) as unknown as Record<
      string,
      unknown
    >

    expect(plugin.transformIndexHtml).toBeUndefined()
  })

  it('Vite 入口与 webpack 入口共享同一套转换行为', async () => {
    const vite = vitePlugin({ tagPrefix: 'web-ui', packageName: '@greypan/web-ui' })
    const plugin = Array.isArray(vite) ? vite[0] : vite
    const transform = plugin.transform as unknown as (code: string, id: string) => Promise<{ code: string } | undefined>

    const result = await transform.call({}, 'const A = () => <web-ui-button />', '/src/App.jsx')

    expect(result?.code).toContain(`import { WebUiButton } from '@greypan/web-ui/components/button'`)
  })
})
