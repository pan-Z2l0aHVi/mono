import path from 'node:path'

import { fenceGroupVariants, groupedMetaNodes } from '@greypan/doc-demo-kit'
import { runExampleDocsContractTests } from '@greypan/doc-demo-kit/testing'
import type { MetaNode } from '@greypan/md-to-meta'
import { visibleText } from '@greypan/md-to-meta/contract'
import { render, waitFor } from '@testing-library/react'
import { createElement } from 'react'
import { describe, expect, it, vi } from 'vite-plus/test'

import Codeblock from '../components/codeblock'
import { MetaComp } from '../components/meta'
import readme from '../generated/readme/README.CN.meta'
import readmeEn from '../generated/readme/README.meta'
import { loadMeta } from '../i18n/examples'

const INSTALL_COMMANDS = fenceGroupVariants(
  groupedMetaNodes(readme).find(group => group.length > 1 && group[0]?.lang === 'npm')!
)!

// 语料接线的轻量 contract 断言（围栏同源 / 落盘文件）收拢在 `@greypan/doc-demo-kit/testing`；
// 这里只注入 React 侧的宿主事实。生成器判据在 `@greypan/md-to-meta` 单测里。
runExampleDocsContractTests({
  loadMeta,
  docsDir: path.resolve(import.meta.dirname, '../../../../packages/web-ui/docs'),
  generatedDir: path.resolve(import.meta.dirname, '../generated'),
  /** 本端只执行 tsx 围栏：它们才是真组件；其余围栏只是源码。 */
  execLanguage: 'tsx'
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

  it('中英文 README 的安装选项和命令一致', () => {
    const readCommands = (nodes: typeof readme) =>
      fenceGroupVariants(groupedMetaNodes(nodes).find(group => group.length > 1 && group[0]?.lang === 'npm')!)!.map(
        item => [item.label, visibleText(item.node.content ?? '')]
      )
    expect(readCommands(readmeEn)).toEqual(readCommands(readme))
  })

  it('README 的相邻安装围栏自动合并为一个切换卡片', () => {
    const view = render(createElement(MetaComp, { nodes: readme, preview: false, variantLabel: '包管理器' }))
    const selector = view.container.querySelector('web-ui-segmented[aria-label="包管理器"]')
    expect(selector?.querySelectorAll('web-ui-segmented-trigger')).toHaveLength(4)
    expect(selector?.closest('article')?.querySelector('[data-code] pre')?.textContent).toContain(
      'npm install @greypan/web-ui'
    )
    view.unmount()
  })

  it('安装命令随包管理器切换，复制当前命令而不包含行号', async () => {
    const previous = Object.getOwnPropertyDescriptor(navigator, 'clipboard')
    const writeText = vi.fn<(text: string) => Promise<void>>().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    const view = render(
      createElement(Codeblock, { nodes: [], preview: false, variants: INSTALL_COMMANDS, switchLabel: '包管理器' })
    )
    try {
      const commands = [
        ['npm', 'npm install @greypan/web-ui'],
        ['pnpm', 'pnpm add @greypan/web-ui'],
        ['bun', 'bun add @greypan/web-ui'],
        ['yarn', 'yarn add @greypan/web-ui']
      ] as const
      for (const [manager, command] of commands) {
        const trigger = [
          ...view.container.querySelectorAll<HTMLElement & { value?: string }>('web-ui-segmented-trigger')
        ].find(item => item.value === manager)
        await waitFor(() => expect(trigger?.shadowRoot?.querySelector('[role="option"]')).toBeTruthy())
        trigger!.shadowRoot!.querySelector<HTMLElement>('[role="option"]')!.click()
        await waitFor(() =>
          expect(visibleText(view.container.querySelector('[data-code] pre')!.innerHTML)).toBe(command)
        )
        ;(view.container.querySelector('web-ui-button[data-copy]') as HTMLElement).click()
        await waitFor(() => expect(writeText).toHaveBeenLastCalledWith(command))
      }
    } finally {
      view.unmount()
      if (previous) Object.defineProperty(navigator, 'clipboard', previous)
      else Reflect.deleteProperty(navigator, 'clipboard')
    }
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

    const vueTrigger = [...card.querySelectorAll<HTMLElement & { value?: string }>('web-ui-segmented-trigger')].find(
      item => item.value === 'vue'
    )
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
