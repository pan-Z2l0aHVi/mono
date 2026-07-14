import type { Thenable, TransformResult } from 'unplugin'
import { describe, expect, it } from 'vite-plus/test'

import vitePlugin from '../vite'

describe('unplugin-web-components', () => {
  function createPlugin() {
    const plugin = vitePlugin({ tagPrefix: 'web-ui', packageName: '@greypan/web-ui' })
    return Array.isArray(plugin) ? plugin[0] : plugin
  }

  it('应当在 Vue 组件中 import kebab-case 组件', async () => {
    const plugin = createPlugin()

    const transform = plugin.transform as unknown as (
      this: unknown,
      code: string,
      id: string
    ) => Thenable<TransformResult>

    expect(transform).toBeTypeOf('function')

    const code = `
      <template>
        <web-ui-button />
        <web-ui-card />
      </template>

      <script setup>
      const a = 1
      </script>
    `

    const result = await transform!.call({}, code, '/src/App.vue')
    if (!result || typeof result === 'string') {
      throw new Error('Unexpected transform result.')
    }
    expect(result.code).toContain(`import { WebUiButton } from '@greypan/web-ui/components/button'`)
    expect(result.code).toContain(`import { WebUiCard } from '@greypan/web-ui/components/card'`)
  })

  it('应当在 React 组件中 import kebab-case 组件', async () => {
    const plugin = createPlugin()

    const transform = plugin.transform as unknown as (
      this: unknown,
      code: string,
      id: string
    ) => Thenable<TransformResult>

    expect(transform).toBeTypeOf('function')

    const code = `
      const App = () => {
        const a = 1
        return <>
          <web-ui-button />
          <web-ui-card />
        </>
      }
    `

    const result = await transform!.call({}, code, '/src/App.jsx')
    if (!result || typeof result === 'string') {
      throw new Error('Unexpected transform result.')
    }
    expect(result.code).toContain(`import { WebUiButton } from '@greypan/web-ui/components/button'`)
    expect(result.code).toContain(`import { WebUiCard } from '@greypan/web-ui/components/card'`)
  })
})
