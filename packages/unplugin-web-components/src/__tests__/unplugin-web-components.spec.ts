import type { Thenable, TransformResult } from 'unplugin'
import { describe, expect, it } from 'vitest'

import { unpluginWebComponents } from '..'

describe('unplugin-web-components', () => {
  it('应当在 Vue 组件中 import kebab-case 组件', async () => {
    const raw = unpluginWebComponents.raw({ tagPrefix: 'web-ui', packageName: '@mono/web-ui' }, { framework: 'vite' })

    const plugin = Array.isArray(raw) ? raw[0] : raw

    const transform = plugin.transform as (this: unknown, code: string, id: string) => Thenable<TransformResult>

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
    expect(result.code).toContain(`import { WebUiButton } from '@mono/web-ui/components/button'`)
    expect(result.code).toContain(`import { WebUiCard } from '@mono/web-ui/components/card'`)
  })

  it('应当在 React 组件中 import kebab-case 组件', async () => {
    const raw = unpluginWebComponents.raw({ tagPrefix: 'web-ui', packageName: '@mono/web-ui' }, { framework: 'vite' })

    const plugin = Array.isArray(raw) ? raw[0] : raw

    const transform = plugin.transform as (this: unknown, code: string, id: string) => Thenable<TransformResult>

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
    expect(result.code).toContain(`import { WebUiButton } from '@mono/web-ui/components/button'`)
    expect(result.code).toContain(`import { WebUiCard } from '@mono/web-ui/components/card'`)
  })
})
