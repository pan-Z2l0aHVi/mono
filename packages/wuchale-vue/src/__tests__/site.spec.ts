// cspell:words txts
import { compileScript, parse } from '@vue/compiler-sfc'
import { expect, it, vi } from 'vite-plus/test'
import { IndexTracker } from 'wuchale'

import type { VueDiagnostic } from '../index'
import { adapter } from '../index'

async function run(source: string) {
  const onWarn = vi.fn<(diagnostic: VueDiagnostic) => void>()
  const result = await adapter({
    componentAttributes: { 'web-ui-option': ['label'], 'web-ui-tooltip': ['content'] },
    onWarn
  }).transform({
    content: source,
    filename: 'src/Site.vue',
    index: new IndexTracker(true),
    expr: { plain: '_w_load_()', reactive: '_w_load_rx_()' },
    matchUrl: () => null
  })
  const code = result.output('import {getRuntimeRx as _w_load_rx_} from "./loader.js"').code ?? source
  const parsed = parse(code)
  expect(parsed.errors).toEqual([])
  compileScript(parsed.descriptor, { id: 'site', inlineTemplate: true })
  return { bodies: result.txts.map(t => t.body), code, onWarn }
}

it('遍历组件和slot容器，保留图标前缀，受控处理组件文案属性', async () => {
  const { bodies, code } = await run(
    '<template><web-ui-theme><template v-if="true"><web-ui-option label="跟随系统" value="system"/><span><web-ui-icon/>跨框架支持</span><slot>后备说明</slot></template></web-ui-theme></template>'
  )
  expect(bodies).toEqual(['跟随系统', '跨框架支持', '后备说明'])
  expect(code).toContain('value="system"')
})

it('转换render时调用的setup函数和模板绑定表达式，保留技术字符串', async () => {
  const { bodies, code } = await run(
    '<script setup lang="ts">const LABEL="简体中文"; function label(ok: boolean) { console.error("Technical error"); return ok ? "复制成功" : "复制代码" }</script><template><web-ui-tooltip :content="true ? \'收起代码\' : \'展开代码\'"><button :aria-label="label(true)">说明</button></web-ui-tooltip></template>'
  )
  expect(bodies).toEqual(expect.arrayContaining(['复制成功', '复制代码', '收起代码', '展开代码', '说明']))
  expect(bodies).not.toContain('Technical error')
  expect(bodies).not.toContain('简体中文')
  expect(code).toContain('console.error("Technical error")')
})

it('纯插值中的自然文案也转换，比较值、对象key与宏参数保持字节不变', async () => {
  const { bodies, code } = await run(`<script setup lang="ts">
const props = defineProps({ label: { default: '技术协议' } })
function label(value: string) {
  switch (value) { case '业务键': return { '对象键': '显示说明' } }
}
</script><template><p>{{ true ? '显示成功' : '显示失败' }}</p></template>`)
  expect(bodies).toEqual(expect.arrayContaining(['显示成功', '显示失败', '显示说明']))
  expect(bodies).not.toEqual(expect.arrayContaining(['业务键', '对象键', '技术协议']))
  expect(code).toContain("case '业务键':")
  expect(code).toContain("default: '技术协议'")
})

it('函数内插值模板字符串安全保留并报告诊断', async () => {
  const { bodies, code, onWarn } = await run(
    '<script setup>function label(name) { return `你好 ${name}` }</script><template><p>{{ label("Ada") }}</p></template>'
  )
  expect(bodies).not.toContain('你好 {0}')
  expect(code).toContain('`你好 ${name}`')
  expect(onWarn).toHaveBeenCalledWith(expect.objectContaining({ code: 'unsupported-template' }))
})

it('tagged模板保持语法，optional member的计算key与console参数不翻译', async () => {
  const { bodies, code, onWarn } = await run(
    '<script setup>function label(data) { console.error?.("错误原因"); return data?.["业务键"] ?? format`自然文案` }</script><template><p>{{ label({}) }}</p></template>'
  )
  expect(bodies).toEqual([])
  expect(code).toContain('format`自然文案`')
  expect(code).toContain('data?.["业务键"]')
  expect(onWarn).toHaveBeenCalled()
})

it('计算与optional console调用、已知成员键和存储协议参数保留原文', async () => {
  const { bodies, code } = await run(`<script setup>
function label(value) {
  console['error']('技术错误'); console?.error('技术错误');
  globalThis.console.error('技术错误'); window.console['error']('技术错误');
  Object.hasOwn(value, '业务键'); Reflect.get(value, '业务键');
  localStorage.setItem('偏好键', '业务值');
  return '可见说明'
}
</script><template><p>{{ label({}) }}</p></template>`)
  expect(bodies).toEqual(['可见说明'])
  expect(code).toContain("Object.hasOwn(value, '业务键')")
  expect(code).toContain("console?.error('技术错误')")
})
