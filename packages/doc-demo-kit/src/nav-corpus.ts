import { existsSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vite-plus/test'

import { NAV_SECTIONS, type NavItem, type NavSection } from './nav'

/** 宿主注入的语料目录；kit 不硬编码仓库路径。 */
export interface NavCorpusContractOptions<Id extends string = string> {
  /** 语料目录（本仓是 `packages/web-ui/docs`），由宿主解析后传入。 */
  readonly docsDir: string
  /** 可选自定义导航分组；缺省校验 `NAV_SECTIONS`。 */
  readonly sections?: readonly NavSection<Id>[]
  /** 可选自定义条目到文件基名的映射；缺省取 `item.path` 尾段。 */
  readonly basenameOf?: (item: NavItem) => string
}

/**
 * shared nav 条目 ↔ 语料文件的存在性契约，宿主注入语料目录。
 *
 * 只检查单向：每个 nav 条目（含通过 `item.docs` 声明的附属子文档，如 `button-group`）必须在语料目录
 * 有同英文名的 `.md` 与 `.CN.md`。nav 是两端侧栏、搜索与动态组件路由的全集，任一文档缺失都会让用户落到空页。
 */
export function runNavCorpusContractTests<Id extends string = string>({
  docsDir,
  sections = NAV_SECTIONS as readonly NavSection<Id>[],
  basenameOf = item => item.path.split('/').at(-1)!
}: NavCorpusContractOptions<Id>): void {
  const docCases = sections.flatMap(section =>
    section.items.flatMap(item => {
      const docs = item.docs ?? [basenameOf(item)]
      return docs.map(doc => [item.label, doc] as const)
    })
  )

  describe('语料契约（单向）', () => {
    it.each(docCases)('%s 的文档 %s 在语料目录有同名的 .md 与 .CN.md', (_label, doc) => {
      // 文件名是 kebab-case 的路由 basename（back-top.md），不是显示标签（BackTop）。
      expect(existsSync(path.join(docsDir, `${doc}.md`)), `${doc}.md 缺失`).toBe(true)
      expect(existsSync(path.join(docsDir, `${doc}.CN.md`)), `${doc}.CN.md 缺失`).toBe(true)
    })
  })
}
