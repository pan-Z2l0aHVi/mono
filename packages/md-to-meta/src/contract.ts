/**
 * 引擎输出契约的类名与纯文本读取函数：高亮 HTML 与 theme.css 各写一半，宿主（代码卡、复制、
 * 折叠）按这里的导出对齐，不抄字符串。只收「读产物要用的」符号，不收宿主业务知识（ADR-0019）。
 *
 * 本模块是独立 exports 子路径 `@greypan/md-to-meta/contract`，不许引入任何运行时依赖：
 * demo 的 codeblock 与浏览器测试只读契约，从根入口 import 会把生成期依赖（shiki、tinyglobby）
 * 拖进浏览器图。`highlight.ts` 与根入口从这里取 `visibleText` / `lineCountOf`。
 */

/** 围栏 `<pre>` 的主题类名：highlight 并到 shiki 的 `<pre>` 上，theme.css 按它复位自带版式。 */
export const MDM_CODE_CLASS = 'mdm-code'

/** 标题类名：宿主渲染标题节点时挂它，theme.css 给版式。 */
export const MDM_HEADING_CLASS = 'mdm-heading'

/** 正文容器类名：宿主渲染整篇 meta 时挂它。 */
export const MDM_MARKDOWN_CLASS = 'mdm-markdown'

/** 次要正文类名：在 `.mdm-markdown` 之上再加一档，theme.css 调淡颜色。 */
export const MDM_MARKDOWN_SECONDARY_CLASS = 'mdm-markdown-secondary'

/**
 * 行号槽的类名：transformer 写它，`visibleText` 豁免它，theme.css 排版它，宿主摘行号槽按它选。
 * 行号由 shiki 官方 transformer 按真实行号注入（空行也占一号）。
 */
export const LINE_NUMBER_CLASS = 'line-number'

/** shiki 核心按行包的 `<span class="line">`：每行恰好一个，`lineCountOf` 按它数行。 */
export const LINE_CLASS = 'line'

/** 行号槽整段（含数字）；`visibleText` 在剥标记之前先摘掉它。 */
const LINE_NUMBER_SPAN = new RegExp(`<span class="${LINE_NUMBER_CLASS}">[^<]*</span>`, 'g')

/** 每行的行 span 开头；`lineCountOf` 按它数行。 */
const LINE_SPAN = new RegExp(`<span class="${LINE_CLASS}"`, 'g')

const NAMED_ENTITIES: Record<string, string> = { amp: '&', apos: "'", gt: '>', lt: '<', quot: '"' }

/**
 * 高亮 HTML 的可见文本：摘掉行号槽、剥掉标记、解掉实体。
 * 导出给宿主复用：宿主断言「页面显示的代码 == markdown 围栏」时量的是同一份可见文本。
 */
export function visibleText(html: string): string {
  return html
    .replace(LINE_NUMBER_SPAN, '')
    .replace(/<[^>]*>/g, '')
    .replace(
      /&#x([\da-f]+);|&#(\d+);|&([a-z]+);/gi,
      (whole, hex: string | undefined, dec: string | undefined, name: string | undefined) => {
        if (hex) return String.fromCodePoint(Number.parseInt(hex, 16))
        if (dec) return String.fromCodePoint(Number.parseInt(dec, 10))
        return (name && NAMED_ENTITIES[name.toLowerCase()]) || whole
      }
    )
}

/**
 * 高亮 HTML 的行数：shiki 每行恰好包一个 `<span class="line">`，按它数行不必解析整棵树。
 * 宿主判「代码卡要不要折叠」用这一份，不再各自手写数行正则。
 */
export function lineCountOf(html: string): number {
  return html.match(LINE_SPAN)?.length ?? 0
}
