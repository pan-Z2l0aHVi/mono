/**
 * board 摘要读取与读写路径一致性。
 *
 * 验收里那条「board 不存在时不应报错」是前一半的主题：board 是加分项，任何格式不符都必须
 * 静默降级成 undefined，而不是把异常抛进 `before_agent_start`。
 *
 * 后一半是「dispatch 之后 `/board` 上能看到任务」：写入经 `task_board` 工具落
 * `<cwd>/.pi/task-board.json`，读取侧必须读同一个文件。在 linked worktree 里读主 checkout
 * 的板，就是用户看不到编排进度的那个 bug。
 */

import { execFileSync } from 'node:child_process'
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vite-plus/test'

import { applyBoardAction } from '../board/apply'
import { BOARD_PANEL_TITLE, taskTitle } from '../board/sync'
import { boardPath, parseBoard, readBoardSummary } from '../board/task-board'

const boardFile = (overrides: Record<string, unknown> = {}) => ({
  version: 2,
  nextPanelId: 2,
  nextTaskId: 3,
  lastPanelId: 'P-2',
  panels: [
    {
      id: 'P-1',
      name: 'older',
      tasks: [{ id: 'T-9', title: 'old task', status: 'backlog', sessions: [] }],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z'
    },
    {
      id: 'P-2',
      name: 'current',
      tasks: [
        { id: 'T-1', title: 'wire anchor', status: 'in_review', sessions: [] },
        { id: 'T-2', title: 'read board', status: 'todo', sessions: [] },
        { id: 'T-3', title: 'ship', status: 'in_progress', sessions: [] }
      ],
      createdAt: '2026-01-02T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z'
    }
  ],
  ...overrides
})

const makeRepo = async (content?: string): Promise<string> => {
  const root = await mkdtemp(join(tmpdir(), 'board-spec-'))
  if (content !== undefined) {
    await mkdir(join(root, '.pi'), { recursive: true })
    await writeFile(boardPath(root), content, 'utf8')
  }
  return root
}

describe('parseBoard', () => {
  it('选 lastPanelId 指向的面板', () => {
    const summary = parseBoard(boardFile())

    expect(summary?.panel).toBe('current')
  })

  it('统计各状态数量', () => {
    const summary = parseBoard(boardFile())

    expect(summary?.counts).toEqual({ in_review: 1, todo: 1, in_progress: 1 })
  })

  it('in_progress / in_review 排在前面', () => {
    const summary = parseBoard(boardFile())

    expect(summary?.items.map(item => item.id)).toEqual(['T-1', 'T-3', 'T-2'])
  })

  it('lastPanelId 指向不存在的面板时回退到第一个有任务的面板', () => {
    const summary = parseBoard(boardFile({ lastPanelId: 'P-99' }))

    expect(summary?.panel).toBe('older')
  })

  it('没有 lastPanelId 时选第一个有任务的面板', () => {
    const raw = boardFile()
    delete (raw as Record<string, unknown>).lastPanelId
    const summary = parseBoard(raw)

    expect(summary?.panel).toBe('older')
  })

  it('版本不符时返回 undefined', () => {
    expect(parseBoard(boardFile({ version: 1 }))).toBeUndefined()
    expect(parseBoard(boardFile({ version: 3 }))).toBeUndefined()
  })

  it('没有 panels 或全为空时返回 undefined', () => {
    expect(parseBoard({ version: 2 })).toBeUndefined()
    expect(parseBoard({ version: 2, panels: [] })).toBeUndefined()
  })

  it('跳过不合法的任务条目而不是整份丢弃', () => {
    const summary = parseBoard(
      boardFile({
        panels: [
          {
            id: 'P-1',
            name: 'p',
            tasks: [
              { id: 'T-1', title: 'ok', status: 'todo' },
              { id: 'T-2', status: 'todo' },
              { title: 'no id', status: 'todo' },
              { id: 'T-4', title: 'bad status', status: 'nope' },
              null
            ]
          }
        ]
      })
    )

    expect(summary?.items).toHaveLength(1)
    expect(summary?.items[0]?.id).toBe('T-1')
  })
})

describe('readBoardSummary 容错', () => {
  it('board 文件不存在时返回 undefined 且不抛错', async () => {
    const root = await makeRepo()
    await expect(readBoardSummary(root)).resolves.toBeUndefined()
  })

  it('JSON 损坏时返回 undefined 且不抛错', async () => {
    const root = await makeRepo('{ not json')
    await expect(readBoardSummary(root)).resolves.toBeUndefined()
  })

  it('schema 不对时返回 undefined', async () => {
    const root = await makeRepo(JSON.stringify({ version: 99, panels: [] }))
    await expect(readBoardSummary(root)).resolves.toBeUndefined()
  })

  it('合法文件读出摘要', async () => {
    const root = await makeRepo(JSON.stringify(boardFile()))
    const summary = await readBoardSummary(root)

    expect(summary?.panel).toBe('current')
    expect(summary?.items.length).toBeGreaterThan(0)
  })
})

const git = (cwd: string, ...args: string[]): string =>
  execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()

/** 造一个主 checkout + 一个 linked worktree；布局由真实 git 生成，不手写 `.git` 文件。 */
const makeRepoWithWorktree = async (): Promise<{ main: string; worktree: string }> => {
  const root = await mkdtemp(join(tmpdir(), 'board-path-spec-'))
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
 * 文件态 `task_board` 替身：按 pi-task-board 的行为把状态写进 `cwd` 的
 * `.pi/task-board.json`，schema 与其 v2 一致。桥接只能经这个工具写入，所以替身落在哪里，
 * 读取侧就应该读到哪里。
 */
const createFileBoard = (cwd: string) => {
  const state = { panel: false, tasks: [] as Array<{ id: string; title: string; status: string }>, nextId: 1 }
  const now = '2026-01-01T00:00:00.000Z'

  const save = async (): Promise<void> => {
    await mkdir(join(cwd, '.pi'), { recursive: true })
    await writeFile(
      boardPath(cwd),
      JSON.stringify({
        version: 2,
        nextPanelId: 2,
        nextTaskId: state.nextId,
        lastPanelId: 'P-1',
        panels: state.panel
          ? [
              {
                id: 'P-1',
                name: BOARD_PANEL_TITLE,
                tasks: state.tasks.map(task => ({ ...task, sessions: [] })),
                createdAt: now,
                updatedAt: now
              }
            ]
          : []
      }),
      'utf8'
    )
  }

  return async (_name: string, args: Record<string, unknown>): Promise<{ ok: boolean; text: string }> => {
    const action = args.action
    if (action === 'list_panels') {
      return {
        ok: true,
        text: state.panel ? JSON.stringify([{ id: 'P-1', name: BOARD_PANEL_TITLE }]) : 'No panels yet'
      }
    }
    if (action === 'add_panel') {
      state.panel = true
      await save()
      return { ok: true, text: 'Created panel P-1' }
    }
    if (!state.panel) return { ok: false, text: 'panel not found' }
    if (action === 'get_panel') {
      return { ok: true, text: JSON.stringify({ id: 'P-1', name: BOARD_PANEL_TITLE, tasks: state.tasks }) }
    }
    if (action === 'add_task') {
      const id = `T-${state.nextId++}`
      state.tasks.push({ id, title: String(args.title), status: String(args.status) })
      await save()
      return { ok: true, text: `Created ${id}` }
    }
    if (action === 'move_task') {
      const task = state.tasks.find(item => item.id === args.taskId)
      if (!task) return { ok: false, text: 'task not found' }
      task.status = String(args.status)
      await save()
      return { ok: true, text: `Moved ${task.id}` }
    }
    if (action === 'delete_task') {
      state.tasks = state.tasks.filter(item => item.id !== args.taskId)
      await save()
      return { ok: true, text: 'deleted' }
    }
    if (action === 'update_task') {
      await save()
      return { ok: true, text: 'updated' }
    }
    return { ok: false, text: `unknown action ${String(action)}` }
  }
}

describe('worktree 里读写同一个板', () => {
  it('boardPath 落在 cwd 自己的 .pi 下', async () => {
    const { main, worktree } = await makeRepoWithWorktree()

    expect(boardPath(worktree)).toBe(join(worktree, '.pi', 'task-board.json'))
    expect(boardPath(worktree)).not.toBe(boardPath(main))
  })

  it('在 linked worktree 里 dispatch 建的任务能被 readBoardSummary 读到', async () => {
    const { main, worktree } = await makeRepoWithWorktree()

    const outcome = await applyBoardAction(createFileBoard(worktree), {
      kind: 'add_task',
      title: taskTitle('bridge-worker'),
      status: 'in_progress'
    })

    expect(outcome.ok).toBe(true)
    const summary = await readBoardSummary(worktree)
    expect(summary?.items).toEqual([{ id: 'T-1', title: taskTitle('bridge-worker'), status: 'in_progress' }])

    // 未调用 ensureSharedBoard 时两边仍是两个文件；共享由 `.pi` symlink 完成（见 share.spec.ts）。
    await expect(readBoardSummary(main)).resolves.toBeUndefined()
  })
})
