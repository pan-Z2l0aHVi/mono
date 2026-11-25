import { PREVIEW_LANGUAGES } from './preview'

/*
 * 预览的 md-to-meta 运行时：shiki / markdown 解析只在首次打开 markdown 或代码预览时才加载
 * （动态 import 独立成 chunk），不拖慢应用启动。
 *
 * 运行时的失败策略是「回退纯文本」，语言白名单收敛到本应用声明预览的语言集合
 * （PREVIEW_LANGUAGES 来自 preview.ts 的扩展名映射，两处同源）。
 */
export interface PreviewMarkdownNode {
  label: string
  id?: string
  lang?: string
  content?: string
  src?: string
  alt?: string
  children?: PreviewMarkdownNode[]
  path?: string
}

type RuntimeModule = {
  parseMarkdown: (
    source: string,
    file: string,
    options: {
      exec: readonly string[]
      hash?: (code: string) => string
      highlight?: (code: string, lang: string, file: string) => Promise<string>
    }
  ) => Promise<{ nodes: PreviewMarkdownNode[]; codeFiles: unknown[] }>
  highlightRuntime: (code: string, lang: string, options?: { allowedLangs?: readonly string[] }) => Promise<string>
}

let runtime: Promise<RuntimeModule> | null = null

export function loadPreviewRuntime(): Promise<RuntimeModule> {
  return (runtime ??= import('@greypan/md-to-meta/runtime') as Promise<RuntimeModule>)
}

/** 预览着色的统一入口：语言白名单在这里收口，调用方不用各自带。 */
export function highlightForPreview(code: string, lang: string): Promise<string> {
  return loadPreviewRuntime().then(module => module.highlightRuntime(code, lang, { allowedLangs: PREVIEW_LANGUAGES }))
}
