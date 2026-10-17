import { describe, expect, it } from 'vite-plus/test'

import { highlight } from '../highlight'

/*
 * `highlight()` 里那条 HTML 往返自证是「页面显示的那份 == 围栏那份」在引擎侧的落点：它一旦解错
 * 实体，合法源码会被判成漂移、整条生成链非零退出，症状比静默错排更糟的是没人能改这类示例。
 * 仓库根的完整生成断言有一份独立的同口径解码器，两侧各自被钉。
 */

describe('highlight 的原文往返', () => {
  it('正文里的尖括号与字面实体都算同一份源码', async () => {
    const code = [
      `export default function Demo() {`,
      `  return <web-ui-button label="&quot; &amp; &#x26; <b>" count={1} />`,
      `}`
    ].join('\n')
    const html = await highlight(code, 'react', 'button.md')
    expect(html).toContain('mdc-code')
    expect(html).toContain('&#x3C;')
  })

  it('vue 的模板片段同样通过往返', async () => {
    const code = [`<template>`, `  <web-ui-slider :min="0" :value="40"></web-ui-slider>`, `</template>`].join('\n')
    await expect(highlight(code, 'vue', 'slider.md')).resolves.toContain('</pre>')
  })
})
