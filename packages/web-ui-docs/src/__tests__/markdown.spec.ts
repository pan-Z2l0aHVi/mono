import { describe, expect, it } from 'vite-plus/test'

import { parseMarkdown } from '../markdown'

/*
 * markdown 面的契约：`### 标题 {#id}` 的锚点、`## 示例` / `## API` 两节、围栏与表格的形状。
 * 这里量的是「解析器认不认」，不是「生成物落盘对不对」——后者由 `scripts/generate-web-ui-examples.test.mjs`
 * 走完整 CLI 断言。分队的原则是：能在纯函数上判死的规则，别等到跑一遍生成器才知道。
 */

const FRONTMATTER = ['---', 'component: slider', 'tag: web-ui-slider', '---', ''].join('\n')
const INTRO = '范围滑块，支持刻度标记。\n'
const REACT_FENCE = [
  '```react',
  'export default function Demo() {',
  '  return <web-ui-slider min={0}></web-ui-slider>',
  '}',
  '```'
].join('\n')
const VUE_FENCE = ['```vue', '<template>', '  <web-ui-slider :min="0"></web-ui-slider>', '</template>', '```'].join(
  '\n'
)
const SAMPLE = ['### 基础 {#basic}', '', '`min` 约束取值范围。', '', REACT_FENCE, '', VUE_FENCE, ''].join('\n')
const PROPS_TABLE = [
  '### Props',
  '',
  '| 名称   | 说明     |',
  '| ------ | -------- |',
  '| `min`  | 最小值。 |',
  ''
].join('\n')

const DOC = [
  FRONTMATTER,
  INTRO,
  '',
  '## 示例',
  '',
  SAMPLE,
  '## API',
  '',
  PROPS_TABLE,
  '### Events',
  '',
  '| 名称    | 说明               |',
  '| ------- | ------------------ |',
  '| `input` | 拖拽过程中触发。   |',
  ''
].join('\n')

/** 把一条已知的坏写法塞进合法文档，断言解析器为它专门留的那句话。 */
function parseWith(patch: (source: string) => string) {
  return () => parseMarkdown(patch(DOC), 'slider.md')
}

describe('parseMarkdown', () => {
  it('锚点、标题、围栏原文与 API 表各归其位', () => {
    const doc = parseMarkdown(DOC, 'slider.md')

    expect(doc.component).toBe('slider')
    expect(doc.tag).toBe('web-ui-slider')
    expect(doc.introHtml).toBe('<p>范围滑块，支持刻度标记。</p>')

    expect(doc.samples).toHaveLength(1)
    const sample = doc.samples[0]
    expect(sample?.title).toBe('基础')
    expect(sample?.id).toBe('basic')
    expect(sample?.descriptionHtml).toContain('<code>min</code>')
    // 围栏里就是将被编译执行的那份源码，所以这里连换行都要原样。
    expect(sample?.react).toBe('export default function Demo() {\n  return <web-ui-slider min={0}></web-ui-slider>\n}')
    expect(sample?.vue).toBe('<template>\n  <web-ui-slider :min="0"></web-ui-slider>\n</template>')

    // 单元格走的是与说明文字同一条 prose 管线，所以描述是块级 HTML，不是裸文本。
    expect(doc.api.props.rows).toEqual([{ name: 'min', descriptionHtml: '<p>最小值。</p>' }])
    expect(doc.api.events.rows).toEqual([{ name: 'input', descriptionHtml: '<p>拖拽过程中触发。</p>' }])
    expect(doc.api.slots.rows).toEqual([])
  })

  it('没写锚点的示例 id 为 null，仍然正常出内容', () => {
    const doc = parseMarkdown(DOC.replace('### 基础 {#basic}', '### 基础'), 'button.md')
    expect(doc.samples[0]?.id).toBeNull()
    expect(doc.samples[0]?.title).toBe('基础')
  })

  it.each([
    ['锚点不是 kebab-case', parseWith(source => source.replace('{#basic}', '{#Basic}')), /kebab-case/],
    [
      '同一篇里锚点重复',
      parseWith(source =>
        source.replace('## API', ['### 又一条 {#basic}', '', REACT_FENCE, '', VUE_FENCE, '', '## API'].join('\n'))
      ),
      /重复/
    ],
    ['出现不认识的一级小节', parseWith(source => `${source}\n## 注意事项\n\n写着玩的。\n`), /不认识的小节/],
    ['同一小节写两遍', parseWith(source => source.replace('## API', `## 示例\n\n${SAMPLE}\n## API`)), /出现多次/],
    [
      '第一个 ### 之前有正文',
      parseWith(source => source.replace('## 示例\n\n', '## 示例\n\n这段谁都不渲染。\n\n')),
      /不会被渲染/
    ],
    ['围栏语言写成 tsx', parseWith(source => source.replace('```react', '```tsx')), /语言必须是 react 或 vue/],
    ['围栏带了元信息', parseWith(source => source.replace('```vue', '```vue title="x"')), /未支持的元信息/],
    [
      '只写了 react 块',
      parseWith(source => source.replace(`${VUE_FENCE}\n`, '')),
      /必须各有一个 react 与一个 vue 代码块/
    ],
    [
      '一个示例块都没有',
      parseWith(source => `${FRONTMATTER}\n${INTRO}\n\n## 示例\n\n## API\n\n${PROPS_TABLE}\n`),
      /至少要有一个/
    ],
    ['缺 frontmatter', parseWith(source => source.replace(FRONTMATTER, '')), /缺少 frontmatter/],
    [
      'frontmatter 少了 tag',
      parseWith(source => source.replace('tag: web-ui-slider\n', '')),
      /必须同时声明 component 与 tag/
    ],
    ['表头写错', parseWith(source => source.replace('| 名称   | 说明     |', '| 名字 | 说明 |')), /表头前两列/],
    ['描述是空的', parseWith(source => source.replace('| `min`  | 最小值。 |', '| `min`  |          |')), /描述是空的/],
    [
      '同一张表里重名',
      parseWith(source => source.replace('| `min`  | 最小值。 |', '| `min`  | 最小值。 |\n| `min`  | 又一行。 |')),
      /重复的字段名/
    ],
    [
      'API 里出现不认识的小节',
      parseWith(source => `${source}\n### Methods\n\n| 名称 | 说明 |\n| ---- | ---- |\n`),
      /只允许 Props/
    ]
  ])('%s 时必须失败', (_case, run, message) => {
    expect(run).toThrow(message)
  })
})
