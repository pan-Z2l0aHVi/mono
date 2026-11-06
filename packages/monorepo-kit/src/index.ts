// 包的入口。导出三类：
//   - 链协议：`defineRunner()` 是唯一的链基座（链头给恒等 `ok`，链中原样转发继承来的 `run`），
//     `defineCatch()` 把逃逸的异常收成 `throw: ` 前缀的 `Err`；
//   - 判定与能力插件：`defineXxx(options)` 返回插件，判定插件产 `run`，能力插件产方法；触发层
//     用 `.use()` 按想要的顺序组合，再 `.make({ root, env })` 得到实例；
//   - 叶子函数与常量：包内名字唯一、不需要上下文的部分实现，平铺后调用点最短。
//
// Vite 侧的适配（取端口、dev HTTPS）不在这里，走 `@greypan/monorepo-kit/vite`：本入口的消费者是
// Node 脚本，不该为了两个配置符号把 Vite 的类型面摊给每个 import。
//
// 包内模块之间仍然用相对路径互相 import；写成 `@greypan/monorepo-kit` 会绕回本文件形成环。

export { defineRunner } from './runner/runner'
export type { Chain, KitCtx, Run } from './runner/runner'
export { defineCatch } from './runner/catch'

export { defineChangesetRequired } from './plugin/changesets/changeset-required'
export type { ChangesetRequiredOptions } from './plugin/changesets/changeset-required'
export { defineChangesetStatus } from './plugin/changesets/changeset-status'
export type { ChangesetStatusOptions } from './plugin/changesets/changeset-status'
export { defineChangesets } from './plugin/changesets/changesets'
export type { ChangesetsApi, ChangesetsOptions } from './plugin/changesets/changesets'
export { defineCommandConventions } from './plugin/workspace/command-conventions'
export type { CommandConventionsOptions } from './plugin/workspace/command-conventions'
export { defineContextCorpus } from './plugin/workspace/context-corpus'
export type { ContextCorpusOptions, SkillsSurface } from './plugin/workspace/context-corpus'
export { defineDocsInputs } from './plugin/turbo/docs-inputs'
export type { DocsInputsOptions } from './plugin/turbo/docs-inputs'
export { defineExec } from './plugin/exec/exec'
export type { ExecApi, ExecOptions, ExecResult } from './plugin/exec/exec'
export { defineFullCheckout } from './plugin/git/full-checkout'
export type { FullCheckoutOptions } from './plugin/git/full-checkout'
export { defineGit } from './plugin/git/git'
export type { ChangedFilesOptions, GitApi } from './plugin/git/git'
export { defineGitHooksStatus } from './plugin/git/git-hooks-status'
export type { GitHooksStatusApi, GitHooksStatusOptions, HookStatus } from './plugin/git/git-hooks-status'
export { defineGoCheck } from './plugin/exec/go-check'
export type { GoCheckOptions } from './plugin/exec/go-check'
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
export { defineTestPorts } from './plugin/test-ports/test-ports'
export type { TestPortsApi, TestPortsOptions } from './plugin/test-ports/test-ports'
export { defineToolchain } from './plugin/toolchain/toolchain'
export type { ToolchainApi, ToolchainStep } from './plugin/toolchain/toolchain'
export { defineTurbo } from './plugin/turbo/turbo'
export type { TurboApi } from './plugin/turbo/turbo'
export { defineTurboCacheInvariant } from './plugin/turbo/turbo-cache-invariant'
export { defineTurboInputPaths } from './plugin/turbo/turbo-input-paths'
export { defineTurboInputs } from './plugin/turbo/turbo-inputs'
export type { TurboInput, TurboInputsOptions } from './plugin/turbo/turbo-inputs'
export { defineWorkspace } from './plugin/workspace/workspace'
export type { WorkspaceApi } from './plugin/workspace/workspace'

export { commandOutput, exec, failureEvidence, pnpm } from './plugin/exec/exec'
export {
  listPnpmWorkspaceManifests,
  readPnpmWorkspaceDirectories,
  readPnpmWorkspacePatterns
} from './plugin/workspace/workspace'
export { readJsonFile } from './shared/config'
export { byCodeUnit } from './shared/order'
export { getWorkspaceRoot } from './shared/workspace-root'
