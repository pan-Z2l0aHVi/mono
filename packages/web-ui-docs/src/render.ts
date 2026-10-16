import type { SampleFlavor } from './highlight'
import type { ApiRow } from './markdown'

export interface ExampleApiSection {
  key: 'props' | 'events' | 'slots'
  title: string
  rows: ApiRow[]
}

export interface ExampleSamplePayload {
  /** `### 标题 {#id}` 的锚点；null 表示这条示例只展示代码。 */
  id: string | null
  title: string
  descriptionHtml: string
  html: Record<SampleFlavor, string>
  /** 非 null 时 `demos/<liveKey>` 已被发出，可以直接挂成真组件。 */
  liveKey: string | null
}

export interface ExampleDocPayload {
  component: string
  tag: string
  introHtml: string
  samples: ExampleSamplePayload[]
  api: ExampleApiSection[]
}

const MODULE_HEADER = `// 本文件由 @greypan/web-ui-docs 生成，请勿手动编辑。
// source of truth：docs/examples/web-ui/*.md —— 示例代码、API 表的名称/说明/类型/默认值都在这一份里。
// 重新生成：node scripts/generate-web-ui-examples.mjs`

const MODULE_TYPES = `export interface ExampleApiRow {
  name: string
  type?: string
  default?: string
  descriptionHtml: string
}

export interface ExampleApiSection {
  key: 'props' | 'events' | 'slots'
  title: string
  rows: ExampleApiRow[]
}

export interface ExampleSample {
  id: string | null
  title: string
  descriptionHtml: string
  html: { react: string; vue: string }
  liveKey: string | null
}

export interface ExampleDoc {
  component: string
  tag: string
  introHtml: string
  samples: ExampleSample[]
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
 * 深色判定跟着 `web-ui-theme` 的 `resolved-appearance` 走，和组件其余表面用同一个外观源，
 * 所以切换外观不需要重新生成高亮 HTML。
 *
 * 外框（圆角、底色、内边距、滚动、字号）仍然由两个 demo 的 example-doc 组件用 Tailwind 工具类写，
 * 所以 `.wui-example-code` 把 shiki 自带的 `<pre>` 版式复位成「继承外面那一层」——
 * 这部分归仓级 Tailwind 主题管，搬进来反而会绕开它。
 */
export function renderCss(): string {
  return `/* 本文件由 @greypan/web-ui-docs 生成，请勿手动编辑。 */

/*
 * shiki 的 defaultColor: false 把颜色输出成 CSS 变量，浅色取 --shiki-light、深色取 --shiki-dark。
 * 深色判定跟着 web-ui-theme 的 resolved-appearance 走，和组件其余表面用同一个外观源，
 * 所以切换外观不需要重新生成高亮 HTML。
 */
.shiki,
.shiki span {
  color: var(--shiki-light);
}

web-ui-theme[resolved-appearance='dark'] .shiki,
web-ui-theme[resolved-appearance='dark'] .shiki span {
  color: var(--shiki-dark);
}

/*
 * shiki 产出的是自带版式的 <pre>（等宽、margin、背景都在它自己的 style 里），
 * 而示例代码块的外框由两个 demo 用 Tailwind 工具类提供。这里把前者复位成继承，
 * 否则同一块代码会出现两层边框与两套字号。
 */
.wui-example-code {
  margin: 0;
  font: inherit;
  background: transparent;
}
`
}
