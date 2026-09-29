#!/usr/bin/env node
// 编排巡检：多 agent 编排期间，把「谁跑完了 / 谁卡住了」收成一趟可重复的检查。
//
// 起停时机与首行分派见 SKILL.md 的「巡检」一节。本文件是一次性快照对比：跑一趟、打印首行、
// 退出，不注册任何监听、不留后台 —— 所以名字用 patrol（巡检走一趟）而不是 watch（常驻监听）。
// 首行是状态，恰好四种语义（NO_ACTIVE / NO_CHANGE / ALL_DONE / 信号组）。
// herdr 取数失败不会被吞成「无变化」：首败轮靠 agent 列表与上一轮不同走信号分支；
// 持续失败两轮列表其实相同，靠 herdrDown 守卫跳过 NO_ACTIVE/NO_CHANGE，并单独列一行待处理。
// state 落在 $TMPDIR，不写仓库、不写 worktree。
// 数据源是编排单元（$TMPDIR/herdr-agents/reports/ 下每轮一份的 manifest），不是 task state：
// 编排可以完全没有 task，单元才是「谁在跑」的权威来源，task 只作参考附在行尾。

import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const STALL_AFTER = 4 // 连续多少轮 churn 未变且 owner 在跑才算可能停滞（6 分钟一轮 ≈ 24 分钟）

const here = dirname(fileURLToPath(import.meta.url))
const repo = resolve(here, '../../..')
// realpath 与 task.mjs 的 resolveWorktree 同口径：state 里的 commonDir 是解析过软链的绝对路径，
// 直接比 git 的原始输出会在 /Users 之类是软链的机器上把本仓库的 phase 误判成 unreadable。
const gitCommonDir = realpathSync(
  execFileSync('git', ['-C', repo, 'rev-parse', '--path-format=absolute', '--git-common-dir'], {
    encoding: 'utf8'
  }).trim()
)
const taskDir = join(process.env.TMPDIR || tmpdir(), 'greypan', 'tasks')
const stateDir = join(process.env.TMPDIR || tmpdir(), 'herdr-agents-monitor')
// 首次运行时 state 目录不存在，漏掉这行会在全新环境 ENOENT 崩掉（真实环境常因旧目录已存在而掩盖）。
mkdirSync(stateDir, { recursive: true })
const statePath = join(stateDir, 'state')
const stallPath = join(stateDir, 'stall')

// 编排产物的固定根与子目录是 skill 的一部分（见 roles/manager.md），与有没有 task 无关。
// patrol 只读 reports/，这里补 mkdir 让全新环境也能直接跑；写在 stateDir 之外，
// 免得 $TMPDIR/herdr-agents-monitor/ 同时承担编排产物与巡检基线两种语义。
const reportDir = join(process.env.TMPDIR || tmpdir(), 'herdr-agents', 'reports')
mkdirSync(reportDir, { recursive: true })

// state 是「与上一轮相比」的基线，不是记录：agents 与 units 每一轮都能从 herdr 和 reports/ 重新算出。
// 旧格式（TASKS 段，键是 task）没有可对应的字段——单元 id、参与者来源和 churn 定义（多 root 求和
// vs 单 worktree）都变了，逐字段迁移等于凭空造出一个从未观测过的基线：要么在首轮误报一次
// CHURN/STALL，要么在字段恰好撞上时对一个没测过的轮次武装 STALL。所以版本不匹配就当没有基线。
// 代价是升级后的第一轮多一次信号轮，那正是「我没有可比的基线」的真实信号。
const STATE_VERSION = 'v2'

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

function readJson(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'))
  } catch {
    return null
  }
}

// task 只是参考：附上它当前的 phase，好让操作者看清编排单元与 task 的对应关系。
// 它不参与任何判定——单元的存续由 manifest 的 status 决定，两者是不同的生命周期。
// task state 搬进 $TMPDIR 之后，这个目录由同一台机器上的所有仓库共用（ADR-0018），所以按
// state 自带的 commonDir 认仓库：别的仓库里同名的 task id 不该被当成本仓库的 phase 显示。
// 认不出归属与读不到文件一样，都落回既有的 'unreadable' 哨兵，不新增输出形状。
function taskRef(taskId) {
  if (typeof taskId !== 'string' || !taskId) return '-'
  const state = readJson(join(taskDir, `${taskId}.json`))
  return `${taskId}:${state?.commonDir === gitCommonDir && state.phase ? state.phase : 'unreadable'}`
}

// 编排单元 → 参与者与 churn 全部来自 manifest，字段形状见 SKILL.md「巡检」一节。
// churn 指纹含未跟踪文件数：git diff 不算 untracked，漏掉会把「正在新建文件」误判成停滞。
function unitLines() {
  let files = []
  try {
    files = readdirSync(reportDir)
      .filter(f => f.endsWith('.json'))
      .sort()
  } catch {
    return []
  }
  const rows = []
  for (const file of files) {
    const manifest = readJson(join(reportDir, file))
    const id = typeof manifest?.coordination === 'string' ? manifest.coordination : ''
    if (!id) continue
    if (manifest.status === 'finished') continue

    const roots = (Array.isArray(manifest.roots) ? manifest.roots : []).filter(r => typeof r === 'string' && r)
    const participants = (Array.isArray(manifest.participants) ? manifest.participants : []).filter(
      a => typeof a === 'string' && a
    )
    rows.push([id, participants.join(','), rootsChurn(roots), taskRef(manifest.taskId)].join('\t'))
  }
  return rows
}

// 单 root 的形状与旧版单 worktree 完全一致；多 root 求和。全灭时整体退化成单个哨兵值，
// 这样「目录整个没了」和「目录全部读不出」依旧不武装 STALL，而不是被当成一个冻住的数字。
// 三个哨兵值都表示「这一轮拿不到可比的工作量」，因此全部由 STALL_INELIGIBLE 一处排除；
// 曾经只排除了 'gone' 与 'error'，漏掉的 'none' 让缺 roots 的 manifest 每轮 churn 恒定，
// 于是第 5 轮武装出一条指向根本没被观测过的工作量的假 STALL。
const STALL_INELIGIBLE = new Set(['gone', 'error', 'none'])

function rootsChurn(roots) {
  if (roots.length === 0) return 'none'
  const parts = roots.map(root => {
    if (!existsSync(root)) return 'gone'
    try {
      return fingerprint(root)
    } catch {
      return 'error'
    }
  })
  if (parts.every(part => part === 'gone')) return 'gone'
  if (parts.every(part => part === 'error')) return 'error'
  return parts.join('+')
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
  const units = {}
  let section = null
  for (const line of text.split('\n')) {
    if (line === 'AGENTS') {
      section = 'agents'
      continue
    }
    if (line === 'UNITS') {
      section = 'units'
      continue
    }
    if (!line) continue
    if (section === 'agents') {
      const at = line.indexOf('=')
      if (at > 0) agents[line.slice(0, at)] = line.slice(at + 1)
    }
    if (section === 'units') {
      const parts = line.split('\t')
      if (parts.length >= 4) {
        units[parts[0]] = {
          participants: parts[1].split(',').filter(Boolean),
          churn: parts[2],
          task: parts[3]
        }
      }
    }
  }
  return { agents, units }
}

const current = [STATE_VERSION, 'AGENTS', ...agentLines(), 'UNITS', ...unitLines()].join('\n')
const cur = parse(current)
const prevRaw = read(statePath)
const hasBaseline = prevRaw.startsWith(`${STATE_VERSION}\n`)
const prev = hasBaseline ? parse(prevRaw) : { agents: {}, units: {} }
// stall 计数器按单元 id 键，跨格式同样解不开，所以基线作废时一起丢弃。
let stall = {}
if (hasBaseline) {
  try {
    stall = JSON.parse(read(stallPath) || '{}')
  } catch {
    stall = {}
  }
}

const running = Object.values(cur.agents).filter(status => status === 'working').length
const agentsChanged = JSON.stringify(prev.agents) !== JSON.stringify(cur.agents)
const herdrDown = Object.hasOwn(cur.agents, 'herdr_unavailable')

// 遍历两侧并集：单元从 live 消失（被标记 finished）本身也是一次变化，只遍历 cur 会把它吞掉。
let churnChanged = false
for (const id of new Set([...Object.keys(prev.units), ...Object.keys(cur.units)])) {
  const before = prev.units[id]?.churn
  const after = cur.units[id]?.churn
  if (before !== after) churnChanged = true
}

// STALL：该单元的某个参与者在 working，且它的 churn 连续没动；只在跨过阈值那一次报。
// 参与者匹配的是 herdr agent 名：Manager 派发时把 live agent 名写进 manifest，不写 pane label
// 也不让登录名兜底，否则不武装 STALL。哨兵值（STALL_INELIGIBLE）即使逐轮不变也不武装：
// 恒定不是「没动」，是「没得可比」。
const next = {}
const fired = []
for (const [id, unit] of Object.entries(cur.units)) {
  const someoneWorking = unit.participants.some(name => cur.agents[name] === 'working')
  const before = prev.units[id]
  const unchanged =
    before !== undefined && before.churn === unit.churn && !STALL_INELIGIBLE.has(unit.churn)
  next[id] = someoneWorking && unchanged ? (stall[id] || 0) + 1 : 0
  if (next[id] === STALL_AFTER) fired.push(id)
}
writeFileSync(stallPath, JSON.stringify(next))

// 四态判定。命中静默/终态就只输出首行，否则组装信号块。无论走哪一支，state 都在最后统一落盘
// —— 与 bash 版语义一致：先打印、后写 state，中途抛错不会推进基线。
const live = Object.keys(cur.units)
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
  if (!hasBaseline) out.push('  baseline: no matching state version, this poll has nothing to compare against')
  out.push(`CHURN_CHANGED=${churnChanged}`)
  for (const id of fired) {
    const unit = cur.units[id]
    out.push(`STALL? ${id}: churn=${unit.churn}, ${unit.participants.join('/')} working, unchanged ${STALL_AFTER} polls`)
  }
  out.push('--- current ---')
  out.push(current)
}

console.log(out.join('\n'))
if (read(statePath) !== current) writeFileSync(statePath, current)
