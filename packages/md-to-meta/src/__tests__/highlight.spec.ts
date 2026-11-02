import { describe, expect, it } from 'vite-plus/test'

import { highlight, visibleText } from '../highlight'

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
