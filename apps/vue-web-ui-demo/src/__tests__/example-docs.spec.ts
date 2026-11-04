import path from 'node:path'

import { runExampleDocsContractTests } from '@greypan/doc-demo-kit/testing'
import type { MetaNode } from '@greypan/md-to-meta'
import { visibleText } from '@greypan/md-to-meta/contract'
import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it } from 'vite-plus/test'
import { defineComponent, h } from 'vue'

import { MetaComp } from '../components/meta'
import { loadMeta } from '../i18n/examples'

// 语料接线的 contract 断言（围栏同源 / 落盘文件 / 页面 ↔ 语料不互为孤儿）收拢在
// `@greypan/doc-demo-kit/testing`；这里只注入 Vue 侧的宿主事实。生成器那侧的判据在
// `@greypan/md-to-meta` 的单测里；跨 app 的另一半由 web-ui 包的 generated-parity.spec.ts 持有。
runExampleDocsContractTests({
  loadMeta,
  docsDir: path.resolve(import.meta.dirname, '../../../../packages/web-ui/docs'),
  generatedDir: path.resolve(import.meta.dirname, '../generated'),
  /** 本端只执行 vue 围栏：它们才是真组件；其余围栏只是源码。 */
  execLanguage: 'vue',
  componentsDir: path.resolve(import.meta.dirname, '../components'),
  pagesDir: path.resolve(import.meta.dirname, '../pages/components'),
  pageExt: '.vue',
  framework: 'Vue',
  demoImportSample: `import Demo from '@/components/slider-demo/index.vue'`,
  exampleDocImportSample: `import Doc from '@/components/example-doc/index.vue'`
})

describe('通用 meta 渲染', () => {
  const sampleNodes = (content: string) =>
    [
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
        lang: 'vue',
        path: './codeblock/abc.vue',
        content: `<pre class="shiki mdm-code"><code><span class="line"><span class="line-number">1</span>${content}</span></code></pre>`,
        load: async () => ({ default: defineComponent({ render: () => h('span', { 'data-demo': true }, 'demo') }) })
      }
    ] as MetaNode[]

  it('按 label 渲染标题、列表、表格与代码块预览', async () => {
    const wrapper = mount(
      defineComponent({
        render: () => h('div', { class: 'mdm-markdown' }, [h(MetaComp, { nodes: sampleNodes('const answer = 42') })])
      })
    )
    expect(wrapper.find('h2').classes()).toEqual(['mdm-heading'])
    expect(wrapper.find('h2').attributes('id')).toBe('section-1')
    expect(wrapper.find('ul li').text()).toBe('item')
    expect(wrapper.find('table th').text()).toBe('Name')
    expect(wrapper.find('[data-codeblock="vue"]').exists()).toBe(true)
    expect(visibleText(wrapper.find('[data-code] pre').element.innerHTML)).toBe('const answer = 42')
    await flushPromises()
    expect(wrapper.find('[data-demo]').exists()).toBe(true)
  })

  it('preview 关闭时只渲染源码，不挂运行示例', () => {
    const wrapper = mount(MetaComp, {
      props: {
        preview: false,
        nodes: [{ label: 'codeblock', lang: 'vue', content: '<pre class="shiki mdm-code"><code>demo</code></pre>' }]
      }
    })
    expect(wrapper.find('[data-codeblock-preview]').exists()).toBe(false)
    expect(wrapper.find('[data-code] pre').exists()).toBe(true)
  })

  it('相邻的 tsx 与 vue 围栏合成一张卡，工具条切换两份源码', async () => {
    const fence = (lang: string, content: string) => ({
      label: 'codeblock',
      lang,
      content: `<pre class="shiki mdm-code"><code><span class="line"><span class="line-number">1</span>${content}</span></code></pre>`
    })
    // 自定义元素只在进入文档后升级，而 `mount` 默认渲染到游离节点：不挂到 body 就永远没有
    // shadowRoot，切换器里的可点击项也不存在。
    const wrapper = mount(MetaComp, {
      props: { nodes: [fence('tsx', 'react source'), fence('vue', 'vue source')] as MetaNode[] },
      attachTo: document.body
    })
    expect(wrapper.findAll('[data-codeblock]')).toHaveLength(1)
    expect(wrapper.find('[data-codeblock]').attributes('data-codeblock')).toBe('vue')

    const reactTrigger = wrapper
      .findAll('web-ui-segmented-trigger')
      .find(item => (item.element as { value?: string }).value === 'react')
    await flushPromises()
    // 切换器自身处理点击的是 shadowRoot 里的 `[role="option"]`，宿主节点上没有该监听。
    reactTrigger!.element.shadowRoot!.querySelector<HTMLElement>('[role="option"]')!.click()

    await flushPromises()
    expect(wrapper.find('[data-codeblock]').attributes('data-codeblock')).toBe('tsx')
    expect(visibleText(wrapper.find('[data-code] pre').element.innerHTML)).toBe('react source')
    wrapper.unmount()
  })

  it('代码不足一屏时不挂折叠，超过一屏才出现展开按钮', () => {
    const fenceOf = (lines: number) => ({
      label: 'codeblock',
      lang: 'vue',
      content: `<pre class="shiki mdm-code"><code>${Array.from(
        { length: lines },
        (_, index) => `<span class="line"><span class="line-number">${index + 1}</span>line ${index + 1}</span>`
      ).join('\n')}</code></pre>`
    })
    const short = mount(MetaComp, { props: { nodes: [fenceOf(2)] as MetaNode[] } })
    expect(short.find('web-ui-collapse').exists()).toBe(false)
    expect(short.find('[data-toggle-code]').exists()).toBe(false)
    const tall = mount(MetaComp, { props: { nodes: [fenceOf(6)] as MetaNode[] } })
    expect(tall.find('web-ui-collapse').exists()).toBe(true)
    expect(tall.find('[data-toggle-code]').exists()).toBe(true)
  })
})
