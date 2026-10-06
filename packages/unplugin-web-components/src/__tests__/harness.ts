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
  handler: (html: string) => unknown
}

function createPlugin(options: PluginOptions) {
  const plugin = vitePlugin({ tagPrefix: 'web-ui', packageName: '@greypan/web-ui', ...options })
  return Array.isArray(plugin) ? plugin[0] : plugin
}

function createTransform(options: PluginOptions) {
  const transform = createPlugin(options).transform as unknown as TransformHook

  expect(transform).toBeTypeOf('function')

  return (code: string, id: string) => transform.call({}, code, id)
}

/**
 * 返回 transform 的原始结果：未命中时插件返回 undefined 而非空代码，测试「原样放过」
 * 需要看到它到底返回了什么（见 runTransformRaw）。
 */
export async function runTransform({ options = {}, code, id }: { options?: PluginOptions; code: string; id: string }) {
  const result = await createTransform(options)(code, id)

  if (result === null || typeof result === 'undefined' || typeof result === 'string') {
    throw new Error('Expected the transform to return code.')
  }
  return result
}

/** 返回 transform 的原始产物（含 undefined），供「未命中时原样放过」的用例断言。 */
export function runTransformRaw({ options = {}, code, id }: { options?: PluginOptions; code: string; id: string }) {
  return createTransform(options)(code, id)
}

/** 返回 transform 产出的代码，供断言注入内容的用例使用。 */
export async function runTransformedCode({
  options = {},
  code,
  id
}: {
  options?: PluginOptions
  code: string
  id: string
}) {
  const result = await runTransform({ options, code, id })

  return result.code
}

export function createHtmlHook(options: PluginOptions = {}) {
  const hook = (createPlugin(options) as unknown as { transformIndexHtml: HtmlHook }).transformIndexHtml

  expect(hook).toBeDefined()
  return hook
}

/** 返回 HTML hook 的原始结果：未命中时插件原样返回 HTML 字符串，测试「不注入」需要看到它。 */
export function runHtmlHook({ options = {}, html }: { options?: PluginOptions; html: string }) {
  return createHtmlHook(options).handler(html)
}

/** 返回注入的单个标签描述，断言「注入了脚本」并取出其内容。 */
export async function runHtmlInjection({ options = {}, html }: { options?: PluginOptions; html: string }) {
  const result = await runHtmlHook({ options, html })

  if (!Array.isArray(result)) {
    throw new Error('Expected the HTML hook to inject a tag.')
  }
  return result[0] as HtmlTagShape
}
