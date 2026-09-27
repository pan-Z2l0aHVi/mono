#!/usr/bin/env node
// 编排巡检：多 agent 编排期间，把「谁跑完了 / 谁卡住了」收成一趟可重复的检查。
//
// 起停时机与首行分派见 SKILL.md 的「巡检」一节：派发多于一个实施会话时用 /loop 6m 跑本文件。
// 首行是状态，恰好四种语义（NO_ACTIVE / NO_CHANGE / ALL_DONE / 信号组）。
// herdr 取数失败不会被吞成「无变化」：首败轮靠 agent 列表与上一轮不同走信号分支；
// 持续失败两轮列表其实相同，靠 herdrDown 守卫跳过 NO_ACTIVE/NO_CHANGE，并单独列一行待处理。
// state 落在 $TMPDIR，不写仓库、不写 worktree。

import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const STALL_AFTER = 4 // 连续多少轮 churn 未变且 owner 在跑才算可能停滞（6 分钟一轮 ≈ 24 分钟）

const here = dirname(fileURLToPath(import.meta.url))
const repo = resolve(here, '../../..')
const gitCommonDir = execFileSync('git', ['-C', repo, 'rev-parse', '--path-format=absolute', '--git-common-dir'], {
  encoding: 'utf8'
}).trim()
const taskDir = join(gitCommonDir, 'tasks')
const stateDir = join(process.env.TMPDIR || tmpdir(), 'herdr-agents-monitor')
// 首次运行时 state 目录不存在，漏掉这行会在全新环境 ENOENT 崩掉（真实环境常因旧目录已存在而掩盖）。
mkdirSync(stateDir, { recursive: true })
const statePath = join(stateDir, 'state')
const stallPath = join(stateDir, 'stall')

const read = file => {
  try {
    return readFileSync(file, 'utf8')
  } catch {
    return ''
  }
}

// 只收有名字的 agent。无名的那条通常是发起巡检的 Manager 自己的 TUI；而本文件正是在
// Manager 的 turn 里执行的，把它算进 running 会让 running>=1 恒成立、NO_ACTIVE 永不触发。
function agentLines() {
  try {
    const out = execFileSync('herdr', ['agent', 'list'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    })
    return JSON.parse(out)
      .result.agents.filter(a => a.name)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(a => `${a.name}=${a.agent_status}`)
  } catch {
    return ['herdr_unavailable=error']
  }
}

// task → 归属从 task state 派生（owner 与 worktree 字段），提交进仓库的文件不写按会话手写的名单。
// churn 指纹含未跟踪文件数：git diff 不算 untracked，漏掉会把「正在新建文件」误判成停滞。
function taskLines() {
  const rows = []
  for (const file of readdirSync(taskDir).filter(f => f.endsWith('.json')).sort()) {
    let state
    try {
      state = JSON.parse(readFileSync(join(taskDir, file), 'utf8'))
    } catch {
      continue
    }
    if (!state?.taskId) continue
    if (state.phase === 'done' || state.phase === 'dropped') continue

    let churn = 'gone'
    if (state.worktree && existsSync(state.worktree)) {
      try {
        churn = fingerprint(state.worktree)
      } catch {
        churn = 'error'
      }
    }
    rows.push([state.taskId, state.owner || '', churn, state.phase].join('\t'))
  }
  return rows
}

function fingerprint(worktree) {
  const numstat = execFileSync('git', ['diff', 'HEAD', '--numstat'], {
    cwd: worktree,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore']
  })
  let added = 0
  let deleted = 0
  for (const line of numstat.split('\n')) {
    const parts = line.split('\t')
    if (parts.length >= 3) {
      added += Number(parts[0]) || 0
      deleted += Number(parts[1]) || 0
    }
  }
  const untracked = execFileSync('git', ['ls-files', '--others', '--exclude-standard'], {
    cwd: worktree,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore']
  })
    .split('\n')
    .filter(Boolean).length
  return `${added}+${deleted}-u${untracked}`
}

function parse(text) {
  const agents = {}
  const tasks = {}
  let section = null
  for (const line of text.split('\n')) {
    if (line === 'AGENTS') {
      section = 'agents'
      continue
    }
    if (line === 'TASKS') {
      section = 'tasks'
      continue
    }
    if (!line) continue
    if (section === 'agents') {
      const at = line.indexOf('=')
      if (at > 0) agents[line.slice(0, at)] = line.slice(at + 1)
    }
    if (section === 'tasks') {
      const parts = line.split('\t')
      if (parts.length >= 4) tasks[parts[0]] = { owner: parts[1], churn: parts[2], phase: parts[3] }
    }
  }
  return { agents, tasks }
}

const current = ['AGENTS', ...agentLines(), 'TASKS', ...taskLines()].join('\n')
const cur = parse(current)
const prev = parse(read(statePath))
let stall = {}
try {
  stall = JSON.parse(read(stallPath) || '{}')
} catch {
  stall = {}
}

const running = Object.values(cur.agents).filter(status => status === 'working').length
const agentsChanged = JSON.stringify(prev.agents) !== JSON.stringify(cur.agents)
const herdrDown = Object.hasOwn(cur.agents, 'herdr_unavailable')

// 遍历两侧并集：task 从 live 消失（被 done/drop）本身也是一次变化，只遍历 cur 会把它吞掉。
let churnChanged = false
for (const id of new Set([...Object.keys(prev.tasks), ...Object.keys(cur.tasks)])) {
  const before = prev.tasks[id]?.churn
  const after = cur.tasks[id]?.churn
  if (before !== after) churnChanged = true
}

// STALL：该 task 自己的 owner 在 working，且它的 churn 连续没动；只在跨过阈值那一次报。
// owner 匹配的是 herdr agent 名：走登录名兜底的 task 匹配不到，不武装 STALL，
// 所以派发时要用 `--owner <agent-name>` 而不是让登录名兜底。
const next = {}
const fired = []
for (const [id, task] of Object.entries(cur.tasks)) {
  const ownerWorking = cur.agents[task.owner] === 'working'
  const before = prev.tasks[id]
  const unchanged =
    before !== undefined && before.churn === task.churn && task.churn !== 'gone' && task.churn !== 'error'
  next[id] = ownerWorking && unchanged ? (stall[id] || 0) + 1 : 0
  if (next[id] === STALL_AFTER) fired.push(id)
}
writeFileSync(stallPath, JSON.stringify(next))

// 四态判定。命中静默/终态就只输出首行，否则组装信号块。无论走哪一支，state 都在最后统一落盘
// —— 与 bash 版语义一致：先打印、后写 state，中途抛错不会推进基线。
const live = Object.keys(cur.tasks)
const out = []
if (!herdrDown && live.length === 0 && running === 0) {
  out.push('ALL_DONE')
} else if (!herdrDown && running === 0 && !agentsChanged && !churnChanged && fired.length === 0) {
  out.push('NO_ACTIVE')
} else if (!herdrDown && !agentsChanged && !churnChanged && fired.length === 0) {
  out.push('NO_CHANGE')
} else {
  if (agentsChanged) {
    out.push('AGENTS_CHANGED')
    const keys = [...new Set([...Object.keys(prev.agents), ...Object.keys(cur.agents)])].sort()
    for (const key of keys) {
      if (prev.agents[key] !== cur.agents[key]) {
        out.push(`  ${key}: ${prev.agents[key] ?? '<absent>'} -> ${cur.agents[key] ?? '<absent>'}`)
      }
    }
  } else {
    out.push('AGENTS_SAME')
  }
  if (herdrDown) out.push('  herdr_unavailable: agent list unreadable, working/idle unknown')
  out.push(`CHURN_CHANGED=${churnChanged}`)
  for (const id of fired) {
    out.push(`STALL? ${id}: churn=${cur.tasks[id].churn}, owner ${cur.tasks[id].owner} working, unchanged ${STALL_AFTER} polls`)
  }
  out.push('--- current ---')
  out.push(current)
}

console.log(out.join('\n'))
if (read(statePath) !== current) writeFileSync(statePath, current)
