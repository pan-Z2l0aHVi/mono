import { describe, expect, it } from 'vite-plus/test'

import { runHtmlHook, runHtmlInjection, runTransformedCode, runTransform, runTransformRaw } from './harness'

// 这个插件的可观察行为只有两件：给用到的组件生成正确的 import 语句，以及把 import 放到
// 不会破坏模块语义的位置（Vue 的 script 块、React 的 directive prologue 之后）。
// 断言一律落在「最终产出的代码里有没有这行 import、有没有被放到非法位置」，
// 不断言插件内部调用了哪个 hook 或匹配过程。

describe('组件 import 生成', () => {
  it.each([
    { name: 'Vue', id: '/src/App.vue', wrap: (body: string) => `<template>\n${body}\n</template>` },
    { name: 'React JSX', id: '/src/App.jsx', wrap: (body: string) => `const App = () => <>\n${body}\n</>` },
    { name: 'React TSX', id: '/src/App.tsx', wrap: (body: string) => `const App = () => <>\n${body}\n</>` }
  ])('$name 中每个用到的组件各生成一条 import', async ({ id, wrap }) => {
    const code = await runTransformedCode({
      code: wrap('  <web-ui-button />\n  <web-ui-card />'),
      id
    })

    expect(code).toContain(`import { WebUiButton } from '@greypan/web-ui/components/button'`)
    expect(code).toContain(`import { WebUiCard } from '@greypan/web-ui/components/card'`)
  })

  it('同一个组件在源码中出现多次只生成一条 import', async () => {
    const code = await runTransformedCode({
      code: `<template>
        <web-ui-button /><web-ui-button />
        <WebUiButton /><web-ui-button />
        <web-ui-card />
      </template>`,
      id: '/src/App.vue'
    })

    expect(code.match(/components\/button/g)).toHaveLength(1)
    expect(code.match(/components\/card/g)).toHaveLength(1)
  })

  it.each([
    { name: 'kebab-case', tag: 'web-ui-button' },
    { name: 'PascalCase', tag: 'WebUiButton' },
    { name: '单字母后缀的 PascalCase', tag: 'WebUiA' }
  ])('$name 标签都映射到同名组件', async ({ tag }) => {
    const code = await runTransformedCode({
      code: `<template><${tag} /></template>`,
      id: '/src/App.vue'
    })

    const dir = tag === 'WebUiA' ? 'a' : 'button'
    expect(code).toContain(`import { WebUi${dir === 'a' ? 'A' : 'Button'} } from '@greypan/web-ui/components/${dir}'`)
  })

  it('模板里的混合大小写 kebab 标签归一到小写组件目录', async () => {
    // Vue 模板的标签名大小写不敏感：导入路径必须是小写目录，否则在大小写敏感的
    // 文件系统上解析不到模块
    const code = await runTransformedCode({
      code: '<template><web-ui-Button /></template>',
      id: '/src/App.vue'
    })

    expect(code).toContain(`from '@greypan/web-ui/components/button'`)
    expect(code).not.toContain('components/Button')
  })

  it('packageName 与 tagPrefix 选项改变最终产出的导入路径', async () => {
    const code = await runTransformedCode({
      options: { packageName: '@acme/ui', tagPrefix: 'acme' },
      code: `<template><acme-button /></template>`,
      id: '/src/App.vue'
    })

    expect(code).toContain(`import { AcmeButton } from '@acme/ui/components/button'`)
    expect(code).not.toContain('@greypan/web-ui')
  })

  it('tagPrefix 的大小写与分隔符被归一后再匹配', async () => {
    // kebabCase/pascalCase 先归一前缀，元字符也随之被剥掉，所以 `<web-ui.button>`
    // 与 `<web-ui-button>` 归一到同一个前缀；真正的输入形态是 `WebUI` 这类驼峰写法。
    const code = await runTransformedCode({
      options: { tagPrefix: 'WebUI' },
      code: `<template><web-ui-button /></template>`,
      id: '/src/App.vue'
    })

    expect(code).toContain(`import { WebUiButton } from '@greypan/web-ui/components/button'`)
  })

  it('sideEffects 选项切换为副作用导入', async () => {
    const code = await runTransformedCode({
      options: { sideEffects: true },
      code: `<template><web-ui-button /></template>`,
      id: '/src/App.vue'
    })

    expect(code).toContain(`import '@greypan/web-ui/components/button';`)
    expect(code).not.toContain('import { WebUiButton }')
  })

  it('withStyle 为每个组件追加其样式文件导入', async () => {
    const code = await runTransformedCode({
      options: { withStyle: 'style.css' },
      code: `<template><web-ui-button /></template>`,
      id: '/src/App.vue'
    })

    expect(code).toContain(`import { WebUiButton } from '@greypan/web-ui/components/button'`)
    expect(code).toContain(`import '@greypan/web-ui/components/button/style.css';`)
  })

  it.each([
    { name: '没有组件标签', code: '<template><main /></template>' },
    { name: '只有别的包的标签', code: '<template><other-ui-button /></template>' },
    { name: 'tagPrefix 出现在普通文本里', code: '<template>web-ui-button</template>' }
  ])('$name 时不改写源码', async ({ code: input }) => {
    expect(await runTransformRaw({ code: input, id: '/src/App.vue' })).toBeUndefined()
  })

  it('模块源码里全大写的 kebab 标签也生成导入', async () => {
    const result = await runTransform({
      code: `
      <template>
        <WEB-UI-BUTTON />
        <WEB-UI-CARD />
      </template>
    `,
      id: '/src/App.vue'
    })

    expect(result.code).toContain(`import { WebUiButton } from '@greypan/web-ui/components/button'`)
    expect(result.code).toContain(`import { WebUiCard } from '@greypan/web-ui/components/card'`)
  })

  it('模块源码里混合大小写的 kebab 标签归一到小写组件目录', async () => {
    const result = await runTransform({
      code: `
      <template>
        <web-ui-Button />
      </template>
    `,
      id: '/src/App.vue'
    })

    expect(result.code).toContain(`import { WebUiButton } from '@greypan/web-ui/components/button'`)
    expect(result.code).not.toContain('components/Button')
  })

  it('模块源码里全大写的 kebab 标签在 React 中也生成导入', async () => {
    const result = await runTransform({
      code: `
      const App = () => <WEB-UI-BUTTON />
    `,
      id: '/src/App.jsx'
    })

    expect(result.code).toContain(`import { WebUiButton } from '@greypan/web-ui/components/button'`)
  })

  // 上面三条来自 ba26659f（连同 factory.ts 的预筛修复）。这里补它没枚举的大小写变体：
  // 首字母大写同样被 HTML/Vue 的大小写不敏感规则覆盖，但既不在那三条的输入里，也不在
  // HTML 入口那组里——只有模块源码这一条路径会走到它。
  it('首字母大写的 kebab 标签也生成导入', async () => {
    const code = await runTransformedCode({
      code: '<template><Web-ui-Button /></template>',
      id: '/src/App.vue'
    })

    expect(code).toContain(`from '@greypan/web-ui/components/button'`)
  })

  it.each([
    { name: 'CSS 文件', id: '/src/app.css' },
    { name: '普通 TS 模块', id: '/src/app.ts' },
    { name: 'node_modules 依赖', id: '/repo/node_modules/@acme/ui/index.jsx' }
  ])('$name 不经过组件扫描', async ({ id }) => {
    expect(await runTransformRaw({ code: `<web-ui-button />`, id })).toBeUndefined()
  })
})

describe('Vue SFC 注入位置', () => {
  it('已有 <script setup> 时注入到该块内', async () => {
    const code = await runTransformedCode({
      code: `<script setup>\nconst a = 1\n</script>\n<template><web-ui-button /></template>`,
      id: '/src/App.vue'
    })

    // 断言注入点：import 落在 <script setup> 开标签之后、原代码之前
    expect(code.indexOf('<script setup>')).toBeLessThan(code.indexOf('import { WebUiButton }'))
    expect(code.indexOf('import { WebUiButton }')).toBeLessThan(code.indexOf('const a = 1'))
    expect(code.indexOf('const a = 1')).toBeLessThan(code.indexOf('</script>'))
  })

  it('只有普通 <script>（options API）时注入到该块内', async () => {
    const code = await runTransformedCode({
      code: `<script>\nexport default { name: 'Foo' }\n</script>\n<template><web-ui-button /></template>`,
      id: '/src/App.vue'
    })

    expect(code.indexOf('<script>')).toBeLessThan(code.indexOf('import { WebUiButton }'))
    expect(code.indexOf('import { WebUiButton }')).toBeLessThan(code.indexOf('export default'))
  })

  it('带 src 的普通 <script> 无法承载内联导入时新增 <script setup>', async () => {
    const code = await runTransformedCode({
      code: `<template><web-ui-button /></template>\n<script src="./logic.ts"></script>`,
      id: '/src/App.vue'
    })

    expect(code.startsWith('<script setup>')).toBe(true)
    expect(code).toContain(`from '@greypan/web-ui/components/button'`)
    // 外部脚本块原样保留，没有被改写成内联块
    expect(code).toContain('<script src="./logic.ts"></script>')
  })

  it('无 script 块时新增 <script setup>', async () => {
    const code = await runTransformedCode({
      code: '<template><web-ui-button /></template>',
      id: '/src/App.vue'
    })

    expect(code.startsWith('<script setup>')).toBe(true)
    expect(code).toContain(`from '@greypan/web-ui/components/button'`)
    expect(code).toContain('</script>')
  })

  it('带 src 的 <script setup> 无法承载内联导入时原样放过', async () => {
    const input = `<script setup src="./setup.ts"></script>\n<template><web-ui-button /></template>`
    const result = await runTransformRaw({ code: input, id: '/src/App.vue' })

    expect(result).toEqual({ code: input })
  })

  it('前置的普通 <script> 不会让后续 <script setup> 被跳过', async () => {
    const code = await runTransformedCode({
      code: `<script data-x="setup">export default {}</script>\n<script setup>const a = 1</script>\n<template><web-ui-button /></template>`,
      id: '/src/App.vue'
    })

    // setup 出现在属性值里不算独立属性；导入应落进真正的 <script setup> 块
    expect(code.indexOf('export default {}')).toBeLessThan(code.indexOf('<script setup>'))
    expect(code.indexOf('<script setup>')).toBeLessThan(code.indexOf('import { WebUiButton }'))
    expect(code.indexOf('import { WebUiButton }')).toBeLessThan(code.indexOf('const a = 1'))
  })
})

describe('React 导入位置与 directive prologue', () => {
  it('无 prologue 时导入置于文件最前', async () => {
    const code = await runTransformedCode({
      code: `export default function Page() {\n  return <web-ui-button />\n}`,
      id: '/src/Page.jsx'
    })

    expect(code.startsWith(`import { WebUiButton } from '@greypan/web-ui/components/button'`)).toBe(true)
  })

  it.each([
    {
      name: 'use client + use server',
      code: `'use client'\n'use server'\nexport default function Page() {\n  return <web-ui-button />\n}`
    },
    {
      name: 'use strict + use client',
      code: `'use strict'\n'use client'\nexport default function Page() {\n  return <web-ui-button />\n}`
    },
    {
      name: '多条相同指令',
      code: `'use client'\n'use client'\nexport default function Page() {\n  return <web-ui-button />\n}`
    }
  ])('$name 的序言整体保留在导入之前', async ({ code: input }) => {
    const code = await runTransformedCode({ code: input, id: '/src/Page.jsx' })

    // 断言的是「序言整体」的位置：最后一条指令仍早于导入，导入早于真实代码
    const lastDirectiveIdx = code.lastIndexOf("'use")
    const importIdx = code.indexOf('import { WebUiButton }')

    expect(lastDirectiveIdx).toBeLessThan(importIdx)
    expect(importIdx).toBeLessThan(code.indexOf('export default function Page'))
    expect(code.startsWith("'use")).toBe(true)
  })

  it.each([
    { name: '函数体内的 use client', code: `function App() {\n  'use client'\n  return <web-ui-button />\n}` },
    { name: '字符串二元表达式', code: `'a' + 'b'\nconst Page = () => <web-ui-button />` },
    { name: 'in 运算符', code: `'x' in value\nconst Page = () => <web-ui-button />` },
    { name: 'instanceof 运算符', code: `'x' instanceof value\nconst Page = () => <web-ui-button />` }
  ])('$name 不计入 prologue，导入置于文件最前', async ({ code: input }) => {
    const code = await runTransformedCode({ code: input, id: '/src/Page.jsx' })

    expect(code.startsWith(`import { WebUiButton } from '@greypan/web-ui/components/button'`)).toBe(true)
  })

  it('prologue 前的注释不阻断导入位置计算', async () => {
    const code = await runTransformedCode({
      code: `// leading comment\n'use client'\nexport default function Page() {\n  return <web-ui-button />\n}`,
      id: '/src/Page.jsx'
    })

    expect(code.indexOf('// leading comment')).toBeLessThan(code.indexOf("'use client'"))
    expect(code.indexOf("'use client'")).toBeLessThan(code.indexOf('import { WebUiButton }'))
    expect(code.indexOf('import { WebUiButton }')).toBeLessThan(code.indexOf('export default function Page'))
  })
})

describe('Vite HTML 入口注入', () => {
  it('注入了 head 顶部的模块脚本', async () => {
    const tag = await runHtmlInjection({
      html: `<!doctype html>
<html>
  <head><title>App</title></head>
  <body><web-ui-button>Click</web-ui-button><web-ui-card /></body>
</html>`
    })

    expect(tag.tag).toBe('script')
    expect(tag.attrs).toEqual({ type: 'module' })
    expect(tag.injectTo).toBe('head-prepend')
    expect(tag.children).toContain(`import { WebUiButton } from '@greypan/web-ui/components/button'`)
    expect(tag.children).toContain(`import { WebUiCard } from '@greypan/web-ui/components/card'`)
  })

  it('重复标签按组件去重', async () => {
    const tag = await runHtmlInjection({
      html: '<web-ui-button>1</web-ui-button><web-ui-button>2</web-ui-button><web-ui-card></web-ui-card>'
    })

    expect(tag.children.match(/components\/button/g)).toHaveLength(1)
    expect(tag.children.match(/components\/card/g)).toHaveLength(1)
  })

  it.each([
    {
      name: '大写',
      html: '<WEB-UI-BUTTON>ok</WEB-UI-BUTTON>',
      forbidden: 'components/Button'
    },
    {
      name: '混合大小写',
      html: '<web-ui-Button>ok</web-ui-Button>',
      forbidden: 'components/Button'
    }
  ])('$name 标签归一到小写组件名', async ({ html, forbidden }) => {
    const tag = await runHtmlInjection({ html })

    expect(tag.children).toContain(`from '@greypan/web-ui/components/button'`)
    expect(tag.children).not.toContain(forbidden)
  })

  it.each([
    { name: 'PascalCase 不是合法的 custom element', html: '<WebUiButton />' },
    { name: '注释中的伪标签', html: '<!-- <web-ui-button>fake</web-ui-button> --><html><body>ok</body></html>' },
    {
      name: 'script/style 原始文本中的伪标签',
      html: `<html><head><script>const tpl = '<web-ui-button>';</script><style>.x::after { content: '<web-ui-card>'; }</style></head><body></body></html>`
    },
    {
      name: 'title/textarea/iframe 中的伪标签',
      html: '<html><head><title><web-ui-button>App</web-ui-button></title></head><body><textarea><web-ui-card></web-ui-card></textarea><iframe><web-ui-dialog></web-ui-dialog></iframe></body></html>'
    },
    {
      name: '双引号属性值中的伪标签',
      html: '<div data-template="<web-ui-button>"></div><div data-single=\'<web-ui-card>\'></div>'
    },
    {
      name: '等号两侧带空白的属性值中的伪标签',
      html: '<div data-template = "<web-ui-button>"></div><div data-single = \'<web-ui-card>\'></div>'
    },
    {
      name: '未闭合注释',
      html: '<!doctype html>\n<html>\n  <!-- <web-ui-button> unclosed\n  <body>ok</body>\n</html>'
    },
    {
      name: '未闭合的原始文本区域',
      html: "<html><head><script>const tpl = '<web-ui-card>';\n</head><body><textarea><web-ui-dialog>\n</body></html>"
    },
    { name: '空 HTML', html: '' },
    {
      name: '没有组件标签的页面',
      html: '<!doctype html><html><head><title>App</title></head><body><main>empty</main></body></html>'
    }
  ])('$name 时原样返回 HTML，不注入脚本', async ({ html }) => {
    expect(await runHtmlHook({ html })).toBe(html)
  })

  it.each([
    {
      name: '普通文本中的等号与引号不遮蔽真实标签',
      html: '<div>template = "<web-ui-button>"</div>'
    },
    {
      name: '属性值中的伪 <script> 字面量不吞掉后续真实标签',
      html: '<div data-template="<script>"></div><web-ui-button>ok</web-ui-button>'
    },
    {
      name: '<template> 内容中的真实标签',
      html: '<html><body><template><web-ui-button></web-ui-button></template></body></html>'
    }
  ])('$name 仍被识别并注入', async ({ html }) => {
    const tag = await runHtmlInjection({ html })

    expect(tag.children).toContain(`import { WebUiButton } from '@greypan/web-ui/components/button'`)
  })

  it('sideEffects 与 withStyle 选项影响注入的脚本内容', async () => {
    const sideEffectTag = await runHtmlInjection({
      options: { sideEffects: true },
      html: '<web-ui-button></web-ui-button>'
    })
    expect(sideEffectTag.children).toBe(`import '@greypan/web-ui/components/button';`)

    const styleTag = await runHtmlInjection({
      options: { withStyle: 'style.css' },
      html: '<web-ui-button></web-ui-button>'
    })
    expect(styleTag.children).toContain(`import { WebUiButton } from '@greypan/web-ui/components/button'`)
    expect(styleTag.children).toContain(`import '@greypan/web-ui/components/button/style.css';`)
  })
})
