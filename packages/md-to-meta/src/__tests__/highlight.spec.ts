import { describe, expect, it } from 'vite-plus/test'

import { lineCountOf, visibleText } from '../contract'
import { highlight } from '../highlight'

/*
 * `highlight()` 里那条 HTML 往返自证是「页面显示的那份 == 围栏那份」在引擎侧的落点：它一旦解错
 * 实体，合法源码会被判成漂移、整条生成链非零退出，症状比静默错排更糟的是没人能改这类示例。
 */

describe('highlight 的原文往返', () => {
  it('正文里的尖括号与字面实体都算同一份源码', async () => {
    const code = [
      'export default function Demo() {',
      '  return <web-ui-button label="&quot; &amp; &#x26; <b>" count={1} />',
      '}'
    ].join('\n')
    const html = await highlight(code, 'tsx', 'button.md')
    expect(html).toContain('mdm-code')
    expect(html).toContain('line-number')
    expect(visibleText(html).replace(/\n$/, '')).toBe(code)
  })

  it('vue 的模板片段同样通过往返', async () => {
    const code = ['<template>', '  <web-ui-slider :min="0" :value="40"></web-ui-slider>', '</template>'].join('\n')
    const html = await highlight(code, 'vue', 'slider.md')
    expect(html).toContain('</pre>')
    expect(visibleText(html).replace(/\n$/, '')).toBe(code)
  })

  it('未知语言退回纯文本，类名与原文都不丢', async () => {
    const code = '这是 <一段> & 原文'
    const html = await highlight(code, 'unknown-lang', 'bad.md')
    expect(html).toBe('<pre class="shiki mdm-code"><code>这是 &lt;一段&gt; &amp; 原文</code></pre>')
    expect(visibleText(html)).toBe(code)
  })

  it('无语言围栏同样退回纯文本', async () => {
    const html = await highlight('plain\nline', '', 'plain.md')
    expect(html).toContain('mdm-code')
    expect(visibleText(html)).toBe('plain\nline')
  })
})

/*
 * `lineCountOf` 是宿主折叠判据的引擎侧实现：数的是 shiki 按行包的行 span，不是行号槽。
 * 行号槽的文本里也有数字，若错数了它，空行或位数不同的行数就会漂。
 */
describe('lineCountOf', () => {
  it('高亮 HTML 按行 span 数行，空行也占一行', async () => {
    const html = await highlight('const a = 1\n\nconst b = 2', 'ts', 'a.md')
    expect(lineCountOf(html)).toBe(3)
  })

  it('退回纯文本的输出没有行 span，行数为 0', async () => {
    const html = await highlight('plain', 'unknown-lang', 'bad.md')
    expect(lineCountOf(html)).toBe(0)
  })

  it('不把行号槽里的数字当成行', () => {
    expect(lineCountOf('<span class="line-number">12</span>')).toBe(0)
  })
})
