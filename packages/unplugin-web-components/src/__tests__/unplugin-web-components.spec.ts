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

  it('应当在 Vue SFC 无 script 块时生成 <script setup> 块', async () => {
    const plugin = createPlugin()

    const transform = plugin.transform as unknown as (
      this: unknown,
      code: string,
      id: string
    ) => Thenable<TransformResult>

    const code = `
      <template>
        <web-ui-button />
      </template>
    `

    const result = await transform!.call({}, code, '/src/App.vue')
    if (!result || typeof result === 'string') {
      throw new Error('Unexpected transform result.')
    }
    expect(result.code).toContain('<script setup>')
    expect(result.code).toContain(`from '@greypan/web-ui/components/button'`)
    expect(result.code).toContain('</script>')
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

  it('函数体内的 use client 字符串不改变注入位置', async () => {
    const plugin = createPlugin()

    const transform = plugin.transform as unknown as (
      this: unknown,
      code: string,
      id: string
    ) => Thenable<TransformResult>

    const code = `
      function App() {
        'use client'
        return <web-ui-button />
      }
    `

    const result = await transform!.call({}, code, '/src/App.jsx')
    if (!result || typeof result === 'string') {
      throw new Error('Unexpected transform result.')
    }
    // 导入必须位于文件顶部，而非函数体内部
    expect(result.code.startsWith(`import { WebUiButton } from '@greypan/web-ui/components/button'`)).toBe(true)
  })

  it('在顶层 use client/use server 指令后注入，保留指令序言', async () => {
    const plugin = createPlugin()

    const transform = plugin.transform as unknown as (
      this: unknown,
      code: string,
      id: string
    ) => Thenable<TransformResult>

    const code = `'use client'\n'use server'\nexport default function Page() {\n  return <web-ui-button />\n}\n`

    const result = await transform!.call({}, code, '/src/Page.jsx')
    if (!result || typeof result === 'string') {
      throw new Error('Unexpected transform result.')
    }
    // 导入必须位于两个指令之后、真实代码之前
    const importIdx = result.code.indexOf(`import { WebUiButton }`)
    const clientIdx = result.code.indexOf(`'use client'`)
    const serverIdx = result.code.indexOf(`'use server'`)
    expect(clientIdx).toBeLessThan(serverIdx)
    expect(serverIdx).toBeLessThan(importIdx)
    expect(importIdx).toBeLessThan(result.code.indexOf('export default function Page'))
  })

  it('在任意顶层字符串指令（含 use strict）后注入，保留完整指令序言', async () => {
    const plugin = createPlugin()

    const transform = plugin.transform as unknown as (
      this: unknown,
      code: string,
      id: string
    ) => Thenable<TransformResult>

    const code = `'use strict';\n'use client';\nexport default function Page() {\n  return <web-ui-button />\n}\n`

    const result = await transform!.call({}, code, '/src/Page.jsx')
    if (!result || typeof result === 'string') {
      throw new Error('Unexpected transform result.')
    }
    const importIdx = result.code.indexOf(`import { WebUiButton }`)
    const strictIdx = result.code.indexOf(`'use strict'`)
    const clientIdx = result.code.indexOf(`'use client'`)
    expect(strictIdx).toBeLessThan(clientIdx)
    expect(clientIdx).toBeLessThan(importIdx)
    expect(importIdx).toBeLessThan(result.code.indexOf('export default function Page'))
  })

  it('字符串表达式（非独立指令）不参与 prologue，导入加在文件最前', async () => {
    const plugin = createPlugin()

    const transform = plugin.transform as unknown as (
      this: unknown,
      code: string,
      id: string
    ) => Thenable<TransformResult>

    const code = `'a' + 'b'\nconst Page = () => <web-ui-button />`

    const result = await transform!.call({}, code, '/src/Page.jsx')
    if (!result || typeof result === 'string') {
      throw new Error('Unexpected transform result.')
    }
    expect(result.code.startsWith(`import { WebUiButton } from '@greypan/web-ui/components/button'`)).toBe(true)
  })

  it('顶层字符串二元表达式不参与 prologue，导入加在文件最前', async () => {
    const plugin = createPlugin()

    const transform = plugin.transform as unknown as (
      this: unknown,
      code: string,
      id: string
    ) => Thenable<TransformResult>

    const code = `'x' in value\nconst Page = () => <web-ui-button />`

    const result = await transform!.call({}, code, '/src/Page.jsx')
    if (!result || typeof result === 'string') {
      throw new Error('Unexpected transform result.')
    }
    expect(result.code.startsWith(`import { WebUiButton } from '@greypan/web-ui/components/button'`)).toBe(true)
  })

  it('带 src 的普通 <script> 仍可新增内联 <script setup>', async () => {
    const plugin = createPlugin()

    const transform = plugin.transform as unknown as (
      this: unknown,
      code: string,
      id: string
    ) => Thenable<TransformResult>

    const code = `
      <template>
        <web-ui-button />
      </template>
      <script src="./logic.ts"></script>
    `

    const result = await transform!.call({}, code, '/src/App.vue')
    if (!result || typeof result === 'string') {
      throw new Error('Unexpected transform result.')
    }
    expect(result.code).toContain('<script setup>')
    expect(result.code).toContain(`from '@greypan/web-ui/components/button'`)
    expect(result.code).toContain('<script src="./logic.ts"></script>')
  })

  it('带 src 的 <script setup> 跳过转换', async () => {
    const plugin = createPlugin()

    const transform = plugin.transform as unknown as (
      this: unknown,
      code: string,
      id: string
    ) => Thenable<TransformResult>

    const code = `
      <script setup src="./setup.ts"></script>
      <template>
        <web-ui-button />
      </template>
    `

    const result = await transform!.call({}, code, '/src/App.vue')
    if (!result || typeof result === 'string') {
      throw new Error('Unexpected transform result.')
    }
    expect(result.code).toBe(code)
  })

  it('向不含 src 的普通 <script> 注入', async () => {
    const plugin = createPlugin()

    const transform = plugin.transform as unknown as (
      this: unknown,
      code: string,
      id: string
    ) => Thenable<TransformResult>

    const code = `
      <script>
      export default { name: 'Foo' }
      </script>
      <template>
        <web-ui-button />
      </template>
    `

    const result = await transform!.call({}, code, '/src/App.vue')
    if (!result || typeof result === 'string') {
      throw new Error('Unexpected transform result.')
    }
    expect(result.code).toContain(`<script>\nimport { WebUiButton } from '@greypan/web-ui/components/button'`)
  })
})

describe('unplugin-web-components Vite HTML 入口注入', () => {
  interface HtmlTagShape {
    tag: string
    attrs: Record<string, unknown>
    children: string
    injectTo: string
  }

  function createHtmlHook(options: { sideEffects?: boolean; withStyle?: string } = {}) {
    const plugin = vitePlugin({
      tagPrefix: 'web-ui',
      packageName: '@greypan/web-ui',
      ...options
    })
    const single = Array.isArray(plugin) ? plugin[0] : plugin
    const hook = (
      single as unknown as {
        transformIndexHtml: { order: string; handler: (html: string) => unknown }
      }
    ).transformIndexHtml
    expect(hook).toBeDefined()
    return hook
  }

  it('从 HTML 入口识别 kebab-case 组件并注入模块脚本', async () => {
    const { order, handler } = createHtmlHook()
    expect(order).toBe('pre')

    const html = `<!doctype html>
<html>
  <head>
    <title>App</title>
  </head>
  <body>
    <web-ui-button>Click me</web-ui-button>
    <web-ui-card />
  </body>
</html>`

    const result = await handler(html)
    expect(Array.isArray(result)).toBe(true)
    const tags = result as HtmlTagShape[]
    expect(tags).toHaveLength(1)
    expect(tags[0].tag).toBe('script')
    expect(tags[0].attrs).toEqual({ type: 'module' })
    expect(tags[0].injectTo).toBe('head-prepend')
    expect(tags[0].children).toContain(`import { WebUiButton } from '@greypan/web-ui/components/button'`)
    expect(tags[0].children).toContain(`import { WebUiCard } from '@greypan/web-ui/components/card'`)
  })

  it('重复标签按组件去重，只生成一次导入', async () => {
    const { handler } = createHtmlHook()

    const result = await handler(`
      <web-ui-button>1</web-ui-button>
      <web-ui-button>2</web-ui-button>
      <web-ui-card></web-ui-card>
    `)
    const tags = result as HtmlTagShape[]
    const children = tags[0].children
    expect(children.match(/@greypan\/web-ui\/components\/button/g)).toHaveLength(1)
    expect(children.match(/@greypan\/web-ui\/components\/card/g)).toHaveLength(1)
  })

  it('sideEffects 模式生成副作用导入', async () => {
    const { handler } = createHtmlHook({ sideEffects: true })

    const result = await handler(`<web-ui-button></web-ui-button>`)
    const tags = result as HtmlTagShape[]
    expect(tags[0].children).toBe(`import '@greypan/web-ui/components/button';`)
  })

  it('withStyle 追加样式导入', async () => {
    const { handler } = createHtmlHook({ withStyle: 'style.css' })

    const result = await handler(`<web-ui-button></web-ui-button>`)
    const tags = result as HtmlTagShape[]
    expect(tags[0].children).toContain(`import { WebUiButton } from '@greypan/web-ui/components/button'`)
    expect(tags[0].children).toContain(`import '@greypan/web-ui/components/button/style.css';`)
  })

  it('无组件标签时原样返回 HTML', async () => {
    const { handler } = createHtmlHook()

    const html = `<!doctype html>
<html>
  <head><title>App</title></head>
  <body><main>empty</main></body>
</html>`
    expect(await handler(html)).toBe(html)
  })

  it('空 HTML 原样返回', async () => {
    const { handler } = createHtmlHook()

    expect(await handler('')).toBe('')
  })

  it('注释中的伪标签不产生注入', async () => {
    const { handler } = createHtmlHook()

    const html = `<!-- <web-ui-button>fake</web-ui-button> -->
<html>
  <body>ok</body>
</html>`
    expect(await handler(html)).toBe(html)
  })

  it('script/style 原始文本中的伪标签不产生注入', async () => {
    const { handler } = createHtmlHook()

    const html = `<html>
  <head>
    <script>const tpl = '<web-ui-button>';</script>
    <style>.x::after { content: '<web-ui-button>'; }</style>
  </head>
  <body></body>
</html>`
    expect(await handler(html)).toBe(html)
  })

  it('PascalCase 不作为可注册 Custom Element 识别', async () => {
    const { handler } = createHtmlHook()

    const html = `<html>
  <body><WebUiButton /></body>
</html>`
    expect(await handler(html)).toBe(html)
  })

  it('大写 kebab 标签被识别并归一到小写组件名', async () => {
    const { handler } = createHtmlHook()

    const result = await handler(`<WEB-UI-BUTTON>ok</WEB-UI-BUTTON>`)
    const tags = result as HtmlTagShape[]
    expect(tags[0].children).toContain(`from '@greypan/web-ui/components/button'`)
  })

  it('混合大小写 kebab 标签归一到小写组件名', async () => {
    const { handler } = createHtmlHook()

    const result = await handler(`<web-ui-Button>ok</web-ui-Button>`)
    const tags = result as HtmlTagShape[]
    expect(tags[0].children).toContain(`from '@greypan/web-ui/components/button'`)
    expect(tags[0].children).not.toContain('components/Button')
  })

  it('字符数据/原始文本区域（title/textarea/iframe）中的伪标签不产生注入', async () => {
    const { handler } = createHtmlHook()

    const html = `<!doctype html>
<html>
  <head>
    <title><web-ui-button>App</web-ui-button></title>
  </head>
  <body>
    <textarea><web-ui-card></web-ui-card></textarea>
    <iframe><web-ui-dialog></web-ui-dialog></iframe>
  </body>
</html>`
    expect(await handler(html)).toBe(html)
  })

  it('属性值中的伪标签不产生注入', async () => {
    const { handler } = createHtmlHook()

    const html = `<html>
  <body>
    <div data-template="<web-ui-button>"></div>
    <div data-single='<web-ui-card>'></div>
  </body>
</html>`
    expect(await handler(html)).toBe(html)
  })

  it('等号两侧带空白的属性值中的伪标签不产生注入', async () => {
    const { handler } = createHtmlHook()

    const html = `<html>
  <body>
    <div data-template = "<web-ui-button>"></div>
    <div data-single = '<web-ui-card>'></div>
  </body>
</html>`
    expect(await handler(html)).toBe(html)
  })

  it('普通文本中的等号和引号不遮蔽真实标签', async () => {
    const { handler } = createHtmlHook()

    const result = await handler('<div>template = "<web-ui-button>"</div>')
    const tags = result as HtmlTagShape[]
    expect(tags[0].children).toContain(`from '@greypan/web-ui/components/button'`)
  })

  it('属性值中的伪 <script> 字面量不吞掉后续真实标签', async () => {
    const { handler } = createHtmlHook()

    const html = `<div data-template="<script>"></div><web-ui-button>ok</web-ui-button>`
    const result = await handler(html)
    const tags = result as HtmlTagShape[]
    expect(tags[0].children).toContain(`from '@greypan/web-ui/components/button'`)
  })

  it('未闭合注释匹配到 EOF，不产生注入', async () => {
    const { handler } = createHtmlHook()

    const html = `<!doctype html>
<html>
  <!-- <web-ui-button> unclosed comment
  <body>ok</body>
</html>`
    expect(await handler(html)).toBe(html)
  })

  it('未闭合 script/textarea 匹配到 EOF，不产生注入', async () => {
    const { handler } = createHtmlHook()

    const html = `<html>
  <head>
    <script>const tpl = '<web-ui-card>';
  </head>
  <body>
    <textarea><web-ui-dialog>
  </body>
</html>`
    expect(await handler(html)).toBe(html)
  })

  it('template 内容仍参与识别', async () => {
    const { handler } = createHtmlHook()

    const result = await handler(`<html>
  <body>
    <template><web-ui-button></web-ui-button></template>
  </body>
</html>`)
    const tags = result as HtmlTagShape[]
    expect(tags[0].children).toContain(`import { WebUiButton } from '@greypan/web-ui/components/button'`)
  })
})
