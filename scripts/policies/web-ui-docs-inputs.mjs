import { defineDocsInputs } from '@greypan/monorepo-kit'

/**
 * `packages/web-ui` 是唯一「文档语料住在被发布包里」的包：那批示例 md 是 build 与 test 的真输入。
 * 根 `turbo.json` 的 Markdown 排除规则把它们排掉，包级 `turbo.json` 必须反过来纳入语料、按名字排掉散文 md。
 * 名单与目录是本仓事实，判据在包里。
 */
const options = {
  packageDir: 'packages/web-ui',
  corpusDir: 'docs',
  proseNames: ['README.md', 'README.CN.md', 'AGENTS.md', 'CHANGELOG.md']
}

/** 全仓口径（check-policy，先过 fullCheckout）：包目录缺失就是失败。 */
export const webUiDocsInputs = defineDocsInputs(options)

/**
 * 提交边界口径（check-pre-commit）：稀疏 cone 可以合法隐藏整个 `packages/web-ui`，此时跳过；
 * 全 checkout 的完整判定由 check-policy 承担。稀疏信号只认 manifest 的 skip-worktree 位。
 */
export const webUiDocsInputsSparseTolerant = defineDocsInputs({ ...options, allowSparsePackages: true })
