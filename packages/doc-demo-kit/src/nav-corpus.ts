import { existsSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vite-plus/test'

import { NAV_SECTIONS } from './nav'

/** 宿主注入的语料目录；kit 不硬编码仓库路径。 */
export interface NavCorpusContractOptions {
  /** 语料目录（本仓是 `packages/web-ui/docs`），由宿主解析后传入。 */
  readonly docsDir: string
}

/**
 * shared nav 条目 ↔ 语料文件的存在性契约，宿主注入语料目录。
 *
 * 只检查单向：每个 nav 条目必须在语料目录有同英文名的 `.md` 与 `.CN.md`。nav 是两端侧栏与搜索
 * 的全集，条目缺语料会让用户落到空页；docs 里没有被 nav 收录的页面（例如子组件页）不设灯，
 * 内部组件只要不进 nav，就不受这条契约约束。
 */
export function runNavCorpusContractTests({ docsDir }: NavCorpusContractOptions): void {
  describe('语料契约（单向）', () => {
    it.each(NAV_SECTIONS.flatMap(section => section.items).map(item => [item.label, item.path] as const))(
      '%s 在语料目录有同名的 .md 与 .CN.md',
      (_label, navPath) => {
        // 文件名是 kebab-case 的路由 basename（back-top.md），不是显示标签（BackTop）。
        const basename = navPath.split('/').at(-1)!
        expect(existsSync(path.join(docsDir, `${basename}.md`)), `${basename}.md 缺失`).toBe(true)
        expect(existsSync(path.join(docsDir, `${basename}.CN.md`)), `${basename}.CN.md 缺失`).toBe(true)
      }
    )
  })
}
