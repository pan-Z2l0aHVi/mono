/**
 * 一篇 markdown 落成的通用结构节点。`label` 是块级标签名，唯一例外是 `codeblock`。
 *
 * 行内内容（加粗、链接、行内代码……）在解析期已渲染成 HTML 字符串放在 `content` 里；
 * `children` 只承载结构嵌套（列表、表格、引用块）。宿主按 `label` 决定用哪个元素渲染。
 */
export interface MetaNode {
  /** 块级标签名；`codeblock` 是围栏代码块的专用标签。 */
  label:
    | 'h1'
    | 'h2'
    | 'h3'
    | 'h4'
    | 'h5'
    | 'h6'
    | 'p'
    | 'ul'
    | 'ol'
    | 'li'
    | 'blockquote'
    | 'hr'
    | 'table'
    | 'tr'
    | 'th'
    | 'td'
    | 'img'
    | 'codeblock'
  /** 标题锚点，`section-<n>`；只有 `h1`–`h6` 有。 */
  id?: string
  /** 行内 HTML；`codeblock` 时是高亮后的整段 HTML。 */
  content?: string
  /** 结构嵌套（列表、表格、引用块）或列表项里的嵌套块。 */
  children?: MetaNode[]
  /** `img` 的源地址。 */
  src?: string
  /** `img` 的替代文本。 */
  alt?: string
  /** `codeblock` 的围栏语言名；无语言时为空串。 */
  lang?: string
  /** `codeblock` 的代码文件相对路径，只用于显示与报错定位。 */
  path?: string
  /**
   * `codeblock` 的加载 thunk，仅当 `lang` 命中 `exec` 时存在。
   * 生成的模块里是字面 specifier 的动态 import，宿主可以直接调用它拿到可执行模块。
   */
  load?: () => Promise<unknown>
}

/** 通用 mdToMeta 插件的配置面。 */
export interface MdToMetaOptions {
  /** 字面路径或 glob，相对 Vite root 解析；支持 string | string[]。 */
  input: string | readonly string[]
  /** 产物目录，相对 Vite root 解析。 */
  output: string
  /** 可选，默认 []；只决定哪些语言生成 `load` thunk，不参与扩展名映射。 */
  exec?: readonly string[]
  /** 可选，主题 CSS 的暗色选择器。 */
  darkSelector?: string
}

/** 路径解析后的生成配置：`root` 用于解析 glob，`output` 是绝对路径。 */
export interface ResolvedOptions {
  root: string
  input: readonly string[]
  output: string
  exec: readonly string[]
  darkSelector?: string
}

/** 落盘前的内容；`path` 是绝对路径。 */
export interface GeneratedFile {
  path: string
  content: string
}

/** 围栏落成的代码文件；`path` 是相对 meta 模块的路径。 */
export interface CodeFile {
  path: string
  content: string
}

/** 一次生成的产出集合；`output` 是绝对路径，孤儿清扫以它为根。 */
export interface GenerateResult {
  files: GeneratedFile[]
  output: string
}
