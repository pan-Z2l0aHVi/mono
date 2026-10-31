/**
 * 任务板同步。
 *
 * 守的是「编排进度在 board 上可见」这条用户可感知的契约：
 * dispatch 建任务并进入 in_progress，review APPROVE 推进到 in_review，REJECT 退回 todo
 * 并带上原因。以及两条稳定性要求——同一 slice 重放不重复建任务、board 工具失败不阻塞记忆。
 */

import { describe, expect, it } from 'vite-plus/test'

import { applyBoardAction, parsePanelTasks } from '../board/apply'
import {
  BOARD_PANEL_TITLE,
  boardActionForDispatch,
  boardActionForReview,
  enqueueBoardAction,
  taskTitle
} from '../board/sync'

const dispatchDetails = (overrides: Record<string, unknown> = {}) => ({
  action: 'dispatch',
  name: 'bridge-worker',
  role: 'builder',
  pane: 'w1:p7',
  ledgerFile: '/repo/.herdr-runs/bridge-worker.md',
  status: 'idle',
  ...overrides
})

const reviewDetails = (overrides: Record<string, unknown> = {}) => ({
  action: 'review',
  slice: 'bridge-worker',
  verdict: 'APPROVE',
  reason: 'criteria met',
  ...overrides
})

describe('dispatch → 建任务', () => {
  it('为 slice 建 in_progress 任务，描述带 role 与 ledger', () => {
    const action = boardActionForDispatch(dispatchDetails())

    expect(action).toEqual({
      kind: 'add_task',
      title: taskTitle('bridge-worker'),
      status: 'in_progress',
      description: 'role: builder | pane: w1:p7 | ledger: /repo/.herdr-runs/bridge-worker.md'
    })
  })

  it('非 dispatch 的 details 不产生动作', () => {
    expect(boardActionForDispatch({ action: 'plan' })).toBeUndefined()
    expect(boardActionForDispatch({ action: 'watch' })).toBeUndefined()
    expect(boardActionForDispatch(undefined)).toBeUndefined()
    expect(boardActionForDispatch('dispatch')).toBeUndefined()
  })

  it('缺少 name 时不产生动作', () => {
    expect(boardActionForDispatch(dispatchDetails({ name: undefined }))).toBeUndefined()
    expect(boardActionForDispatch(dispatchDetails({ name: '   ' }))).toBeUndefined()
  })
})

describe('review → 移动任务', () => {
  it('APPROVE 进 in_review', () => {
    const action = boardActionForReview(reviewDetails())

    expect(action).toEqual({
      kind: 'move_task',
      title: taskTitle('bridge-worker'),
      status: 'in_review',
      description: 'review approved: criteria met'
    })
  })

  it('REJECT 退回 todo 并带上原因', () => {
    const action = boardActionForReview(reviewDetails({ verdict: 'REJECT', reason: 'no tests' }))

    expect(action?.status).toBe('todo')
    expect(action?.description).toBe('REJECT: no tests')
  })

  it('RE_PLAN 同样退回 todo', () => {
    const action = boardActionForReview(reviewDetails({ verdict: 'RE_PLAN', reason: 'blocked' }))
    expect(action?.status).toBe('todo')
    expect(action?.description).toBe('RE_PLAN: blocked')
  })

  it('解析出的真实 verdict 覆盖 details 的假值', () => {
    // details 说 APPROVE（orchestrator 的正则缺陷），文件里其实是 REJECT。
    const action = boardActionForReview(reviewDetails({ verdict: 'APPROVE' }), { verdict: 'REJECT' })

    expect(action?.status).toBe('todo')
  })

  it('UNKNOWN 不动任务', () => {
    expect(boardActionForReview(reviewDetails({ verdict: 'UNKNOWN' }))).toBeUndefined()
  })

  it('缺少 slice 时不产生动作', () => {
    expect(boardActionForReview(reviewDetails({ slice: undefined }))).toBeUndefined()
  })

  it('无 reason 时 REJECT 仍带占位说明', () => {
    const action = boardActionForReview(reviewDetails({ verdict: 'REJECT', reason: '' }))
    expect(action?.description).toBe('REJECT: (no reason recorded)')
  })

  it('模板占位符不当成 reason', () => {
    const action = boardActionForReview(reviewDetails({ verdict: 'APPROVE', reason: '<one or two sentences>' }))

    expect(action?.description).toBeUndefined()
  })

  it('调用方传入的真实 reason 覆盖占位符', () => {
    const action = boardActionForReview(reviewDetails({ reason: '<one or two sentences>' }), {
      verdict: 'APPROVE',
      reason: 'the file count was verified'
    })

    expect(action?.description).toBe('review approved: the file count was verified')
  })

  it('传入的 reason 也是占位符时按无 reason 处理', () => {
    const action = boardActionForReview(reviewDetails({ verdict: 'REJECT', reason: '<x>' }), {
      verdict: 'REJECT',
      reason: '<y>'
    })
    expect(action?.description).toBe('REJECT: (no reason recorded)')
  })
})

describe('标题稳定性', () => {
  it('同一 slice 的 dispatch 与 review 得到同一个标题', () => {
    const dispatched = boardActionForDispatch(dispatchDetails())
    const reviewed = boardActionForReview(reviewDetails())

    expect(dispatched?.title).toBe(reviewed?.title)
  })

  it('标题带固定前缀，便于与用户手建任务区分', () => {
    expect(taskTitle('x')).toBe('slice: x')
    expect(taskTitle('  x  ')).toBe('slice: x')
  })
})

describe('parsePanelTasks', () => {
  it('从 get_panel 的 JSON 里取任务', () => {
    const tasks = parsePanelTasks(
      JSON.stringify({ id: 'P-1', name: BOARD_PANEL_TITLE, tasks: [{ id: 'T-1', title: 'a', status: 'todo' }] })
    )

    expect(tasks).toEqual([{ id: 'T-1', title: 'a', status: 'todo' }])
  })

  it('非 JSON 或形状不符时返回空数组', () => {
    expect(parsePanelTasks('')).toEqual([])
    expect(parsePanelTasks('No panels yet')).toEqual([])
    expect(parsePanelTasks(JSON.stringify({ tasks: 'nope' }))).toEqual([])
    expect(parsePanelTasks(JSON.stringify({ tasks: [{ id: 'T-1' }] }))).toEqual([])
  })
})

/**
 * 动作执行：用一个记录调用的假 task_board。
 *
 * 断言落在「最终发出哪些 task_board 调用」上，而不是它的文件状态——board 的存储格式属于
 * pi-task-board，桥接只依赖工具契约。
 */
describe('applyBoardAction', () => {
  interface Call {
    name: string
    args: Record<string, unknown>
  }

  /** 造一个内存态 task_board：支持 list_panels / add_panel / get_panel / add_task / move_task。 */
  const fakeBoard = (initial?: { panel?: boolean; tasks?: Array<{ id: string; title: string; status: string }> }) => {
    const calls: Call[] = []
    const state = {
      hasPanel: initial?.panel ?? false,
      tasks: [...(initial?.tasks ?? [])],
      nextId: (initial?.tasks?.length ?? 0) + 1
    }
    const call = async (name: string, args: Record<string, unknown>) => {
      calls.push({ name, args })
      if (name !== 'task_board') return { ok: false, text: 'unexpected tool' }
      const action = args.action
      if (action === 'list_panels') {
        return {
          ok: true,
          text: state.hasPanel
            ? JSON.stringify([{ id: 'P-1', name: BOARD_PANEL_TITLE, tasks: state.tasks.length }])
            : 'No panels yet'
        }
      }
      if (action === 'add_panel') {
        state.hasPanel = true
        return { ok: true, text: 'Created panel P-1' }
      }
      if (action === 'get_panel') {
        if (!state.hasPanel) return { ok: false, text: 'panel not found' }
        return { ok: true, text: JSON.stringify({ id: 'P-1', name: BOARD_PANEL_TITLE, tasks: state.tasks }) }
      }
      if (action === 'add_task') {
        const id = `T-${state.nextId++}`
        state.tasks.push({ id, title: String(args.title), status: String(args.status) })
        return { ok: true, text: `Created ${id}` }
      }
      if (action === 'move_task') {
        const task = state.tasks.find(item => item.id === args.taskId)
        if (!task) return { ok: false, text: 'task not found' }
        task.status = String(args.status)
        return { ok: true, text: `Moved ${task.id}` }
      }
      if (action === 'update_task') return { ok: true, text: 'updated' }
      return { ok: false, text: `unknown action ${String(action)}` }
    }
    return { call, calls, state }
  }

  it('面板不存在时先创建再建任务', async () => {
    const board = fakeBoard()
    const outcome = await applyBoardAction(board.call, {
      kind: 'add_task',
      title: taskTitle('s1'),
      status: 'in_progress',
      description: 'role: builder'
    })

    expect(outcome.ok).toBe(true)
    const actions = board.calls.map(c => c.args.action)
    // get_panel 会出现两次：建任务前查重、建任务后再查一次并删冗余。
    expect(actions.filter(a => a === 'add_panel')).toHaveLength(1)
    expect(actions.filter(a => a === 'add_task')).toHaveLength(1)
    expect(board.state.tasks).toHaveLength(1)
    expect(board.state.tasks[0]?.title).toBe('slice: s1')
  })

  it('面板已存在时不重复创建', async () => {
    const board = fakeBoard({ panel: true })
    await applyBoardAction(board.call, { kind: 'add_task', title: taskTitle('s1'), status: 'in_progress' })

    expect(board.calls.map(c => c.args.action)).not.toContain('add_panel')
  })

  it('同一 slice 重复 dispatch 不重复建任务', async () => {
    const board = fakeBoard()
    await applyBoardAction(board.call, { kind: 'add_task', title: taskTitle('s1'), status: 'in_progress' })
    await applyBoardAction(board.call, { kind: 'add_task', title: taskTitle('s1'), status: 'in_progress' })

    expect(board.state.tasks).toHaveLength(1)
  })

  it('同一 slice 重复 dispatch 但状态不同时移动而不是新建', async () => {
    const board = fakeBoard({ panel: true, tasks: [{ id: 'T-1', title: taskTitle('s1'), status: 'todo' }] })
    await applyBoardAction(board.call, { kind: 'add_task', title: taskTitle('s1'), status: 'in_progress' })

    expect(board.state.tasks).toHaveLength(1)
    expect(board.state.tasks[0]?.status).toBe('in_progress')
  })

  it('review 移动已有任务并写入原因', async () => {
    const board = fakeBoard({ panel: true, tasks: [{ id: 'T-1', title: taskTitle('s1'), status: 'in_progress' }] })
    const outcome = await applyBoardAction(board.call, {
      kind: 'move_task',
      title: taskTitle('s1'),
      status: 'todo',
      description: 'REJECT: no tests'
    })

    expect(outcome.ok).toBe(true)
    const actions = board.calls.map(c => c.args.action)
    expect(actions).toContain('move_task')
    expect(actions).toContain('update_task')
    expect(board.state.tasks[0]?.status).toBe('todo')
  })

  it('review 时任务还不存在则补建在目标状态', async () => {
    const board = fakeBoard()
    const outcome = await applyBoardAction(board.call, {
      kind: 'move_task',
      title: taskTitle('ghost'),
      status: 'in_review'
    })

    expect(outcome.ok).toBe(true)
    expect(board.state.tasks[0]?.status).toBe('in_review')
  })

  it('状态已经一致时不发 move_task', async () => {
    const board = fakeBoard({ panel: true, tasks: [{ id: 'T-1', title: taskTitle('s1'), status: 'in_review' }] })
    const outcome = await applyBoardAction(board.call, {
      kind: 'move_task',
      title: taskTitle('s1'),
      status: 'in_review'
    })

    expect(outcome.ok).toBe(true)
    expect(board.calls.map(c => c.args.action)).not.toContain('move_task')
  })

  it('board 工具失败时返回 ok:false 并带上原因', async () => {
    const call = async () => ({ ok: false, text: 'board file is corrupt' })
    const outcome = await applyBoardAction(call, { kind: 'add_task', title: taskTitle('s1'), status: 'todo' })

    expect(outcome.ok).toBe(false)
    expect(outcome.detail).toContain('corrupt')
  })
})

/**
 * 入队合并。
 *
 * dispatch 与 review 的 tool_result 可能在同一次 flush 之前连续触发，那时上一次的写还没
 * 落盘。若两条都入队，执行时会查不到已有任务而重复建——所以合并必须发生在入队时。
 */
describe('enqueueBoardAction', () => {
  const dispatch = () => boardActionForDispatch(dispatchDetails())!
  const review = (overrides: Record<string, unknown> = {}) => boardActionForReview(reviewDetails(overrides))!

  it('同一 slice 的 dispatch + review 只留一条', () => {
    const queue: ReturnType<typeof dispatch>[] = []
    enqueueBoardAction(queue, dispatch())
    enqueueBoardAction(queue, review())

    expect(queue).toHaveLength(1)
  })

  it('合并后取最新状态', () => {
    const queue: ReturnType<typeof dispatch>[] = []
    enqueueBoardAction(queue, dispatch())
    enqueueBoardAction(queue, review())

    expect(queue[0]?.status).toBe('in_review')
  })

  it('合并后取最新的描述（review 的原因优先于 dispatch 的 role）', () => {
    const queue: ReturnType<typeof dispatch>[] = []
    enqueueBoardAction(queue, dispatch())
    enqueueBoardAction(queue, review({ verdict: 'REJECT', reason: 'no tests' }))

    expect(queue[0]?.description).toBe('REJECT: no tests')
    expect(queue[0]?.status).toBe('todo')
  })

  it('状态可以回退：in_progress 之后 REJECT 打回 todo', () => {
    const queue: ReturnType<typeof dispatch>[] = []
    enqueueBoardAction(queue, dispatch())
    enqueueBoardAction(queue, review({ verdict: 'REJECT', reason: 'gaps' }))

    expect(queue[0]?.status).toBe('todo')
  })

  it('不同 slice 各占一条', () => {
    const queue: ReturnType<typeof dispatch>[] = []
    enqueueBoardAction(queue, dispatch())
    enqueueBoardAction(queue, boardActionForDispatch(dispatchDetails({ name: 'other-worker' }))!)

    expect(queue).toHaveLength(2)
  })

  it('合并后仍是 add_task 语义，执行层才能「不存在就创建」', () => {
    const queue: ReturnType<typeof dispatch>[] = []
    enqueueBoardAction(queue, dispatch())
    enqueueBoardAction(queue, review())

    expect(queue[0]?.kind).toBe('add_task')
  })

  it('只有 review 时保持 move_task', () => {
    const queue: ReturnType<typeof dispatch>[] = []
    enqueueBoardAction(queue, review())

    expect(queue[0]?.kind).toBe('move_task')
  })

  it('新动作没有描述时保留旧描述', () => {
    const queue: ReturnType<typeof dispatch>[] = []
    enqueueBoardAction(queue, dispatch())
    enqueueBoardAction(queue, review({ verdict: 'APPROVE', reason: '' }))

    expect(queue[0]?.description).toBe('role: builder | pane: w1:p7 | ledger: /repo/.herdr-runs/bridge-worker.md')
  })
})
