// cspell:words txts
import { compileFunction } from 'node:vm'

import { compileScript, parse } from '@vue/compiler-sfc'
import { expect, vi } from 'vite-plus/test'
import * as Vue from 'vue'
import { IndexTracker } from 'wuchale'
import { compileTranslation } from 'wuchale/compiler'
import toRuntime from 'wuchale/runtime'

import { adapter, type VueDiagnostic } from '../index'

export async function transform(source: string) {
  const warn = vi.fn<(diagnostic: VueDiagnostic) => void>()
  const result = await adapter({ onWarn: warn }).transform({
    content: source,
    filename: 'src/Capability.vue',
    index: new IndexTracker(true),
    expr: { plain: '_w_load_()', reactive: '_w_load_rx_()' },
    matchUrl: () => null
  })
  const code = result.output('').code ?? source
  const parsed = parse(code)
  expect(parsed.errors).toEqual([])
  const compiled = compileScript(parsed.descriptor, { id: 'capability', inlineTemplate: true })
  return { bodies: result.txts.map(text => text.body), code, compiled, warn }
}

export function component(
  compiled: { content: string },
  translations: (string | string[])[],
  locale = 'fr',
  current?: () => ReturnType<typeof toRuntime>,
  plural?: (n: number, choices: string[], language: string) => string
) {
  const runtime = toRuntime({ c: translations.map(value => compileTranslation(value)) }, locale)
  const body = compiled.content
    .replace(
      /import \{([^}]+)\} from ["']vue["']/g,
      (_all, names: string) => `const {${names.replace(/ as /g, ':')}} = Vue`
    )
    .replace(/import plural from [^\n]+/g, '')
    .replace('export default', 'return')
  return compileFunction(body, ['Vue', '_w_load_rx_', 'plural'])(
    Vue,
    current ?? (() => runtime),
    plural
  ) as Vue.ComponentOptions
}
