/**
 * Worker 生命周期编排模块：收口派生（spawn）、续跑/投递（sendInput）、列表（list）、
 * 输出/变更验收（inspectOutput / inspectChanges）与暂停保护（setPaused）。
 *
 * 与 `event-coordinator.ts`、`worker-teardown.ts` 对称：只通过窄依赖接口与 Rex、git、
 * 交接区和宿主 UI 交互，不持有 Pi 扩展胶水。
 */

import { randomUUID } from 'node:crypto'

import {
  cleanupWorktree,
  createWorktree,
  inspectChanges as inspectWorkspaceChanges,
  scanIgnoredDeps,
  snapshotBase,
  worktreeBranch,
  worktreeDirtyNote,
  type GitExec
} from './git-inspector'
import type { HandoffStore } from './handoff-store'
import type { PiExecOptions, PiToolResult } from './pi-types'
import { auditProfileArgs, resolveExecutable, type AgentProfile } from './profiles'
import { withAntiRecursionPrefix, type RexAdapter } from './rex-adapter'
import type { WorkerRegistry } from './state-machine'

export interface LifecycleUiContext {
  hasUI: boolean
  ui: { confirm(title: string, message?: string): Promise<boolean> }
}

export interface WorkerLifecycleOptions {
  readonly runHeadlessPath: string
  readonly nodePath: string
  readonly worktreeSetupHook?: string
  readonly ackTimeoutMs?: number
  readonly shortId?: () => string
}

export interface WorkerLifecycleDeps {
  adapter: Pick<RexAdapter, 'runBlock' | 'blockClose' | 'send' | 'sendKey' | 'capture'>
  registry: WorkerRegistry
  profiles: ReadonlyMap<string, AgentProfile>
  requireStore(): HandoffStore
  /** 延迟读取：Pi session id 在 `session_start` 才确定。 */
  getShortSession(): string
  gitExec: GitExec
  exec(
    command: string,
    args: string[],
    options?: PiExecOptions
  ): Promise<{
    stdout: string
    stderr: string
    code: number
    killed: boolean
    truncated: boolean
  }>
  persistRegistry(): void
  reconcile(): Promise<void>
  notify(message: string): void
  options: WorkerLifecycleOptions
}

export interface WorkerLifecycle {
  spawn(
    params: { agent: string; task: string; mode?: string; label?: string; use_worktree?: boolean },
    ctx: LifecycleUiContext & { cwd: string }
  ): Promise<PiToolResult>
  list(): PiToolResult
  sendInput(params: { worker_id: string; instruction: string }, ctx: LifecycleUiContext): Promise<PiToolResult>
  inspectOutput(params: { worker_id: string; tail_lines?: number }): Promise<PiToolResult>
  inspectChanges(params: { worker_id: string; path?: string }): Promise<PiToolResult>
  setPaused(workerId: string, paused: boolean): boolean
}

function text(content: string, isError = false): PiToolResult {
  return { content: [{ type: 'text', text: content }], isError }
}

function defaultShortId(): string {
  return randomUUID().slice(0, 8)
}

/** 从 headless events.jsonl 尾部提取 agent session id（claude result / codex 线程 id）。 */
export function extractSessionId(eventsTail: string | undefined): string | undefined {
  if (!eventsTail) return undefined
  for (const line of eventsTail.split('\n').reverse()) {
    const trimmed = line.trim()
    if (trimmed === '') continue
    try {
      const parsed = JSON.parse(trimmed) as Record<string, unknown>
      if (typeof parsed.session_id === 'string') return parsed.session_id
      if (typeof parsed.thread_id === 'string') return parsed.thread_id
    } catch {
      continue
    }
  }
  return undefined
}

function renderBrief(input: {
  turn: number
  task: string
  workerId: string
  worktree?: { path: string; branch: string }
  mainCwd: string
  ignoredDeps: string[]
  handoffPath: string
}): string {
  const lines = [
    `# turn-${String(input.turn).padStart(3, '0')} 任务说明`,
    '',
    input.task,
    '',
    '## 上下文边界',
    input.worktree
      ? [
          `- 你在独立 git worktree：${input.worktree.path}（branch ${input.worktree.branch}）。`,
          `- 主仓库：${input.mainCwd}。worktree 基于 HEAD 检出，不含主目录未提交改动。`,
          input.ignoredDeps.length > 0
            ? `- 主仓库存在被忽略的依赖/配置：${input.ignoredDeps.join('、')}；worktree 里不存在，按需重建或从主仓库取。`
            : ''
        ].join('\n')
      : `- 工作目录：${input.mainCwd}（与其他会话共享，改动前先确认没有冲突）。`,
    // claude / codex 会按 cwd 自动加载各自机制认的仓库级规范；显式点名一次，
    // worktree 里被 ignore 的本地配置（如 .claude/settings.local.json）才不会被漏看。
    '- 开工前先读并遵守本仓库的仓库级 agent 规范与配置（AGENTS.md、CLAUDE.md、.claude/ 等仓库内文件，以其各自约定为准）。',
    '',
    '## 交付',
    `完成后把结构化结论写入 ${input.handoffPath}：包含做了什么、改了哪些路径、验证方式与结果、未尽事项。`
  ]
  return lines.join('\n')
}

function buildShortPrompt(briefPath: string, handoffPath: string): string {
  return `Read ${briefPath} and execute it now. ` + `When done, write a structured conclusion to ${handoffPath}.`
}

/** 单引号 shell 转义：供 worktreeSetupHook 的 $MAIN_CWD 前缀注入使用。 */
function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`
}

export function createWorkerLifecycle(deps: WorkerLifecycleDeps): WorkerLifecycle {
  const { adapter, registry, profiles, gitExec, options } = deps
  const generateShortId = options.shortId ?? defaultShortId

  /** 可执行解析的依赖注入：which 走 login shell 环境，test -f 判绝对路径。 */
  function resolveDeps() {
    return {
      exec: (command: string, args: string[], execOptions?: { cwd?: string }) => deps.exec(command, args, execOptions),
      fileExists: async (filePath: string) => (await deps.exec('/usr/bin/test', ['-f', filePath])).code === 0
    }
  }

  async function resolveExecutableOrThrow(profile: AgentProfile): Promise<string> {
    const binary = await resolveExecutable(profile.binary, resolveDeps())
    if (!binary) throw new Error(`找不到可执行文件 ${profile.binary}`)
    return binary
  }

  function existsPath(filePath: string): Promise<boolean> {
    // `-e` 而非 `-f`：node_modules / .venv 是目录，`-f` 会漏报。
    return deps.exec('/usr/bin/test', ['-e', filePath]).then(result => result.code === 0)
  }

  function buildHeadlessCommand(binary: string, eventsOut: string, args: readonly string[]): string[] {
    return withAntiRecursionPrefix(options.nodePath, [
      options.runHeadlessPath,
      '--events-out',
      eventsOut,
      '--',
      binary,
      ...args
    ])
  }

  /** 等待 worker 的下一次状态跃迁；观察先注册再放行超时，超时返回 false。 */
  async function waitForTransition(workerId: string, timeoutMs: number): Promise<boolean> {
    return new Promise(resolve => {
      let settled = false
      const unsubscribe = registry.subscribe({
        onTransition(transition) {
          if (transition.workerId === workerId) finish(true)
        }
      })
      const timer = setTimeout(() => finish(false), timeoutMs)
      function finish(ok: boolean): void {
        if (settled) return
        settled = true
        clearTimeout(timer)
        unsubscribe()
        resolve(ok)
      }
    })
  }

  return {
    async spawn(params, ctx) {
      const profile = profiles.get(params.agent)
      if (!profile) {
        return text(`未知 agent "${params.agent}"。可用 profile：${[...profiles.keys()].join('、')}`, true)
      }
      const activeStore = deps.requireStore()
      const mode = params.mode === 'headless' ? 'headless' : 'interactive'
      const targetCwd = ctx.cwd
      const snapshot = await snapshotBase(gitExec, targetCwd).catch(error => {
        throw new Error(
          `读取 git 基线失败（${error instanceof Error ? error.message : String(error)}），请在 git 仓库内派生`
        )
      })

      const workerId = `${profile.name}-${generateShortId()}`
      const label = params.label !== undefined && params.label.trim() !== '' ? params.label : workerId

      // 可执行先解析再建 worktree：binary 拼错时不能留下无 registry 记录、
      // 也没有人负责清理的孤儿 worktree 和 pi-orch/* 分支。
      const binary = await resolveExecutable(profile.binary, resolveDeps())
      if (!binary) {
        return text(`找不到 profile "${profile.name}" 的可执行文件 ${profile.binary}，worker 未派生。`, true)
      }

      let worktree: { path: string; branch: string } | undefined
      let workerCwd = targetCwd
      let useWorktree = params.use_worktree
      if (useWorktree === undefined && snapshot.baseCommit !== null) {
        const busyPeer = registry.list().find(worker => worker.cwd === targetCwd && worker.status !== 'closed')
        if (busyPeer !== undefined) {
          const note = [worktreeDirtyNote(snapshot.dirty), `已有活跃 worker ${busyPeer.workerId} 使用同一目录。`]
            .filter(Boolean)
            .join('\n')
          useWorktree = await ctx.ui.confirm(
            '为新 Worker 创建独立 git worktree？',
            `${note}\n推荐创建，避免两个 worker 写同一工作区。`
          )
        }
      }
      if (useWorktree === true) {
        if (snapshot.baseCommit === null) {
          return text('零提交仓库没有 HEAD，无法创建 Worktree；请改用共享目录模式。', true)
        }
        const branch = worktreeBranch(deps.getShortSession(), workerId)
        const path = activeStore.worktreeDir(workerId)
        // 检出起点用验收基线：若 snapshot 与建 worktree 之间有别的提交，
        // worktree 不能晚于 base_commit 起步，否则验收会把别人的提交算进来。
        await createWorktree(gitExec, { mainCwd: targetCwd, path, branch }, snapshot.baseCommit)
        worktree = { path, branch }
        workerCwd = path
        if (options.worktreeSetupHook) {
          // pi.exec 没有 env 选项；经 shell 前缀注入 $MAIN_CWD 供 hook 引用主仓。
          const hookCommand = `export MAIN_CWD=${shellQuote(targetCwd)}; ${options.worktreeSetupHook}`
          const hook = await deps.exec('/bin/sh', ['-c', hookCommand], { cwd: workerCwd })
          if (hook.code !== 0) {
            deps.notify(`worktreeSetupHook 失败（exit ${hook.code}）：${hook.stderr.slice(0, 200)}`)
          }
        }
      }

      let handoffDir: string
      let warnings: string[]
      let ignoredDeps: string[] = []
      try {
        const ensured = await activeStore.ensureWorkerDir(workerId)
        handoffDir = ensured.dir
        warnings = ensured.warnings
        // 扫描的是主仓库：目的就是找出「主仓有、worktree 没有」的被 ignore 依赖与配置。
        ignoredDeps = worktree ? await scanIgnoredDeps({ exists: path => existsPath(path) }, targetCwd) : []
        const brief = renderBrief({
          turn: 1,
          task: params.task,
          workerId,
          worktree,
          mainCwd: targetCwd,
          ignoredDeps,
          handoffPath: activeStore.handoffPath(workerId, 1)
        })
        await activeStore.writeBrief(workerId, 1, brief)
      } catch (error) {
        // 派发前失败会留下没有 registry 记录的 worktree 与分支：回滚后如实抛出。
        if (worktree !== undefined) {
          await cleanupWorktree(
            gitExec,
            { mainCwd: targetCwd, path: worktree.path, branch: worktree.branch },
            { force: true }
          ).catch(() => undefined)
        }
        throw error
      }

      const shortPrompt = buildShortPrompt(activeStore.briefPath(workerId, 1), activeStore.handoffPath(workerId, 1))
      const launchCtx = { cwd: workerCwd, handoffDir, prompt: shortPrompt }

      const commandSegments =
        mode === 'headless'
          ? buildHeadlessCommand(binary, activeStore.eventsPath(workerId, 1), profile.headlessArgs(launchCtx))
          : withAntiRecursionPrefix(binary, profile.interactiveArgs(launchCtx))

      const dangerWarnings = auditProfileArgs(profile, commandSegments)
      for (const warning of [...dangerWarnings, ...warnings]) deps.notify(warning)

      let created: Awaited<ReturnType<RexAdapter['runBlock']>>
      try {
        created = await adapter.runBlock({
          cwd: workerCwd,
          label,
          keepOpen: mode === 'headless',
          focus: mode === 'interactive',
          interactiveShell: profile.interactiveShell,
          commandSegments
        })
      } catch (error) {
        const failure = error instanceof Error ? error.message : String(error)
        // 无 worktree：没有残留资源，直接把失败如实交给宿主。
        if (worktree === undefined) throw error
        // runBlock 失败时 Rex 可能已创建 Block（超时 / JSON 截断），而 Block 与失败
        // 请求之间没有任何可证明的关联——按 label 接管可能认领别人的 Block，按列表
        // 判定「未创建」也可能与创建竞态。一律保守：不接管、不回滚，登记一个
        // blockId 为 `unconfirmed:` 前缀的 placeholder（永远不匹配真实事件），让
        // rex_list_workers 与 /rex-cleanup 都看得见这份残留，由用户在 Rex Tab 确认。
        registry.register(
          {
            workerId,
            agent: profile.name,
            mode,
            label,
            blockId: `unconfirmed:${workerId}`,
            turn: 1,
            cwd: workerCwd,
            baseCommit: snapshot.baseCommit,
            baseDirty: snapshot.dirty,
            worktree,
            mainCwd: targetCwd,
            paused: false
          },
          { initialStatus: 'closed' }
        )
        deps.persistRegistry()
        return text(
          [
            `rex run 返回异常（${failure}），派生结果不明：请在 Rex Tab 检查 label=${label}。`,
            `worker ${workerId} 已按「未确认」登记，worktree 保留：${worktree.path}（branch ${worktree.branch}）。`,
            `brief：${activeStore.briefPath(workerId, 1)}`,
            '若 Block 在跑就让它完成并人工验收；若确认未派生，用 /rex-cleanup 清理该 worktree。'
          ].join('\n'),
          true
        )
      }

      const blockId = created.blockIds[0] as string
      registry.register({
        workerId,
        agent: profile.name,
        mode,
        label,
        blockId,
        turn: 1,
        cwd: workerCwd,
        baseCommit: snapshot.baseCommit,
        baseDirty: snapshot.dirty,
        worktree,
        mainCwd: worktree === undefined ? undefined : targetCwd,
        paused: false
      })
      deps.persistRegistry()
      // 登记发生在 Block 创建之后：创建到登记之间到达的终态事件已被丢弃，
      // 立即对账把 program_status / last_exit 拉平。
      void deps.reconcile().catch(() => undefined)

      return text(
        [
          `worker ${workerId}（${profile.name}，${mode}）已派生。`,
          `Rex Tab：label=${label}，window=${created.windowId}。`,
          `brief：${activeStore.briefPath(workerId, 1)}`,
          worktree ? `worktree：${worktree.path}（branch ${worktree.branch}）` : `工作区：共享目录 ${workerCwd}`
        ].join('\n')
      )
    },

    list() {
      const workers = registry.list()
      if (workers.length === 0) return text('当前没有 worker。')
      const rows = workers.map(worker =>
        [
          `- ${worker.workerId} [${worker.agent}/${worker.mode}] ${worker.status}${worker.paused ? '（paused）' : ''}`,
          `  turn=${worker.turn} block=${worker.blockId}${worker.retiredBlockIds.length > 0 ? `（retired ${worker.retiredBlockIds.length}）` : ''}`,
          worker.worktree
            ? `  worktree=${worker.worktree.path} branch=${worker.worktree.branch}`
            : `  cwd=${worker.cwd}`
        ].join('\n')
      )
      return text(rows.join('\n'))
    },

    async sendInput(params, ctx) {
      const initialWorker = registry.get(params.worker_id)
      if (!initialWorker) return text(`未知 worker "${params.worker_id}"。`, true)

      const gate = registry.canAutoDeliver(params.worker_id)
      if (!gate.allowed) {
        if (!ctx.hasUI) {
          return text(`无法静默投递：${gate.reason}。请向用户说明并征得同意后再试。`, true)
        }
        const ok = await ctx.ui.confirm(
          `向 worker ${initialWorker.workerId} 投递新指令？`,
          `当前状态：${initialWorker.status}${initialWorker.paused ? '（已暂停保护）' : ''}。\n拒绝原因：${gate.reason}\n拟发送：\n${params.instruction.slice(0, 300)}`
        )
        if (!ok) return text('用户拒绝投递。', true)
      }

      // confirm 等待期间 worker 可能已被关闭/清理：重新读取最新快照。
      const worker = registry.get(params.worker_id)
      if (!worker) return text(`未知 worker "${params.worker_id}"。`, true)

      const profile = profiles.get(worker.agent)
      if (!profile) return text(`worker 的 profile "${worker.agent}" 已不可用。`, true)
      const activeStore = deps.requireStore()

      const turn = worker.turn + 1
      const brief = renderBrief({
        turn,
        task: params.instruction,
        workerId: worker.workerId,
        worktree: worker.worktree,
        // worktree worker 的主仓是 mainCwd；cwd 是 worktree 自身，写反会把续跑指令
        // 的「主仓库」指到 worktree 路径上。
        mainCwd: worker.mainCwd ?? worker.cwd,
        ignoredDeps: [],
        handoffPath: activeStore.handoffPath(worker.workerId, turn)
      })
      await activeStore.writeBrief(worker.workerId, turn, brief)
      const shortPrompt = buildShortPrompt(
        activeStore.briefPath(worker.workerId, turn),
        activeStore.handoffPath(worker.workerId, turn)
      )

      if (worker.mode === 'headless') {
        // 全文扫描而不是只看尾部：codex 的 thread 记录在首行，长任务的尾部没有它。
        const agentSessionId =
          worker.agentSessionId ?? extractSessionId(await activeStore.readEvents(worker.workerId, worker.turn))
        if (agentSessionId === undefined) {
          return text(
            `找不到 worker ${worker.workerId} 的 agent session id（events.jsonl 无 session/thread 记录），无法 headless 续跑。` +
              '先 rex_inspect_output 查看输出。',
            true
          )
        }
        registry.setAgentSessionId(worker.workerId, agentSessionId)
        const launchCtx = {
          cwd: worker.cwd,
          handoffDir: activeStore.workerDir(worker.workerId),
          prompt: shortPrompt,
          sessionId: agentSessionId
        }
        const args = profile.headlessResumeArgs(launchCtx, agentSessionId)
        const oldBlockId = worker.blockId
        const binary = await resolveExecutableOrThrow(profile)
        const created = await adapter.runBlock({
          cwd: worker.cwd,
          label: worker.label,
          keepOpen: true,
          focus: false,
          interactiveShell: profile.interactiveShell,
          commandSegments: buildHeadlessCommand(binary, activeStore.eventsPath(worker.workerId, turn), args)
        })
        registry.replaceBlock(worker.workerId, created.blockIds[0] as string)
        registry.markTurnDispatched(worker.workerId, turn)
        deps.persistRegistry()
        // 与 spawn 同理：新 Block 的早期终态事件可能早于 replaceBlock 到达。
        void deps.reconcile().catch(() => undefined)
        // 旧 Block 的结论已在 events.jsonl 里，续跑即回收（V3-02「单活跃 Tab」）：
        // 关不掉（如用户正盯着）就留在 retired 列表，由 /rex-cleanup 兜底重试。
        const oldBlockClosed = await adapter.blockClose(oldBlockId).then(
          () => true,
          () => false
        )
        if (oldBlockClosed) {
          registry.removeRetiredBlock(worker.workerId, oldBlockId)
        }
        return text(
          [
            `headless 续跑已启动（turn ${turn}，session ${agentSessionId}）。`,
            oldBlockClosed
              ? `旧 Tab 已自动回收；新 Block：${created.blockIds[0]}。`
              : `旧 Tab 关闭失败（可能正被查看），留在 /rex-cleanup 待回收；新 Block：${created.blockIds[0]}。`,
            `brief：${activeStore.briefPath(worker.workerId, turn)}`
          ].join('\n')
        )
      }

      // ACK 监听先注册再投递：等的是 worker 真实 OSC 跃迁，不能被自家动作抢先。
      const ackPromise = profile.supportsOsc7501
        ? waitForTransition(worker.workerId, options.ackTimeoutMs ?? 5000)
        : Promise.resolve<boolean | undefined>(undefined)

      await adapter.send(worker.blockId, shortPrompt)
      await adapter.sendKey(worker.blockId, 'enter')
      registry.markTurnDispatched(worker.workerId, turn, { notifyTransition: false })
      deps.persistRegistry()

      let ackNote = '（profile 不支持 OSC 7501，跳过送达强校验）'
      if (profile.supportsOsc7501) {
        const transitioned = await ackPromise
        if (transitioned) {
          ackNote = '送达确认：worker 状态发生跃迁。'
        } else {
          const tail = await adapter.capture(worker.blockId, 30).catch(() => undefined)
          ackNote = `5 秒内未观察到状态跃迁，可能卡在弹窗或未提交。屏幕尾部诊断：\n${(tail ?? '(capture 失败，需人工查看)').split('\n').slice(-10).join('\n')}`
        }
      }
      return text([`已向 ${worker.workerId} 投递 turn ${turn}。`, ackNote].join('\n'))
    },

    async inspectOutput(params) {
      const worker = registry.get(params.worker_id)
      if (!worker) return text(`未知 worker "${params.worker_id}"。`, true)
      const activeStore = deps.requireStore()
      const tailLines = params.tail_lines ?? 40

      const handoff = await activeStore.readHandoff(worker.workerId, worker.turn)
      const sections: string[] = [`worker ${worker.workerId}：status=${worker.status}，turn=${worker.turn}`]

      if (handoff.status === 'ok') {
        sections.push(`## turn-${worker.turn} handoff\n${handoff.content}`)
      } else if (worker.mode === 'headless') {
        const eventsTail = await activeStore.readEventsTail(worker.workerId, worker.turn, tailLines)
        sections.push(
          eventsTail === undefined
            ? `## events.jsonl\n（turn-${worker.turn} 无事件落盘）`
            : `## events.jsonl 尾部\n${eventsTail}`
        )
      } else {
        const screen = await adapter.capture(worker.blockId, tailLines).catch(error => `capture 失败：${String(error)}`)
        await activeStore.writeCaptureLog(worker.workerId, screen).catch(() => undefined)
        sections.push(`## 屏幕尾部\n${screen}`)
      }

      return text(sections.join('\n\n'))
    },

    async inspectChanges(params) {
      const worker = registry.get(params.worker_id)
      if (!worker) return text(`未知 worker "${params.worker_id}"。`, true)
      const report = await inspectWorkspaceChanges(
        gitExec,
        {
          readFile: async filePath => {
            const result = await deps.exec('/bin/cat', [filePath])
            if (result.code !== 0) throw new Error(result.stderr)
            return result.stdout
          }
        },
        worker.cwd,
        { baseCommit: worker.baseCommit, dirty: [...worker.baseDirty] },
        { path: params.path }
      )
      return text(report)
    },

    setPaused(workerId, paused) {
      if (!registry.setPaused(workerId, paused)) return false
      deps.persistRegistry()
      return true
    }
  }
}
