import type { Thenable, TransformResult } from 'unplugin'
import { expect } from 'vite-plus/test'

import type { UnpluginWebComponentsOptions } from '../factory'
import vitePlugin from '../vite'

type PluginOptions = Partial<UnpluginWebComponentsOptions>

type TransformHook = (this: unknown, code: string, id: string) => Thenable<TransformResult>

export interface HtmlTagShape {
  tag: string
  attrs: Record<string, unknown>
  children: string
  injectTo: string
}

interface HtmlHook {
  order: string
  handler: (html: string) => unknown
}

function createPlugin(options: PluginOptions) {
  const plugin = vitePlugin({ tagPrefix: 'web-ui', packageName: '@greypan/web-ui', ...options })
  return Array.isArray(plugin) ? plugin[0] : plugin
}

export async function runTransform({ options = {}, code, id }: { options?: PluginOptions; code: string; id: string }) {
  const transform = createPlugin(options).transform as unknown as TransformHook

  expect(transform).toBeTypeOf('function')

  const result = await transform.call({}, code, id)
  if (!result || typeof result === 'string') {
    throw new Error('Unexpected transform result.')
  }
  return result
}

export function createHtmlHook(options: PluginOptions = {}) {
  const hook = (createPlugin(options) as unknown as { transformIndexHtml: HtmlHook }).transformIndexHtml

  expect(hook).toBeDefined()
  return hook
}

export async function runHtmlHook({ options = {}, html }: { options?: PluginOptions; html: string }) {
  const { handler } = createHtmlHook(options)

  return await handler(html)
}
