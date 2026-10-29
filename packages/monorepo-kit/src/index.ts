// 包的唯一入口。子路径不再对外导出：消费方一律 `import { … } from '@greypan/monorepo-kit'`。
//
// 导出分两类，判据是「模块的导出名是否互相冲突」，不是风格偏好：
//   - 命名空间导出：尚未参数化的检查单元全部导出 `name` 与 `run`，平铺会互相覆盖；
//     `check-runner` 读的正是 `check.name` / `check.run`，所以命名空间是这套协议的载体，
//     不是规避重名的权宜手段。
//   - 平铺导出：叶子函数、常量与参数化检查工厂，包内名字唯一，平铺后调用点最短；
//     参数化检查（`defineXxx`）的实例由消费仓库的 `scripts/policies/` 建好再交给入口。
//
// 包内模块之间仍然用相对路径互相 import；写成 `@greypan/monorepo-kit` 会绕回本文件形成环。

export * as changesetPolicy from './policy/changeset-policy'
export * as changesetStatus from './policy/changeset-status'
export * as goCheck from './policy/go-check'
export * as interweaveTurboInputs from './policy/interweave-turbo-inputs'
export * as packageContract from './policy/package-contract'
export * as scriptTests from './policy/script-tests'
export * as turboCacheInvariant from './policy/turbo-cache-invariant'
export * as webUiDocsInputs from './policy/web-ui-docs-inputs'

export { defineCommandConventions } from './checks/command-conventions'
export type { CommandConventionsOptions } from './checks/command-conventions'
export { defineContextCorpus } from './checks/context-corpus'
export type { ContextCorpusOptions, SkillsSurface } from './checks/context-corpus'
export { defineNoMutualLinks } from './checks/no-mutual-links'
export type { NoMutualLinksOptions } from './checks/no-mutual-links'
export { defineReadmeLocales } from './checks/readme-locales'
export type { ReadmeLocalesOptions } from './checks/readme-locales'
export { defineShellI18nCatalog } from './checks/shell-i18n-catalog'
export type { ShellI18nCatalogOptions } from './checks/shell-i18n-catalog'
export { defineStagedClean } from './checks/staged-clean'
export type { StagedCleanOptions } from './checks/staged-clean'
export type { ToolchainStep } from './plugins/toolchain'

export { runChecks, runEntrypoint } from './policy/check-runner'
export type { CheckContext, CheckResult, CheckUnit } from './policy/check-runner'
export { inspectGitHooks } from './policy/git-hooks-status'
export type { HookStatus, InspectOptions } from './policy/git-hooks-status'

export { readJsonFile } from './shared/config'
export { commandOutput, exec, pnpm } from './shared/exec'
export { git } from './shared/git'
export { byCodeUnit } from './shared/order'
export { findRepoRoot } from './shared/repo-root'
export { listPnpmWorkspaceManifests, readPnpmWorkspacePatterns } from './shared/workspace-manifests'

export { testApiPort, testApiPortNames } from './repo/test-ports'
