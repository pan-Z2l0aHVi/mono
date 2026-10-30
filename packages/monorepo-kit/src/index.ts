// 包的唯一入口。子路径不再对外导出：消费方一律 `import { … } from '@greypan/monorepo-kit'`。
//
// 导出分三类：
//   - 能力插件：`defineXxx(options)` 返回插件，`.use()` 组合、`.make(ctx)` 得到能力对象；
//   - 检查单元：`defineXxx(options)` 返回 `{ name, run }`，仓库事实只经 options 进入，实例由
//     消费仓库的 `scripts/policies/` 建好再交给入口；
//   - 叶子函数与常量：包内名字唯一，平铺后调用点最短。
//
// 包内模块之间仍然用相对路径互相 import；写成 `@greypan/monorepo-kit` 会绕回本文件形成环。

export { defineChangesetRequired } from './plugin/changesets/changeset-required'
export { defineChangesetStatus } from './plugin/changesets/changeset-status'
export { defineCommandConventions } from './plugin/workspace/command-conventions'
export type { CommandConventionsOptions } from './plugin/workspace/command-conventions'
export { defineContextCorpus } from './plugin/workspace/context-corpus'
export type { ContextCorpusOptions, SkillsSurface } from './plugin/workspace/context-corpus'
export { defineDocsInputs } from './plugin/turbo/docs-inputs'
export type { DocsInputsOptions } from './plugin/turbo/docs-inputs'
export { defineGitHooksStatus } from './plugin/git/git-hooks-status'
export type { GitHooksStatus, GitHooksStatusOptions, HookStatus } from './plugin/git/git-hooks-status'
export { defineGoCheck } from './plugin/exec/go-check'
export type { GoCheckOptions } from './plugin/exec/go-check'
export { devHttpsPlugin } from './plugin/dev-https/dev-https'
export type { DevHttpsOptions } from './plugin/dev-https/dev-https'
export { defineNoMutualLinks } from './plugin/workspace/no-mutual-links'
export type { NoMutualLinksOptions } from './plugin/workspace/no-mutual-links'
export { definePackageContract } from './plugin/workspace/package-contract'
export { defineReadmeLocales } from './plugin/workspace/readme-locales'
export type { ReadmeLocalesOptions } from './plugin/workspace/readme-locales'
export { defineScriptTests } from './plugin/exec/script-tests'
export { defineShellI18nCatalog } from './plugin/exec/shell-i18n-catalog'
export type { ShellI18nCatalogOptions } from './plugin/exec/shell-i18n-catalog'
export { defineStagedClean } from './plugin/git/staged-clean'
export type { StagedCleanOptions } from './plugin/git/staged-clean'
export { defineTestPortCallSites } from './plugin/test-ports/test-port-call-sites'
export type { TestPortCallSitesOptions } from './plugin/test-ports/test-port-call-sites'
export { defineTurboCacheInvariant } from './plugin/turbo/turbo-cache-invariant'
export { defineTurboInputPaths } from './plugin/turbo/turbo-input-paths'
export { defineTurboInputs } from './plugin/turbo/turbo-inputs'
export type { TurboInput, TurboInputsOptions } from './plugin/turbo/turbo-inputs'

export { defineChangesets } from './plugin/changesets/changesets'
export type { ChangesetsApi, ChangesetsOptions } from './plugin/changesets/changesets'
export { commandOutput, defineExec, exec, pnpm } from './plugin/exec/exec'
export type { ExecApi, ExecOptions, ExecResult } from './plugin/exec/exec'
export { defineGit } from './plugin/git/git'
export type { ChangedFilesOptions, GitApi } from './plugin/git/git'
export { defineTestPorts, testApiPort, testApiPortNames } from './plugin/test-ports/test-ports'
export type { TestPortsApi, TestPortsOptions } from './plugin/test-ports/test-ports'
export { defineToolchain } from './plugin/toolchain/toolchain'
export type { ToolchainStep } from './plugin/toolchain/toolchain'
export { defineTurbo } from './plugin/turbo/turbo'
export type { TurboApi } from './plugin/turbo/turbo'
export {
  defineWorkspace,
  findRepoRoot,
  listPnpmWorkspaceManifests,
  readPnpmWorkspaceDirectories,
  readPnpmWorkspacePatterns
} from './plugin/workspace/workspace'
export type { WorkspaceApi } from './plugin/workspace/workspace'

export { runChecks, runEntrypoint } from './runner/check-runner'
export type { CheckContext, CheckResult, CheckUnit } from './runner/check-runner'

export { readJsonFile } from './shared/config'
export { byCodeUnit } from './shared/order'
