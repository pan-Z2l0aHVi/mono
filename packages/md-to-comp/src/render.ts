import type { FenceFlavor } from './highlight'

/**
 * API 表一列渲染成什么：`name` 是行的身份（首列）、`html` 是富文本说明（次列），其余列都是普通值列。
 * 形状由列的位置定，label 由配置给，所以渲染端不必认识任何一节叫什么。
 */
export type ApiColumnKind = 'name' | 'code' | 'html'

/** 表头文字与它在单元格里怎么渲染。 */
export interface ExampleApiColumn {
  title: string
  kind: ApiColumnKind
}

/** `## API` 里声明过表头的小节：列形状来自配置，行是已切好的单元格原文。 */
export interface ExampleApiTableSection {
  kind: 'table'
  /** 标题小写，即宿主 DOM 上 `data-example-api` 的值。 */
  key: string
  title: string
  /** 顺序即渲染顺序，单元格按它逐列取 `kind`。 */
  columns: ExampleApiColumn[]
  /** 每行的单元格，长度等于 `columns`；除 `html` 列外都是原样字符串。 */
  rows: string[][]
}

/** `## API` 里没声明表头的小节：正文渲染成 HTML 片段，没有表格。 */
export interface ExampleApiProseSection {
  kind: 'prose'
  key: string
  title: string
  html: string
}

export type ExampleApiSection = ExampleApiTableSection | ExampleApiProseSection

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

const MODULE_TYPES = `export type ExampleApiColumnKind = 'name' | 'code' | 'html'

export interface ExampleApiColumn {
  title: string
  kind: ExampleApiColumnKind
}

export interface ExampleApiTableSection {
  kind: 'table'
  key: string
  title: string
  columns: ExampleApiColumn[]
  rows: string[][]
}

export interface ExampleApiProseSection {
  kind: 'prose'
  key: string
  title: string
  html: string
}

export type ExampleApiSection = ExampleApiTableSection | ExampleApiProseSection

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
 * 代码块取色与 Markdown 正文版式。shiki 的 `defaultColor: false` 把颜色写成
 * `--shiki-light` / `--shiki-dark` 变量落在每个 token 上，这里决定当前外观取哪一边；
 * 深色判定跟着配置里的 `darkSelector` 走，和宿主其余表面用同一个外观源，
 * 所以切换外观不需要重新生成高亮 HTML。
 *
 * 代码块外框（圆角、底色、内边距、滚动、字号）仍留给宿主的样式层，所以 `.mdc-code` 把 shiki
 * 自带的 `<pre>` 版式复位成「继承外面那一层」。正文的 `.mdc-markdown` / `.mdc-heading`
 * 则在这里统一收口：取值跟随 Notion 的默认阅读版式，所有 demo 页都从同一份 `examples.css`
 * 拿到同一套标签、间距、字号与颜色，宿主只负责挂 class。
 *
 * 顺序按 stylelint 的 `no-descending-specificity` 排：先低比重的复位与浅色取色，再正文版式，
 * 最后是带 `darkSelector` 前缀的深色覆盖。深色规则比重更高，必须收在末尾。
 */
export function renderCss(darkSelector?: string): string {
  const dark = darkSelector
    ? `
${darkSelector} .mdc-code,
${darkSelector} .mdc-code span {
  color: var(--shiki-dark);
}

/*
 * 行号槽的压暗要在深色档再写一遍：上面那条深色取色规则是 darkSelector + .mdc-code + span，
 * 与 .mdc-code + .line-number 同为两个类位却多带一个元素，比重更高，不补这一条，深色下行号会被
 * 刷成正文满色——档位差异就只剩浅色有了。
 */
${darkSelector} .mdc-code .line-number {
  color: color-mix(in srgb, currentcolor 45%, transparent);
}

${darkSelector} .mdc-markdown,
${darkSelector} .mdc-heading {
  color: rgb(255 255 255 / 0.81);
}

${darkSelector} .mdc-markdown-secondary {
  color: rgb(255 255 255 / 0.46);
}

${darkSelector} .mdc-markdown :not(pre) > code {
  color: #ff7369;
}

${darkSelector} .mdc-markdown a {
  text-decoration-color: rgb(255 255 255 / 0.4);
}

${darkSelector} .mdc-markdown hr {
  border-top-color: rgb(255 255 255 / 0.094);
}

${darkSelector} .mdc-markdown pre {
  background-color: rgb(255 255 255 / 0.055);
}

${darkSelector} .mdc-markdown th,
${darkSelector} .mdc-markdown td {
  border-color: rgb(255 255 255 / 0.094);
}

${darkSelector} .mdc-markdown th {
  background-color: rgb(255 255 255 / 0.055);
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

/*
 * 行号槽：shiki 的 render-line-number 在生成期把它写在每一行最前面。这里把它摆成右对齐栏，
 * 并取比正文暗一档的颜色——currentColor 混透明，所以它跟着上面的取色走，深色档另有同一条规则
 * （见文件末尾，比重压过深色取色那条）。
 * 宽按三位数字预留（ch 就是这一栏所用等宽字体的一个数字宽）：语料里最长的示例也只有几十行，
 * 四位数行号不会发生，多留的宽度只会把代码往右推。
 * user-select: none 让鼠标划过选代码时不顺手把行号圈进选区。复制按钮不归这里管：它读的是 DOM 文本，
 * 要自己摘掉这一槽。
 */
.mdc-code .line-number {
  user-select: none;

  display: inline-block;

  width: 3ch;
  margin-inline-end: 2ch;

  color: color-mix(in srgb, currentcolor 45%, transparent);
  text-align: end;
}

/*
 * Markdown 正文版式：默认值取自 Notion 的阅读页——系统 UI 字体、
 * #37352f 主文字、85% 行内代码。正文字号不抄 Notion 写死的 16px，表格更不单独声明一档
 * 字号（跟着正文继承），两者都跟随宿主的正文 token，
 * 而是跟随宿主的正文 token，页面才不会正文比组件里的文字还大；
 * 脱离主题单独引用时回落到 14px，与设计系统的正文基准同一个值。
 * 容器挂 .mdc-markdown、标题挂 .mdc-heading；说明这类次要正文再加 .mdc-markdown-secondary。
 */
.mdc-markdown {
  font-family:
    ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, 'Apple Color Emoji', Arial, sans-serif,
    'Segoe UI Emoji', 'Segoe UI Symbol';
  font-size: var(--wui-font-size, 14px);
  line-height: 1.5;
  color: #37352f;
  overflow-wrap: break-word;
}

.mdc-markdown > :first-child {
  margin-top: 0;
}

.mdc-markdown > :last-child {
  margin-bottom: 0;
}

.mdc-markdown p {
  margin: 8px 0;
}

.mdc-markdown ul,
.mdc-markdown ol {
  margin: 8px 0;
  padding-left: 24px;
}

.mdc-markdown ul {
  list-style: disc;
}

.mdc-markdown ol {
  list-style: decimal;
}

.mdc-markdown li {
  margin: 2px 0;
}

.mdc-markdown li > p {
  margin: 0;
}

.mdc-markdown li > ul,
.mdc-markdown li > ol {
  margin: 2px 0;
}

.mdc-markdown strong {
  font-weight: 600;
}

.mdc-markdown :not(pre) > code {
  padding: 0.2em 0.4em;
  border-radius: 3px;

  font-family: SFMono-Regular, menlo, consolas, 'Liberation Mono', courier, monospace;
  font-size: 85%;
  color: #eb5757;

  background-color: rgb(135 131 120 / 0.15);
}

.mdc-markdown a {
  color: inherit;
  text-decoration: underline;
  text-decoration-color: rgb(55 53 47 / 0.4);
  text-underline-offset: 2px;
}

.mdc-markdown blockquote {
  margin: 8px 0;
  padding-left: 14px;
  border-left: 3px solid currentcolor;
}

.mdc-markdown hr {
  margin: 16px 0;
  border: 0;
  border-top: 1px solid rgb(55 53 47 / 0.16);
}

.mdc-markdown img {
  max-width: 100%;
  height: auto;
}

.mdc-markdown pre {
  overflow-x: auto;

  margin: 8px 0;
  padding: 12px 16px;
  border-radius: 4px;

  font-family: SFMono-Regular, menlo, consolas, 'Liberation Mono', courier, monospace;
  font-size: 85%;
  line-height: 1.5;

  background-color: rgb(247 246 243);
}

.mdc-markdown pre code {
  padding: 0;
  font: inherit;
  color: inherit;
  background-color: transparent;
}

.mdc-markdown table {
  border-spacing: 0;
  border-collapse: collapse;
  width: 100%;
  margin: 8px 0;
}

.mdc-markdown th,
.mdc-markdown td {
  padding: 7px 9px;
  border: 1px solid #e9e9e7;

  text-align: left;
  overflow-wrap: anywhere;
  vertical-align: top;
}

.mdc-markdown th {
  font-weight: 500;
  background-color: rgb(242 241 238 / 0.5);
}

.mdc-markdown-secondary {
  color: rgb(55 53 47 / 0.65);
}

.mdc-heading {
  margin: 0;
  font-weight: 600;
  color: #37352f;
}

h1.mdc-heading {
  font-size: 30px;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.01em;
}

h2.mdc-heading {
  font-size: 24px;
  line-height: 1.3;
}

h3.mdc-heading {
  font-size: 20px;
  line-height: 1.4;
}

h4.mdc-heading {
  font-size: 18px;
  line-height: 1.4;
}
${dark}`
}
