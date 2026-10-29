// 包的唯一入口。子路径不再对外导出：消费方一律 `import { … } from '@greypan/monorepo-kit'`。
//
// 导出分两类，判据是「模块的导出名是否互相冲突」，不是风格偏好：
//   - 命名空间导出：检查单元（13 个）全部导出 `name` 与 `run`，平铺会互相覆盖；
//     `check-runner` 读的正是 `check.name` / `check.run`，所以命名空间是这套协议的载体，
//     不是规避重名的权宜手段。`contextInvariants` 与 `shellI18nCatalog` 也走命名空间：
//     前者 12 个 helper 名字过于通用，后者的 `checkApp` 放进平铺面指代不明（哪个 app）。
//   - 平铺导出：叶子函数与常量，包内名字唯一，平铺后调用点最短。
//
// 包内模块之间仍然用相对路径互相 import；写成 `@greypan/monorepo-kit` 会绕回本文件形成环。

export * as changesetPolicy from './policy/changeset-policy'
export * as changesetStatus from './policy/changeset-status'
export * as commandConventions from './policy/command-conventions'
export * as contextCorpus from './policy/context-corpus'
export * as contextInvariants from './policy/context-invariants'
export * as goCheck from './policy/go-check'
export * as interweaveTurboInputs from './policy/interweave-turbo-inputs'
export * as noMutualLinks from './policy/no-mutual-links'
export * as packageContract from './policy/package-contract'
export * as readmeLocales from './policy/readme-locales'
export * as scriptTests from './policy/script-tests'
export * as shellI18nCatalog from './policy/shell-i18n-catalog'
export * as stagedClean from './policy/staged-clean'
export * as turboCacheInvariant from './policy/turbo-cache-invariant'
export * as webUiDocsInputs from './policy/web-ui-docs-inputs'

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
