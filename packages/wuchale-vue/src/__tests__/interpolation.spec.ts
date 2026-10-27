// cspell:words txts untime
import { compileFunction } from 'node:vm'

import { compile } from '@vue/compiler-dom'
import { compileScript, parse } from '@vue/compiler-sfc'
import { describe, expect, it, vi } from 'vite-plus/test'
import * as Vue from 'vue'
import { IndexTracker } from 'wuchale'
import { compileTranslation } from 'wuchale/compiler'
import toRuntime from 'wuchale/runtime'

import { adapter, type VueDiagnostic } from '../index'

async function transform(source: string) {
  const onWarn = vi.fn<(diagnostic: VueDiagnostic) => void>()
  const result = await adapter({ onWarn }).transform({
    content: source,
    filename: 'src/Interpolation.vue',
    index: new IndexTracker(true),
    expr: { plain: '_w_load_()', reactive: '_w_load_rx_()' },
    matchUrl: () => null
  })
  const code =
    result.output('import { getRuntime as _w_load_, getRuntimeRx as _w_load_rx_ } from "./main.loader.js"').code ??
    source
  return { result, code, onWarn }
}

function render(code: string, translation: string, bindings: Record<string, unknown> = {}): Vue.VNode {
  const { descriptor } = parse(code)
  const script = compileScript(descriptor, { id: 'interpolation' })
  const generated = compile(descriptor.template!.content, {
    mode: 'function',
    prefixIdentifiers: true,
    bindingMetadata: script.bindings
  })
  const runtime = toRuntime({ c: [compileTranslation(translation)] }, 'fr')
  const setup = Object.fromEntries(
    Object.keys(script.bindings!).map(name => [name, name.startsWith('_w_runtime_') ? runtime : Vue.toDisplayString])
  )
  const fn = compileFunction(generated.code, ['Vue'])(Vue) as (...args: unknown[]) => Vue.VNode
  return fn({}, [], {}, { ...setup, ...bindings }, {}, {})
}

describe('Vue 插值整句', () => {
  it('提取一条消息并支持译文重排占位符', async () => {
    const source =
      '<script setup lang="ts">const name = "Ada"; const count = 2</script><template><p>Hello {{ name }}, {{ count }} items!</p></template>'
    const { result, code, onWarn } = await transform(source)
    expect(result.txts).toHaveLength(1)
    expect(result.txts[0]).toMatchObject({
      body: 'Hello {0}, {1} items!',
      placeholders: [
        ['0', 'name'],
        ['1', 'count']
      ]
    })
    expect(render(code, 'Il y a {1} articles, {0}.', { name: 'Ada', count: 2 }).children).toBe(
      'Il y a 2 articles, Ada.'
    )
    expect(onWarn).not.toHaveBeenCalled()
  })

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['boolean', false],
    ['number', 0],
    ['object', { name: 'Ada' }],
    ['array', ['Ada', 'Lin']]
  ])('值 %s 保持 Vue toDisplayString 语义', async (_label, value) => {
    const { code } = await transform(
      '<script setup>const value = null</script><template><p>Value: {{ value }}.</p></template>'
    )
    expect(render(code, 'Valeur: {0}.', { value }).children).toBe(`Valeur: ${Vue.toDisplayString(value)}.`)
  })

  it('每个表达式只求值一次，并在下一个表达式执行前完成字符串化', async () => {
    const shared = { count: 1 }
    const first = vi.fn<() => typeof shared>(() => shared)
    const second = vi.fn<() => string>(() => {
      shared.count = 2
      return 'end'
    })
    const expected = Vue.toDisplayString(shared)
    const { code } = await transform(
      '<script setup>function first() {} function second() {}</script><template><p>Value {{ first() }} / {{ second() }}.</p></template>'
    )
    expect(render(code, 'Valeur {0} / {1}.', { first, second }).children).toBe(`Valeur ${expected} / end.`)
    expect(first).toHaveBeenCalledTimes(1)
    expect(second).toHaveBeenCalledTimes(1)
  })

  it('使用原始表达式位置保留 entity 编码及字符串中的插值结束符', async () => {
    const { code } = await transform('<template><p>Value {{ "&#125;&#125;" }}.</p></template>')
    expect(render(code, 'Valeur {0}.').children).toBe('Valeur }}.')
  })

  it('保留 v-for 局部作用域', async () => {
    const { code } = await transform(
      '<template><p v-for="(name, i) in [\'Ada\']">Hello {{ name }} #{{ i }}.</p></template>'
    )
    expect(render(code, 'Bonjour {0} #{1}.').children).toEqual(
      expect.arrayContaining([expect.objectContaining({ children: 'Bonjour Ada #0.' })])
    )
  })

  it('纯动态表达式不构造消息', async () => {
    const source = '<script setup>const value = "Text"</script><template><p>{{ value }}</p></template>'
    const { result, code } = await transform(source)
    expect(result.txts).toEqual([])
    expect(code).toBe(source)
  })
})
