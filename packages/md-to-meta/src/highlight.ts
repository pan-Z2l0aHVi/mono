import { transformerRenderLineNumber } from '@shikijs/transformers'
import { createHighlighter, type Highlighter } from 'shiki'

import { fail } from './errors'

const THEMES = { light: 'github-light', dark: 'github-dark' } as const

/**
 * 行号槽的类名：transformer 写它，`visibleText` 豁免它，两处读同一个常量。
 * 行号由 shiki 官方 transformer 按真实行号注入（空行也占一号）。
 */
const LINE_NUMBER_CLASS = 'line-number'

const TRANSFORMERS = [transformerRenderLineNumber({ classLineNumber: LINE_NUMBER_CLASS })]

/** 行号槽整段（含数字）；`visibleText` 在剥标记之前先摘掉它。 */
const LINE_NUMBER_SPAN = new RegExp(`<span class="${LINE_NUMBER_CLASS}">[^<]*</span>`, 'g')

let ready: Promise<Highlighter> | undefined

function highlighter(): Promise<Highlighter> {
  return (ready ??= createHighlighter({ themes: Object.values(THEMES), langs: [] }))
}

/** 未注册的语言退回纯文本：引擎不维护语言白名单，也不因为未知语言中断整次生成。 */
function plain(code: string): string {
  return `<pre class="shiki mdm-code"><code>${escapeHtml(code)}</code></pre>`
}

function escapeHtml(text: string): string {
  return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

/**
 * 双主题输出：`defaultColor: false` 让 shiki 把颜色写成 `--shiki-light` / `--shiki-dark` 变量，
 * 由生成的 CSS 按宿主的外观源选用，深浅色切换不需要重新生成。
 * 行号一并由 `TRANSFORMERS` 在生成期写进 HTML，宿主不需要运行时再数一遍行。
 */
export async function highlight(code: string, lang: string, file: string): Promise<string> {
  if (!lang) return plain(code)
  const hl = await highlighter()
  try {
    await hl.loadLanguage(lang as never)
  } catch {
    return plain(code)
  }
  // 仓库文档的生成结果必须完整、可重建；分词不按机器负载截断着色。
  const html = hl.codeToHtml(code, {
    lang,
    themes: THEMES,
    defaultColor: false,
    tokenizeTimeLimit: 0,
    transformers: TRANSFORMERS
  })
  // 外框（圆角、底色、滚动）归宿主自己的样式管，这里只把类名并到 shiki 的 <pre> 上。
  const framed = html.replace(/^<pre class="([^"]*)"/, '<pre class="$1 mdm-code"')
  if (framed === html) fail(`${file}：shiki 输出的 <pre> 形状变了，类名并不上：${html.slice(0, 80)}`)
  assertHtmlPreservesSource(code, framed, file)
  return framed
}

/**
 * 自证：发出去的 HTML 剥掉标记、解掉实体之后必须逐字等于输入。着色器吞掉一个空白或字符，
 * 页面上显示的就不是 markdown 里那一份，而示例代码块同时是「被执行的那份源码」，这条不能松。
 * 唯一的例外是行号槽：它是我们自己注入的、代码之外的文本，所以先整段摘掉再比。
 */
function assertHtmlPreservesSource(code: string, html: string, file: string): void {
  const restored = visibleText(html)
  if (restored !== code) fail(`${file}：shiki 改变了代码块原文。\n--- 输入 ---\n${code}\n--- 还原后 ---\n${restored}`)
}

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
