import { describe, expect, it } from 'vite-plus/test'

import { highlight } from '../highlight'

/*
 * `highlight()` 里那条 HTML 往返自证是「页面显示的那份 == 围栏那份」在引擎侧的落点：它一旦解错
 * 实体，合法源码会被判成漂移、整条生成链非零退出，症状比静默错排更糟的是没人能改这类示例。
 * 仓库根的完整生成断言有一份独立的同口径解码器，两侧各自被钉。
 */

/** 去掉行号槽与高亮标签、一趟解掉实体，得到读者实际看到的那份源码。 */
function visibleText(html: string): string {
  const named: Record<string, string> = { amp: '&', quot: '"' }
  return html
    .replace(/<span class="line-number">[^<]*<\/span>/g, '')
    .replace(/<[^>]*>/g, '')
    .replace(
      /&#x([\da-f]+);|&#(\d+);|&([a-z]+);/gi,
      (whole, hex: string | undefined, dec: string | undefined, name: string | undefined) => {
        if (hex) return String.fromCodePoint(Number.parseInt(hex, 16))
        if (dec) return String.fromCodePoint(Number.parseInt(dec, 10))
        return (name && named[name.toLowerCase()]) || whole
      }
    )
}

describe('highlight 的原文往返', () => {
  it('正文里的尖括号与字面实体都算同一份源码', async () => {
    const code = [
      `export default function Demo() {`,
      `  return <web-ui-button label="&quot; &amp; &#x26; <b>" count={1} />`,
      `}`
    ].join('\n')
    const html = await highlight(code, 'react', 'button.md')
    expect(html).toContain('mdc-code')
    // 往返的判据是可见文本等于围栏原文，而不是输出里出现某个转义串。
    expect(visibleText(html).replace(/\n$/, '')).toBe(code)
  })

  it('vue 的模板片段同样通过往返', async () => {
    const code = [`<template>`, `  <web-ui-slider :min="0" :value="40"></web-ui-slider>`, `</template>`].join('\n')
    const html = await highlight(code, 'vue', 'slider.md')
    expect(html).toContain('</pre>')
    expect(visibleText(html).replace(/\n$/, '')).toBe(code)
  })
})
