import type { MetaNode } from './types'

const MODULE_HEADER = `// 本文件由 @greypan/md-to-meta 生成，请勿手动编辑。
// 来源：markdown —— meta 是文档结构的直接投影，不含任何业务含义。
// 重新生成：跑一次宿主构建（生成挂在 md-to-meta 的 Vite 插件上）。`

const MODULE_DTS = `// 本文件由 @greypan/md-to-meta 生成，请勿手动编辑。
import type { MetaNode } from '@greypan/md-to-meta'

declare const meta: MetaNode[]
export default meta
`

function serializeNode(node: MetaNode, indent: string): string {
  const fields: string[] = [`label: '${node.label}'`]
  if (node.id !== undefined) fields.push(`id: '${node.id}'`)
  if (node.content !== undefined) fields.push(`content: ${JSON.stringify(node.content)}`)
  if (node.src !== undefined) fields.push(`src: ${JSON.stringify(node.src)}`)
  if (node.alt !== undefined) fields.push(`alt: ${JSON.stringify(node.alt)}`)
  if (node.lang !== undefined) fields.push(`lang: ${JSON.stringify(node.lang)}`)
  if (node.path !== undefined) fields.push(`path: '${node.path}'`)
  // 字面 specifier 才能被 Rollup 静态分析并按 chunk 切分；路径只来自引擎自己算出的相对路径。
  if (node.load !== undefined && node.path !== undefined) fields.push(`load: () => import('${node.path}')`)
  if (node.children === undefined) return `${indent}{ ${fields.join(', ')} }`
  const inner = node.children.map(child => serializeNode(child, `${indent}  `)).join(',\n')
  return `${indent}{\n${fields.map(field => `${indent}  ${field}`).join(',\n')},\n${indent}  children: [\n${inner}\n${indent}  ]\n${indent}}`
}

/**
 * meta 模块。手写序列化而不是 `JSON.stringify`：`load` 必须落成字面的动态 import，
 * JSON 只能产出字符串。默认导出用 `const meta = …`，避开匿名 default export 的 lint 规则。
 */
export function renderMetaModule(nodes: readonly MetaNode[]): string {
  const body = nodes.map(node => serializeNode(node, '  ')).join(',\n')
  return `${MODULE_HEADER}

const meta = [
${body}
]

export default meta
`
}

/** 与 meta 模块并排的类型声明：根 tsconfig 未开 `allowJs`，没有它宿主拿到的是 any。 */
export function renderMetaTypes(): string {
  return MODULE_DTS
}

/**
 * 代码块取色与 Markdown 正文版式。shiki 的 `defaultColor: false` 把颜色写成
 * `--shiki-light` / `--shiki-dark` 变量落在每个 token 上，这里决定当前外观取哪一边；
 * 深色判定跟着配置里的 `darkSelector` 走，所以切换外观不需要重新生成高亮 HTML。
 *
 * 代码块外框（圆角、底色、内边距、滚动、字号）留给宿主，所以 `.mdm-code` 把 shiki
 * 自带的 `<pre>` 版式复位成「继承外面那一层」。正文的 `.mdm-markdown` / `.mdm-heading`
 * 在这里统一收口：取值跟随 Notion 的默认阅读版式，所有宿主页面都从同一份 `theme.css`
 * 拿到同一套标签、间距、字号与颜色，宿主只负责挂 class。
 *
 * 顺序按 stylelint 的 `no-descending-specificity` 排：先低比重的复位与浅色取色，再正文版式，
 * 最后是带 `darkSelector` 前缀的深色覆盖。深色规则比重更高，必须收在末尾。
 */
export function renderCss(darkSelector?: string): string {
  const dark = darkSelector
    ? `
${darkSelector} .mdm-code,
${darkSelector} .mdm-code span {
  color: var(--shiki-dark);
}

/*
 * 行号槽的压暗要在深色档再写一遍：上面那条深色取色规则是 darkSelector + .mdm-code + span，
 * 与 .mdm-code + .line-number 同为两个类位却多带一个元素，比重更高，不补这一条，深色下行号会被
 * 刷成正文满色——档位差异就只剩浅色有了。
 */
${darkSelector} .mdm-code .line-number {
  color: color-mix(in srgb, currentcolor 45%, transparent);
}

${darkSelector} .mdm-markdown,
${darkSelector} .mdm-heading {
  color: rgb(255 255 255 / 0.81);
}

${darkSelector} .mdm-markdown-secondary {
  color: rgb(255 255 255 / 0.46);
}

${darkSelector} .mdm-markdown :not(pre) > code {
  color: #ff7369;
}

${darkSelector} .mdm-markdown a {
  text-decoration-color: rgb(255 255 255 / 0.4);
}

${darkSelector} .mdm-markdown hr {
  border-top-color: rgb(255 255 255 / 0.094);
}

${darkSelector} .mdm-markdown pre:not(.mdm-code) {
  background-color: rgb(255 255 255 / 0.055);
}

${darkSelector} .mdm-markdown th,
${darkSelector} .mdm-markdown td {
  border-color: rgb(255 255 255 / 0.094);
}

${darkSelector} .mdm-markdown th {
  background-color: rgb(255 255 255 / 0.055);
}
`
    : ''
  return `/* 本文件由 @greypan/md-to-meta 生成，请勿手动编辑。 */

/*
 * shiki 产出的是自带版式的 <pre>（等宽、margin、背景都在它自己的 style 里），
 * 而代码块的外框由宿主提供。这里把前者复位成继承，
 * 否则同一块代码会出现两层边框与两套字号。
 */
.mdm-code {
  margin: 0;
  font: inherit;
  background: transparent;
}

/*
 * shiki 的 defaultColor: false 把颜色输出成 CSS 变量，浅色取 --shiki-light、深色取 --shiki-dark。
 * 深色判定跟着宿主的外观源走，所以切换外观不需要重新生成高亮 HTML。
 */
.mdm-code,
.mdm-code span {
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
.mdm-code .line-number {
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
 * 字号（跟着正文继承），两者都跟随宿主的正文 token（--mdm-font-size），
 * 页面才不会正文比组件里的文字还大；脱离主题单独引用时回落到 14px。
 * 容器挂 .mdm-markdown、标题挂 .mdm-heading；说明这类次要正文再加 .mdm-markdown-secondary。
 */
.mdm-markdown {
  font-family:
    ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, 'Apple Color Emoji', Arial, sans-serif,
    'Segoe UI Emoji', 'Segoe UI Symbol';
  font-size: var(--mdm-font-size, 14px);
  line-height: 1.5;
  color: #37352f;
  overflow-wrap: break-word;
}

.mdm-markdown > :first-child {
  margin-top: 0;
}

.mdm-markdown > :last-child {
  margin-bottom: 0;
}

.mdm-markdown p {
  margin: 8px 0;
}

.mdm-markdown ul,
.mdm-markdown ol {
  margin: 8px 0;
  padding-left: 24px;
}

.mdm-markdown ul {
  list-style: disc;
}

.mdm-markdown ol {
  list-style: decimal;
}

.mdm-markdown li {
  margin: 2px 0;
}

.mdm-markdown li > p {
  margin: 0;
}

.mdm-markdown li > ul,
.mdm-markdown li > ol {
  margin: 2px 0;
}

.mdm-markdown strong {
  font-weight: 600;
}

.mdm-markdown :not(pre) > code {
  padding: 0.2em 0.4em;
  border-radius: 3px;

  font-family: SFMono-Regular, menlo, consolas, 'Liberation Mono', courier, monospace;
  font-size: 85%;
  color: #eb5757;

  background-color: rgb(135 131 120 / 0.15);
}

.mdm-markdown a {
  color: inherit;
  text-decoration: underline;
  text-decoration-color: rgb(55 53 47 / 0.4);
  text-underline-offset: 2px;
}

.mdm-markdown blockquote {
  margin: 8px 0;
  padding-left: 14px;
  border-left: 3px solid currentcolor;
}

.mdm-markdown hr {
  margin: 16px 0;
  border: 0;
  border-top: 1px solid rgb(55 53 47 / 0.16);
}

.mdm-markdown img {
  max-width: 100%;
  height: auto;
}

/*
 * 只有正文里的裸 pre 才按阅读版式排；围栏的 pre 带 mdm-code，外框、字号、底色与滚动都归
 * 宿主的代码卡。.mdm-markdown pre 比 .mdm-code 多一个元素位，不把它排除，正文的内边距、
 * 85% 字号与底色就会压过 .mdm-code 的复位，在代码卡里再叠一层灰底和小字。
 */
.mdm-markdown pre:not(.mdm-code) {
  overflow-x: auto;

  margin: 8px 0;
  padding: 12px 16px;
  border-radius: 4px;

  font-family: SFMono-Regular, menlo, consolas, 'Liberation Mono', courier, monospace;
  font-size: 85%;
  line-height: 1.5;

  background-color: rgb(247 246 243);
}

.mdm-markdown pre code {
  padding: 0;
  font: inherit;
  color: inherit;
  background-color: transparent;
}

.mdm-markdown table {
  border-spacing: 0;
  border-collapse: collapse;
  width: 100%;
  margin: 8px 0;
}

.mdm-markdown th,
.mdm-markdown td {
  padding: 7px 9px;
  border: 1px solid #e9e9e7;

  text-align: left;
  overflow-wrap: anywhere;
  vertical-align: middle;
}

.mdm-markdown th {
  font-weight: 500;
  white-space: nowrap;
  background-color: rgb(242 241 238 / 0.5);
}

.mdm-markdown-secondary {
  color: rgb(55 53 47 / 0.65);
}

.mdm-heading {
  margin: 0;
  font-weight: 600;
  color: #37352f;
}

h1.mdm-heading {
  font-size: 30px;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.01em;
}

h2.mdm-heading {
  font-size: 24px;
  line-height: 1.3;
}

h3.mdm-heading {
  font-size: 20px;
  line-height: 1.4;
}

h4.mdm-heading {
  font-size: 18px;
  line-height: 1.4;
}
${dark}`
}
