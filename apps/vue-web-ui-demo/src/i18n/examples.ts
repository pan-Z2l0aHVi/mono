import { defineAsyncComponent, defineComponent, h, type Component } from 'vue'

import { demoManifest } from '@/generated/demo-manifest'
import { demoManifest as enDemoManifest } from '@/generated/en/demo-manifest'
import type { ExampleDoc } from '@/generated/examples'

import type { DemoLocale } from './locale'

export function createDemo(importModule: () => Promise<{ default: Component }>) {
  let component: Component | undefined
  let pending: Promise<{ default: Component }> | undefined
  const load = () =>
    (pending ??= importModule()
      .then(module => {
        component = module.default
        return module
      })
      .catch(error => {
        pending = undefined
        throw error
      }))
  // 每个实例只选择一次内部组件，初次懒载完成后也不因父层重渲染而重挂。
  const Demo = defineComponent({
    setup() {
      const inner = component ?? defineAsyncComponent(() => load().then(module => module.default))
      return () => h(inner)
    }
  })
  return { load, get: () => Demo }
}

const modules = import.meta.glob<{ default: Component }>(['../generated/demos/*.vue', '../generated/en/demos/*.vue'])
const demos = new Map(
  Object.entries(modules).map(([file, load]) => [file.slice('../generated/'.length, -'.vue'.length), createDemo(load)])
)
for (const [prefix, keys] of [
  ['', demoManifest],
  ['en/', enDemoManifest]
] as const) {
  for (const key of keys) {
    if (!demos.has(`${prefix}demos/${key}`))
      throw new Error(`Generated demo module is missing from glob: ${prefix}demos/${key}.vue`)
  }
}
const demoKey = (locale: DemoLocale, component: string, key: string) =>
  `${locale === 'en' ? 'en/' : ''}demos/${component}--${key}`

export function getDemo(locale: DemoLocale, component: string, key: string) {
  return demos.get(demoKey(locale, component, key))?.get()
}

export async function prepareExamples(locale: DemoLocale, docs: ExampleDoc[], components: string[]) {
  await Promise.all(
    docs
      .filter(doc => components.includes(doc.component))
      .flatMap(doc =>
        doc.samples.map(sample => {
          const key = demoKey(locale, doc.component, sample.demoKey)
          const demo = demos.get(key)
          if (!demo) throw new Error(`Missing generated demo: ${key}`)
          return demo.load()
        })
      )
  )
}
