// cspell:words txts untime
import { readFileSync } from 'node:fs'
import { compileFunction } from 'node:vm'

import { compile as compileDOM } from '@vue/compiler-dom'
import { compileScript, compileTemplate, parse } from '@vue/compiler-sfc'
import { describe, expect, it, vi } from 'vite-plus/test'
import * as Vue from 'vue'
import { IndexTracker, type TransformOutput } from 'wuchale'

import { adapter, type VueDiagnostic } from '../index'

const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}.vue`, import.meta.url), 'utf8')
const header = 'import { getRuntime as _w_load_, getRuntimeRx as _w_load_rx_ } from "./main.loader.js"'

async function transform(source: string) {
  const onWarn = vi.fn<(diagnostic: VueDiagnostic) => void>()
  const result = await adapter({ onWarn }).transform({
    content: source,
    filename: 'src/Example.vue',
    index: new IndexTracker(true),
    expr: { plain: '_w_load_()', reactive: '_w_load_rx_()' },
    matchUrl: () => null
  })
  return { result, onWarn, code: result.output(header).code ?? source }
}

function compile(code: string) {
  const { descriptor, errors } = parse(code, { filename: 'Example.vue' })
  const script = compileScript(descriptor, { id: 'example' })
  const template = compileTemplate({
    source: descriptor.template!.content,
    filename: 'Example.vue',
    id: 'example',
    compilerOptions: { bindingMetadata: script.bindings }
  })
  return { descriptor, script, template, errors }
}

function renderTemplate(code: string): Vue.VNode {
  const { descriptor, script } = compile(code)
  const generated = compileDOM(descriptor.template!.content, {
    mode: 'function',
    prefixIdentifiers: true,
    bindingMetadata: script.bindings
  })
  const render = compileFunction(generated.code, ['Vue'])(Vue) as (...args: unknown[]) => Vue.VNode
  const setup = Object.fromEntries(Object.keys(script.bindings!).map(name => [name, () => 'Translated']))
  return render({}, [], {}, setup, {}, {})
}

describe('Vue SFC 静态文案', () => {
  it('提取自然文本及白名单属性，保留 script、样式和业务属性', async () => {
    const source = fixture('static')
    const { result, code, onWarn } = await transform(source)
    expect(result.txts.map(text => text.body)).toEqual(
      expect.arrayContaining(['Welcome', 'Hello world!', 'Your name', 'Company logo', 'Close dialog', 'Close'])
    )
    expect(result.txts).toHaveLength(6)
    expect(code).toContain('id="greeting" data-key="Keep data attributes"')
    expect(code).toContain('src="/logo.svg"')
    const original = parse(source).descriptor
    const compiled = compile(code)
    expect(compiled.descriptor.scriptSetup!.content).toContain(original.scriptSetup!.content.trim())
    expect(compiled.descriptor.styles[0].content).toBe(original.styles[0].content)
    expect(compiled.errors).toEqual([])
    expect(compiled.template.errors).toEqual([])
    expect(onWarn).not.toHaveBeenCalled()
  })

  it('无 script 时生成 setup 绑定，保留 entity 与 CRLF 的原始位置', async () => {
    const source = fixture('template-only').replaceAll('\n', '\r\n')
    const { result, code } = await transform(source)
    expect(result.txts.map(text => text.body)).toContain('Hello & 😀')
    const compiled = compile(code)
    expect(compiled.descriptor.scriptSetup).not.toBeNull()
    expect(compiled.errors).toEqual([])
    expect(compiled.template.errors).toEqual([])
    expect(compiled.template.code).not.toContain('_ctx._w_')
    expect(() => compileScript(compiled.descriptor, { id: 'inline', inlineTemplate: true })).not.toThrow()
  })

  it('source map 保存完整原始 SFC', async () => {
    const source = fixture('static')
    const { result } = await transform(source)
    const output: ReturnType<TransformOutput['output']> = result.output(header)
    expect(output.map).toMatchObject({ sourcesContent: [source] })
  })

  it.each([':title', 'v-bind:title', ':title.prop'])(
    '已有 %s 时保留同名静态属性，避免重复 directive 或改变覆盖语义',
    async binding => {
      const source = `<script setup>const name = 'Ada'</script><template><p title="Welcome" ${binding}="name">Hello {{ name }}.</p></template>`
      const { code, result, onWarn } = await transform(source)
      expect(result.txts.map(text => text.body)).toEqual(['Hello {0}.'])
      expect(code).toContain(`title="Welcome" ${binding}="name"`)
      const compiled = compile(code)
      expect(compiled.errors).toEqual([])
      expect(compiled.template.errors).toEqual([])
      expect(() => compileScript(compiled.descriptor, { id: 'inline', inlineTemplate: true })).not.toThrow()
      expect(onWarn).toHaveBeenCalledWith(expect.objectContaining({ code: 'unsupported-template' }))
    }
  )

  it.each([
    ['普通 script', '<script>export default {}</script><template><p>Hello world!</p></template>'],
    ['外部 template', '<template src="./other.html" />'],
    ['template 预处理器', '<template lang="pug">p Hello world!</template>']
  ])('%s 保留原文并给出可定位诊断', async (_name, source) => {
    const { result, code, onWarn } = await transform(source)
    expect(result.txts).toEqual([])
    expect(code).toBe(source)
    expect(onWarn).toHaveBeenCalledWith(expect.objectContaining({ filename: 'src/Example.vue' }))
  })

  it('插值与嵌套富文本提取成一条消息', async () => {
    const source =
      '<script setup>const name = "Ada"</script><template><p>Hello {{ name }}<strong>!</strong></p></template>'
    const { result, code, onWarn } = await transform(source)
    expect(result.txts.map(text => text.body)).toEqual(['Hello {0}<0>!</0>'])
    expect(compile(code).template.errors).toEqual([])
    expect(onWarn).not.toHaveBeenCalled()
  })

  it('没有候选文案时不注入 helper', async () => {
    const source = '<template><div id="internal-id" data-key="Internal key" /></template>'
    const { result, code, onWarn } = await transform(source)
    expect(result.txts).toEqual([])
    expect(code).toBe(source)
    expect(onWarn).not.toHaveBeenCalled()
  })

  it.each([['块级嵌套富文本', '<template><div>Read <p>this</p> now</div></template>']])(
    '%s 不发生局部翻译',
    async (_name, source) => {
      const { result, code, onWarn } = await transform(source)
      expect(result.txts).toEqual([])
      expect(code).toBe(source)
      expect(onWarn).toHaveBeenCalled()
    }
  )

  it('v-pre、原始 HTML 与保留空白的元素不被转换', async () => {
    const source =
      '<template><div><p v-pre>Hello {{ name }}</p><pre>Hello world!</pre><div v-html="html" /></div></template>'
    const { result, code } = await transform(source)
    expect(result.txts).toEqual([])
    expect(code).toBe(source)
  })

  it('用户已声明 loader alias 时安全跳过，不产生重复绑定', async () => {
    const source = '<script setup>const _w_load_ = 1</script><template><p>Hello world!</p></template>'
    const { result, code, onWarn } = await transform(source)
    expect(result.txts).toEqual([])
    expect(code).toBe(source)
    expect(onWarn).toHaveBeenCalled()
  })

  it.each(['_w_&#114;untime_', String.raw`\u005fw_runtime_`])(
    '解码后的 v-for alias %s 不遮蔽生成的 runtime',
    async alias => {
      const source = `<template><p v-for="${alias} in [1]">Hello world!</p></template>`
      const { code } = await transform(source)
      const result = renderTemplate(code)
      expect(result.children).toEqual(expect.arrayContaining([expect.objectContaining({ children: 'Translated' })]))
    }
  )

  it.each([
    '<template><p>Use {0} to continue</p></template>',
    '<template><p>Use &lt;0&gt;Help&lt;/0&gt; now</p></template>',
    '<template><p>Place &lt;0/&gt; here</p></template>',
    '<template><input title="Use {0} to continue" /></template>',
    '<template><input title="Use &lt;0&gt;Help&lt;/0&gt; now" /></template>'
  ])('保留与 wuchale 占位符语法冲突的静态文案：%s', async source => {
    const { result, code, onWarn } = await transform(source)
    expect(result.txts).toEqual([])
    expect(code).toBe(source)
    expect(onWarn).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('占位符') }))
  })

  it.each(['Use &lt;0&gt; now', 'Use &lt;/0&gt; now'])('未配对的数字 tag %s 只输出 adapter 诊断', async text => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const { result, onWarn } = await transform(`<template><p>${text}</p></template>`)
      expect(result.txts).toEqual([])
      expect(onWarn).toHaveBeenCalled()
      expect(error).not.toHaveBeenCalled()
    } finally {
      error.mockRestore()
    }
  })

  it.each(['v-pre.foo', 'v-pre:arg', 'v-pre.foo="value"'])('%s 保留整个子树并警告', async directive => {
    const source = `<template><p ${directive}>Hello world!</p></template>`
    const { result, code, onWarn } = await transform(source)
    expect(result.txts).toEqual([])
    expect(code).toBe(source)
    expect(onWarn).toHaveBeenCalled()
  })

  it.each(['Hello ', ' Hello '])('属性 %j 与普通文本共用消息时保留其前后空白', async value => {
    const source = `<template><section><p>Hello</p><input placeholder="${value}" /></section></template>`
    const { result, code } = await transform(source)
    expect(result.txts.map(text => text.body)).toEqual(['Hello', 'Hello'])
    const node = renderTemplate(code)
    expect(node.children).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'p', children: 'Translated' }),
        expect.objectContaining({ type: 'input', props: { placeholder: value.replace('Hello', 'Translated') } })
      ])
    )
  })

  it('使用 index.has 避免把构建时未提取的文案替换成未知索引', async () => {
    const source = fixture('template-only')
    const result = await adapter().transform({
      content: source,
      filename: 'src/Unknown.vue',
      index: new IndexTracker(false),
      expr: { plain: '_w_load_()', reactive: '_w_load_rx_()' },
      matchUrl: () => null
    })
    expect(result.output(header).code ?? source).toBe(source)
  })
})
