import { defineDocsInputs } from '@greypan/monorepo-kit'

/**
 * `packages/web-ui` 是唯一「文档语料住在被发布包里」的包：那批示例 md 是 test 的真输入
 * （build 不读 docs，`files` 只有 `dist`）；demo 侧的 build/test 才把语料当输入。
 * 根 `turbo.json` 的 Markdown 排除规则把它们排掉，包级 `turbo.json` 的 test 必须反过来
 * 纳入语料、按名字排掉散文 md。名单与目录是本仓事实，判据在包里。
 */
const options = {
  packageDir: 'packages/web-ui',
  corpusDir: 'docs',
  proseNames: ['README.md', 'README.CN.md', 'AGENTS.md', 'CHANGELOG.md']
}

/** 完整校验口径（`check-policy` 与 `check-pre-commit` 共用，因 `packages/` 永不稀疏）：包目录缺失就是失败。 */
export const webUiDocsInputs = defineDocsInputs(options)
