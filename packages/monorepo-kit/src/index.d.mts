// 入口的类型声明。运行时代码在 index.mjs；`src/index.test.mjs` 逐名比对两边，
// 少声明、多声明或声明了运行时不存在的成员都会失败。
//
// 检查单元用结构化的 `CheckUnit` 描述，不为每个检查单独建模：`check-runner` 读的全部契约
// 就是 `name` 与 `run`，各检查的入参差异由检查自己解释。

export type { TestApiPortName } from './repo/test-ports.mjs'
export { BAND_WIDTH, OFFSET_STRIDE, TEST_API_PORT_NAMES, testApiPort } from './repo/test-ports.mjs'
export * as shellI18nCatalog from './policy/shell-i18n-catalog.mjs'

/** 检查接收的上下文。故意不按检查分别建模：同一批检查共享同一份 context。 */
export type CheckContext = Record<string, unknown>

/** 一个检查单元。`runEntrypoint` 只读这两个成员。 */
export interface CheckUnit {
  readonly name: string
  run(context: CheckContext): Promise<string | void>
}

export interface CheckResult {
  readonly check: CheckUnit
  readonly detail: string | void
}

export interface CorpusEntry {
  readonly file: string
  readonly source: string
}

export interface LinkTarget {
  readonly location: string
  readonly fragment: string
}

export interface ContextInvariants {
  readonly AUTHORIZATION_POINTER: string
  countNonWhitespace(source: string): number
  stripCodeSegments(source: string): string
  parseLocalLinkTarget(raw: string): LinkTarget | null
  readInlineLinkTarget(source: string, start: number): string | null
  isUnqualifiedRelativeTarget(location: string): boolean
  scanVolatilePhrases(entries: readonly CorpusEntry[]): readonly { readonly file: string; readonly phrase: string }[]
  findUnroutedAgentDocs(agentsSource: string, files: readonly string[]): string[]
  findMissingAuthorizationPointers(entries: readonly CorpusEntry[]): string[]
  findUnmarkedReferenceDocs(entries: readonly CorpusEntry[]): string[]
  findRetiredAdrMarkers(
    entries: readonly CorpusEntry[]
  ): readonly { readonly file: string; readonly line: number; readonly phrase: string }[]
  contentDigest(entries: readonly CorpusEntry[]): string
}

export interface ExecResult {
  readonly ok: boolean
  readonly status?: number | undefined
  readonly stdout: string
  readonly stderr?: string | undefined
}

export interface HookStatus {
  readonly level: 'ok' | 'warn' | 'fail'
  readonly detail: string
}

export const changesetPolicy: CheckUnit
export const changesetStatus: CheckUnit
export const commandConventions: CheckUnit
export const contextCorpus: CheckUnit
export const formatClean: CheckUnit
export const goCheck: CheckUnit
export const interweaveTurboInputs: CheckUnit
export const noMutualLinks: CheckUnit
export const packageContract: CheckUnit
export const scriptTests: CheckUnit
export const turboCacheInvariant: CheckUnit
export const webUiDocsInputs: CheckUnit

export const contextInvariants: ContextInvariants

export function runChecks(checks: readonly CheckUnit[], context?: CheckContext): Promise<readonly CheckResult[]>
export function runEntrypoint(checks: readonly CheckUnit[], context?: CheckContext): Promise<void>

export const requiredGitHooks: readonly string[]
export function inspectGitHooks(root: string, env?: Record<string, string | undefined>): HookStatus

export function readJsonFile(file: string): unknown
export const pnpm: string
export function exec(command: string, args: readonly string[], options?: object): ExecResult
export function commandOutput(result: ExecResult): string
export function git(root: string, args: readonly string[], options?: object): string
export function byCodeUnit(left: string, right: string): number
export function findRepoRoot(start?: string): string
export function readPnpmWorkspacePatterns(root: string): string[]
export function listPnpmWorkspaceManifests(root: string): string[]
export function resolveTurboCacheDir(repositoryRoot?: string, env?: Record<string, string | undefined>): string
