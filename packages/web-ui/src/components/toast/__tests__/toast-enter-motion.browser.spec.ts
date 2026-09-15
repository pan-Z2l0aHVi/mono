import { afterEach, describe, expect, it } from 'vite-plus/test'

import '@/components/theme'
import type { WebUiTheme } from '@/components/theme'

import '..'

afterEach(() => document.body.replaceChildren())

// toast 的入场缩放走 --wui-scale-enter。写成字面量时，motion=reduced 的归零对它无效。
// 本文件在无系统 reduce 的 browser 项目里跑，所以 reduced 断言只可能由 token 生效。
describe('WebUiToast 入场缩放 token（浏览器）', () => {
  /** 拆出 computed matrix 的缩放与位移分量；位移由 JS 写入，与本 token 无关。 */
  function decompose(transform: string): { scale: [string, string]; translate: string } {
    const matched = /^matrix\(([^)]+)\)$/.exec(transform)
    expect(matched, `不是 matrix()：${transform}`).toBeTruthy()
    const [a, b, c, d, e, f] = matched![1].split(',').map(value => value.trim())
    expect([b, c], '非等比缩放/斜切').toEqual(['0', '0'])
    return { scale: [a, d], translate: `${e}, ${f}` }
  }

  async function mountToast(parent: HTMLElement): Promise<HTMLElement> {
    const el = document.createElement('web-ui-toast')
    el.message = 'enter scale'
    parent.append(el)
    await el.updateComplete
    return el.shadowRoot!.querySelector<HTMLElement>('.toast')!
  }

  it('默认主题下入场起点沿 --wui-scale-enter 缩放 0.95', async () => {
    const toast = await mountToast(document.body)
    expect(decompose(getComputedStyle(toast).transform).scale).toEqual(['0.95', '0.95'])
  })

  it('motion=reduced 时缩放归 1，位移不变', async () => {
    const theme = document.createElement('web-ui-theme') as WebUiTheme
    theme.appearance = 'light'
    theme.motion = 'reduced'
    document.body.append(theme)

    const reduced = decompose(getComputedStyle(await mountToast(theme)).transform)
    const normal = decompose(getComputedStyle(await mountToast(document.body)).transform)

    expect(reduced.scale).toEqual(['1', '1'])
    expect(normal.scale).toEqual(['0.95', '0.95'])
    expect(reduced.translate, 'reduce 只该收掉缩放，不该动位移').toBe(normal.translate)
  })
})
