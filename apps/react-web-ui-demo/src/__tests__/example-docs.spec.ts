import path from 'node:path'

import { runExampleDocsContractTests } from '@greypan/doc-demo-kit/testing'
import type { MetaNode } from '@greypan/md-to-meta'
import { visibleText } from '@greypan/md-to-meta/contract'
import { render, waitFor } from '@testing-library/react'
import { createElement } from 'react'
import { describe, expect, it } from 'vite-plus/test'

import { MetaComp } from '../components/meta'
import { loadMeta } from '../i18n/examples'

// 语料接线的 contract 断言（围栏同源 / 落盘文件 / 页面 ↔ 语料不互为孤儿）收拢在
// `@greypan/doc-demo-kit/testing`；这里只注入 React 侧的宿主事实。生成器那侧的判据在
// `@greypan/md-to-meta` 的单测里；跨 app 的另一半由 web-ui 包的 generated-parity.spec.ts 持有。
runExampleDocsContractTests({
  loadMeta,
  docsDir: path.resolve(import.meta.dirname, '../../../../packages/web-ui/docs'),
  generatedDir: path.resolve(import.meta.dirname, '../generated'),
  /** 本端只执行 tsx 围栏：它们才是真组件；其余围栏只是源码。 */
  execLanguage: 'tsx',
  componentsDir: path.resolve(import.meta.dirname, '../components'),
  pagesDir: path.resolve(import.meta.dirname, '../routes/components'),
  pageExt: '.tsx',
  framework: 'React',
  demoImportSample: `import Demo from '@/components/slider-demo'`,
  exampleDocImportSample: `import Doc from '@/components/example-doc'`
})

describe('通用 meta 渲染', () => {
  const sample = (content: string) =>
    createElement(
      'div',
      { className: 'mdm-markdown' },
      createElement(MetaComp, {
        nodes: [
          { label: 'h2', id: 'section-1', content: 'Samples' },
          { label: 'p', content: 'A <strong>paragraph</strong>' },
          { label: 'ul', children: [{ label: 'li', content: 'item' }] },
          {
            label: 'table',
            children: [
              {
                label: 'tr',
                children: [
                  { label: 'th', content: 'Name' },
                  { label: 'td', content: 'Value' }
                ]
              }
            ]
          },
          {
            label: 'codeblock',
            lang: 'tsx',
            path: './codeblock/abc.tsx',
            content: `<pre class="shiki mdm-code"><code><span class="line"><span class="line-number">1</span>${content}</span></code></pre>`,
            load: async () => ({ default: () => createElement('span', { 'data-demo': true }, 'demo') })
          }
        ] as MetaNode[]
      })
    )

  it('按 label 渲染标题、列表、表格与代码块预览', async () => {
    const { container } = render(sample('const answer = 42'))
    const heading = container.querySelector('h2')
    expect(heading?.className).toBe('mdm-heading')
    expect(heading?.id).toBe('section-1')
    expect(container.querySelector('ul li')?.textContent).toBe('item')
    expect(container.querySelector('table th')?.textContent).toBe('Name')
    expect(container.querySelector('[data-codeblock="tsx"]')).toBeTruthy()
    expect(visibleText(container.querySelector('[data-code] pre')?.innerHTML ?? '')).toBe('const answer = 42')
    await waitFor(() => expect(container.querySelector('[data-demo]')).toBeTruthy())
  })

  it('preview 关闭时只渲染源码，不挂运行示例', async () => {
    const { container } = render(
      createElement(MetaComp, {
        nodes: [{ label: 'codeblock', lang: 'tsx', content: '<pre class="shiki mdm-code"><code>demo</code></pre>' }]
      })
    )
    expect(container.querySelector('[data-codeblock-preview]')).toBeNull()
    expect(container.querySelector('[data-code] pre')).toBeTruthy()
  })

  it('相邻的 tsx 与 vue 围栏合成一张卡，工具条切换两份源码', async () => {
    const fence = (lang: string, content: string) => ({
      label: 'codeblock',
      lang,
      content: `<pre class="shiki mdm-code"><code><span class="line"><span class="line-number">1</span>${content}</span></code></pre>`
    })
    const { container } = render(
      createElement(MetaComp, {
        nodes: [fence('tsx', 'react source'), fence('vue', 'vue source')] as MetaNode[]
      })
    )
    expect(container.querySelectorAll('[data-codeblock]')).toHaveLength(1)
    const card = container.querySelector('[data-codeblock]')!
    expect(card.getAttribute('data-codeblock')).toBe('tsx')

    const vueTrigger = [...card.querySelectorAll('web-ui-segmented-trigger')].find(item => item.value === 'vue')
    await waitFor(() => expect(vueTrigger?.shadowRoot?.querySelector('[role="option"]')).toBeTruthy())
    vueTrigger!.shadowRoot!.querySelector<HTMLElement>('[role="option"]')!.click()

    await waitFor(() => expect(card.getAttribute('data-codeblock')).toBe('vue'))
    expect(visibleText(card.querySelector('[data-code] pre')?.innerHTML ?? '')).toBe('vue source')
  })

  it('代码不足一屏时不挂折叠，超过一屏才出现展开按钮', () => {
    const fenceOf = (lines: number) => ({
      label: 'codeblock',
      lang: 'tsx',
      content: `<pre class="shiki mdm-code"><code>${Array.from(
        { length: lines },
        (_, index) => `<span class="line"><span class="line-number">${index + 1}</span>line ${index + 1}</span>`
      ).join('\n')}</code></pre>`
    })
    const short = render(createElement(MetaComp, { nodes: [fenceOf(2)] as MetaNode[] }))
    expect(short.container.querySelector('web-ui-collapse')).toBeNull()
    expect(short.container.querySelector('[data-toggle-code]')).toBeNull()
    const tall = render(createElement(MetaComp, { nodes: [fenceOf(6)] as MetaNode[] }))
    expect(tall.container.querySelector('web-ui-collapse')).toBeTruthy()
    expect(tall.container.querySelector('[data-toggle-code]')).toBeTruthy()
  })
})
