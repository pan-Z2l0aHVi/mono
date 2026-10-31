/**
 * 共享任务板：所有 checkout 的 `.pi` 都指向仓库外的共享目录。
 *
 * 数据不再落在仓库目录里：每个 checkout（主 checkout 与 linked worktree）的 `.pi` 都是指向
 * `~/.pi/task-boards/<repo-key>/` 的 symlink。测试用 `PI_TASK_BOARD_DIR` 指到临时目录，跑完
 * 不污染真实的 `~/.pi`。
 *
 * 全部用真实 `git init` / `git worktree add` 驱动——迁移会重命名目录，拿真实仓库做实验不可接受。
 * 覆盖 `ensureSharedBoard` 的决策矩阵与两条硬底线：**不丢数据**、**不留备份目录**。
 */

import { execFileSync } from 'node:child_process'
import {
  chmod,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  readlink,
  realpath,
  rm,
  symlink,
  writeFile
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test'

import { ensureSharedBoard, mergeBoards, sharedBoardDir, taskBoardRoot } from '../board/share'
import { boardPath, readBoardSummary } from '../board/task-board'
import { resolveRepoIdentity } from '../repo-identity'

const NOW = '2026-01-01T00:00:00.000Z'

/** root 无视目录权限，权限用例只在普通用户下有意义。 */
const IS_ROOT = typeof process.getuid === 'function' && process.getuid() === 0

interface TaskFixture {
  readonly id: string
  readonly title: string
  readonly status?: string
}

/** 与 pi-task-board v2 对齐的最小 board 文件。 */
const boardFile = (tasks: TaskFixture[], overrides: Record<string, unknown> = {}) => ({
  version: 2,
  nextPanelId: 2,
  nextTaskId: tasks.length + 1,
  lastPanelId: 'P-1',
  panels: [
    {
      id: 'P-1',
      name: 'shepherd',
      tasks: tasks.map(task => ({ status: 'todo', sessions: [], ...task })),
      createdAt: NOW,
      updatedAt: NOW
    }
  ],
  ...overrides
})

const git = (cwd: string, ...args: string[]): string =>
  execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()

const makeRepoWithWorktree = async (): Promise<{ main: string; worktree: string }> => {
  const root = await mkdtemp(join(tmpdir(), 'share-spec-'))
  const main = join(root, 'demo-repo')
  await mkdir(main, { recursive: true })
  git(main, 'init', '-q')
  git(main, 'config', 'user.email', 'spec@example.com')
  git(main, 'config', 'user.name', 'spec')
  await writeFile(join(main, 'README.md'), '# demo\n', 'utf8')
  git(main, 'add', '.')
  git(main, 'commit', '-q', '-m', 'init')

  const worktree = join(root, 'wt-branch')
  git(main, 'worktree', 'add', '-q', '-b', 'branch', worktree)
  return { main, worktree }
}

/**
 * 共享目录的期望路径。
 *
 * `resolveRepoIdentity` 返回 realpath 后的 key，而 symlink 里存的是我们传进去的目录算出来的
 * 同一个 key，所以两边一致；断言链接目标仍用 realpath 对齐，避免 macOS 的 `/var` → `/private/var`。
 */
const sharedDirFor = async (cwd: string): Promise<string> => sharedBoardDir(cwd)

const writeBoard = async (dir: string, tasks: TaskFixture[], overrides?: Record<string, unknown>): Promise<void> => {
  await mkdir(join(dir, '.pi'), { recursive: true })
  await writeFile(boardPath(dir), JSON.stringify(boardFile(tasks, overrides)), 'utf8')
}

const listBackups = async (dir: string): Promise<string[]> =>
  (await readdir(dir)).filter(name => name.startsWith('.pi.bak-') || name.includes('.pi-migrating'))

let boardRoot: string

beforeEach(async () => {
  boardRoot = await mkdtemp(join(tmpdir(), 'board-root-'))
  process.env.PI_TASK_BOARD_DIR = boardRoot
})

afterEach(async () => {
  delete process.env.PI_TASK_BOARD_DIR
  await rm(boardRoot, { recursive: true, force: true })
})

describe('共享目录位置', () => {
  it('默认落在 ~/.pi/task-boards 下，不在仓库目录里', () => {
    expect(taskBoardRoot({})).toMatch(/\.pi\/task-boards$/)
    expect(taskBoardRoot({ PI_TASK_BOARD_DIR: '/custom' })).toBe('/custom')
  })

  it('共享目录名带仓库身份键，不同仓库不互相覆盖', async () => {
    const { main } = await makeRepoWithWorktree()
    const key = resolveRepoIdentity(main).key

    expect(sharedBoardDir(main)).toBe(join(boardRoot, key))
    // 两个 worktree 同属一个仓库，得到同一个共享目录。
    expect(await sharedDirFor(main)).toBe(join(boardRoot, key))
  })
})

describe('ensureSharedBoard 决策矩阵', () => {
  it('没有 .pi 时建 symlink，指向仓库外的共享目录', async () => {
    const { main, worktree } = await makeRepoWithWorktree()

    const outcome = ensureSharedBoard(worktree, { PI_TASK_BOARD_DIR: boardRoot })

    expect(outcome.status).toBe('linked')
    expect(outcome.migrated).toBe(false)
    expect(outcome.target).toBe(await sharedDirFor(worktree))
    expect((await lstat(join(worktree, '.pi'))).isSymbolicLink()).toBe(true)
    // 目标在仓库外，仓库里只剩下链接本身。
    expect((await realpath(join(worktree, '.pi'))).startsWith(await realpath(boardRoot))).toBe(true)

    await writeFile(boardPath(worktree), JSON.stringify(boardFile([{ id: 'T-1', title: 'shared' }])), 'utf8')
    // 主 checkout 读到同一份数据（它的 .pi 也指同一个共享目录）。
    expect(ensureSharedBoard(main, { PI_TASK_BOARD_DIR: boardRoot }).status).toBe('linked')
    expect((await readBoardSummary(main))?.items).toEqual([{ id: 'T-1', title: 'shared', status: 'todo' }])
  })

  it('已有真实 .pi 时合并数据、换成 symlink，且不留下任何备份目录', async () => {
    const { main, worktree } = await makeRepoWithWorktree()
    const sharedDir = await sharedDirFor(main)
    await mkdir(sharedDir, { recursive: true })
    await writeFile(
      join(sharedDir, 'task-board.json'),
      JSON.stringify(boardFile([{ id: 'T-1', title: 'shared task' }])),
      'utf8'
    )
    await writeBoard(worktree, [
      { id: 'T-1', title: 'local duplicate' },
      { id: 'T-2', title: 'local only', status: 'in_progress' }
    ])

    const outcome = ensureSharedBoard(worktree, { PI_TASK_BOARD_DIR: boardRoot })

    expect(outcome.status).toBe('migrated')
    expect(outcome.migrated).toBe(true)
    expect(outcome.target).toBe(sharedDir)
    expect((await lstat(join(worktree, '.pi'))).isSymbolicLink()).toBe(true)

    // 两边任务都在；冲突的 T-1 保留共享目录的版本；nextTaskId 推过并集。
    const merged = JSON.parse(await readFile(join(sharedDir, 'task-board.json'), 'utf8')) as {
      nextTaskId: number
      panels: Array<{ tasks: Array<{ id: string; title: string }> }>
    }
    expect(merged.panels[0]?.tasks.map(task => task.id)).toEqual(['T-1', 'T-2'])
    expect(merged.panels[0]?.tasks[0]?.title).toBe('shared task')
    expect(merged.nextTaskId).toBe(3)

    // 关键：迁移不留备份目录。旧数据已并入共享目录，残留就是垃圾。
    expect(await listBackups(worktree)).toEqual([])
  })

  it('.pi 里有 board 以外的条目时拒绝迁移且不修改任何东西', async () => {
    const { worktree } = await makeRepoWithWorktree()
    await writeBoard(worktree, [{ id: 'T-1', title: 'local' }])
    await writeFile(join(worktree, '.pi', 'settings.json'), '{"theme":"dark"}\n', 'utf8')
    const before = await readdir(join(worktree, '.pi'))

    const outcome = ensureSharedBoard(worktree, { PI_TASK_BOARD_DIR: boardRoot })

    expect(outcome.status).toBe('refused')
    expect(outcome.migrated).toBe(false)
    expect(outcome.reason).toContain('settings.json')
    expect((await lstat(join(worktree, '.pi'))).isDirectory()).toBe(true)
    expect(await readdir(join(worktree, '.pi'))).toEqual(before)
    // 拒绝发生在写盘之前：共享目录没被创建。
    await expect(lstat(await sharedDirFor(worktree))).rejects.toThrow(/ENOENT/)
  })

  it('已是 symlink 时重复调用不做任何事', async () => {
    const { worktree } = await makeRepoWithWorktree()
    expect(ensureSharedBoard(worktree, { PI_TASK_BOARD_DIR: boardRoot }).status).toBe('linked')

    const outcome = ensureSharedBoard(worktree, { PI_TASK_BOARD_DIR: boardRoot })

    expect(outcome.status).toBe('already-shared')
    expect(outcome.migrated).toBe(false)
    expect(await listBackups(worktree)).toEqual([])
  })

  it('.pi 是别的 symlink 时拒绝，不覆盖用户的链接', async () => {
    const { main, worktree } = await makeRepoWithWorktree()
    const elsewhere = join(main, 'elsewhere')
    await mkdir(elsewhere, { recursive: true })
    await symlink(elsewhere, join(worktree, '.pi'), 'dir')

    const outcome = ensureSharedBoard(worktree, { PI_TASK_BOARD_DIR: boardRoot })

    expect(outcome.status).toBe('refused')
    expect(outcome.reason).toContain(elsewhere)
    expect(await readlink(join(worktree, '.pi'))).toBe(elsewhere)
  })
})

describe('间接链接归一', () => {
  it('经由主 checkout 的 .pi 到达共享目录的两跳链接，会被改成直接指向', async () => {
    const { main, worktree } = await makeRepoWithWorktree()
    const sharedDir = await sharedDirFor(main)
    await mkdir(sharedDir, { recursive: true })

    // 造出旧布局：主 checkout 的 .pi 指向共享目录，worktree 的 .pi 指向主 checkout 的 .pi。
    await symlink(sharedDir, join(main, '.pi'), 'dir')
    await symlink(join(main, '.pi'), join(worktree, '.pi'), 'dir')
    expect(await readlink(join(worktree, '.pi'))).toBe(join(main, '.pi'))

    const outcome = ensureSharedBoard(worktree, { PI_TASK_BOARD_DIR: boardRoot })

    expect(outcome.status).toBe('relinked')
    // 关键：字面目标变成共享目录本身。两跳的坏处是主 checkout 的 .pi 一旦被删，
    // worktree 的链接就悬空，pointsAt 会判成「指向别处」而拒绝自愈。
    expect(await readlink(join(worktree, '.pi'))).toBe(sharedDir)
    expect((await readdir(worktree)).filter(name => name === '.pi')).toHaveLength(1)
  })

  it('主 checkout 的 .pi 被删除后，已归一的工作树链接不再受影响', async () => {
    const { main, worktree } = await makeRepoWithWorktree()
    const sharedDir = await sharedDirFor(main)
    await mkdir(sharedDir, { recursive: true })
    await symlink(sharedDir, join(main, '.pi'), 'dir')
    await symlink(join(main, '.pi'), join(worktree, '.pi'), 'dir')
    expect(ensureSharedBoard(worktree, { PI_TASK_BOARD_DIR: boardRoot }).status).toBe('relinked')

    // 两跳时这一步会让 worktree 的 .pi 悬空；直接链接之后不再受影响。
    await rm(join(main, '.pi'), { force: true })

    expect(ensureSharedBoard(worktree, { PI_TASK_BOARD_DIR: boardRoot }).status).toBe('already-shared')
    expect(await readlink(join(worktree, '.pi'))).toBe(sharedDir)
  })
})

describe('ensureSharedBoard 悬空链接自愈', () => {
  it('共享目录被删除后重建目标并返回 repaired', async () => {
    const { worktree } = await makeRepoWithWorktree()
    expect(ensureSharedBoard(worktree, { PI_TASK_BOARD_DIR: boardRoot }).status).toBe('linked')
    // 链接还在目标没了：再判 already-shared 会让 pi-task-board 写盘 ENOENT，任务静默丢失。
    await rm(await sharedDirFor(worktree), { recursive: true, force: true })

    const outcome = ensureSharedBoard(worktree, { PI_TASK_BOARD_DIR: boardRoot })

    expect(outcome.status).toBe('repaired')
    expect(outcome.migrated).toBe(false)
    expect((await lstat(await sharedDirFor(worktree))).isDirectory()).toBe(true)
    expect((await lstat(join(worktree, '.pi'))).isSymbolicLink()).toBe(true)

    await writeFile(boardPath(worktree), JSON.stringify(boardFile([{ id: 'T-1', title: 'after repair' }])), 'utf8')
    expect((await readBoardSummary(worktree))?.items.map(item => item.id)).toEqual(['T-1'])

    expect(ensureSharedBoard(worktree, { PI_TASK_BOARD_DIR: boardRoot }).status).toBe('already-shared')
  })
})

describe('ensureSharedBoard 失败不冒泡', () => {
  it('.pi 被普通文件占住时返回 refused', async () => {
    const { worktree } = await makeRepoWithWorktree()
    await writeFile(join(worktree, '.pi'), 'not a directory', 'utf8')

    const outcome = ensureSharedBoard(worktree, { PI_TASK_BOARD_DIR: boardRoot })

    expect(outcome.status).toBe('refused')
    expect(outcome.migrated).toBe(false)
    expect(outcome.reason).toMatch(/neither a directory nor a symlink/)
  })

  it.skipIf(IS_ROOT)('worktree 不可写时返回 failed 而不是抛错', async () => {
    const { worktree } = await makeRepoWithWorktree()
    await chmod(worktree, 0o500)
    try {
      const outcome = ensureSharedBoard(worktree, { PI_TASK_BOARD_DIR: boardRoot })
      // 不可写时既可能连链接都建不了（failed），也可能在共享目录侧就失败（failed）；
      // 无论哪种都不能抛错，且不能留下半成品。
      expect(outcome.status).toBe('failed')
      expect(outcome.reason).toBeTruthy()
    } finally {
      await chmod(worktree, 0o755)
    }
  })
})

describe('mergeBoards', () => {
  it('共享目录侧条目胜出，本地独有条目补齐', () => {
    const merged = mergeBoards(
      boardFile([{ id: 'T-1', title: 'shared' }]) as never,
      boardFile([
        { id: 'T-1', title: 'local' },
        { id: 'T-2', title: 'only local' }
      ]) as never
    ) as { panels: Array<{ tasks: Array<{ id: string; title: string }> }>; nextTaskId: number }

    expect(merged.panels[0]?.tasks.map(task => task.id)).toEqual(['T-1', 'T-2'])
    expect(merged.panels[0]?.tasks[0]?.title).toBe('shared')
    expect(merged.nextTaskId).toBe(3)
  })

  it('本地独有的面板追加在后面', () => {
    const withPanel = (id: string, taskId: string) => ({
      ...boardFile([{ id: taskId, title: taskId }]),
      panels: [
        {
          id,
          name: id,
          tasks: [{ id: taskId, title: taskId, status: 'todo', sessions: [] }],
          createdAt: NOW,
          updatedAt: NOW
        }
      ]
    })

    const merged = mergeBoards(withPanel('P-1', 'T-1') as never, withPanel('P-2', 'T-2') as never) as {
      panels: Array<{ id: string }>
      nextPanelId: number
    }

    expect(merged.panels.map(panel => panel.id)).toEqual(['P-1', 'P-2'])
    expect(merged.nextPanelId).toBe(3)
  })

  it('空 panel 列表时不抛错', () => {
    const merged = mergeBoards({ version: 2, panels: [] }, { version: 2, panels: [] }) as {
      panels: unknown[]
      nextTaskId: number
    }

    expect(merged.panels).toEqual([])
    expect(merged.nextTaskId).toBe(1)
  })
})
