import { afterEach, describe, expect, it } from 'vite-plus/test'

import type { WebUiEmpty } from '..'
import '..'

afterEach(() => document.body.replaceChildren())

/*
 * `size` 的语义是「整套版面度量的一个旋钮」：图标盒、min-height、padding 与标题/描述
 * 字号都由它派生，公开 `--wui-empty-*` 仍压在派生值之上。
 *
 * 这些量只能在这里证：派生值先落在宿主的 `--wui-internal-empty-*` 上，再由 shadow 内的
 * `var(--wui-empty-*, var(--wui-internal-empty-*, 默认值))` 取出。jsdom 的 getComputedStyle
 * 不解析自定义属性，那一层退化不出来，因此 jsdom spec 只能断言写入的 token 文本。
 */

async function createEmpty(size?: string, tokens?: Record<string, string>): Promise<WebUiEmpty> {
  const el = document.createElement('web-ui-empty') as WebUiEmpty
  el.title = '暂无内容'
  el.description = '当前区域还没有可展示的内容。'
  if (size !== undefined) el.setAttribute('size', size)
  for (const [token, value] of Object.entries(tokens ?? {})) el.style.setProperty(token, value)
  document.body.append(el)
  await el.updateComplete
  return el
}

function part(el: WebUiEmpty, selector: string): HTMLElement {
  const found = el.shadowRoot?.querySelector<HTMLElement>(selector)
  if (!found) throw new Error(`web-ui-empty shadow root 缺少 ${selector}`)
  return found
}

/** 一份空态当前真正生效的版面度量，用来与目标数值表逐项比对。 */
function metrics(el: WebUiEmpty) {
  const box = getComputedStyle(part(el, '.empty'))
  const icon = getComputedStyle(part(el, '.empty-icon'))
  return {
    iconWidth: icon.width,
    iconHeight: icon.height,
    minHeight: box.minBlockSize,
    paddingBlock: `${box.paddingTop} / ${box.paddingBottom}`,
    paddingInline: `${box.paddingLeft} / ${box.paddingRight}`,
    titleFontSize: getComputedStyle(part(el, '.empty-title')).fontSize,
    descriptionFontSize: getComputedStyle(part(el, '.empty-description')).fontSize
  }
}

describe('web-ui-empty 的 size 派生整套度量（浏览器计算值）', () => {
  it.each([
    [
      '40',
      {
        iconWidth: '40px',
        iconHeight: '40px',
        minHeight: '171px',
        paddingBlock: '23px / 23px',
        paddingInline: '17px / 17px',
        titleFontSize: '14px',
        descriptionFontSize: '13px'
      }
    ],
    [
      '56',
      {
        iconWidth: '56px',
        iconHeight: '56px',
        minHeight: '240px',
        paddingBlock: '32px / 32px',
        paddingInline: '24px / 24px',
        titleFontSize: '16px',
        descriptionFontSize: '14px'
      }
    ],
    [
      '72',
      {
        iconWidth: '72px',
        iconHeight: '72px',
        minHeight: '309px',
        paddingBlock: '41px / 41px',
        paddingInline: '31px / 31px',
        titleFontSize: '16px',
        descriptionFontSize: '14px'
      }
    ]
  ])('size=%s 派生 %o', async (size, expected) => {
    expect(metrics(await createEmpty(size))).toEqual(expected)
  })

  it('未写 size 时按默认 56 派生，与显式 56 逐项相同', async () => {
    expect(metrics(await createEmpty())).toEqual(metrics(await createEmpty('56')))
  })

  it('字号在 56 处分档：55 取紧凑档，56 起取默认档', async () => {
    const compact = metrics(await createEmpty('55'))
    expect([compact.titleFontSize, compact.descriptionFontSize]).toEqual(['14px', '13px'])

    const regular = metrics(await createEmpty('56'))
    expect([regular.titleFontSize, regular.descriptionFontSize]).toEqual(['16px', '14px'])
  })

  it.each([['abc'], [''], ['0'], ['-5'], ['Infinity'], ['NaN']])(
    '非法 size="%s" 让整套度量回到默认 56，而不是垃圾值',
    async raw => {
      const el = await createEmpty(raw)
      expect(el.size).toBe(56)
      expect(metrics(el)).toEqual(metrics(await createEmpty('56')))
    }
  )

  it('公开 token 覆盖压在 size 派生值之上', async () => {
    const el = await createEmpty('72', {
      '--wui-empty-min-height': '0',
      '--wui-empty-padding': '0',
      '--wui-empty-icon-size': '52px',
      '--wui-empty-title-font-size': '20px',
      '--wui-empty-description-font-size': '18px'
    })

    const overridden = metrics(el)
    expect(overridden).toEqual({
      iconWidth: '52px',
      iconHeight: '52px',
      minHeight: '0px',
      paddingBlock: '0px / 0px',
      paddingInline: '0px / 0px',
      titleFontSize: '20px',
      descriptionFontSize: '18px'
    })
  })
})
