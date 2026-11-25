import { createHash } from 'node:crypto'

/**
 * 生成器的内容寻址哈希：sha256 前 12 位 hex，codeblock 文件名由它稳定。只在 Node 侧的生成路径
 * 注入；`./runtime` 与浏览器模块图不经此文件——`markdown.ts` 不再静态依赖 `node:crypto`。
 */
export function sha256Prefix12(code: string): string {
  return createHash('sha256').update(code).digest('hex').slice(0, 12)
}
