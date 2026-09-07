import { describe, expect, it } from 'vite-plus/test'

import webpackPlugin from '../webpack'

describe('unplugin-web-components webpack 适配器', () => {
  it('apply 时将 transform 接入 webpack module rules', () => {
    const plugin = webpackPlugin({ tagPrefix: 'web-ui', packageName: '@greypan/web-ui' })
    const rules: unknown[] = []
    // 最小 Compiler 桩：factory 只声明 transform，unplugin 走 module.rules 注入分支
    const compiler = { options: { plugins: [], module: { rules } } } as unknown as Parameters<typeof plugin.apply>[0]
    plugin.apply(compiler)
    expect(rules).toHaveLength(1)
  })
})
