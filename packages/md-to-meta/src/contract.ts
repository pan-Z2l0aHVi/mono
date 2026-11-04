/**
 * 引擎输出契约的类名：高亮 HTML 与 theme.css 各写一半，宿主（代码卡、复制、折叠）按这里的
 * 导出对齐，不抄字符串。只收「读产物要用的」符号，不收宿主业务知识（ADR-0019）。
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
