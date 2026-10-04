import { afterEach, describe, expect, it } from 'vite-plus/test'

import type { WebUiEmpty } from '..'
import '..'

/**
 * `size` 非法输入的**用户可见后果**：JS 调用方与 framework 绑定都能写出
 * `size="abc"` / `size="0"` 这类类型系统管不到的输入。它最终落到 CSS 盒子上，
 * jsdom 没有布局只能读到写入的 token 文本，盒是否真的可用只能在这里证。
 */
afterEach(() => document.body.replaceChildren())

async function createEmpty(size?: string): Promise<WebUiEmpty> {
  const el = document.createElement('web-ui-empty') as WebUiEmpty
  el.title = '暂无内容'
  el.description = '当前区域还没有可展示的内容。'
  if (size !== undefined) el.setAttribute('size', size)
  document.body.append(el)
  await el.updateComplete
  return el
}

/** 图标盒的边长：非法 size 若漏过归一化，这里会是 `NaNpx` 或 `0px` 而不是可用尺寸。 */
async function iconBoxWidth(el: WebUiEmpty): Promise<string> {
  const box = el.shadowRoot!.querySelector<HTMLElement>('.empty-icon')
  if (!box) throw new Error('web-ui-empty shadow root 缺少 .empty-icon')
  await new Promise(resolve => requestAnimationFrame(resolve))
  return getComputedStyle(box).width
}

describe('web-ui-empty 的 size 归一化（浏览器）', () => {
  it.each([
    ['40', '40px'],
    ['56', '56px'],
    ['72', '72px']
  ])('size=%s 产出 %s 的图标盒', async (size, expected) => {
    expect(await iconBoxWidth(await createEmpty(size))).toBe(expected)
  })

  it('未写 size 时按默认 56 渲染', async () => {
    expect(await iconBoxWidth(await createEmpty())).toBe('56px')
  })

  it.each(['abc', '', '0', '-5', 'Infinity', 'NaN'])(
    '非法 size="%s" 的图标盒回退为默认 56，而不是 NaN 或 0',
    async raw => {
      const el = await createEmpty(raw)
      expect(el.size).toBe(56)
      expect(await iconBoxWidth(el)).toBe('56px')
    }
  )

  // 公开 token 压在 size 派生值之上，这是 README 写明的定制入口。
  it('公开 --wui-empty-icon-size 覆盖 size 派生值', async () => {
    const el = await createEmpty('72')
    el.style.setProperty('--wui-empty-icon-size', '52px')

    expect(await iconBoxWidth(el)).toBe('52px')
  })
})
