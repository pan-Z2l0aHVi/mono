import { createElement, use, type ComponentType } from 'react'

import { demoManifest as enDemoManifest } from '@/generated/en/demo-manifest'
import { demoManifest as zhDemoManifest } from '@/generated/zh-CN/demo-manifest'
import type { ExampleDoc } from '@/generated/zh-CN/examples'

import type { Locale } from './locale'

const modules = import.meta.glob<{ default: ComponentType }>('../generated/*/demos/*.tsx')
export function createDemo(importModule: () => Promise<{ default: ComponentType }>) {
  let component: ComponentType | undefined
  let pending: Promise<{ default: ComponentType }> | undefined
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
  const Demo = () => createElement(component ?? use(load()).default)
  return { load, get: () => Demo }
}

const demos = new Map(
  Object.entries(modules).map(([file, importModule]) => {
    const key = file.slice('../generated/'.length, -'.tsx'.length).replace('/demos/', '/')
    return [key, createDemo(importModule)] as const
  })
)
for (const [locale, keys] of [
  ['zh-CN', zhDemoManifest],
  ['en', enDemoManifest]
] as const) {
  for (const key of keys) {
    if (!demos.has(`${locale}/${key}`))
      throw new Error(`Generated demo module is missing from glob: ${locale}/demos/${key}.tsx`)
  }
}

export function getDemo(locale: Locale, component: string, key: string) {
  return demos.get(`${locale}/${component}--${key}`)?.get()
}

/** 切语种只加载当前页的示例；就绪后直接使用组件，避免首次 lazy 挂载再挂起一帧。 */
export async function prepareExamples(locale: Locale, docs: ExampleDoc[], components: string[]) {
  await Promise.all(
    docs
      .filter(doc => components.includes(doc.component))
      .flatMap(doc =>
        doc.samples.map(sample => {
          const key = `${locale}/${doc.component}--${sample.demoKey}`
          const demo = demos.get(key)
          if (!demo) throw new Error(`Missing generated demo: ${key}`)
          return demo.load()
        })
      )
  )
}
