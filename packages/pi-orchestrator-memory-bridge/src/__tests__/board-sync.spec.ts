/**
 * 任务板同步。
 *
 * 守的是「编排进度在 board 上可见」这条用户可感知的契约：
 * dispatch 建任务并进入 in_progress，watch 到 done 推进到 in_review、卡住时记录原因，
 * review APPROVE 推进到 in_review，REJECT 退回 todo 并带上原因。以及两条稳定性要求——
 * 同一 slice 重放不重复建任务、board 工具失败不阻塞记忆。
 */

import { describe, expect, it } from 'vite-plus/test'

import { appendedDescription, applyBoardAction, parsePanelTasks } from '../board/apply'
import {
  BOARD_PANEL_TITLE,
  boardActionForDispatch,
  boardActionForReview,
  boardActionForWatch,
  enqueueBoardAction,
  taskTitle,
  withoutWatchReasons,
  type BoardAction
} from '../board/sync'

const dispatchDetails = (overrides: Record<string, unknown> = {}) => ({
  action: 'dispatch',
  name: 'bridge-worker',
  role: 'builder',
  pane: 'w1:p7',
  ledgerFile: '/repo/.herdr-runs/bridge-worker.md',
  status: 'working',
  ...overrides
})

const reviewDetails = (overrides: Record<string, unknown> = {}) => ({
  action: 'review',
  slice: 'bridge-worker',
  verdict: 'APPROVE',
  reason: 'criteria met',
  ...overrides
})

const watchDetails = (overrides: Record<string, unknown> = {}) => ({
  action: 'watch',
  name: 'bridge-worker',
  status: 'done',
  elapsedMs: 1234,
  ledgerText: 'DONE: all good',
  ...overrides
})

describe('dispatch → 建任务', () => {
  it('为 slice 建 in_progress 任务，描述带 role 与 ledger', () => {
    const action = boardActionForDispatch(dispatchDetails())

    expect(action).toEqual({
      kind: 'add_task',
      title: taskTitle('bridge-worker'),
      status: 'in_progress',
      description: 'role: builder | pane: w1:p7 | ledger: /repo/.herdr-runs/bridge-worker.md',
      intent: 'dispatch'
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

describe('watch → 反映 worker 终态', () => {
  it('done 进 in_review，表示等验收', () => {
    const action = boardActionForWatch(watchDetails())

    expect(action).toEqual({
      kind: 'move_task',
      title: taskTitle('bridge-worker'),
      status: 'in_review',
      intent: 'watch'
    })
  })

  for (const status of ['blocked', 'timeout', 'lost']) {
    it(`${status} 留在 in_progress 并记录原因`, () => {
      const action = boardActionForWatch(watchDetails({ status }))

      expect(action?.status).toBe('in_progress')
      expect(action?.description).toBe(`watch: ${status}`)
      expect(action?.appendDescription).toBe(true)
    })
  }

  it('轮询中间态不产生动作（status 是 agent 实时状态，不是终态）', () => {
    expect(boardActionForWatch(watchDetails({ waiting: true, status: 'blocked' }))).toBeUndefined()
  })

  it('缺少 name、未知状态或非 watch 都不产生动作', () => {
    expect(boardActionForWatch(watchDetails({ name: undefined }))).toBeUndefined()
    expect(boardActionForWatch(watchDetails({ name: '   ' }))).toBeUndefined()
    expect(boardActionForWatch(watchDetails({ status: 'idle' }))).toBeUndefined()
    expect(boardActionForWatch({ action: 'dispatch', name: 'bridge-worker', status: 'done' })).toBeUndefined()
    expect(boardActionForWatch(undefined)).toBeUndefined()
    expect(boardActionForWatch('watch')).toBeUndefined()
  })
})

describe('review → 移动任务', () => {
  it('APPROVE 进 in_review', () => {
    const action = boardActionForReview(reviewDetails())

    expect(action).toEqual({
      kind: 'move_task',
      title: taskTitle('bridge-worker'),
      status: 'in_review',
      description: 'review approved: criteria met',
      intent: 'review'
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

  it('取任务的 description', () => {
    const tasks = parsePanelTasks(
      JSON.stringify({ tasks: [{ id: 'T-1', title: 'a', status: 'todo', description: 'role: builder' }] })
    )

    expect(tasks).toEqual([{ id: 'T-1', title: 'a', status: 'todo', description: 'role: builder' }])
  })

  it('非 JSON 或形状不符时返回空数组', () => {
    expect(parsePanelTasks('')).toEqual([])
    expect(parsePanelTasks('No panels yet')).toEqual([])
    expect(parsePanelTasks(JSON.stringify({ tasks: 'nope' }))).toEqual([])
    expect(parsePanelTasks(JSON.stringify({ tasks: [{ id: 'T-1' }] }))).toEqual([])
  })
})

describe('withoutWatchReasons', () => {
  it('剥掉桥接自己写的 watch 卡住原因', () => {
    expect(withoutWatchReasons('role: builder\nwatch: blocked')).toBe('role: builder')
  })

  it('大小写与首尾空白容错', () => {
    expect(withoutWatchReasons('role: builder\n  WATCH: Timeout  ')).toBe('role: builder')
  })

  it('保留不以桥接状态结尾的 watch 行（用户备注）', () => {
    expect(withoutWatchReasons('watch: my own note\nrole: builder')).toBe('watch: my own note\nrole: builder')
  })

  it('带后缀的 watch 行按非桥接内容保留', () => {
    // 桥接只会写整行 `watch: <status>`；后缀说明这行来自 reviewer 或用户，不能当过期原因删掉。
    expect(withoutWatchReasons('watch: blocked because X\nrole: builder')).toBe(
      'watch: blocked because X\nrole: builder'
    )
  })

  it('空描述返回 undefined', () => {
    expect(withoutWatchReasons(undefined)).toBeUndefined()
    expect(withoutWatchReasons('')).toBeUndefined()
  })
})

describe('appendedDescription', () => {
  it('默认整段替换', () => {
    expect(appendedDescription('role: builder', 'watch: blocked', false)).toBe('watch: blocked')
  })

  it('追加时保留已有描述', () => {
    expect(appendedDescription('role: builder', 'watch: blocked', true)).toBe('role: builder\nwatch: blocked')
  })

  it('已有描述为空时直接写新内容', () => {
    expect(appendedDescription(undefined, 'watch: blocked', true)).toBe('watch: blocked')
    expect(appendedDescription('   ', 'watch: blocked', true)).toBe('watch: blocked')
  })

  it('同一行已经存在时不重复追加', () => {
    expect(appendedDescription('role: builder\nwatch: blocked', ' watch: blocked ', true)).toBe(
      'role: builder\nwatch: blocked'
    )
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

  /** 造一个内存态 task_board：支持 list_panels / add_panel / get_panel / add_task / move_task / update_task。 */
  const fakeBoard = (initial?: {
    panel?: boolean
    tasks?: Array<{ id: string; title: string; status: string; description?: string }>
  }) => {
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
        state.tasks.push({
          id,
          title: String(args.title),
          status: String(args.status),
          ...(typeof args.description === 'string' ? { description: args.description } : {})
        })
        return { ok: true, text: `Created ${id}` }
      }
      if (action === 'move_task') {
        const task = state.tasks.find(item => item.id === args.taskId)
        if (!task) return { ok: false, text: 'task not found' }
        task.status = String(args.status)
        return { ok: true, text: `Moved ${task.id}` }
      }
      if (action === 'update_task') {
        const task = state.tasks.find(item => item.id === args.taskId)
        if (!task) return { ok: false, text: 'task not found' }
        if (typeof args.description === 'string') task.description = args.description
        return { ok: true, text: 'updated' }
      }
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

  it('watch 的卡住原因追加到已有描述，不覆盖 dispatch 写入的元信息', async () => {
    const board = fakeBoard({
      panel: true,
      tasks: [{ id: 'T-1', title: taskTitle('s1'), status: 'in_progress', description: 'role: builder' }]
    })
    const action = boardActionForWatch(watchDetails({ name: 's1', status: 'blocked' }))!
    await applyBoardAction(board.call, action)

    expect(board.state.tasks[0]?.status).toBe('in_progress')
    expect(board.state.tasks[0]?.description).toBe('role: builder\nwatch: blocked')
  })

  it('重复上报同一卡住原因不重复追加', async () => {
    const board = fakeBoard({
      panel: true,
      tasks: [{ id: 'T-1', title: taskTitle('s1'), status: 'in_progress', description: 'role: builder' }]
    })
    const action = boardActionForWatch(watchDetails({ name: 's1', status: 'timeout' }))!
    await applyBoardAction(board.call, action)
    await applyBoardAction(board.call, action)

    expect(board.state.tasks[0]?.description).toBe('role: builder\nwatch: timeout')
    expect(board.calls.filter(c => c.args.action === 'update_task')).toHaveLength(1)
  })

  it('新的卡住原因取代旧的，不把两种原因都留在板上', async () => {
    const board = fakeBoard({
      panel: true,
      tasks: [{ id: 'T-1', title: taskTitle('s1'), status: 'in_progress', description: 'role: builder' }]
    })
    await applyBoardAction(board.call, boardActionForWatch(watchDetails({ name: 's1', status: 'blocked' }))!)
    await applyBoardAction(board.call, boardActionForWatch(watchDetails({ name: 's1', status: 'timeout' }))!)

    expect(board.state.tasks[0]?.description).toBe('role: builder\nwatch: timeout')
  })

  it('跨轮 blocked → done 清掉过期的 watch 原因并进 in_review', async () => {
    const board = fakeBoard({
      panel: true,
      tasks: [{ id: 'T-1', title: taskTitle('s1'), status: 'in_progress', description: 'role: builder' }]
    })
    await applyBoardAction(board.call, boardActionForWatch(watchDetails({ name: 's1', status: 'blocked' }))!)
    expect(board.state.tasks[0]?.description).toBe('role: builder\nwatch: blocked')

    await applyBoardAction(board.call, boardActionForWatch(watchDetails({ name: 's1', status: 'done' }))!)

    expect(board.state.tasks[0]?.status).toBe('in_review')
    expect(board.state.tasks[0]?.description).toBe('role: builder')
    expect(board.state.tasks[0]?.description).not.toContain('blocked')
  })

  it('watch done 进 in_review，之后的 review REJECT 能打回 todo', async () => {
    const board = fakeBoard()
    await applyBoardAction(board.call, boardActionForWatch(watchDetails({ name: 's1' }))!)
    expect(board.state.tasks[0]?.status).toBe('in_review')

    await applyBoardAction(
      board.call,
      boardActionForReview(reviewDetails({ slice: 's1', verdict: 'REJECT', reason: 'gaps' }))!
    )

    expect(board.state.tasks[0]?.status).toBe('todo')
    expect(board.state.tasks[0]?.description).toBe('REJECT: gaps')
  })

  it('review 移动已有任务并写入原因', async () => {
    const board = fakeBoard({ panel: true, tasks: [{ id: 'T-1', title: taskTitle('s1'), status: 'in_progress' }] })
    const outcome = await applyBoardAction(board.call, {
      kind: 'move_task',
      title: taskTitle('s1'),
      status: 'todo',
      description: 'REJECT: no tests',
      intent: 'review'
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

  /**
   * 队列里的旧意图不能把板上更新的状态降级。
   *
   * 动作要等下一次 flush 才执行，期间 watch 的 done 可能已经把任务推到 in_review；仍留在队
   * 里的 add_task(in_progress) 若按「状态不等就移动」执行会把它打回 in_progress。add_task
   * 只推进，回退只由 review 的结论（move_task）触发。
   */
  it('板上已 in_review 时到达旧的 add_task(in_progress) 不移动，保持 in_review', async () => {
    const board = fakeBoard({
      panel: true,
      tasks: [{ id: 'T-1', title: taskTitle('s1'), status: 'in_review', description: 'review approved: criteria met' }]
    })
    const outcome = await applyBoardAction(board.call, {
      kind: 'add_task',
      title: taskTitle('s1'),
      status: 'in_progress',
      description: 'role: builder | pane: w1:p7'
    })

    expect(outcome.ok).toBe(true)
    expect(board.state.tasks[0]?.status).toBe('in_review')
    expect(board.calls.map(c => c.args.action)).not.toContain('move_task')
    // 过期意图的描述也不能把 review 的结论顶掉。
    expect(board.state.tasks[0]?.description).toBe('review approved: criteria met')
  })

  it('缺陷复现：watch done 先移到 in_review，队里旧的 add_task(in_progress) 不会把它打回', async () => {
    const board = fakeBoard({
      panel: true,
      tasks: [{ id: 'T-1', title: taskTitle('s1'), status: 'in_progress', description: 'role: builder' }]
    })
    await applyBoardAction(board.call, boardActionForWatch(watchDetails({ name: 's1' }))!)
    expect(board.state.tasks[0]?.status).toBe('in_review')

    await applyBoardAction(board.call, boardActionForDispatch(dispatchDetails({ name: 's1' }))!)

    expect(board.state.tasks[0]?.status).toBe('in_review')
    expect(board.state.tasks[0]?.description).toBe('role: builder')
  })

  it('D3：dispatch 的 status 是 done/idle 时视同一次 watch-done，任务直接到 in_review', () => {
    const done = boardActionForDispatch(dispatchDetails({ status: 'done' }))
    const idle = boardActionForDispatch(dispatchDetails({ status: 'idle' }))

    expect(done).toEqual({
      kind: 'add_task',
      title: taskTitle('bridge-worker'),
      status: 'in_review',
      description: 'role: builder | pane: w1:p7 | ledger: /repo/.herdr-runs/bridge-worker.md',
      intent: 'dispatch'
    })
    expect(idle).toEqual(done)
  })

  it('D3：dispatch 的 status 是 working/blocked/缺省时仍建 in_progress', () => {
    expect(boardActionForDispatch(dispatchDetails({ status: 'working' }))?.status).toBe('in_progress')
    expect(boardActionForDispatch(dispatchDetails({ status: 'blocked' }))?.status).toBe('in_progress')
    expect(boardActionForDispatch(dispatchDetails({ status: undefined }))?.status).toBe('in_progress')
  })

  it('板上已 todo 时 add_task(in_progress) 照常推进', async () => {
    const board = fakeBoard({ panel: true, tasks: [{ id: 'T-1', title: taskTitle('s1'), status: 'todo' }] })
    const outcome = await applyBoardAction(board.call, {
      kind: 'add_task',
      title: taskTitle('s1'),
      status: 'in_progress'
    })

    expect(outcome.ok).toBe(true)
    expect(board.state.tasks[0]?.status).toBe('in_progress')
  })

  it('板上已 in_progress 时 watch done 的 move_task 推进到 in_review', async () => {
    const board = fakeBoard({ panel: true, tasks: [{ id: 'T-1', title: taskTitle('s1'), status: 'in_progress' }] })
    await applyBoardAction(board.call, boardActionForWatch(watchDetails({ name: 's1' }))!)

    expect(board.state.tasks[0]?.status).toBe('in_review')
  })

  /**
   * 陈旧的 watch(stuck) 不能把已进入 in_review 的任务降回 in_progress。
   *
   * watch 的卡住终态是 `move_task(in_progress, intent:'watch')`。它描述 worker **当时**的
   * 状态；板上已经 in_review 时这条事件是陈旧的，整条 no-op：不移动，也不把过期的卡住原因
   * 追加到等验收的任务上。dispatch 的 add_task 已有同样的保护，这里补的是 move_task 这一半。
   */
  it('板上已 in_review 时陈旧的 watch(blocked) 既不降级也不追加原因', async () => {
    const board = fakeBoard({
      panel: true,
      tasks: [{ id: 'T-1', title: taskTitle('s1'), status: 'in_review', description: 'role: builder' }]
    })

    const action = boardActionForWatch(watchDetails({ name: 's1', status: 'blocked' }))!
    const outcome = await applyBoardAction(board.call, action)

    expect(outcome.ok).toBe(true)
    expect(board.state.tasks[0]?.status).toBe('in_review')
    expect(board.state.tasks[0]?.description).toBe('role: builder')
    expect(board.calls.map(c => c.args.action)).not.toContain('move_task')
    expect(board.calls.map(c => c.args.action)).not.toContain('update_task')
  })

  it('板上 in_progress 时 watch(blocked) 照常写原因', async () => {
    const board = fakeBoard({
      panel: true,
      tasks: [{ id: 'T-1', title: taskTitle('s1'), status: 'in_progress', description: 'role: builder' }]
    })

    await applyBoardAction(board.call, boardActionForWatch(watchDetails({ name: 's1', status: 'blocked' }))!)

    expect(board.state.tasks[0]?.status).toBe('in_progress')
    expect(board.state.tasks[0]?.description).toBe('role: builder\nwatch: blocked')
  })

  it('板上已 in_review 时 review REJECT 的 move_task 仍能回退到 todo', async () => {
    const board = fakeBoard({ panel: true, tasks: [{ id: 'T-1', title: taskTitle('s1'), status: 'in_review' }] })
    await applyBoardAction(
      board.call,
      boardActionForReview(reviewDetails({ slice: 's1', verdict: 'REJECT', reason: 'gaps' }))!
    )

    expect(board.state.tasks[0]?.status).toBe('todo')
    expect(board.state.tasks[0]?.description).toBe('REJECT: gaps')
  })

  /**
   * 回退保护看动作来源意图，不看合并后的 kind。
   *
   * 同轮 dispatch + review REJECT 在队列里合并成一条 `add_task(todo)`——kind 必须保留 `add_task`
   * 才能「不存在就创建」。若回退保护按 kind 判断，这条 review 结论会被误判成陈旧的 dispatch
   * 而整条 no-op：状态不回退，REJECT 原因也不落盘。
   */
  const mergedDispatchThenReject = (slice = 's1', reason = 'gaps') => {
    const queue: BoardAction[] = []
    enqueueBoardAction(queue, boardActionForDispatch(dispatchDetails({ name: slice }))!)
    enqueueBoardAction(queue, boardActionForReview(reviewDetails({ slice, verdict: 'REJECT', reason }))!)
    return queue[0]!
  }

  for (const status of ['in_progress', 'in_review'] as const) {
    it(`同轮 dispatch + review REJECT 合并后，板上已 ${status} 仍退回 todo 并写入原因`, async () => {
      const board = fakeBoard({
        panel: true,
        tasks: [{ id: 'T-1', title: taskTitle('s1'), status, description: 'role: builder' }]
      })
      const action = mergedDispatchThenReject()
      // 前提：合并后的 kind 仍是 add_task，状态是 review 的结论。
      expect(action.kind).toBe('add_task')
      expect(action.status).toBe('todo')

      const outcome = await applyBoardAction(board.call, action)

      expect(outcome.ok).toBe(true)
      expect(board.state.tasks[0]?.status).toBe('todo')
      expect(board.state.tasks[0]?.description).toBe('REJECT: gaps')
    })
  }

  it('跨轮：dispatch 先落盘 in_progress，随后的 review REJECT 退回 todo 并写入原因', async () => {
    const board = fakeBoard()
    await applyBoardAction(board.call, boardActionForDispatch(dispatchDetails({ name: 's1' }))!)
    expect(board.state.tasks[0]?.status).toBe('in_progress')

    await applyBoardAction(
      board.call,
      boardActionForReview(reviewDetails({ slice: 's1', verdict: 'REJECT', reason: 'gaps' }))!
    )

    expect(board.state.tasks[0]?.status).toBe('todo')
    expect(board.state.tasks[0]?.description).toBe('REJECT: gaps')
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
  const watch = (overrides: Record<string, unknown> = {}) => boardActionForWatch(watchDetails(overrides))!

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

  it('合并后仍保留 review 的回退意图（kind 是 add_task，意图仍是 review）', () => {
    const queue: ReturnType<typeof dispatch>[] = []
    enqueueBoardAction(queue, dispatch())
    enqueueBoardAction(queue, review({ verdict: 'REJECT', reason: 'gaps' }))

    expect(queue[0]?.kind).toBe('add_task')
    expect(queue[0]?.intent).toBe('review')
  })

  it('dispatch + watch 合并后意图是 watch', () => {
    const queue: ReturnType<typeof dispatch>[] = []
    enqueueBoardAction(queue, dispatch())
    enqueueBoardAction(queue, watch())

    expect(queue[0]?.intent).toBe('watch')
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

  it('dispatch 与 watch done 合并成一条 in_review', () => {
    const queue: ReturnType<typeof dispatch>[] = []
    enqueueBoardAction(queue, dispatch())
    enqueueBoardAction(queue, watch())

    expect(queue).toHaveLength(1)
    expect(queue[0]?.status).toBe('in_review')
    expect(queue[0]?.kind).toBe('add_task')
    // done 不带描述，dispatch 写的 role/pane/ledger 保留。
    expect(queue[0]?.description).toContain('role: builder')
  })

  it('watch done 之后的 review REJECT 仍能打回 todo', () => {
    const queue: ReturnType<typeof dispatch>[] = []
    enqueueBoardAction(queue, watch())
    enqueueBoardAction(queue, review({ verdict: 'REJECT', reason: 'no tests' }))

    expect(queue).toHaveLength(1)
    expect(queue[0]?.status).toBe('todo')
    expect(queue[0]?.description).toBe('REJECT: no tests')
    expect(queue[0]?.appendDescription).toBeUndefined()
  })

  it('watch 的 in_review 不覆盖后续 review 的 verdict 结果', () => {
    const queue: ReturnType<typeof dispatch>[] = []
    enqueueBoardAction(queue, watch())
    enqueueBoardAction(queue, review({ verdict: 'APPROVE', reason: 'criteria met' }))

    expect(queue[0]?.status).toBe('in_review')
    expect(queue[0]?.description).toBe('review approved: criteria met')
  })

  for (const status of ['blocked', 'timeout', 'lost']) {
    it(`同轮 dispatch + watch ${status} 合并后同时保留元信息与卡住原因`, () => {
      const queue: ReturnType<typeof dispatch>[] = []
      enqueueBoardAction(queue, dispatch())
      enqueueBoardAction(queue, watch({ status }))

      expect(queue).toHaveLength(1)
      expect(queue[0]?.status).toBe('in_progress')
      // dispatch 写的 role/pane/ledger 与 watch 的卡住原因同时留在板上。
      expect(queue[0]?.description).toBe(
        `role: builder | pane: w1:p7 | ledger: /repo/.herdr-runs/bridge-worker.md\nwatch: ${status}`
      )
      // 合并后的描述已是完整内容，执行层整段替换，不需要再追加。
      expect(queue[0]?.appendDescription).toBeUndefined()
    })
  }

  it('同轮 dispatch + watch done 不残留 watch 原因', () => {
    const queue: ReturnType<typeof dispatch>[] = []
    enqueueBoardAction(queue, dispatch())
    enqueueBoardAction(queue, watch())

    expect(queue[0]?.status).toBe('in_review')
    expect(queue[0]?.description).toBe('role: builder | pane: w1:p7 | ledger: /repo/.herdr-runs/bridge-worker.md')
    expect(queue[0]?.description).not.toContain('watch:')
    expect(queue[0]?.description).not.toContain('blocked')
  })

  it('同轮 blocked → done 后不残留过期的 blocked 原因', () => {
    const queue: ReturnType<typeof dispatch>[] = []
    enqueueBoardAction(queue, dispatch())
    enqueueBoardAction(queue, watch({ status: 'blocked' }))
    enqueueBoardAction(queue, watch({ status: 'done' }))

    expect(queue).toHaveLength(1)
    expect(queue[0]?.status).toBe('in_review')
    expect(queue[0]?.description).toBe('role: builder | pane: w1:p7 | ledger: /repo/.herdr-runs/bridge-worker.md')
    expect(queue[0]?.description).not.toContain('blocked')
  })

  it('同轮多个卡住原因只保留最新的那个', () => {
    const queue: ReturnType<typeof dispatch>[] = []
    enqueueBoardAction(queue, dispatch())
    enqueueBoardAction(queue, watch({ status: 'blocked' }))
    enqueueBoardAction(queue, watch({ status: 'timeout' }))

    expect(queue[0]?.description).toBe(
      'role: builder | pane: w1:p7 | ledger: /repo/.herdr-runs/bridge-worker.md\nwatch: timeout'
    )
    expect(queue[0]?.description).not.toContain('blocked')
  })
})
