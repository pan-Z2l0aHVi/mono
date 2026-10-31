/**
 * 让同一仓库的所有 worktree 共享一块任务板。
 *
 * `pi-task-board` 把 store 写死在 `<ctx.cwd>/.pi/task-board.json`，没有 path 参数；桥接的读侧
 * 也跟着 cwd 走（见 `task-board.ts`），否则 `/board` 与注入会看到两个文件。两边都改不了，
 * 所以共享只能在文件系统层做：把 worktree 的 `.pi` 变成指向主 checkout `.pi` 的 symlink。
 *
 * 为什么不 symlink 单个文件：`pi-task-board` 用 `writeFileSync(tmp)` + `renameSync(tmp, path)`
 * 落盘，`rename` 会替换 symlink 本身，第一次写入后共享就断了。symlink 整个目录时 rename 发生
 * 在目标目录内，链接完好，跨 worktree 立即可见。
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
  symlinkSync,
  writeFileSync
} from 'node:fs'
import { dirname, join, resolve } from 'node:path'

import { resolveRepoIdentity } from '../repo-identity'

/** 共享结果的状态；调用方按状态决定是否通知。 */
export type SharedBoardStatus =
  /** 当前 checkout 就是主 checkout：它自己就是真身，无需共享。 */
  | 'main-checkout'
  /** `.pi` 已是指向主 checkout 的 symlink 且目标可用，重复调用是 no-op。 */
  | 'already-shared'
  /** `.pi` 已指向主 checkout，但主 `.pi` 目录缺失，本次重建了目标。 */
  | 'repaired'
  /** 本次建立了 symlink。 */
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
  /** 共享目标（主 checkout 的 `.pi`）；linked / already-shared / repaired / migrated 都有。 */
  readonly target?: string
  /** 拒绝或失败的原因；写进通知，用户要知道为什么没共享。 */
  readonly reason?: string
  /** 迁移后保留的旧目录；只有 migrated 才有。 */
  readonly backupPath?: string
}

/** `.pi` 里只允许出现 board 文件本身与它的伴生文件，其他条目一律视为不安全。 */
const ALLOWED_ENTRY = /^task-board\.json(?:\.(?:lock|tmp|bak)(?:[.-].+)?)?$/

/** 与 `task-board.ts` 对齐的 board 版本；迁移只处理能理解的 schema。 */
const BOARD_VERSION = 2

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
 * 找出 cwd 所属的 checkout 根（向上遇到的第一个 `.git`）。
 *
 * 不能用 `resolveRepoIdentity().root` 做这件事：它刻意把 linked worktree 归到主 checkout，
 * 好让记忆按仓库分区；而这里要区分「我在主 checkout 里」和「我在它的某个 worktree 里」。
 * 找不到 `.git` 时返回 cwd 自身，与 `resolveRepoIdentity` 对非 Git 目录的处理一致。
 */
function containingCheckoutRoot(cwd: string): string {
  let current = resolve(cwd)
  for (;;) {
    if (existsSync(join(current, '.git'))) return canonical(current)
    const parent = dirname(current)
    if (parent === current) return canonical(cwd)
    current = parent
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

function nextCounter(counter: unknown, ids: unknown[]): number {
  const declared = typeof counter === 'number' && Number.isFinite(counter) ? counter : 1
  const used = ids.reduce<number>((max, id) => Math.max(max, trailingNumber(id)), 0)
  return Math.max(declared, used + 1)
}

/**
 * 合并两块 board：面板按 id 对齐，任务按 id 去重，保留两边并集。
 *
 * 主 checkout 的条目优先（冲突时保留它），本地新增的条目补进去。`nextTaskId` /
 * `nextPanelId` 必须推过并集里的最大 id，否则下一次 `add_task` 会撞已有的 id。
 */
export function mergeBoards(main: Record<string, unknown>, local: Record<string, unknown>): Record<string, unknown> {
  type Panel = Record<string, unknown> & { tasks: unknown[] }
  const mainPanels = (main.panels as unknown[]).filter(isRecord)
  const localPanels = (local.panels as unknown[]).filter(isRecord)

  const panels: Panel[] = mainPanels.map(panel => ({
    ...panel,
    tasks: Array.isArray(panel.tasks) ? [...panel.tasks] : []
  }))

  for (const localPanel of localPanels) {
    const id = localPanel.id
    const existing = id === undefined ? undefined : panels.find(panel => panel.id === id)
    if (!existing) {
      panels.push({
        ...localPanel,
        tasks: Array.isArray(localPanel.tasks) ? [...localPanel.tasks] : []
      })
      continue
    }

    const tasks = existing.tasks as unknown[]
    const known = new Set(tasks.filter(isRecord).map(task => task.id))
    for (const task of Array.isArray(localPanel.tasks) ? localPanel.tasks : []) {
      if (!isRecord(task)) continue
      const taskId = task.id
      if (taskId !== undefined && known.has(taskId)) continue
      tasks.push(task)
      if (taskId !== undefined) known.add(taskId)
    }
  }

  const allTaskIds = panels.flatMap(panel =>
    (panel.tasks as unknown[]).map(task => (isRecord(task) ? task.id : undefined))
  )
  const panelIds = panels.map(panel => panel.id)
  const pickLast = (candidate: unknown): string | undefined =>
    typeof candidate === 'string' && panelIds.includes(candidate) ? candidate : undefined
  // 用户最后停在本地那块板的面板上，所以先认本地；两边都失效时退回第一个面板。
  const lastPanelId = pickLast(local.lastPanelId) ?? pickLast(main.lastPanelId) ?? panelIds[0]

  return {
    ...main,
    version: BOARD_VERSION,
    panels,
    nextPanelId: nextCounter(Math.max(Number(main.nextPanelId) || 1, Number(local.nextPanelId) || 1), panelIds),
    nextTaskId: nextCounter(Math.max(Number(main.nextTaskId) || 1, Number(local.nextTaskId) || 1), allTaskIds),
    ...(lastPanelId === undefined ? {} : { lastPanelId })
  }
}

/** 找一个不冲突的备份目录名；同毫秒连续迁移时补序号。 */
function backupPathFor(piDir: string): string {
  const base = `${piDir}.bak-${Date.now()}`
  let candidate = base
  for (let index = 1; existsSync(candidate); index += 1) candidate = `${base}-${index}`
  return candidate
}

/**
 * 迁移真实 `.pi` 目录：合并 board、保留旧目录、建立 symlink。
 *
 * 调用前已确认目录里只有 board 及其伴生文件。任何会丢数据的判断（board 解析不了、主 checkout
 * 那份版本不认识）都在写盘之前完成并转成 refused，此时文件系统未被修改。
 */
function migrateDirectory(cwdPi: string, mainPi: string): SharedBoardResult {
  const unexpected = readdirSync(cwdPi).filter(name => !ALLOWED_ENTRY.test(name))
  if (unexpected.length > 0) {
    const sample = unexpected.slice(0, 3).join(', ')
    return {
      status: 'refused',
      migrated: false,
      reason: `${cwdPi} contains entries besides task-board.json (${sample}); move them out before sharing`
    }
  }

  const localPath = join(cwdPi, 'task-board.json')
  const mainPath = join(mainPi, 'task-board.json')
  const local = readBoardFile(localPath)

  let contents: string | undefined
  if (local === null) {
    // 本地 board 坏了：主 checkout 没有 board 时原样搬过去（保数据），有则拒绝，避免覆盖。
    if (existsSync(mainPath)) {
      return {
        status: 'refused',
        migrated: false,
        reason: `${localPath} is not a mergeable task-board v${BOARD_VERSION} file`
      }
    }
    contents = readFileSync(localPath, 'utf8')
  } else if (local !== undefined) {
    if (existsSync(mainPath)) {
      const main = readBoardFile(mainPath)
      if (!main) {
        return {
          status: 'refused',
          migrated: false,
          reason: `${mainPath} is not a mergeable task-board v${BOARD_VERSION} file`
        }
      }
      contents = `${JSON.stringify(mergeBoards(main, local), null, 2)}\n`
    } else {
      contents = readFileSync(localPath, 'utf8')
    }
  }

  try {
    mkdirSync(mainPi, { recursive: true })
    if (contents !== undefined) writeBoardAtomic(mainPath, contents)
  } catch (error) {
    return { status: 'failed', migrated: false, reason: `cannot prepare ${mainPi}: ${String(error)}` }
  }

  const backupPath = backupPathFor(cwdPi)
  try {
    renameSync(cwdPi, backupPath)
  } catch (error) {
    return { status: 'failed', migrated: false, reason: `cannot move ${cwdPi} aside: ${String(error)}` }
  }

  try {
    symlinkSync(mainPi, cwdPi, 'dir')
  } catch (error) {
    // 建链失败要把旧目录放回去，否则用户的数据只剩一个 .bak 路径。
    try {
      renameSync(backupPath, cwdPi)
      return { status: 'failed', migrated: false, reason: `cannot link ${cwdPi}: ${String(error)}` }
    } catch (restoreError) {
      return {
        status: 'failed',
        migrated: false,
        backupPath,
        reason: `cannot link ${cwdPi}: ${String(error)}; old directory kept at ${backupPath} (restore failed: ${String(restoreError)})`
      }
    }
  }

  return { status: 'migrated', migrated: true, target: mainPi, backupPath }
}

/**
 * 保证当前 checkout 与主 checkout 共用一块任务板。
 *
 * 决策矩阵：
 *
 * | cwd 的 `.pi`        | 结果 |
 * | ------------------- | ---- |
 * | 当前就是主 checkout | `main-checkout`，无动作 |
 * | 不存在              | `linked`，建 symlink → `<main>/.pi` |
 * | symlink → 主 `.pi`，目标可用 | `already-shared`，无动作 |
 * | symlink → 主 `.pi`，目标缺失 | `repaired`，重建主 `.pi` 目录 |
 * | symlink → 别处      | `refused`，不覆盖用户的链接 |
 * | 真实目录，只有 board（及 `.lock`/`.tmp`/`.bak`） | `migrated`，合并后改名 `.pi.bak-<ts>` 并建链 |
 * | 真实目录，含其他条目 | `refused`，无动作 |
 * | 普通文件 / 其他      | `refused`，无动作 |
 * | 任何文件系统异常    | `failed`，返回原因，不抛错 |
 */
export function ensureSharedBoard(cwd: string): SharedBoardResult {
  try {
    const mainRoot = resolveRepoIdentity(cwd).root
    // 主 checkout 自己就是真身。用「所属 checkout 根」而不是「cwd 是否等于 mainRoot」，
    // 这样在 monorepo 子目录里起会话时也不会在子目录另建链接。
    if (containingCheckoutRoot(cwd) === mainRoot) return { status: 'main-checkout', migrated: false }

    const cwdPi = join(cwd, '.pi')
    const mainPi = join(mainRoot, '.pi')

    let info: ReturnType<typeof lstatSync> | undefined
    try {
      info = lstatSync(cwdPi)
    } catch {
      info = undefined
    }

    if (!info) {
      try {
        mkdirSync(mainPi, { recursive: true })
        symlinkSync(mainPi, cwdPi, 'dir')
        return { status: 'linked', migrated: false, target: mainPi }
      } catch (error) {
        return { status: 'failed', migrated: false, reason: `cannot link ${cwdPi}: ${String(error)}` }
      }
    }

    if (info.isSymbolicLink()) {
      if (pointsAt(cwdPi, mainPi)) {
        if (existsSync(mainPi)) return { status: 'already-shared', migrated: false, target: mainPi }
        // 主 checkout 的 `.pi` 被删掉后链接仍然存在，此时写盘会 ENOENT，任务静默丢失。
        // 链接本身不用动：重建目标目录即可让后续读写重新落到共享板。
        try {
          mkdirSync(mainPi, { recursive: true })
          return { status: 'repaired', migrated: false, target: mainPi }
        } catch (error) {
          return {
            status: 'failed',
            migrated: false,
            target: mainPi,
            reason: `cannot recreate missing ${mainPi}: ${String(error)}`
          }
        }
      }
      let target = ''
      try {
        target = readlinkSync(cwdPi)
      } catch {
        // 读取失败时只报告路径，原因留给下面的通用信息。
      }
      return {
        status: 'refused',
        migrated: false,
        reason: `${cwdPi} already links to ${target || '(unknown)'} instead of ${mainPi}`
      }
    }

    if (info.isDirectory()) return migrateDirectory(cwdPi, mainPi)

    return {
      status: 'refused',
      migrated: false,
      reason: `${cwdPi} exists but is neither a directory nor a symlink`
    }
  } catch (error) {
    return { status: 'failed', migrated: false, reason: String(error) }
  }
}
