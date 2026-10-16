import { describe, expect, it } from 'vite-plus/test'

import { parseMarkdown, type ParsedDoc } from '../markdown'
import type { MdToCompConfig } from '../types'

/*
 * markdown 面的契约：`### 标题 {#id}` 的锚点、`## 示例` / `## API` 两节、围栏与表格的形状。
 * 这里量的是「解析器认不认」——产物落盘对不对由 `emit.spec.ts` 与仓库根的完整生成断言管。
 * 分队的原则是：能在纯函数上判死的规则，别等到跑一遍生成器才知道。
 *
 * 表单元格一律写成单空格：解析器按 `|` 切之后再 trim，负例要改哪一格就直接写哪一格，
 * 不需要复刻对齐后的空格数（仓库里的 .md 是被格式化器补过空格的，那是另一件事）。
 */

const CONFIG: Pick<MdToCompConfig, 'flavors' | 'apiTables'> = {
  flavors: ['react', 'vue'],
  apiTables: {
    columns: {
      Props: ['名称', '说明', '类型', '默认值'],
      Events: ['名称', '说明'],
      Slots: ['名称', '说明']
    }
  }
}

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

const PROPS_HEAD = '| 名称 | 说明 | 类型 | 默认值 |'
const PROPS_SEP = '| ---- | ---- | ---- | ---- |'
// 类型列里的 `\|` 是 GFM 的列分隔符转义，解析后要还原成字面竖线。
const ROW_MIN = '| `min` | 最小值。 | `number` | `0` |'
const ROW_VARIANT = `| \`variant\` | 外观。 | \`'a' \\| 'b'\` | \`'a'\` |`
const ROW_ARIA = '| `aria-label` | 无障碍。 | `string \\| null` | `null` |'
const ROW_LABEL = '| `label` | 标签。 | `—` | — |'
const PROPS_TABLE = ['### Props', '', PROPS_HEAD, PROPS_SEP, ROW_MIN, ROW_VARIANT, ROW_ARIA, ROW_LABEL, ''].join('\n')

const EVENTS_TABLE = ['| 名称 | 说明 |', '| ---- | ---- |', '| `input` | 拖拽过程中触发。 |'].join('\n')

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
  EVENTS_TABLE,
  '### Slots',
  '',
  '| 名称 | 说明 |',
  '| ---- | ---- |',
  '| `default` | 默认插槽。 |',
  ''
].join('\n')

function parseWith(patch: (source: string) => string) {
  return () => parseMarkdown(patch(DOC), 'slider.md', CONFIG)
}

function rowsOf(doc: ParsedDoc, key: string) {
  return doc.api.find(section => section.key === key)?.rows
}

describe('parseMarkdown', () => {
  it('锚点、标题、围栏原文与 API 表各归其位', () => {
    const doc = parseMarkdown(DOC, 'slider.md', CONFIG)

    expect(doc.component).toBe('slider')
    expect(doc.tag).toBe('web-ui-slider')
    expect(doc.introHtml).toBe('<p>范围滑块，支持刻度标记。</p>')

    expect(doc.samples).toHaveLength(1)
    const sample = doc.samples[0]
    expect(sample?.title).toBe('基础')
    expect(sample?.id).toBe('basic')
    expect(sample?.descriptionHtml).toContain('<code>min</code>')
    // 围栏里就是将被编译执行的那份源码，所以这里连换行都要原样。
    expect(sample?.fences.react).toBe(
      'export default function Demo() {\n  return <web-ui-slider min={0}></web-ui-slider>\n}'
    )
    expect(sample?.fences.vue).toBe('<template>\n  <web-ui-slider :min="0"></web-ui-slider>\n</template>')

    // 说明走的是与正文同一条 prose 管线，所以是块级 HTML；类型与默认值是原样字符串
    // （渲染端把它们放进 `font-mono` 的 `<td>`，不包 `<code>`），且 `\|` 已还原成 `|`。
    expect(rowsOf(doc, 'props')?.[0]).toEqual({
      name: 'min',
      descriptionHtml: '<p>最小值。</p>',
      type: 'number',
      default: '0'
    })
    expect(rowsOf(doc, 'props')?.[1]?.type).toBe("'a' | 'b'")
    expect(rowsOf(doc, 'props')?.[1]?.default).toBe("'a'")
    expect(rowsOf(doc, 'props')?.[2]?.type).toBe('string | null')
    // 没有默认值就写 `—`，它照原样进产物，页面上是一个破折号而不是空白单元格。
    expect(rowsOf(doc, 'props')?.[3]).toEqual({
      name: 'label',
      descriptionHtml: '<p>标签。</p>',
      type: '—',
      default: '—'
    })
    // Events / Slots 的列契约只有两列：类型与默认值在那儿没有消费者。
    expect(rowsOf(doc, 'events')).toEqual([{ name: 'input', descriptionHtml: '<p>拖拽过程中触发。</p>' }])
    expect(rowsOf(doc, 'slots')).toEqual([{ name: 'default', descriptionHtml: '<p>默认插槽。</p>' }])
    // API 小节的顺序即配置里 columns 的键序，key 是标题小写。
    expect(doc.api.map(section => [section.key, section.title])).toEqual([
      ['props', 'Props'],
      ['events', 'Events'],
      ['slots', 'Slots']
    ])
  })

  it('没写锚点的示例 id 为 null，仍然正常出内容', () => {
    const doc = parseMarkdown(DOC.replace('### 基础 {#basic}', '### 基础'), 'button.md', CONFIG)
    expect(doc.samples[0]?.id).toBeNull()
    expect(doc.samples[0]?.title).toBe('基础')
  })

  it('换一个 anchor 函数就换一套锚点约定', () => {
    const squareAnchor = (heading: string) => {
      const match = heading.match(/^(.*?)\s*\[([^\]]+)\]\s*$/)
      return match ? { title: match[1].trim(), id: match[2].trim() } : { title: heading.trim(), id: null }
    }
    const source = DOC.replace('### 基础 {#basic}', '### 基础 [basic]')
    // 默认的 braceAnchor 认不出 `[basic]`，这条示例就不落盘。
    expect(parseMarkdown(source, 'slider.md', CONFIG).samples[0]?.id).toBeNull()
    const doc = parseMarkdown(source, 'slider.md', { ...CONFIG, anchor: squareAnchor })
    expect(doc.samples[0]?.id).toBe('basic')
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
    ['围栏语言写成 tsx', parseWith(source => source.replace('```react', '```tsx')), /代码块语言必须是 react \/ vue/],
    ['围栏带了元信息', parseWith(source => source.replace('```vue', '```vue title="x"')), /未支持的元信息/],
    ['只写了 react 块', parseWith(source => source.replace(`${VUE_FENCE}\n`, '')), /必须为每个 flavor 各有一个代码块/],
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
    [
      'Props 表还是旧的两列形状',
      parseWith(source =>
        source.replace(
          `${PROPS_HEAD}\n${PROPS_SEP}\n${ROW_MIN}`,
          '| 名称 | 说明 |\n| ---- | ---- |\n| `min` | 最小值。 |'
        )
      ),
      /### Props 的表头必须是/
    ],
    [
      'Events 表多写了类型列',
      parseWith(source =>
        source.replace(
          EVENTS_TABLE,
          '| 名称 | 说明 | 类型 |\n| ---- | ---- | ---- |\n| `input` | 拖拽过程中触发。 | `Event` |'
        )
      ),
      /### Events 的表头必须是/
    ],
    [
      '数据行的列数与表头不符',
      parseWith(source => source.replace(ROW_MIN, '| `min` | 最小值。 | `number` | `0` | 多写的一节 |')),
      /有一行是 5 列，表头是 4 列/
    ],
    ['描述是空的', parseWith(source => source.replace(ROW_MIN, '| `min` |  | `number` | `0` |')), /描述是空的/],
    [
      '名称是空的',
      parseWith(source => source.replace(ROW_MIN, '|  | 最小值。 | `number` | `0` |')),
      /名称单元格是空的/
    ],
    ['类型是空的', parseWith(source => source.replace(ROW_MIN, '| `min` | 最小值。 |  | `0` |')), /类型单元格是空的/],
    [
      '默认值是空的',
      parseWith(source => source.replace(ROW_MIN, '| `min` | 最小值。 | `number` |  |')),
      /默认值单元格是空的/
    ],
    [
      '### Props 有标题却没写表格',
      parseWith(source => source.replace(PROPS_TABLE, '### Props\n')),
      /### Props 有标题但没有表格/
    ],
    ['表格漏了行首的 |', parseWith(source => source.replace(ROW_VARIANT, '这一行忘了写行首的竖线。')), /不是表格行/],
    ['整篇没有 ## API', parseWith(source => source.slice(0, source.indexOf('## API'))), /缺 `## API` 小节/],
    [
      '## API 里只有正文',
      parseWith(source => `${source.slice(0, source.indexOf('## API'))}## API\n\n这里什么都没写。\n`),
      /一张表都没有数据行/
    ],
    ['同一张表里重名', parseWith(source => source.replace(ROW_MIN, `${ROW_MIN}\n${ROW_MIN}`)), /重复的字段名/],
    [
      'API 里出现不认识的小节',
      parseWith(source => `${source}\n### Methods\n\n| 名称 | 说明 |\n| ---- | ---- |\n`),
      /只允许 Props/
    ],
    [
      '配置里没有的小节被写进 md',
      () => parseMarkdown(DOC.replace('### Slots', '### Methods'), 'slider.md', CONFIG),
      /只允许 Props \/ Events \/ Slots/
    ]
  ])('%s 时必须失败', (_case, run, message) => {
    expect(run).toThrow(message)
  })

  it('配置里的 flavors 决定围栏语言，不是硬编码的 react / vue', () => {
    // 只配一个 flavor：多出来的那份围栏就成了「未支持的语言」。
    expect(() => parseMarkdown(DOC, 'slider.md', { ...CONFIG, flavors: ['react'] })).toThrow(/代码块语言必须是 react/)
  })
})
