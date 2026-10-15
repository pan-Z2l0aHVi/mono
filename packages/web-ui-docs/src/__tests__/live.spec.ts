import { describe, expect, it } from 'vite-plus/test'

import { DocError } from '../errors'
import { assertSelfContained, demoFileName, isLiveSample } from '../live'

/*
 * live 通道最便宜也最容易漏的一层：`{#id}` 决定这条示例发不发文件、文件名怎么拼、围栏能不能独立
 * 编译成一份组件。这三件事在页面上的表现都是「示例没出来」或「示例是死的」，所以每条都给正反断言。
 * 生成物与围栏逐字节相同那部分由 `scripts/generate-web-ui-examples.test.mjs` 钉，不在此重复。
 */

describe('isLiveSample 与 demoFileName', () => {
  it('只有显式写了锚点的示例才发组件文件', () => {
    expect(isLiveSample(null)).toBe(false)
    expect(isLiveSample('basic')).toBe(true)
  })

  it('文件名用 -- 连接 component 与 id，并按 flavor 换扩展名', () => {
    expect(demoFileName('slider', 'basic', 'react')).toBe('slider--basic.tsx')
    expect(demoFileName('slider', 'marks-vertical', 'vue')).toBe('slider--marks-vertical.vue')
  })
})

describe('assertSelfContained', () => {
  const reactDemo = [
    `import { useState } from 'react'`,
    ``,
    `export default function Demo() {`,
    `  const [value] = useState(30)`,
    ``,
    `  return <web-ui-slider value={value}></web-ui-slider>`,
    `}`
  ].join('\n')
  // 静态示例的常见形状：动态绑定到字面量不需要 script，把它当成「缺 script」会让一半示例凭空长出空块。
  const vueStatic = [`<template>`, `  <web-ui-slider :min="0" :value="40"></web-ui-slider>`, `</template>`].join('\n')
  const vueControlled = [
    `<template>`,
    `  <web-ui-slider :value="volume" @input="onInput"></web-ui-slider>`,
    `</template>`,
    ``,
    `<script setup lang="ts">`,
    `const volume = 30`,
    `function onInput() {}`,
    `</script>`
  ].join('\n')

  it('完整组件形态的围栏放行', () => {
    for (const [code, flavor] of [
      [reactDemo, 'react'],
      [vueStatic, 'vue'],
      [vueControlled, 'vue']
    ] as const)
      expect(() => assertSelfContained(code, flavor, '受控值', 'slider.md')).not.toThrow()
  })

  // 每条都是「片段被当成文件发出」的一种形状：发出去就是编译失败或一个空壳 demo。
  it.each([
    ['react 里没有默认导出的组件', 'const value = 1', 'react'],
    [
      'react 代码块混进了 vue 的收尾标签',
      'export default function Demo() {\n  return <div></div>\n}\n</template>',
      'react'
    ],
    ['vue 里没有 <template>', 'const volume = 30', 'vue'],
    ['vue 模板用了插值却没有 script', '<template>\n  <span>{{ volume }}</span>\n</template>', 'vue'],
    [
      'vue 模板绑了事件却没有 script',
      '<template>\n  <web-ui-slider @input="onInput"></web-ui-slider>\n</template>',
      'vue'
    ],
    [
      'vue 的 script 块不是 setup 形态',
      '<template>\n  <web-ui-slider @input="onInput"></web-ui-slider>\n</template>\n\n<script lang="ts">\nexport default {}\n</script>',
      'vue'
    ],
    ['空的代码块', '   ', 'react']
  ] as const)('%s 时必须失败', (_case, code, flavor) => {
    expect(() => assertSelfContained(code, flavor, '受控值', 'slider.md')).toThrow(DocError)
  })
})
