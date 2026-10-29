// 包的唯一入口。子路径不再对外导出：消费方一律 `import { … } from '@greypan/monorepo-kit'`。
//
// 导出分三类：
//   - 能力插件：`defineXxx(options)` 返回插件，`.use()` 组合、`.make(ctx)` 得到能力对象；
//   - 检查单元：`defineXxx(options)` 返回 `{ name, run }`，仓库事实只经 options 进入，实例由
//     消费仓库的 `scripts/policies/` 建好再交给入口；
//   - 叶子函数与常量：包内名字唯一，平铺后调用点最短。
//
// 包内模块之间仍然用相对路径互相 import；写成 `@greypan/monorepo-kit` 会绕回本文件形成环。

export { defineChangesetRequired } from './checks/changeset-required'
export { defineChangesetStatus } from './checks/changeset-status'
export { defineCommandConventions } from './checks/command-conventions'
export type { CommandConventionsOptions } from './checks/command-conventions'
export { defineContextCorpus } from './checks/context-corpus'
export type { ContextCorpusOptions, SkillsSurface } from './checks/context-corpus'
export { defineDocsInputs } from './checks/docs-inputs'
export type { DocsInputsOptions } from './checks/docs-inputs'
export { defineGitHooksStatus } from './checks/git-hooks-status'
export type { GitHooksStatus, GitHooksStatusOptions, HookStatus } from './checks/git-hooks-status'
export { defineGoCheck } from './checks/go-check'
export type { GoCheckOptions } from './checks/go-check'
export { defineNoMutualLinks } from './checks/no-mutual-links'
export type { NoMutualLinksOptions } from './checks/no-mutual-links'
export { definePackageContract } from './checks/package-contract'
export { defineReadmeLocales } from './checks/readme-locales'
export type { ReadmeLocalesOptions } from './checks/readme-locales'
export { defineScriptTests } from './checks/script-tests'
export { defineShellI18nCatalog } from './checks/shell-i18n-catalog'
export type { ShellI18nCatalogOptions } from './checks/shell-i18n-catalog'
export { defineStagedClean } from './checks/staged-clean'
export type { StagedCleanOptions } from './checks/staged-clean'
export { defineTestPortCallSites } from './checks/test-port-call-sites'
export type { TestPortCallSitesOptions } from './checks/test-port-call-sites'
export { defineTurboCacheInvariant } from './checks/turbo-cache-invariant'
export { defineTurboInputs } from './checks/turbo-inputs'
export type { TurboInput, TurboInputsOptions } from './checks/turbo-inputs'

export { defineChangesets } from './plugins/changesets'
export type { ChangesetsApi, ChangesetsOptions } from './plugins/changesets'
export { commandOutput, defineExec, exec, pnpm } from './plugins/exec'
export type { ExecApi, ExecOptions, ExecResult } from './plugins/exec'
export { defineGit } from './plugins/git'
export type { ChangedFilesOptions, GitApi } from './plugins/git'
export { defineTestPorts, testApiPort, testApiPortNames } from './plugins/test-ports'
export type { TestPortsApi, TestPortsOptions } from './plugins/test-ports'
export { defineToolchain } from './plugins/toolchain'
export type { ToolchainStep } from './plugins/toolchain'
export { defineTurbo } from './plugins/turbo'
export type { TurboApi } from './plugins/turbo'
export {
  defineWorkspace,
  findRepoRoot,
  listPnpmWorkspaceManifests,
  readPnpmWorkspaceDirectories,
  readPnpmWorkspacePatterns
} from './plugins/workspace'
export type { WorkspaceApi } from './plugins/workspace'

export { runChecks, runEntrypoint } from './runner/check-runner'
export type { CheckContext, CheckResult, CheckUnit } from './runner/check-runner'

export { readJsonFile } from './shared/config'
export { byCodeUnit } from './shared/order'
