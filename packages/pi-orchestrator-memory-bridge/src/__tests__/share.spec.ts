/**
 * 共享任务板：worktree 的 `.pi` 指向主 checkout 的 `.pi`。
 *
 * 全部用临时目录 + 真实 `git init` / `git worktree add` 驱动，不碰本仓库——迁移会重命名目录，
 * 拿真实仓库做实验是不可接受的。覆盖的是 `ensureSharedBoard` 的决策矩阵与「不丢数据」：
 *
 * 1. 主 checkout 自己不做任何事。
 * 2. worktree 没有 `.pi` 时建 symlink，读写都落到主 checkout。
 * 3. worktree 已有真实 `.pi` 且只有 board 文件时合并数据、旧目录留作 `.pi.bak-<ts>`。
 * 4. `.pi` 里有别的条目时拒绝迁移，且不修改任何东西。
 * 5. 已共享时重复调用是 no-op。
 * 6. 文件系统失败（权限、目标被普通文件占住）折算成结果对象，不抛错。
 * 7. 链接指向主 checkout 但目标被删除时重建目录（`repaired`），不静默判成已共享。
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

import { describe, expect, it } from 'vite-plus/test'

import { ensureSharedBoard } from '../board/share'
import { boardPath, readBoardSummary } from '../board/task-board'

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

/** 主 checkout + 一个 linked worktree；布局由真实 git 生成，不手写 `.git` 文件。 */
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

/** `resolveRepoIdentity` 返回 realpath；断言链接目标时也用 realpath 对齐。 */
const mainPiDir = async (main: string): Promise<string> => join(await realpath(main), '.pi')

const writeBoard = async (dir: string, tasks: TaskFixture[], overrides?: Record<string, unknown>): Promise<void> => {
  await mkdir(join(dir, '.pi'), { recursive: true })
  await writeFile(boardPath(dir), JSON.stringify(boardFile(tasks, overrides)), 'utf8')
}

describe('ensureSharedBoard 决策矩阵', () => {
  it('主 checkout 调用时不建链接、不迁移', async () => {
    const { main } = await makeRepoWithWorktree()

    const outcome = ensureSharedBoard(main)

    expect(outcome).toEqual({ status: 'main-checkout', migrated: false })
    await expect(lstat(join(main, '.pi'))).rejects.toThrow(/ENOENT/)
  })

  it('主 checkout 的子目录同样不动作', async () => {
    const { main } = await makeRepoWithWorktree()
    const sub = join(main, 'packages', 'demo')
    await mkdir(sub, { recursive: true })

    expect(ensureSharedBoard(sub).status).toBe('main-checkout')
    await expect(lstat(join(sub, '.pi'))).rejects.toThrow(/ENOENT/)
  })

  it('worktree 没有 .pi 时建 symlink，读写都落到主 checkout', async () => {
    const { main, worktree } = await makeRepoWithWorktree()

    const outcome = ensureSharedBoard(worktree)

    expect(outcome.status).toBe('linked')
    expect(outcome.migrated).toBe(false)
    expect(outcome.target).toBe(await mainPiDir(main))
    expect((await lstat(join(worktree, '.pi'))).isSymbolicLink()).toBe(true)
    expect(await readlink(join(worktree, '.pi'))).toBe(await mainPiDir(main))

    // 经 worktree 的路径写入，主 checkout 的路径读到同一份数据。
    await mkdir(join(worktree, '.pi'), { recursive: true })
    await writeFile(boardPath(worktree), JSON.stringify(boardFile([{ id: 'T-1', title: 'shared' }])), 'utf8')
    const summary = await readBoardSummary(main)
    expect(summary?.items).toEqual([{ id: 'T-1', title: 'shared', status: 'todo' }])
  })

  it('worktree 的 .pi 只有 board 时合并数据、保留旧目录、变成 symlink', async () => {
    const { main, worktree } = await makeRepoWithWorktree()
    await writeBoard(main, [{ id: 'T-1', title: 'main task' }])
    await writeBoard(worktree, [
      { id: 'T-1', title: 'local duplicate' },
      { id: 'T-2', title: 'local only', status: 'in_progress' }
    ])

    const outcome = ensureSharedBoard(worktree)

    expect(outcome.status).toBe('migrated')
    expect(outcome.migrated).toBe(true)
    expect(outcome.target).toBe(await mainPiDir(main))
    expect((await lstat(join(worktree, '.pi'))).isSymbolicLink()).toBe(true)

    // 两边任务都在；冲突的 T-1 保留主 checkout 的版本；nextTaskId 推过并集。
    const merged = JSON.parse(await readFile(boardPath(main), 'utf8')) as {
      nextTaskId: number
      panels: Array<{ tasks: Array<{ id: string; title: string }> }>
    }
    expect(merged.panels[0]?.tasks.map(task => task.id)).toEqual(['T-1', 'T-2'])
    expect(merged.panels[0]?.tasks[0]?.title).toBe('main task')
    expect(merged.nextTaskId).toBe(3)
    expect((await readBoardSummary(worktree))?.items.map(item => item.id)).toEqual(['T-2', 'T-1'])

    // 旧目录被保留（不删除用户数据），里面仍是迁移前的本地 board。
    const backup = (await readdir(worktree)).find(name => name.startsWith('.pi.bak-'))
    expect(backup).toBeDefined()
    expect(outcome.backupPath).toBe(join(worktree, backup as string))
    const original = JSON.parse(await readFile(join(worktree, backup as string, 'task-board.json'), 'utf8')) as {
      panels: Array<{ tasks: Array<{ id: string; title: string }> }>
    }
    expect(original.panels[0]?.tasks.map(task => task.id)).toEqual(['T-1', 'T-2'])
    expect(original.panels[0]?.tasks[0]?.title).toBe('local duplicate')
  })

  it('.pi 里有 board 以外的条目时拒绝迁移且不修改任何东西', async () => {
    const { main, worktree } = await makeRepoWithWorktree()
    await writeBoard(worktree, [{ id: 'T-1', title: 'local' }])
    await writeFile(join(worktree, '.pi', 'settings.json'), '{"theme":"dark"}\n', 'utf8')
    const before = await readdir(join(worktree, '.pi'))

    const outcome = ensureSharedBoard(worktree)

    expect(outcome.status).toBe('refused')
    expect(outcome.migrated).toBe(false)
    expect(outcome.reason).toContain('settings.json')
    expect((await lstat(join(worktree, '.pi'))).isDirectory()).toBe(true)
    expect(await readdir(join(worktree, '.pi'))).toEqual(before)
    // 主 checkout 完全没被碰过：拒绝发生在写盘之前。
    await expect(lstat(join(main, '.pi'))).rejects.toThrow(/ENOENT/)
  })

  it('已是 symlink 时重复调用不做任何事', async () => {
    const { worktree } = await makeRepoWithWorktree()
    expect(ensureSharedBoard(worktree).status).toBe('linked')

    const outcome = ensureSharedBoard(worktree)

    expect(outcome.status).toBe('already-shared')
    expect(outcome.migrated).toBe(false)
    expect((await readdir(worktree)).some(name => name.startsWith('.pi.bak-'))).toBe(false)
  })

  it('.pi 是别的 symlink 时拒绝，不覆盖用户的链接', async () => {
    const { main, worktree } = await makeRepoWithWorktree()
    const elsewhere = join(main, 'elsewhere')
    await mkdir(elsewhere, { recursive: true })
    await symlink(elsewhere, join(worktree, '.pi'), 'dir')

    const outcome = ensureSharedBoard(worktree)

    expect(outcome.status).toBe('refused')
    expect(outcome.reason).toContain(elsewhere)
    expect(await readlink(join(worktree, '.pi'))).toBe(elsewhere)
  })
})

describe('ensureSharedBoard 悬空链接自愈', () => {
  it('主 checkout 的 .pi 被删除后重建目标并返回 repaired', async () => {
    const { main, worktree } = await makeRepoWithWorktree()
    expect(ensureSharedBoard(worktree).status).toBe('linked')
    // 链接还在，目标没了：再判 already-shared 会让 pi-task-board 写盘 ENOENT，任务静默丢失。
    await rm(join(main, '.pi'), { recursive: true, force: true })

    const outcome = ensureSharedBoard(worktree)

    expect(outcome.status).toBe('repaired')
    expect(outcome.migrated).toBe(false)
    expect(outcome.target).toBe(await mainPiDir(main))
    expect((await lstat(join(main, '.pi'))).isDirectory()).toBe(true)
    expect((await lstat(join(worktree, '.pi'))).isSymbolicLink()).toBe(true)

    // 重建后的目录重新可用：经 worktree 写入，主 checkout 读得到同一份数据。
    await writeFile(boardPath(worktree), JSON.stringify(boardFile([{ id: 'T-1', title: 'after repair' }])), 'utf8')
    expect((await readBoardSummary(main))?.items.map(item => item.id)).toEqual(['T-1'])

    // 目标已重建，下一次调用回到常规的 already-shared。
    expect(ensureSharedBoard(worktree).status).toBe('already-shared')
  })
})

describe('ensureSharedBoard 失败不冒泡', () => {
  it('主 checkout 的 .pi 被普通文件占住时返回 failed', async () => {
    const { main, worktree } = await makeRepoWithWorktree()
    await writeFile(join(main, '.pi'), 'not a directory', 'utf8')

    const outcome = ensureSharedBoard(worktree)

    expect(outcome.status).toBe('failed')
    expect(outcome.migrated).toBe(false)
    expect(outcome.reason).toMatch(/EEXIST|ENOTDIR/)
    await expect(lstat(join(worktree, '.pi'))).rejects.toThrow(/ENOENT/)
  })

  it.skipIf(IS_ROOT)('worktree 不可写时返回 failed 而不是抛错', async () => {
    const { worktree } = await makeRepoWithWorktree()
    await chmod(worktree, 0o500)
    try {
      const outcome = ensureSharedBoard(worktree)
      expect(outcome.status).toBe('failed')
      expect(outcome.reason).toMatch(/EACCES|permission denied/i)
    } finally {
      await chmod(worktree, 0o755)
    }
  })
})
