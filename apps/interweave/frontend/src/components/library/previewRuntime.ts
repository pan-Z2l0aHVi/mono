import { PREVIEW_LANGUAGES } from './preview'

/*
 * 预览的 md-to-meta 运行时 adapter：shiki / markdown 解析只在首次打开 markdown 或代码预览时
 * 才加载（动态 import 独立成 chunk），不拖慢应用启动；首次加载失败时清空缓存以便重试。
 */
export interface RawPreviewMarkdownNode {
  label: string
  id?: string
  lang?: string
  content?: string
  src?: string
  alt?: string
  children?: RawPreviewMarkdownNode[]
  path?: string
}

export interface PreviewRendererPort {
  parseMarkdown(source: string): Promise<{ nodes: RawPreviewMarkdownNode[] }>
  highlightCode(code: string, language: string): Promise<string>
}

export type RuntimeModule = {
  parseMarkdown: (
    source: string,
    file: string,
    options: {
      exec: readonly string[]
      hash?: (code: string) => string
      highlight?: (code: string, lang: string, file: string) => Promise<string>
    }
  ) => Promise<{ nodes: RawPreviewMarkdownNode[]; codeFiles: unknown[] }>
  highlightRuntime: (code: string, lang: string, options?: { allowedLangs?: readonly string[] }) => Promise<string>
}

let runtime: Promise<RuntimeModule> | null = null

const defaultRuntimeLoader = (): Promise<RuntimeModule> =>
  import('@greypan/md-to-meta/runtime') as Promise<RuntimeModule>

export function loadPreviewRuntime(
  loader: () => Promise<RuntimeModule> = defaultRuntimeLoader
): Promise<RuntimeModule> {
  if (!runtime) {
    runtime = loader().catch(err => {
      runtime = null
      throw err
    })
  }
  return runtime
}

/** 生产默认渲染器 adapter：基于 md-to-meta runtime 完成 markdown 解析与 shiki 双主题着色。 */
export function createDefaultPreviewRenderer(): PreviewRendererPort {
  return {
    async parseMarkdown(source: string) {
      const module = await loadPreviewRuntime()
      const parsed = await module.parseMarkdown(source, 'preview.md', {
        exec: [],
        highlight: (code, lang) => module.highlightRuntime(code, lang, { allowedLangs: PREVIEW_LANGUAGES })
      })
      return { nodes: parsed.nodes }
    },
    async highlightCode(code: string, language: string) {
      const module = await loadPreviewRuntime()
      return await module.highlightRuntime(code, language, { allowedLangs: PREVIEW_LANGUAGES })
    }
  }
}
