/**
 * 让同一仓库的所有 worktree 共享一块任务板，且数据不落在仓库目录里。
 *
 * 两个硬约束决定了这里只能靠 symlink：
 *
 * 1. `pi-task-board` 把 store 写死在 `<ctx.cwd>/.pi/task-board.json`，没有 path 参数；
 *    桥接的读侧也跟着 cwd 走（见 `task-board.ts`），否则 `/board` 与注入会看到两个文件。
 * 2. 不能 symlink 单个文件：`pi-task-board` 用 `writeFileSync(tmp)` + `renameSync(tmp, path)`
 *    落盘，`rename` 会替换 symlink 本身，第一次写入后共享就断了。symlink 整个 `.pi` 目录时
 *    rename 发生在目标目录内，链接完好。
 *
 * 目标是 `~/.pi/task-boards/<repo-key>/`：仓库目录里不再有任何看板数据，重启也不会丢。
 * 所有 checkout（主 checkout 与 linked worktree）一视同仁地指过去。
 *
 * 迁移不留备份目录：旧 `.pi` 里的 board 先合并进目标，再用一个临时目录名做中转，symlink 建好
 * 后删掉中转目录；建链失败则把中转目录改回去。持久存在的 `.pi.bak-*` 属于垃圾，不做。
 *
 * 失败不得让 session 起不来：所有异常都折算成结果对象，调用方只负责通知。
 */

import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  realpathSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'

import { resolveRepoIdentity } from '../repo-identity'

/** 共享结果的状态；调用方按状态决定是否通知。 */
export type SharedBoardStatus =
  /** `.pi` 已是指向共享目录的 symlink 且目标可用，重复调用是 no-op。 */
  | 'already-shared'
  /** `.pi` 经由另一个 symlink 间接到达共享目录（旧布局的两跳），本次改成直接指向。 */
  | 'relinked'
  /** `.pi` 已指向共享目录，但目标目录缺失，本次重建了它。 */
  | 'repaired'
  /** 本次建立了 symlink（没有旧 board 需要迁移）。 */
  | 'linked'
  /** 本次合并了已有 board 并建立 symlink。 */
  | 'migrated'
  /** 情况不安全，拒绝改动；`reason` 说明原因。 */
  | 'refused'
  /** 文件系统操作失败；`reason` 保留原始错误。 */
  | 'failed'

export interface SharedBoardResult {
  readonly status: SharedBoardStatus
  /** 本次调用是否真的迁移了已有 board 数据。 */
  readonly migrated: boolean
  /** 共享目标目录；除 refused / failed 外都有。 */
  readonly target?: string
  /** 拒绝或失败的原因；写进通知，用户要知道为什么没共享。 */
  readonly reason?: string
}

/** `.pi` 里只允许出现 board 文件本身与它的伴生文件，其他条目一律视为不安全。 */
const ALLOWED_ENTRY = /^task-board\.json(?:\.(?:lock|tmp|bak)(?:[.-].+)?)?$/

/** 与 `task-board.ts` 对齐的 board 版本；迁移只处理能理解的 schema。 */
const BOARD_VERSION = 2

/** 迁移中转目录名。只在一次调用内存在，不是持久备份。 */
const INFLIGHT_SUFFIX = '.pi-migrating'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * 归一化路径。realpath 失败（不存在、权限）时退回原值——身份比较不能因一次 stat 失败抛错。
 */
function canonical(path: string): string {
  try {
    return realpathSync(path)
  } catch {
    return resolve(path)
  }
}

function samePath(left: string, right: string): boolean {
  return canonical(left) === canonical(right)
}

/**
 * 共享目录的根。`PI_TASK_BOARD_DIR` 覆盖用于测试隔离。
 *
 * 放在 `~/.pi/` 下而不是系统临时目录：看板是状态不是缓存，`/var/folders` 在 macOS 重启时
 * 会被清空。真正的编排记忆在 `~/.pi/memory/memory.db`，两者住在一起。
 */
export function taskBoardRoot(env: Record<string, string | undefined> = process.env): string {
  const override = env.PI_TASK_BOARD_DIR?.trim()
  if (override) return override
  return join(homedir(), '.pi', 'task-boards')
}

/**
 * 某个 checkout 应该指向的共享目录。
 *
 * 用 `resolveRepoIdentity().key`（例如 `mono-7f3a2b`）而不是目录名：同一台机器上两个同名仓库
 * 不会撞车，键本身也能看出是哪个仓库。
 */
export function sharedBoardDir(cwd: string, env?: Record<string, string | undefined>): string {
  return join(taskBoardRoot(env), resolveRepoIdentity(cwd).key)
}

/** 读 symlink 的字面目标（不解析中间跳数）；读不到返回 undefined。 */
function literalLinkTarget(linkPath: string): string | undefined {
  try {
    return resolve(dirname(linkPath), readlinkSync(linkPath))
  } catch {
    return undefined
  }
}

/** 判断 `.pi` 是否是指向 `target` 的 symlink；解析失败按「不是」处理。 */
function pointsAt(linkPath: string, target: string): boolean {
  let raw: string
  try {
    raw = readlinkSync(linkPath)
  } catch {
    return false
  }
  return samePath(resolve(dirname(linkPath), raw), target)
}

/** 原子落盘：先写同目录的 tmp，再 rename。与 `pi-task-board` 的写法规避半份 JSON。 */
function writeBoardAtomic(path: string, contents: string): void {
  const tmp = `${path}.share-${process.pid}-${Date.now()}.tmp`
  writeFileSync(tmp, contents, 'utf8')
  renameSync(tmp, path)
}

/** 解析 board 文件；不存在返回 undefined，存在但不是可合并的 v2 board 返回 null。 */
function readBoardFile(path: string): Record<string, unknown> | null | undefined {
  if (!existsSync(path)) return undefined
  let parsed: unknown
  try {
    parsed = JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return null
  }
  if (!isRecord(parsed)) return null
  if (parsed.version !== BOARD_VERSION) return null
  if (!Array.isArray(parsed.panels)) return null
  return parsed
}

/** 取 id 的尾部数字，用于把 `next*Id` 推过已有条目的最大值。 */
function trailingNumber(id: unknown): number {
  if (typeof id !== 'string') return 0
  const match = /(\d+)$/.exec(id)
  return match?.[1] ? Number(match[1]) : 0
}

/** 收集 board 里所有 id（任一形如 `T-12` / `P-3` 的字段）。 */
function collectIds(board: Record<string, unknown>, keys: readonly string[]): string[] {
  const ids: string[] = []
  const panels = Array.isArray(board.panels) ? board.panels : []
  for (const panel of panels) {
    if (!isRecord(panel)) continue
    for (const key of keys) {
      const value = panel[key]
      if (key === 'id' && typeof value === 'string') ids.push(value)
      if (key === 'tasks' && Array.isArray(value)) {
        for (const task of value) {
          if (isRecord(task) && typeof task.id === 'string') ids.push(task.id)
        }
      }
    }
  }
  return ids
}

/** 把计数器推到所有已知 id 之后。 */
function nextCounter(current: number, ids: readonly string[]): number {
  const max = ids.reduce((acc, id) => Math.max(acc, trailingNumber(id)), 0)
  return Math.max(current, max + 1)
}

/**
 * 合并两块 board。
 *
 * 按 task id 去重，**目标侧（共享目录）的条目胜出**：共享目录是既有真相，本地那份只补它没有的。
 * 面板按 id 对齐，本地独有的面板追加在后面。
 */
export function mergeBoards(target: Record<string, unknown>, local: Record<string, unknown>): Record<string, unknown> {
  type Panel = Record<string, unknown> & { tasks: Array<Record<string, unknown>> }
  const targetPanels: Panel[] = (Array.isArray(target.panels) ? target.panels : []).filter(isRecord).map(panel => ({
    ...panel,
    tasks: (Array.isArray(panel.tasks) ? panel.tasks : []).filter(isRecord).map(task => ({ ...task }))
  }))
  const localPanels = (Array.isArray(local.panels) ? local.panels : []).filter(isRecord)

  for (const localPanel of localPanels) {
    const localTasks = (Array.isArray(localPanel.tasks) ? localPanel.tasks : []).filter(isRecord)
    const localPanelId = localPanel.id
    const targetPanel = targetPanels.find(panel => panel.id === localPanelId)
    if (!targetPanel) {
      targetPanels.push({
        ...localPanel,
        tasks: localTasks.map(task => ({ ...task }))
      })
      continue
    }
    const known = new Set(targetPanel.tasks.map(task => task.id))
    for (const task of localTasks) {
      if (!known.has(task.id)) targetPanel.tasks.push({ ...task })
    }
  }

  const panelIds = collectIds({ panels: targetPanels }, ['id'])
  const taskIds = collectIds({ panels: targetPanels }, ['tasks'])
  const lastPanelId = typeof target.lastPanelId === 'string' ? target.lastPanelId : undefined

  return {
    version: BOARD_VERSION,
    nextPanelId: nextCounter(Math.max(Number(target.nextPanelId) || 1, Number(local.nextPanelId) || 1), panelIds),
    nextTaskId: nextCounter(Math.max(Number(target.nextTaskId) || 1, Number(local.nextTaskId) || 1), taskIds),
    panels: targetPanels,
    ...(lastPanelId === undefined ? {} : { lastPanelId })
  }
}

/**
 * 把一个真实 `.pi` 目录迁移到共享目录，并把它换成 symlink。
 *
 * 顺序刻意如此：
 * 1. 校验目录内容（只允许 board 及其伴生文件），不安全就拒绝，**任何写盘之前**完成。
 * 2. 合并本地 board 进共享目录。
 * 3. 旧目录改名为一次性的中转名，给 symlink 腾位。
 * 4. 建 symlink；失败则把中转目录改回去。
 * 5. 成功则删掉中转目录——不留 `.pi.bak-*`。
 */
function migrateDirectory(cwdPi: string, sharedDir: string): SharedBoardResult {
  const unexpected = readdirSync(cwdPi).filter(name => !ALLOWED_ENTRY.test(name))
  if (unexpected.length > 0) {
    const sample = unexpected.slice(0, 3).join(', ')
    return {
      status: 'refused',
      migrated: false,
      target: sharedDir,
      reason: `${cwdPi} contains entries besides task-board.json (${sample}); move them out before sharing`
    }
  }

  const localPath = join(cwdPi, 'task-board.json')
  const sharedPath = join(sharedDir, 'task-board.json')
  const local = readBoardFile(localPath)

  let contents: string | undefined
  if (local === null) {
    // 本地 board 坏了：共享目录还没有 board 时原样搬过去（保数据），有则拒绝，避免覆盖。
    if (existsSync(sharedPath)) {
      return {
        status: 'refused',
        migrated: false,
        target: sharedDir,
        reason: `${localPath} is not a mergeable task-board v${BOARD_VERSION} file`
      }
    }
    contents = readFileSync(localPath, 'utf8')
  } else if (local !== undefined) {
    if (existsSync(sharedPath)) {
      const shared = readBoardFile(sharedPath)
      if (!shared) {
        return {
          status: 'refused',
          migrated: false,
          target: sharedDir,
          reason: `${sharedPath} is not a mergeable task-board v${BOARD_VERSION} file`
        }
      }
      contents = `${JSON.stringify(mergeBoards(shared, local), null, 2)}\n`
    } else {
      contents = readFileSync(localPath, 'utf8')
    }
  }

  try {
    mkdirSync(sharedDir, { recursive: true, mode: 0o700 })
    if (contents !== undefined) writeBoardAtomic(sharedPath, contents)
  } catch (error) {
    return {
      status: 'failed',
      migrated: false,
      target: sharedDir,
      reason: `cannot prepare ${sharedDir}: ${String(error)}`
    }
  }

  const inflight = `${cwdPi}${INFLIGHT_SUFFIX}`
  try {
    rmSync(inflight, { recursive: true, force: true })
    renameSync(cwdPi, inflight)
  } catch (error) {
    return {
      status: 'failed',
      migrated: false,
      target: sharedDir,
      reason: `cannot move ${cwdPi} aside: ${String(error)}`
    }
  }

  try {
    symlinkSync(sharedDir, cwdPi, 'dir')
  } catch (error) {
    // 建链失败要把旧目录放回去，否则数据只剩一个中转路径。
    try {
      renameSync(inflight, cwdPi)
      return { status: 'failed', migrated: false, target: sharedDir, reason: `cannot link ${cwdPi}: ${String(error)}` }
    } catch (restoreError) {
      return {
        status: 'failed',
        migrated: false,
        target: sharedDir,
        reason: `cannot link ${cwdPi}: ${String(error)}; old directory kept at ${inflight} (restore failed: ${String(restoreError)})`
      }
    }
  }

  // 数据已在共享目录里，中转目录是纯冗余；删掉，不留备份垃圾。
  try {
    rmSync(inflight, { recursive: true, force: true })
  } catch {
    // 删不掉不影响共享已经生效；残留路径会在下一次调用时被覆盖或清理。
  }

  return { status: 'migrated', migrated: true, target: sharedDir }
}

/**
 * 把一份 v2 board 的计数器重算到既有 id 之后。
 *
 * D4 的成因在上游（`pi-task-board` 的 `nextTaskId` 从文件原样读，从不按既有任务重算）：
 * 迁移/合并产生的共享 board 带着陈旧计数器，新建任务就会撞号。这里不能改上游，所以在
 * 本侧把共享文件里的计数器归一化：`nextPanelId` / `nextTaskId` 各自推到 `max(existing)+1`。
 * 不认识的 schema / 缺 panels 返回，调用方不动文件。
 */
export function normalizeBoardCounters(board: Record<string, unknown>): Record<string, unknown> | undefined {
  if (board.version !== BOARD_VERSION || !Array.isArray(board.panels)) return undefined
  const panelIds = collectIds(board, ['id'])
  const taskIds = collectIds(board, ['tasks'])
  const normalized = {
    ...board,
    nextPanelId: nextCounter(Number(board.nextPanelId) || 1, panelIds),
    nextTaskId: nextCounter(Number(board.nextTaskId) || 1, taskIds)
  }
  return normalized
}

/**
 * 把共享 board 文件的计数器归一化（D4）。
 *
 * 迁移的两条路径都可能把陈旧计数器带进共享文件：原样拷贝的路径完全不重算，合并路径的
 * 合并输入本身就可能是陈旧的。这里在 `ensureSharedBoard` 的成功路径末尾统一兑底一次；
 * 读不了 / 不是 v2 就不动文件，任何失败都不改变外层结果的状态。返回 normalized 是否真
 * 的改写了文件（诊断用）。
 */
export function syncSharedBoardCounters(sharedDir: string, log: (message: string) => void): boolean {
  const path = join(sharedDir, 'task-board.json')
  let parsed: unknown
  try {
    if (!existsSync(path)) return false
    parsed = JSON.parse(readFileSync(path, 'utf8'))
  } catch (error) {
    log(`shared board counters not normalized (unreadable): ${String(error)}`)
    return false
  }
  if (!isRecord(parsed)) return false
  const normalized = normalizeBoardCounters(parsed)
  if (!normalized) {
    log('shared board counters not normalized (unexpected schema)')
    return false
  }
  if (
    normalized.nextPanelId === (parsed as { nextPanelId?: unknown }).nextPanelId &&
    normalized.nextTaskId === (parsed as { nextTaskId?: unknown }).nextTaskId
  ) {
    return false
  }
  try {
    writeBoardAtomic(path, `${JSON.stringify(normalized, null, 2)}\n`)
    log(
      `shared board counters normalized: nextTaskId ${(parsed as { nextTaskId?: unknown }).nextTaskId} -> ${normalized.nextTaskId}` +
        `, nextPanelId ${(parsed as { nextPanelId?: unknown }).nextPanelId} -> ${normalized.nextPanelId}`
    )
    return true
  } catch (error) {
    log(`shared board counter normalization failed: ${String(error)}`)
    return false
  }
}

/**
 * 保证当前 checkout 与同仓库的其他 checkout 共用一块任务板，且数据在仓库目录之外。
 *
 * 决策矩阵：
 *
 * | cwd 的 `.pi`        | 结果 |
 * | ------------------- | ---- |
 * | 不存在              | `linked`，建 symlink → 共享目录 |
 * | symlink → 共享目录，目标可用 | `already-shared`，无动作 |
 * | symlink → 共享目录，目标缺失 | `repaired`，重建共享目录 |
 * | symlink → 别处      | `refused`，不覆盖用户的链接 |
 * | 真实目录，只有 board（及 `.lock`/`.tmp`/`.bak`） | `migrated`，合并后换 symlink，不留备份 |
 * | 真实目录，含其他条目 | `refused`，无动作 |
 * | 普通文件 / 其他      | `refused`，无动作 |
 * | 任何文件系统异常    | `failed`，返回原因，不抛错 |
 */
export function ensureSharedBoard(
  cwd: string,
  env?: Record<string, string | undefined>,
  log: (message: string) => void = () => {}
): SharedBoardResult {
  const result = ensureSharedBoardInner(cwd, env, log)
  // 成功路径末尾兑底一次计数器（D4）；refused / failed 时不动共享文件。
  if (result.status !== 'refused' && result.status !== 'failed' && result.target) {
    syncSharedBoardCounters(result.target, log)
  }
  return result
}

function ensureSharedBoardInner(
  cwd: string,
  env: Record<string, string | undefined> | undefined,
  _log: (message: string) => void
): SharedBoardResult {
  try {
    const sharedDir = sharedBoardDir(cwd, env)
    const cwdPi = join(cwd, '.pi')

    let info: ReturnType<typeof lstatSync> | undefined
    try {
      info = lstatSync(cwdPi)
    } catch {
      info = undefined
    }

    if (!info) {
      // 这里必须把共享目录建出来：`pi-task-board` 的 save() 只 mkdir 父目录再写文件，
      // 面对一个悬空的 `.pi` symlink，mkdir 会把链接当已存在而跳过，随后 write 报 ENOENT，
      // 任务静默丢失。代价是每个真用过看板的仓库在 ~/.pi/task-boards 下留一个目录——
      // 那是正当的状态目录，不是垃圾（测试里的临时仓库靠 PI_TASK_BOARD_DIR 隔离）。
      try {
        mkdirSync(sharedDir, { recursive: true, mode: 0o700 })
        symlinkSync(sharedDir, cwdPi, 'dir')
        return { status: 'linked', migrated: false, target: sharedDir }
      } catch (error) {
        return {
          status: 'failed',
          migrated: false,
          target: sharedDir,
          reason: `cannot link ${cwdPi}: ${String(error)}`
        }
      }
    }

    if (info.isSymbolicLink()) {
      // 字面目标与最终目标要分开看：旧布局里 worktree 的 `.pi` 指向主 checkout 的 `.pi`，
      // 而后者又是指向共享目录的 symlink——两跳。两跳的坏处是主 checkout 的 `.pi` 一旦被删，
      // worktree 的链接就悬空，pointsAt 会判成「指向别处」而拒绝自愈。所以两跳要归一成直接指向。
      const literal = literalLinkTarget(cwdPi)

      if (!pointsAt(cwdPi, sharedDir)) {
        return {
          status: 'refused',
          migrated: false,
          target: sharedDir,
          reason: `${cwdPi} already links to ${literal ?? '(unknown)'} instead of ${sharedDir}`
        }
      }

      // 目标可能被删（例如用户清了 ~/.pi）。共享目录缺失时重建，否则 pi-task-board
      // 的写入会 ENOENT 而任务静默丢失。
      let recreated = false
      if (!existsSync(sharedDir)) {
        try {
          mkdirSync(sharedDir, { recursive: true, mode: 0o700 })
          recreated = true
        } catch (error) {
          return {
            status: 'failed',
            migrated: false,
            target: sharedDir,
            reason: `cannot recreate ${sharedDir}: ${String(error)}`
          }
        }
      }

      // 判「直接」必须比字面路径，不能走 realpath：realpath 会把两跳链条解析成同一个终点，
      // 于是间接链接会被误判成直接，永远不归一。
      if (literal !== undefined && resolve(literal) === resolve(sharedDir)) {
        // 重建过目标就是 repaired（用户需要知道看板目录曾经消失）；否则无事可做。
        return recreated
          ? { status: 'repaired', migrated: false, target: sharedDir }
          : { status: 'already-shared', migrated: false, target: sharedDir }
      }

      // 间接（两跳或更多跳）：改建成直接链接。
      try {
        rmSync(cwdPi, { force: true })
        symlinkSync(sharedDir, cwdPi, 'dir')
        return { status: 'relinked', migrated: false, target: sharedDir }
      } catch (error) {
        // 改建失败时尽量把原来的链接放回去，避免留下一个没有 .pi 的 checkout。
        try {
          if (literal) symlinkSync(literal, cwdPi, 'dir')
        } catch {
          // 放不回去只能报告；pi-task-board 会因为它不存在而自建普通目录。
        }
        return {
          status: 'failed',
          migrated: false,
          target: sharedDir,
          reason: `cannot relink ${cwdPi} directly to ${sharedDir}: ${String(error)}`
        }
      }
    }

    if (info.isDirectory()) return migrateDirectory(cwdPi, sharedDir)

    return {
      status: 'refused',
      migrated: false,
      target: sharedDir,
      reason: `${cwdPi} exists but is neither a directory nor a symlink`
    }
  } catch (error) {
    return { status: 'failed', migrated: false, reason: String(error) }
  }
}
