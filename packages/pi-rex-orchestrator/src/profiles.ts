/**
 * Agent Profile 白名单与双模命令模板。
 *
 * `rex_spawn_agent` 只接受这里的枚举名，不收任意命令字符串；模板里的参数形态来自
 * 2026-11-19 本机实测（见 `docs` 目录 README 的「阶段 1 实测结论」）：
 *
 * - claude 的位置参数 prompt 必须放在值型 flag（`--add-dir`）之前，否则被当作 flag 值吞掉；
 * - `codex exec resume` 不支持 `--add-dir`（父命令才有），且 `--json` 跟在 resume 之后；
 * - `codex exec resume` 的高危旁路 flag 是 `--dangerously-bypass-approvals-and-sandbox`。
 */

import type { PiExecResult } from './pi-types'

/** 派生一次 worker 所需的上下文。 */
export interface LaunchCtx {
  cwd: string
  /** 该 worker 专属的 handoff 目录（`--add-dir` 只授权给它自己）。 */
  handoffDir: string
  /** 指向 `turn-NNN.brief.md` 的短指令。 */
  prompt: string
  /** 续跑用的 agent session id（`codex` 的 UUID / `claude` 的 session id）。 */
  sessionId?: string
}

export interface AgentProfile {
  name: string
  /** 可执行名或绝对路径；宿主侧在派生前解析成绝对路径。 */
  binary: string
  supportsOsc7501: boolean
  supportsPositionalPrompt: boolean
  /** 追加在模板之后的参数（config 覆写）。 */
  extraArgs?: string[]
  /** 追加 `--interactive` 读取 shell 交互配置（PATH 依赖 `~/.zshrc` 的 CLI 需要）。 */
  interactiveShell: boolean
  /** 高危全自动标志；命中即在首次派生时醒目提示。 */
  dangerFlags: readonly string[]
  // 函数属性而非方法简写：覆写时引用 `base.interactiveArgs` 不触发 unbound-method。
  interactiveArgs: (ctx: LaunchCtx) => string[]
  headlessArgs: (ctx: LaunchCtx) => string[]
  headlessResumeArgs: (ctx: LaunchCtx, sessionId: string) => string[]
  interactiveResumeArgs: (ctx: LaunchCtx, sessionId: string) => string[]
}

/** 通用高危标志库；自定义 profile 默认全量启用检测。 */
const COMMON_DANGER_FLAGS: readonly string[] = [
  '--dangerously-skip-permissions',
  '--yolo',
  'danger-full-access',
  '--dangerously-bypass-approvals-and-sandbox',
  '--dangerously-bypass-hook-trust'
]

/** 值型 flag 之前必须先放位置参数，否则 prompt 会被吞；所有模板都遵守这一点。 */
function claudeFlags(ctx: LaunchCtx, ...extra: string[]): string[] {
  return ['--add-dir', ctx.handoffDir, '--output-format', 'stream-json', '--verbose', ...extra]
}

export const CLAUDE_PROFILE: AgentProfile = {
  name: 'claude',
  binary: 'claude',
  supportsOsc7501: true,
  supportsPositionalPrompt: true,
  interactiveShell: false,
  dangerFlags: COMMON_DANGER_FLAGS,
  interactiveArgs: ctx => [ctx.prompt, '--add-dir', ctx.handoffDir],
  headlessArgs: ctx => ['-p', ctx.prompt, ...claudeFlags(ctx)],
  headlessResumeArgs: (ctx, sessionId) => ['-p', ctx.prompt, '--resume', sessionId, ...claudeFlags(ctx)],
  interactiveResumeArgs: ctx => ['--resume', ctx.sessionId ?? '', '--add-dir', ctx.handoffDir]
}

function codexAddDir(ctx: LaunchCtx): string[] {
  return ['--add-dir', ctx.handoffDir]
}

export const CODEX_PROFILE: AgentProfile = {
  name: 'codex',
  binary: 'codex',
  // 未在真实 codex 会话上验证过 OSC 7501 上报，保守按不支持处理：Send-ACK 强校验自动跳过。
  supportsOsc7501: false,
  supportsPositionalPrompt: true,
  interactiveShell: false,
  dangerFlags: COMMON_DANGER_FLAGS,
  interactiveArgs: ctx => [ctx.prompt, ...codexAddDir(ctx)],
  headlessArgs: ctx => ['exec', '--json', ctx.prompt, ...codexAddDir(ctx)],
  headlessResumeArgs: (ctx, sessionId) => ['exec', 'resume', '--json', sessionId, ctx.prompt],
  // `codex exec resume` 没有 `--add-dir`；会话目录授权随原会话继承。
  interactiveResumeArgs: ctx => ['resume', ctx.sessionId ?? '']
}

const BUILT_IN: ReadonlyMap<string, AgentProfile> = new Map([
  [CLAUDE_PROFILE.name, CLAUDE_PROFILE],
  [CODEX_PROFILE.name, CODEX_PROFILE]
])

export function builtInProfileNames(): string[] {
  return [...BUILT_IN.keys()]
}

/**
 * 解析 profile 白名单。内置名走内置模板；config 里的同名条目只允许覆写
 * `binary` / `interactiveShell` / `extraArgs`（追加在全部模板之后，含 resume），不允许
 * 覆写模板本身。config 新增的自定义 profile 必须显式给出 `binary`，按通用位置参数模板
 * 派生。字段级结构校验：类型不符的条目按缺省处理——配置损坏要在激活阶段降级，不能
 * 等派生阶段才抛 TypeError。
 */
export function resolveProfiles(config: RexOrchestratorConfig | undefined): Map<string, AgentProfile> {
  const resolved = new Map(BUILT_IN)
  for (const [name, override] of Object.entries(config?.profiles ?? {})) {
    if (!isStructurallyValidOverride(override)) continue
    const base = resolved.get(name)
    if (base) {
      const extra = override.extraArgs ?? []
      // 泛型透传模板实参：resume 模板带第二个 sessionId 参数，不能在包装时丢掉。
      const withExtra =
        <Args extends unknown[]>(render: (...args: Args) => string[]) =>
        (...args: Args) => [...render(...args), ...extra]
      resolved.set(name, {
        ...base,
        binary: override.binary ?? base.binary,
        interactiveShell: override.interactiveShell ?? base.interactiveShell,
        // 配置契约里暴露的开关必须真正生效：静默丢弃会让 ACK 与高危告警失真。
        supportsOsc7501: override.supportsOsc7501 ?? base.supportsOsc7501,
        dangerFlags: override.dangerFlags ?? base.dangerFlags,
        extraArgs: extra,
        interactiveArgs: withExtra(base.interactiveArgs),
        headlessArgs: withExtra(base.headlessArgs),
        headlessResumeArgs: withExtra(base.headlessResumeArgs),
        interactiveResumeArgs: withExtra(base.interactiveResumeArgs)
      })
      continue
    }
    // 自定义 profile 必须显式给出 binary；模板函数会把它当字符串用。
    if (!override.binary) continue
    resolved.set(name, customProfile(name, override))
  }
  return resolved
}

/** 逐字段校验 override 形状；不认识或类型不符的整条按缺省处理。 */
function isStructurallyValidOverride(override: unknown): override is ProfileOverride {
  if (typeof override !== 'object' || override === null) return false
  const entry = override as Record<string, unknown>
  if (entry.binary !== undefined && typeof entry.binary !== 'string') return false
  if (entry.interactiveShell !== undefined && typeof entry.interactiveShell !== 'boolean') return false
  if (entry.addDirFlag !== undefined && typeof entry.addDirFlag !== 'string') return false
  if (entry.supportsOsc7501 !== undefined && typeof entry.supportsOsc7501 !== 'boolean') return false
  if (
    entry.extraArgs !== undefined &&
    (!Array.isArray(entry.extraArgs) || entry.extraArgs.some(arg => typeof arg !== 'string'))
  ) {
    return false
  }
  if (
    entry.dangerFlags !== undefined &&
    (!Array.isArray(entry.dangerFlags) || entry.dangerFlags.some(flag => typeof flag !== 'string'))
  ) {
    return false
  }
  return true
}

/** 自定义 profile 的通用模板：prompt 永远在 `extraArgs` 之前。 */
function customProfile(name: string, override: ProfileOverride): AgentProfile {
  const extra = override.extraArgs ?? []
  const addDirFlag = override.addDirFlag ?? ''
  const addDir: (ctx: LaunchCtx) => string[] = addDirFlag !== '' ? ctx => [addDirFlag, ctx.handoffDir] : () => []
  return {
    name,
    binary: override.binary as string,
    supportsOsc7501: override.supportsOsc7501 === true,
    supportsPositionalPrompt: true,
    interactiveShell: override.interactiveShell ?? false,
    dangerFlags: override.dangerFlags ?? COMMON_DANGER_FLAGS,
    interactiveArgs: ctx => [ctx.prompt, ...extra, ...addDir(ctx)],
    headlessArgs: ctx => [ctx.prompt, ...extra, ...addDir(ctx)],
    headlessResumeArgs: () => {
      throw new Error(`custom profile "${name}" does not define a resume template`)
    },
    interactiveResumeArgs: () => {
      throw new Error(`custom profile "${name}" does not define a resume template`)
    }
  }
}

export interface ProfileOverride {
  /** 可执行名或绝对路径；自定义 profile 必填。 */
  binary?: string
  interactiveShell?: boolean
  /** 追加在模板之后的参数。 */
  extraArgs?: string[]
  /** 自定义 profile 的 add-dir flag（如 `--add-dir`）。 */
  addDirFlag?: string
  supportsOsc7501?: boolean
  /** 覆写高危标志检测列表；缺省用通用库。 */
  dangerFlags?: string[]
}

/** `~/.pi/agent/rex-orchestrator.json` 的加载与权限审计结果。 */
export interface LoadedConfig {
  config?: RexOrchestratorConfig
  warnings: string[]
}

export function configPath(homedir: string): string {
  return `${homedir}/.pi/agent/rex-orchestrator.json`
}

/**
 * 读取用户配置。文件缺失是常态（全部走内置默认）；JSON 损坏降级为「没有配置」并
 * 带告警，不让异常进激活流程。group/other 可写时发权限告警，不阻断。
 */
export async function loadUserConfig(deps: {
  homedir: string
  readFile(path: string): Promise<string>
  stat(path: string): Promise<{ mode: number }>
  exists(path: string): Promise<boolean>
}): Promise<LoadedConfig> {
  const path = configPath(deps.homedir)
  if (!(await deps.exists(path))) return { warnings: [] }
  const warnings: string[] = []
  const info = await deps.stat(path)
  if (info.mode & 0o022) {
    warnings.push(`rex-orchestrator.json 权限过宽（${(info.mode & 0o777).toString(8)}），建议 chmod 600 ${path}`)
  }
  try {
    const raw = await deps.readFile(path)
    const parsed = JSON.parse(raw) as RexOrchestratorConfig
    return { config: parsed, warnings }
  } catch (error) {
    warnings.push(
      `rex-orchestrator.json 解析失败，按默认配置运行：${error instanceof Error ? error.message : String(error)}`
    )
    return { warnings }
  }
}

/** `~/.pi/agent/rex-orchestrator.json` 的形状。 */
export interface RexOrchestratorConfig {
  profiles?: Record<string, ProfileOverride>
  /** 创建 worktree 后在 worktree 目录里执行的 setup 命令（如软链 `.env`）。 */
  worktreeSetupHook?: string
}

export function auditProfileArgs(profile: AgentProfile, args: readonly string[]): string[] {
  const hits = args.filter(arg => profile.dangerFlags.some(flag => arg.includes(flag)))
  return hits.length === 0 ? [] : [`profile "${profile.name}" 启用了高危全自动标志: ${hits.join(', ')}`]
}

/**
 * 解析可执行文件的绝对路径。`rex run` 的子 PTY 走 login shell 环境，非交互配置
 * （`~/.zshrc`）不会被读取，`nvm`/`fnm` 装的 CLI 可能在那里才进 PATH，所以派生前在
 * 协调者进程内先按 login shell 环境找到绝对路径再交给 `rex run`。
 */
export async function resolveExecutable(
  binary: string,
  deps: {
    exec(command: string, args: string[], options?: { cwd?: string }): Promise<PiExecResult>
    fileExists(path: string): Promise<boolean>
  }
): Promise<string | null> {
  if (binary.includes('/')) {
    return (await deps.fileExists(binary)) ? binary : null
  }
  const probe = await deps.exec('/usr/bin/which', ['-a', binary])
  const first = probe.stdout
    .split('\n')
    .map(line => line.trim())
    .find(line => line !== '')
  return first ?? null
}
