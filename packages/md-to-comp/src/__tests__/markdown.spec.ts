import { describe, expect, it } from 'vite-plus/test'

import type { FenceFlavor } from '../highlight'
import { parseMarkdown, type ParsedDoc } from '../markdown'
import type { ApiTables } from '../types'

/*
 * markdown 面的契约：`### 标题` 派生出的示例 id、`## Samples` 与可省的 `## API`、围栏与表格的形状，
 * 以及 `## API` 下「表头登记在配置里的是表、其余按散文渲染」这条分岔。
 * 这里量的是「解析器认不认」——产物落盘对不对由 `emit.spec.ts` 与仓库根的完整生成断言管。
 * 分队的原则是：能在纯函数上判死的规则，别等到跑一遍生成器才知道。
 *
 * 表单元格一律写成单空格：解析器按 `|` 切之后再 trim，负例要改哪一格就直接写哪一格，
 * 不需要复刻对齐后的空格数（仓库里的 .md 是被格式化器补过空格的，那是另一件事）。
 */

const CONFIG: { flavors: readonly FenceFlavor[]; apiTables: ApiTables } = {
  flavors: ['react', 'vue'],
  apiTables: {
    columns: {
      Props: ['名称', '说明', '类型', '默认值'],
      Events: ['名称', '说明'],
      Slots: ['名称', '说明'],
      'CSS Custom Properties': ['名称', '说明', '默认值'],
      'Color tokens': ['名称', '说明', '浅色默认值', '深色默认值']
    }
  }
}

const FRONTMATTER = ['---', 'component: slider', 'tag: web-ui-slider', '---', ''].join('\n')
const INTRO = '范围 slider，支持刻度标记。\n'
const REACT_FENCE = [
  '```tsx',
  'export default function Demo() {',
  '  return <web-ui-slider min={0}></web-ui-slider>',
  '}',
  '```'
].join('\n')
const VUE_FENCE = ['```vue', '<template>', '  <web-ui-slider :min="0"></web-ui-slider>', '</template>', '```'].join(
  '\n'
)
const SAMPLE = ['### Basic', '', '`min` 约束取值范围。', '', REACT_FENCE, '', VUE_FENCE, ''].join('\n')

const PROPS_HEAD = '| 名称 | 说明 | 类型 | 默认值 |'
const PROPS_SEP = '| ---- | ---- | ---- | ---- |'
// 类型列里的 `\|` 是 GFM 的列分隔符转义，解析后要还原成字面竖线。
const ROW_MIN = '| `min` | 最小值。 | `number` | `0` |'
const ROW_VARIANT = `| \`variant\` | 外观。 | \`'a' \\| 'b'\` | \`'a'\` |`
const ROW_ARIA = '| `aria-label` | 无障碍。 | `string \\| null` | `null` |'
const ROW_LABEL = '| `label` | label。 | `—` | — |'
const PROPS_TABLE = ['### Props', '', PROPS_HEAD, PROPS_SEP, ROW_MIN, ROW_VARIANT, ROW_ARIA, ROW_LABEL, ''].join('\n')

const EVENTS_TABLE = ['| 名称 | 说明 |', '| ---- | ---- |', '| `input` | 拖拽过程中触发。 |'].join('\n')

const DOC = [
  FRONTMATTER,
  INTRO,
  '',
  '## Samples',
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

/** 表格小节：`kind` 不匹配时直接抛，免得测试里到处写 `?.`。 */
function tableOf(doc: ParsedDoc, key: string) {
  const section = doc.api.find(candidate => candidate.key === key)
  if (section?.kind !== 'table') throw new Error(`没有表格小节 ${key}`)
  return section
}

function proseOf(doc: ParsedDoc, key: string) {
  const section = doc.api.find(candidate => candidate.key === key)
  if (section?.kind !== 'prose') throw new Error(`没有散文小节 ${key}`)
  return section
}

describe('parseMarkdown', () => {
  it('标题、派生 id、围栏原文与 API 表各归其位', () => {
    const doc = parseMarkdown(DOC, 'slider.md', CONFIG)

    expect(doc.component).toBe('slider')
    expect(doc.tag).toBe('web-ui-slider')
    expect(doc.introHtml).toBe('<p>范围 slider，支持刻度标记。</p>')

    expect(doc.samples).toHaveLength(1)
    const sample = doc.samples[0]
    expect(sample?.title).toBe('Basic')
    expect(sample?.id).toBe('basic')
    expect(sample?.descriptionHtml).toContain('<code>min</code>')
    // 围栏里就是将被编译执行的那份源码，所以这里连换行都要原样。
    expect(sample?.fences.react).toBe(
      'export default function Demo() {\n  return <web-ui-slider min={0}></web-ui-slider>\n}'
    )
    expect(sample?.fences.vue).toBe('<template>\n  <web-ui-slider :min="0"></web-ui-slider>\n</template>')

    // 列形状按位置定：首列是行的身份、次列是富文本、其余是普通值列。渲染端只认 `kind`，
    // 因此三列（CSS 变量）与四列（Props）走的是同一条渲染路径。
    const props = tableOf(doc, 'props')
    expect(props.columns).toEqual([
      { title: '名称', kind: 'name' },
      { title: '说明', kind: 'html' },
      { title: '类型', kind: 'code' },
      { title: '默认值', kind: 'code' }
    ])
    // 说明走的是与正文同一条 prose 管线，所以是块级 HTML；值列是原样字符串
    // （渲染端把它们放进 `font-mono` 的 `<td>`，不包 `<code>`），且 `\|` 已还原成 `|`。
    expect(props.rows[0]).toEqual(['min', '<p>最小值。</p>', 'number', '0'])
    expect(props.rows[1]?.[2]).toBe("'a' | 'b'")
    expect(props.rows[1]?.[3]).toBe("'a'")
    expect(props.rows[2]?.[2]).toBe('string | null')
    // 没有默认值就写 `—`，它照原样进产物，页面上是一个破折号而不是空白单元格。
    expect(props.rows[3]).toEqual(['label', '<p>label。</p>', '—', '—'])
    expect(tableOf(doc, 'events').rows).toEqual([['input', '<p>拖拽过程中触发。</p>']])
    expect(tableOf(doc, 'slots').rows).toEqual([['default', '<p>默认插槽。</p>']])
    // API 小节的顺序即正文里 `###` 的顺序，key 是标题小写。
    expect(doc.api.map(section => [section.key, section.title])).toEqual([
      ['props', 'Props'],
      ['events', 'Events'],
      ['slots', 'Slots']
    ])
  })

  it('三列与四列的表头各按自己的形状解析', () => {
    const source = `${DOC}\n### CSS Custom Properties\n\n| 名称 | 说明 | 默认值 |\n| ---- | ---- | ---- |\n| \`--wui-input-width\` | 紧凑控件默认宽度。 | \`200px\` |\n\n### Color tokens\n\n| 名称 | 说明 | 浅色默认值 | 深色默认值 |\n| ---- | ---- | ---- | ---- |\n| \`--wui-color-page\` | 页面背景。 | \`#fff\` | \`#242628\` |\n`
    const doc = parseMarkdown(source, 'slider.md', CONFIG)

    const vars = tableOf(doc, 'css custom properties')
    expect(vars.columns.map(column => column.kind)).toEqual(['name', 'html', 'code'])
    expect(vars.rows[0]).toEqual(['--wui-input-width', '<p>紧凑控件默认宽度。</p>', '200px'])

    // 浅色/深色是两根并列的值列——类型/默认值那种四列形状表达不了这一型。
    const colors = tableOf(doc, 'color tokens')
    expect(colors.columns.map(column => column.kind)).toEqual(['name', 'html', 'code', 'code'])
    expect(colors.rows[0]).toEqual(['--wui-color-page', '<p>页面背景。</p>', '#fff', '#242628'])
  })

  it('表头没登记过的小节按散文渲染，正文里的 markdown 照渲染', () => {
    const source = `${DOC}\n### Known limitations\n\n\`peek\` 模式下不支持嵌套。\n`
    const doc = parseMarkdown(source, 'slider.md', CONFIG)

    const prose = proseOf(doc, 'known limitations')
    expect(prose.title).toBe('Known limitations')
    expect(prose.html).toBe('<p><code>peek</code> 模式下不支持嵌套。</p>')
  })

  it('小节的顺序跟着正文走，与配置里的键序无关', () => {
    // 配置里 Events 写在 Slots 前面，正文反过来写：产物按正文的顺序出。
    const source = [
      FRONTMATTER,
      INTRO,
      '',
      '## Samples',
      '',
      SAMPLE,
      '## API',
      '',
      '### Slots',
      '',
      '| 名称 | 说明 |',
      '| ---- | ---- |',
      '| `default` | 默认插槽。 |',
      '',
      '### Events',
      '',
      EVENTS_TABLE,
      ''
    ].join('\n')
    expect(parseMarkdown(source, 'slider.md', CONFIG).api.map(section => section.key)).toEqual(['slots', 'events'])
  })

  it('标题即身份：短语里的标点与空白折成 kebab-case id', () => {
    const doc = parseMarkdown(DOC.replace('### Basic', '### Prefix and suffix'), 'button.md', CONFIG)
    expect(doc.samples[0]?.title).toBe('Prefix and suffix')
    expect(doc.samples[0]?.id).toBe('prefix-and-suffix')
  })

  it('换一个 anchor 函数就换一套派生约定', () => {
    const squareAnchor = (heading: string) => {
      const match = heading.match(/^(.*?)\s*\[([^\]]+)\]\s*$/)
      return match ? { title: match[1].trim(), id: match[2].trim() } : { title: heading.trim(), id: 'fallback' }
    }
    const source = DOC.replace('### Basic', '### Tick marks [marks]')
    // 默认实现不认方括号约定：它把整串标题折成 id，方括号内容照进不误。
    expect(parseMarkdown(source, 'slider.md', CONFIG).samples[0]?.id).toBe('tick-marks-marks')
    const doc = parseMarkdown(source, 'slider.md', { ...CONFIG, anchor: squareAnchor })
    expect(doc.samples[0]?.id).toBe('marks')
    expect(doc.samples[0]?.title).toBe('Tick marks')
  })

  it('整段省略 ## API 时，产物里没有任何 API 小节', () => {
    // 没有对外契约的组件（纯展示的 divider）用「整节删掉」声明这件事：小节缺省即 `api: []`，
    // 页面据此整段跳过。与下面的「留着标题却没有小节」相对，那一型仍然是错误。
    const doc = parseMarkdown(DOC.slice(0, DOC.indexOf('## API')), 'dropdown-divider.md', CONFIG)
    expect(doc.api).toEqual([])
    expect(doc.samples).toHaveLength(1)
  })

  it.each([
    // id 由标题派生，标题是中文就折不出东西。
    ['示例标题是中文', parseWith(source => source.replace('### Basic', '### 基础')), /派生不出 id/],
    // 半迁的语料：锚点写法留着会被折进标题，产物文件名跟着变歪，所以直接拒。
    ['标题里还写着锚点', parseWith(source => source.replace('### Basic', '### Basic {#basic}')), /还写着/],
    [
      '注入的 anchor 交回非法 id',
      () =>
        parseMarkdown(DOC, 'slider.md', {
          ...CONFIG,
          anchor: (heading: string) => ({ title: heading.trim(), id: 'Basic' })
        }),
      /必须是小写字母数字加连字符/
    ],
    [
      '两条标题折成同一个 id',
      parseWith(source =>
        source.replace('## API', ['### basic', '', REACT_FENCE, '', VUE_FENCE, '', '## API'].join('\n'))
      ),
      /与前面的示例重复/
    ],
    ['出现不认识的一级小节', parseWith(source => `${source}\n## 注意事项\n\n写着玩的。\n`), /不认识的小节/],
    // 中文小节名不是契约的一部分：语料分语种，骨架名只有一套，`## 示例` 是写法错误。
    ['还写着旧的中文小节名', parseWith(source => source.replace('## Samples', '## 示例')), /不认识的小节/],
    ['同一小节写两遍', parseWith(source => source.replace('## API', `## Samples\n\n${SAMPLE}\n## API`)), /出现多次/],
    [
      '第一个 ### 之前有正文',
      parseWith(source => source.replace('## Samples\n\n', '## Samples\n\n这段谁都不渲染。\n\n')),
      /不会被渲染/
    ],
    // 围栏语言写成 `react` 归为未支持：格式化器看不见它，落盘的 .tsx 却归格式化器管。
    [
      '围栏语言写成 react',
      parseWith(source => source.replace('```tsx', '```react')),
      /代码块语言必须是 react 用 ```tsx，vue 用 ```vue，收到 `react`/
    ],
    ['围栏带了元信息', parseWith(source => source.replace('```vue', '```vue title="x"')), /未支持的元信息/],
    [
      '只写了 react 那份围栏',
      parseWith(source => source.replace(`${VUE_FENCE}\n`, '')),
      /必须为每个 flavor 各有一个代码块/
    ],
    [
      '一个示例块都没有',
      parseWith(source => `${FRONTMATTER}\n${INTRO}\n\n## Samples\n\n## API\n\n${PROPS_TABLE}\n`),
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
    ['类型是空的', parseWith(source => source.replace(ROW_MIN, '| `min` | 最小值。 |  | `0` |')), /「类型」列是空的/],
    [
      '默认值是空的',
      parseWith(source => source.replace(ROW_MIN, '| `min` | 最小值。 | `number` |  |')),
      /「默认值」列是空的/
    ],
    [
      '### Props 有标题却没写表格',
      parseWith(source => source.replace(PROPS_TABLE, '### Props\n')),
      /### Props 有标题但没有表格/
    ],
    ['表格漏了行首的 |', parseWith(source => source.replace(ROW_VARIANT, '这一行忘了写行首的竖线。')), /不是表格行/],
    [
      '## API 里一个小节都没有',
      parseWith(source => `${source.slice(0, source.indexOf('## API'))}## API\n`),
      /一个小节都没有/
    ],
    [
      '## API 里第一个 ### 之前有正文',
      parseWith(source => source.replace('## API\n\n', '## API\n\n这段谁都不渲染。\n\n')),
      /不会被渲染/
    ],
    ['同一张表里重名', parseWith(source => source.replace(ROW_MIN, `${ROW_MIN}\n${ROW_MIN}`)), /重复的字段名/],
    [
      '表头没登记的小节里写了表格',
      parseWith(source => `${source}\n### Methods\n\n| 名称 | 说明 |\n| ---- | ---- |\n| \`focus()\` | 聚焦。 |\n`),
      /是散文小节，正文里却有表格行/
    ],
    [
      '配置里没有的小节被写进 md',
      () => parseMarkdown(DOC.replace('### Slots', '### Methods'), 'slider.md', CONFIG),
      /是散文小节，正文里却有表格行/
    ],
    ['散文小节是空的', parseWith(source => `${source}\n### Known limitations\n`), /是空的/],
    [
      'API 里两个小节撞同一个 key',
      parseWith(source => `${source}\n### Known limitations\n\n一。\n\n### Known Limitations\n\n二。\n`),
      /出现多次/
    ]
  ])('%s 时必须失败', (_case, run, message) => {
    expect(run).toThrow(message)
  })

  it('配置里的 flavors 决定认哪种围栏语言，不是硬编码的 tsx / vue', () => {
    // 只配一个 flavor：多出来的那份围栏就成了「未支持的语言」。
    expect(() => parseMarkdown(DOC, 'slider.md', { ...CONFIG, flavors: ['react'] })).toThrow(
      /代码块语言必须是 react 用 ```tsx，收到 `vue`/
    )
  })
})
