import { defineDocsInputs } from '@greypan/monorepo-kit'

/**
 * `packages/web-ui` 是唯一「文档语料住在被发布包里」的包：那批示例 md 是 build 与 test 的真输入。
 * 根 `turbo.json` 的 Markdown 排除规则把它们排掉，包级 `turbo.json` 必须反过来纳入语料、按名字排掉散文 md。
 * 名单与目录是本仓事实，判据在包里。
 */
export const webUiDocsInputs = defineDocsInputs({
  name: 'web-ui-docs-inputs',
  packageDir: 'packages/web-ui',
  corpusDir: 'docs',
  proseNames: ['README.md', 'README.CN.md', 'AGENTS.md', 'CHANGELOG.md']
})
