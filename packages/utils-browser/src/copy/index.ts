/**
 * @description
 * 复制文本到剪切板
 * 优先使用现代 navigator.clipboard API，失败或环境不支持时自动降级到 copy-to-clipboard
 * 现代异步 API (兼容性低且仅在安全上下文 HTTPS/Localhost 下可用)
 */
import copy from 'copy-to-clipboard'

type CopyToClipboardOptions = Parameters<typeof copy>[1]
export type CopyOptions = Exclude<CopyToClipboardOptions, undefined>

export async function copyToClipboard(text: string | Blob, options: CopyOptions = {}): Promise<void> {
  const { format, debug = false, onCopy } = options

  if (navigator.clipboard && window.isSecureContext) {
    if (typeof text === 'string' && (!format || format === 'text/plain')) {
      try {
        await navigator.clipboard.writeText(text)
        onCopy?.({ 'text/plain': text })
        return
      } catch (error) {
        if (debug) console.warn('Modern Clipboard writeText API failed, falling back...', error)
      }
    }

    // Blob 或 富文本路径
    // 自动确定 MIME 类型：优先使用 format，其次是 Blob 的 type，最后保底 text/plain
    const mimeType = format ?? (text instanceof Blob ? text.type : 'text/plain')
    const blob = text instanceof Blob ? text : new Blob([text], { type: mimeType })

    try {
      const clipboardItem = new ClipboardItem({ [mimeType]: blob })
      await navigator.clipboard.write([clipboardItem])
      onCopy?.(clipboardItem)
      return
    } catch (error) {
      if (debug) console.warn('Modern Clipboard write API failed, falling back...', error)
    }
  }

  if (text instanceof Blob) {
    if (debug) console.error('Blob is not supported by copy-to-clipboard.')
    throw new Error('Blob is not supported by copy-to-clipboard.')
  }

  try {
    copy(text, options)
    return
  } catch (error) {
    if (debug) console.error('All copy methods failed:', error)
    throw new Error('All copy methods failed.')
  }
}
