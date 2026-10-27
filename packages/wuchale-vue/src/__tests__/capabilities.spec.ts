// cspell:words puis
import { describe, expect, it, vi } from 'vite-plus/test'
import * as Vue from 'vue'

import { component, transform } from './helpers'

describe('Vue 脚本消息能力', () => {
  it('插值模板整句提取，按原顺序字符串化每个表达式一次', async () => {
    const result = await transform(
      '<script setup>function label(first, second) { return `Hello ${first()} / ${second()}!` }</script><template><p>{{ label(first, second) }}</p></template>'
    )
    expect(result.bodies).toEqual(['Hello {0} / {1}!'])
    expect(result.warn).not.toHaveBeenCalled()
    const calls: string[] = []
    const first = () => ({
      toString() {
        calls.push('first')
        return 'Ada'
      }
    })
    const second = () => {
      calls.push('second')
      return 'end'
    }
    const comp = component(result.compiled, ['{1} puis {0}.'])
    const render = comp.setup!({}, { expose() {} } as Vue.SetupContext) as unknown as (
      context: Record<string, unknown>,
      cache: unknown[]
    ) => Vue.VNode
    expect(render({ first, second }, []).children).toBe('end puis Ada.')
    expect(calls).toEqual(['first', 'second'])
  })

  it('复数作为一个消息提取，自动使用当前语种', async () => {
    const result = await transform(
      '<script setup>import plural from "./locales/plural.js"\nfunction label(n) { return plural(n, ["One item", "# items"]) }</script><template><p>{{ label(2) }}</p></template>'
    )
    expect(result.bodies).toEqual([['One item', '# items']])
    expect(result.warn).not.toHaveBeenCalled()
    const plural = vi.fn<(n: number, choices: string[], language: string) => string>(() => 'localized quantity')
    const comp = component(result.compiled, [['Un article', '# articles', '# articles']], 'fr', undefined, plural)
    const render = comp.setup!({}, { expose() {} } as Vue.SetupContext) as unknown as (
      context: Record<string, unknown>,
      cache: unknown[]
    ) => Vue.VNode
    expect(render({}, []).children).toBe('localized quantity')
    expect(plural).toHaveBeenCalledWith(2, ['Un article', '# articles', '# articles'], 'fr')
  })

  it('动态复数候选整体保留并警告，不分别翻译数组成员', async () => {
    const result = await transform(
      '<script setup>import plural from "./locales/plural.js"\nfunction label(n, other) { return plural(n, ["One item", other]) }</script><template><p>{{ label(2) }}</p></template>'
    )
    expect(result.bodies).toEqual([])
    expect(result.code).toContain('plural(n, ["One item", other])')
    expect(result.warn).toHaveBeenCalled()
  })
})
