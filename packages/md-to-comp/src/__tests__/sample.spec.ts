import { describe, expect, it } from 'vite-plus/test'

import { assertSelfContained, demoFileContent, demoFileName, emitsDemoFile } from '../sample'

describe('示例落成文件的编译期规定', () => {
  it('只有带锚点的示例才落成文件，文件名是 <组件>--<id>.<扩展名>', () => {
    expect(emitsDemoFile(null)).toBe(false)
    expect(emitsDemoFile('basic')).toBe(true)
    expect(demoFileName('slider', 'basic', 'react')).toBe('slider--basic.tsx')
    expect(demoFileName('slider', 'basic', 'vue')).toBe('slider--basic.vue')
  })

  it('落盘内容 = 围栏原文 trimEnd 后补一个行尾换行', () => {
    expect(demoFileContent('a\nb\n\n')).toBe('a\nb\n')
    expect(demoFileContent('a\nb')).toBe('a\nb\n')
  })

  const reactOk = ['export default function Demo() {', '  return <div />', '}'].join('\n')
  const vueOk = [
    '<template>',
    '  <web-ui-slider :value="volume" />',
    '</template>',
    '',
    '<script setup>',
    'const volume = 1',
    '</script>'
  ].join('\n')

  it.each([
    ['react 没有默认导出', 'const Demo = () => null', 'react', /必须以 `export default function Demo\(\)`/],
    ['react 里混进了 vue 模板', `${reactOk}\n</template>`, 'react', /出现了 <\/template>/],
    ['vue 没有 template 块', '<script setup>const a = 1</script>', 'vue', /必须含 <template>/],
    ['vue 有插值却没有 setup script', '<template><span>{{ a }}</span></template>', 'vue', /没有带 `setup` 的 <script>/],
    [
      'vue 有事件绑定却没有 setup script',
      '<template><b @click="go" /></template>',
      'vue',
      /没有带 `setup` 的 <script>/
    ],
    ['代码块是空的', '   ', 'react', /代码块是空的/]
  ])('%s 时必须失败', (_case, code, flavor, message) => {
    expect(() => assertSelfContained(code, flavor as 'react' | 'vue', '基础', 'slider.md')).toThrow(message)
  })

  it('静态绑到字面量的 vue 示例不必凭空长出一个空 script', () => {
    expect(() =>
      assertSelfContained('<template><web-ui-slider :min="0" /></template>', 'vue', '基础', 'slider.md')
    ).not.toThrow()
  })

  it('两个 flavor 的合法形状都放行', () => {
    expect(() => assertSelfContained(reactOk, 'react', '基础', 'slider.md')).not.toThrow()
    expect(() => assertSelfContained(vueOk, 'vue', '基础', 'slider.md')).not.toThrow()
  })
})
