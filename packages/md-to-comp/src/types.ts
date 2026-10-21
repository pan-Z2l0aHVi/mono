import type { AnchorFn } from './anchor'
import type { FenceFlavor } from './highlight'

/**
 * `## API` 下各表格小节的表头，键即小节标题，值是这一节的列名。列的**次序**是引擎的约定：
 * 第 0 列是行的身份、第 1 列是富文本说明、第 2 列起都是普通值列（类型、默认值、浅色默认值……）。
 * 表头字面量与列数都从这里判，所以它是「表写歪了」唯一还能定标准的地方。
 *
 * 只登记表格小节：`## API` 里标题不在这里的小节按散文处理，正文整段渲染成 HTML。散文小节因此
 * 没有形状可声明——若它的正文里出现表格行，说明这一节本该是表，只是表头漏登记了，解析会报错。
 */
export interface ApiTables {
  columns: Readonly<Record<string, readonly string[]>>
}

/** 一份 markdown 语料怎么解析：文档骨架以外的约定全在这里。 */
export interface MdToCompConfig {
  /** markdown 源目录（绝对路径）。 */
  input: string
  /** 组件示例落成的子目录名，相对每个 output。默认 `demos`。 */
  dir?: string
  /** 从示例标题里取锚点；默认 `braceAnchor`。 */
  anchor?: AnchorFn
  /** 一条示例必须齐这几份围栏，顺序即配对顺序；扩展名由入口钉死。 */
  flavors: readonly FenceFlavor[]
  apiTables: ApiTables
  /**
   * 深色外观的祖先选择器。shiki 双主题把颜色写成 CSS 变量，浅色取 `--shiki-light`、
   * 深色取 `--shiki-dark`，由产物里的 CSS 决定当前取哪一边。外观源是宿主的（自定义元素属性、
   * `data-*`、`.dark` 都行），所以这里只收一个选择器；不写就只出浅色一条规则。
   */
  darkSelector?: string
  /**
   * 要求每条示例都带 `{#id}` 锚点并落成组件文件。默认关闭，供尚未迁移完的语料逐篇接入；
   * 全部迁移后开启，漏写锚点会在生成阶段失败，而不是静默退化成「只有代码、没有预览」。
   */
  requireDemo?: boolean
}

/** 一处产物落点。同一个 input 可以出多份，每份服务一个框架。 */
export interface OutputTarget {
  /** `examples.ts` / `examples.css` 与 `dir` 子目录的父目录（绝对路径）。 */
  output: string
  /** 这份产物取哪个 flavor 的围栏落成组件文件、用什么扩展名。 */
  flavor: FenceFlavor
}

export interface GenerateOptions extends MdToCompConfig {
  outputs: OutputTarget[]
}

/** 落盘前的内容；`path` 是绝对路径。 */
export interface GeneratedFile {
  path: string
  content: string
}
