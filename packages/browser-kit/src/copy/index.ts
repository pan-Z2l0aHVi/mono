/**
 * 跨浏览器剪贴板复制
 *
 * 内部委托给 `copy-to-clipboard` (v4+)，该库已内置完整的降级链：
 *   1. navigator.clipboard.writeText / write(ClipboardItem) — 安全上下文优先
 *   2. document.execCommand('copy') — 非 HTTPS / 旧浏览器回退
 *   3. window.prompt() — 需显式开启 fallbackToPrompt（v4 起默认关闭）
 *
 * 本包装器在此基础上额外支持 Blob 输入，自动识别 MIME 类型。
 * 复制失败时静默处理 —— 调用方无需也无法处理该异常。
 *
 * @example
 * ```ts
 * await copyToClipboard('Hello World')
 * await copyToClipboard('Hello', { debug: true })
 * await copyToClipboard(new Blob(['<b>Hi</b>'], { type: 'text/html' }))
 * await copyToClipboard('Hello', { format: 'text/plain' })
 * ```
 */
import copy from 'copy-to-clipboard'

export interface CopyOptions {
  /** 剪贴板 MIME 类型，默认 `'text/plain'`。设为 `'text/html'` 可写入富文本。 */
  format?: string
  /** 开启后会在控制台输出诊断信息，便于排查复制失败的原因。 */
  debug?: boolean
}

/**
 * 将文本或 Blob 写入系统剪贴板。
 *
 * @param content - 文本字符串或 {@link Blob}。Blob 会自动读取内容并使用其 `type` 作为 MIME。
 * @param options  - 可选配置，详见 {@link CopyOptions}。
 */
export async function copyToClipboard(content: string | Blob, options: CopyOptions = {}): Promise<void> {
  const { format, debug = false } = options

  let text: string
  let mimeType: string

  if (content instanceof Blob) {
    text = await content.text()
    mimeType = format || content.type || 'text/plain'
  } else {
    text = content
    mimeType = format || 'text/plain'
  }

  await copy(text, { format: mimeType, debug })
}
