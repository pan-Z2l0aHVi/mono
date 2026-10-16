import type { FenceFlavor } from './highlight'
import type { ApiRow } from './markdown'

/** 落进产物模块的一条 API 行；形状与 `markdown.ts` 的 `ApiRow` 一致，序列化后由宿主消费。 */
export interface ExampleApiRow extends ApiRow {
  name: string
  descriptionHtml: string
}

export interface ExampleApiSection {
  key: string
  title: string
  rows: ExampleApiRow[]
}

/** 落进产物模块的一条示例；形状与 `markdown.ts` 的 `SampleBlock` 对应，序列化后由宿主消费。 */
export interface SamplePayload {
  /** 示例标题里的锚点 id；null 表示这条示例只展示代码。 */
  id: string | null
  title: string
  descriptionHtml: string
  html: Record<FenceFlavor, string>
  /** 非 null 时 `dir/demoKey` 已被发出，宿主可以直接挂成真组件。 */
  demoKey: string | null
}

export interface ExampleDocPayload {
  component: string
  tag: string
  introHtml: string
  samples: SamplePayload[]
  api: ExampleApiSection[]
}

const MODULE_HEADER = `// 本文件由 @greypan/md-to-comp 生成，请勿手动编辑。
// source of truth：input 目录下的 markdown —— 示例代码与 API 表的名称/说明/类型/默认值都在那一份里。
// 重新生成：跑一次宿主构建（生成挂在 md-to-comp 的 Vite 插件上）。`

const MODULE_TYPES = `export interface ExampleApiRow {
  name: string
  type?: string
  default?: string
  descriptionHtml: string
}

export interface ExampleApiSection {
  key: string
  title: string
  rows: ExampleApiRow[]
}

export interface Sample {
  id: string | null
  title: string
  descriptionHtml: string
  html: { react: string; vue: string }
  demoKey: string | null
}

export interface ExampleDoc {
  component: string
  tag: string
  introHtml: string
  samples: Sample[]
  api: ExampleApiSection[]
}
`

export function renderModule(docs: ExampleDocPayload[]): string {
  return `${MODULE_HEADER}

${MODULE_TYPES}
export const exampleDocs: ExampleDoc[] = ${JSON.stringify(docs, null, 2)}
`
}

/**
 * 只放代码着色的取色规则与 shiki `<pre>` 的复位。shiki 的 `defaultColor: false` 把颜色写成
 * `--shiki-light` / `--shiki-dark` 变量落在每个 token 上，这里决定当前外观取哪一边；
 * 深色判定跟着配置里的 `darkSelector` 走，和宿主其余表面用同一个外观源，
 * 所以切换外观不需要重新生成高亮 HTML。
 *
 * 外框（圆角、底色、内边距、滚动、字号）留给宿主的样式层，所以 `.mdc-code` 把 shiki 自带的
 * `<pre>` 版式复位成「继承外面那一层」——那部分归宿主主题管，搬进来反而会绕开它。
 *
 * 两份规则都落在同一个 `.mdc-code` 上，所以复位必须排在取色之前：stylelint 的
 * `no-descending-specificity` 按「最后一个复合选择器相同」的规则成对比较，低比重的
 * `.mdc-code` 排在高比重的 `${darkSelector} .mdc-code` 之后会直接红。两组属性不相交，
 * 先后与级联结果无关。
 */
export function renderCss(darkSelector?: string): string {
  const dark = darkSelector
    ? `
${darkSelector} .mdc-code,
${darkSelector} .mdc-code span {
  color: var(--shiki-dark);
}
`
    : ''
  return `/* 本文件由 @greypan/md-to-comp 生成，请勿手动编辑。 */

/*
 * shiki 产出的是自带版式的 <pre>（等宽、margin、背景都在它自己的 style 里），
 * 而示例代码块的外框由宿主提供。这里把前者复位成继承，
 * 否则同一块代码会出现两层边框与两套字号。
 */
.mdc-code {
  margin: 0;
  font: inherit;
  background: transparent;
}

/*
 * shiki 的 defaultColor: false 把颜色输出成 CSS 变量，浅色取 --shiki-light、深色取 --shiki-dark。
 * 深色判定跟着宿主的外观源走，所以切换外观不需要重新生成高亮 HTML。
 */
.mdc-code,
.mdc-code span {
  color: var(--shiki-light);
}
${dark}`
}
