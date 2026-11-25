import { createHighlighter, type Highlighter } from 'shiki'

import { visibleText } from './contract'
import { codeToHtmlWithLineNumbers, framePre, plain } from './highlight'

/**
 * 运行时高亮：与生成期共用同一条双主题 + 行号管线（`./highlight`），只把失败策略从「报错」换成
 * 「回退纯文本」——预览是尽力而为的展示面，任何失配都不该让预览崩掉。
 *
 * 单例 highlighter：语言按需加载（shiki 的语言映射是逐语言动态 import，宿主打包时各自成 chunk，
 * 未用到的语言不会被拉进内存）。
 */
let ready: Promise<Highlighter> | undefined

function highlighter(): Promise<Highlighter> {
  return (ready ??= createHighlighter({ themes: ['github-light', 'github-dark'], langs: [] }))
}

/** 与生成期同一组别名：包管理器命令围栏按 bash 着色。 */
const BASH_ALIASES = ['npm', 'pnpm', 'bun', 'yarn'] as const

export interface RuntimeHighlightOptions {
  /**
   * 允许着色的语言白名单（bash 别名展开后比对）。给出时白名单之外一律回退纯文本，
   * 不触发语言加载；浏览器宿主用它把运行时着色收敛到自己声明的语言集合。
   */
  allowedLangs?: readonly string[]
}

export async function highlightRuntime(
  code: string,
  lang: string,
  options: RuntimeHighlightOptions = {}
): Promise<string> {
  if (!lang) return plain(code)
  const highlightLang = (BASH_ALIASES as readonly string[]).includes(lang) ? 'bash' : lang
  if (options.allowedLangs && !options.allowedLangs.includes(highlightLang)) return plain(code)
  try {
    const hl = await highlighter()
    await hl.loadLanguage(highlightLang as never)
    const framed = framePre(codeToHtmlWithLineNumbers(hl, code, highlightLang), 'runtime')
    // 与生成期同一条自证，只是失败策略不同：原文被着色器改动时回退纯文本。
    return visibleText(framed) === code ? framed : plain(code)
  } catch {
    return plain(code)
  }
}
