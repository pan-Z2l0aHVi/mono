/**
 * board 摘要读取的容错。
 *
 * 验收里那条「board 不存在时不应报错」是这里的主题：board 是加分项，任何格式不符都必须
 * 静默降级成 undefined，而不是把异常抛进 `before_agent_start`。
 */

import { mkdtemp, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vite-plus/test'

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
