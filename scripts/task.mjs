#!/usr/bin/env node
// Task 内核：脱离具体业务的抽象任务状态机。级别（level）只表达 workflow 严格程度；
// 内核不含 release、changeset、deploy 等任何业务词汇，仓库级政策通过 .agents/checks/
// 的可执行检查挂载。状态存 git common dir 下的 tasks/，跨 worktree 共享。
import { execFileSync } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const root = path.resolve(process.env.AGENT_TASK_ROOT ?? path.join(import.meta.dirname, '..'))
const phases = new Set(['open', 'active', 'frozen', 'reviewed', 'approved', 'done', 'dropped'])
const levels = new Set(['t0', 't1', 't2'])
const SCHEMA_VERSION = 1
// 参与方标识形状：owner / reviewer / approver / drop 的署名人共用，保证事件里每个角色都是可
// 比对的 id。四个字段之间的约束全是「彼此不相等」，比的又是字符串，所以只有都落在同一字符集里，
// 「coder-1」与「coder-1␠」（␠ = 空格）这种看着是两个身份、实际是同一个人的写法才不会被放过。
// 形状只写一份：同一条规则喂四个命令，把字面量抄进四条报错里迟早会漂。
const AGENT_ID_PATTERN = '[A-Za-z0-9][A-Za-z0-9._-]{3,39}'
const AGENT_ID = new RegExp(`^${AGENT_ID_PATTERN}$`)

function fail(message) {
  throw new Error(message)
}

function assertAgentId(value, label) {
  // 必须是字符串：`--reviewer` 后面漏值时 parseArgs 记的是布尔 true，而 RegExp.test 会先把
  // true 转成 "true"（恰好 4 个字符、形状合法）。那样一个 id 会被存成布尔、另一个存成字符串
  // 'true'，两个「互不相等」的比对同时被骗过——同一个身份就藏在两种字形里。
  if (typeof value !== 'string') fail(`invalid ${label} id: ${JSON.stringify(value)}; expected a string`)
  if (!AGENT_ID.test(value)) fail(`invalid ${label} id: ${value}; use ${AGENT_ID_PATTERN}`)
  return value
}

// 未提交改动的清单。干净性检查必须把文件名字面写进报错：只说「worktree 脏」的话，使用者第一
// 反应是去猜哪一个是自己刚写的，而 freeze 会把它们全部吸进快照。
function uncommittedPaths(worktree) {
  const lines = gitAt(worktree, '-c', 'core.quotePath=false', 'status', '--porcelain').split('\n').filter(Boolean)
  const shown = lines.slice(0, 5).map(line => {
    const entry = line.slice(3)
    // 重命名/复制条目形如 `old -> new`：将被提交的是 new，报旧路径只会让人去翻一个没动过的文件。
    return entry.includes(' -> ') ? entry.slice(entry.indexOf(' -> ') + 4) : entry
  })
  if (lines.length > shown.length) shown.push(`… (+${lines.length - shown.length})`)
  return { count: lines.length, shown }
}

function gitAt(worktree, ...args) {
  try {
    return execFileSync('git', ['-C', worktree, ...args], { encoding: 'utf8' }).trimEnd()
  } catch (error) {
    const detail = error?.stderr?.toString().trim()
    fail(`git -C ${worktree} ${args.join(' ')} failed${detail ? `: ${detail}` : ''}`)
  }
}

function parseArgs(argv) {
  const [command, ...rest] = argv
  const options = { command, positional: [] }
  for (let index = 0; index < rest.length; index += 1) {
    const value = rest[index]
    // `--` 只终止选项解析：task 内核不接受位置参数，也不接受尾随命令。
    if (value === '--') break
    if (!value.startsWith('--')) {
      options.positional.push(value)
      continue
    }
    const key = value.slice(2)
    if (!key) fail('empty option')
    const next = rest[index + 1]
    if (next && !next.startsWith('--')) {
      options[key] = next
      index += 1
    } else options[key] = true
  }
  return options
}

function requireOption(options, name) {
  const value = options[name]
  if (typeof value !== 'string' || value.length === 0) fail(`missing required option --${name}`)
  return value
}

function validateTaskId(taskId) {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,100}$/.test(taskId)) fail(`invalid task id: ${taskId}`)
  return taskId
}

// issue 纪律：task 必须显式关联 GitHub issue 或声明 N/A。只接受 https 全链接或字面
// N/A；拒绝 http://（不安全）、裸 #N（缺仓库上下文）与含空白值（复制粘贴损坏）。
function normalizeIssue(value) {
  if (typeof value !== 'string') fail(`invalid issue reference: ${JSON.stringify(value)}; --issue expects a value`)
  if (value === 'N/A') return 'N/A'
  if (!value.startsWith('https://')) fail(`invalid issue reference: ${value}; use a full https:// URL or N/A`)
  if (/\s/.test(value)) fail(`invalid issue reference: ${value}; must not contain whitespace`)
  return value
}

function resolveWorktree(value = root) {
  const candidate = path.resolve(root, value)
  if (!fs.existsSync(candidate) || !fs.statSync(candidate).isDirectory()) fail(`worktree does not exist: ${candidate}`)
  const topLevel = fs.realpathSync(path.resolve(gitAt(candidate, 'rev-parse', '--show-toplevel')))
  const commonPath = path.resolve(topLevel, gitAt(topLevel, 'rev-parse', '--git-common-dir'))
  return { worktree: topLevel, commonDir: fs.realpathSync(commonPath) }
}

function stateDirectory(commonDir) {
  return path.join(commonDir, 'tasks')
}

function stateFile(commonDir, taskId) {
  return path.join(stateDirectory(commonDir), `${validateTaskId(taskId)}.json`)
}

function activeStates(commonDir) {
  const directory = stateDirectory(commonDir)
  if (!fs.existsSync(directory)) return []
  return fs
    .readdirSync(directory)
    .filter(file => file.endsWith('.json'))
    .flatMap(file => {
      const parsed = parseStateFile(path.join(directory, file))
      if (parsed.error) {
        // 目录扫描是所有 worktree guard 的共享路径：单个损坏 state（崩溃半写、schema 升级遗留）
        // 不应阻塞无关 worktree 的提交；降级为可见警告并跳过，硬失败保留给 target task 的 loadState。
        console.error(`warning: skipping unreadable task state; ${parsed.error}`)
        return []
      }
      return parsed.state.phase !== 'done' && parsed.state.phase !== 'dropped' ? [parsed.state] : []
    })
}

function readStateFile(file) {
  const parsed = parseStateFile(file)
  if (parsed.error) fail(parsed.error)
  return parsed.state
}

function parseStateFile(file) {
  let state
  try {
    state = JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch (error) {
    return { error: `cannot read task state ${file}: ${error instanceof Error ? error.message : String(error)}` }
  }
  if (!state || typeof state !== 'object' || !phases.has(state.phase) || typeof state.taskId !== 'string')
    return { error: `task state is invalid: ${file}` }
  if (state.version !== SCHEMA_VERSION)
    return { error: `task state ${file} has unsupported schema version: ${JSON.stringify(state.version)}` }
  return { state }
}

function assertWorktreeAvailable(commonDir, worktree, taskId) {
  const owner = activeStates(commonDir).find(state => state.taskId !== taskId && state.worktree === worktree)
  if (owner) fail(`worktree is already assigned to active task ${owner.taskId}: ${worktree}`)
}

function loadState(taskId) {
  const { commonDir } = resolveWorktree()
  const file = stateFile(commonDir, taskId)
  if (!fs.existsSync(file)) fail(`task is not initialized: ${taskId}`)
  return { file, state: readStateFile(file) }
}

// saveState 原子但不加跨进程锁：同一 task 的读-改-写由「单 owner」使用模型串行化，
// 并发执行同一 task 的两条命令仍可能丢事件，这是接受的边界（guard/status 只读不受影响）。
function saveState(file, state) {
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 })
  const temporary = `${file}.${process.pid}.${crypto.randomBytes(4).toString('hex')}.tmp`
  fs.writeFileSync(temporary, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 })
  fs.renameSync(temporary, file)
}

function now() {
  return new Date().toISOString()
}

function appendEvent(state, event, detail = {}) {
  state.events.push({ at: now(), event, ...detail })
}

// 快照指纹：baseSha 与工作区（含 staged 与未跟踪文件）内容的确定性 hash。
// commit 后 `git diff baseSha` 仍覆盖已提交内容，因此同一份内容在 commit 前后
// hash 不变——guard 与 done 的「hash 一致」校验横跨 commit 边界成立。
function currentSnapshot(worktree, baseSha) {
  const trackedFiles = gitAt(worktree, 'diff', '--name-only', '-z', baseSha, '--').split('\0').filter(Boolean)
  const untrackedFiles = gitAt(worktree, 'ls-files', '--others', '--exclude-standard', '-z').split('\0').filter(Boolean)
  const files = [...new Set([...trackedFiles, ...untrackedFiles])].sort()
  const hash = crypto.createHash('sha256').update(baseSha).update('\0')
  for (const file of files) {
    const absolute = path.join(worktree, file)
    const stat = fs.lstatSync(absolute, { throwIfNoEntry: false })
    hash.update(file).update('\0')
    if (!stat) hash.update('[deleted]')
    else {
      hash.update(String(stat.mode)).update('\0')
      if (stat.isSymbolicLink()) hash.update('[symlink]').update(fs.readlinkSync(absolute))
      else if (stat.isFile()) hash.update('[file]').update(fs.readFileSync(absolute))
      else if (stat.isDirectory()) {
        hash.update('[directory]')
        try {
          hash.update(gitAt(absolute, 'rev-parse', 'HEAD'))
        } catch {
          hash.update('[not-git-repository]')
        }
      } else hash.update('[non-file]')
    }
    hash.update('\0')
  }
  return { hash: hash.digest('hex'), trackedFiles: trackedFiles.sort(), untrackedFiles: untrackedFiles.sort() }
}

function liveState(state) {
  const { worktree, commonDir } = resolveWorktree(state.worktree)
  if (commonDir !== state.commonDir) fail(`task ${state.taskId} belongs to another Git repository`)
  const branch = gitAt(worktree, 'branch', '--show-current')
  const current = currentSnapshot(worktree, state.baseSha)
  const boundHash = state.approval.diffHash ?? state.review.diffHash ?? state.diffHash
  return {
    worktree,
    branch,
    headSha: gitAt(worktree, 'rev-parse', 'HEAD'),
    current,
    branchDrift: branch !== state.branch,
    stale: Boolean(boundHash && boundHash !== current.hash),
    clean: gitAt(worktree, 'status', '--porcelain') === ''
  }
}

function assertPhase(state, allowed) {
  if (!allowed.includes(state.phase))
    fail(`task ${state.taskId} is in phase ${state.phase}; expected ${allowed.join(' or ')}`)
}

function assertTaskBranch(state, live, label = 'task evidence') {
  if (live.branchDrift)
    fail(`${label} belongs to branch ${state.branch}; current worktree is on ${live.branch || 'detached HEAD'}`)
}

function assertCurrentHash(state, live, label = 'task evidence') {
  assertTaskBranch(state, live, label)
  if (live.stale)
    fail(
      `${label} is stale for task ${state.taskId}; re-run freeze (it stages the diff and normalizes formatting) and repeat review/approval`
    )
}

// freeze 归一化与 commit 收敛到同一起点：全量 staging 后运行仓库的 fix:code
//（CI=true 关闭交互），fix 产物重新 staging 后再取快照。pre-commit 只剩 guard、
// 不再运行任何 fixer，因此不存在「commit 期改写文件导致冻结失效」的竞态。
// fix:code 归一化是强制的：声明了 fix:code 但依赖未安装时直接失败并指引安装，
// 只有不含该脚本的仓库（测试 fixture、纯 git 仓库）才允许跳过。
// 全量 staging 的范围边界不在这里，而在 start：open → active 要求 worktree 干净，
// 所以 `git add -A` 扫进来的只可能是本 task 起点之后的改动。
function normalizeWorktree(worktree) {
  gitAt(worktree, 'add', '-A')
  const manifestPath = path.join(worktree, 'package.json')
  if (!fs.existsSync(manifestPath)) return false
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  if (!manifest.scripts?.['fix:code']) return false
  if (!fs.existsSync(path.join(worktree, 'node_modules')))
    fail(
      `worktree dependencies are missing in ${worktree}; normalization via fix:code is mandatory — run "pnpm install && pnpm run build" in the worktree, then re-run freeze`
    )
  try {
    execFileSync('pnpm', ['run', 'fix:code'], { cwd: worktree, stdio: 'pipe', env: { ...process.env, CI: 'true' } })
  } catch (error) {
    const detail = error?.stderr?.toString().trim() || error?.stdout?.toString().trim()
    fail(
      `worktree normalization failed in ${worktree}; fix the reported issues and re-run freeze${detail ? `: ${detail}` : ''}`
    )
  }
  gitAt(worktree, 'add', '-A')
  return true
}

// 仓库级政策检查：freeze 在取快照前、guard 在放行提交前，各执行一次 .agents/checks/
// 下每个可执行文件，非零退出即中止并保留输出作为可观察原因。挂在 guard 上是必要的：
// T2 通常不 freeze，只在 commit 边界出现，检查若只跟 freeze 走就对全部级别里的
// 大多数 task 形同不存在。内核不内置任何业务检查；task 上下文通过环境变量注入，
// 检查脚本据此核对 index 内容而不必重复探测。
function runChecks(worktree, state, phase) {
  const directory = path.join(worktree, '.agents', 'checks')
  if (!fs.existsSync(directory)) return []
  const environment = {
    ...process.env,
    AGENT_TASK_ID: state.taskId,
    AGENT_TASK_LEVEL: state.level,
    AGENT_TASK_BASE_SHA: state.baseSha
  }
  const ran = []
  for (const entry of fs.readdirSync(directory).sort()) {
    const file = path.join(directory, entry)
    const stat = fs.statSync(file, { throwIfNoEntry: false })
    if (!stat?.isFile() || !(stat.mode & 0o111)) continue
    try {
      execFileSync(file, { cwd: worktree, stdio: 'pipe', env: environment })
    } catch (error) {
      const detail = error?.stderr?.toString().trim() || error?.stdout?.toString().trim()
      fail(`check ${entry} failed; ${phase} aborted${detail ? `:\n${detail}` : ''}`)
    }
    ran.push(entry)
  }
  return ran
}

// owner 的两种来源区别对待：显式的 `--owner` / AGENT_TASK_OWNER 是一次身份申报，必须和
// reviewer/approver/署名人同形状，否则四个字段之间的「不相等」比的是字符串而不是人。登录名是
// 兜底而非申报，短用户名不该让人连 task 都建不了，所以不受这条约束。
function declaredOwner(options) {
  if (options.owner !== undefined) return assertAgentId(options.owner, 'owner')
  if (process.env.AGENT_TASK_OWNER) return assertAgentId(process.env.AGENT_TASK_OWNER, 'owner')
  return os.userInfo().username
}

function newTask(options) {
  const taskId = validateTaskId(requireOption(options, 'task'))
  const level = requireOption(options, 'level')
  if (!levels.has(level)) fail(`invalid task level: ${level}`)
  const { worktree, commonDir } = resolveWorktree(options.worktree)
  assertWorktreeAvailable(commonDir, worktree, taskId)
  const dirty = uncommittedPaths(worktree)
  if (dirty.count > 0)
    fail(`worktree has existing changes; isolate them before creating a task: ${dirty.shown.join(', ')}`)
  const branch = gitAt(worktree, 'branch', '--show-current')
  if (!branch) fail(`task worktree must be attached to a branch: ${worktree}`)
  const file = stateFile(commonDir, taskId)
  if (fs.existsSync(file)) fail(`task already exists: ${taskId}`)
  const state = {
    version: SCHEMA_VERSION,
    taskId,
    level,
    phase: 'open',
    createdAt: now(),
    updatedAt: now(),
    commonDir,
    baseSha: gitAt(worktree, 'rev-parse', 'HEAD'),
    branch,
    worktree,
    owner: declaredOwner(options),
    issue: options.issue ? normalizeIssue(options.issue) : null,
    playbook: options.playbook || null,
    roles: [],
    diffHash: null,
    review: { required: level !== 't2', result: null, diffHash: null, reviewer: null, at: null },
    approval: { granted: false, diffHash: null, approver: null, at: null },
    verification: [],
    events: []
  }
  appendEvent(state, 'new', { level, owner: state.owner, baseSha: state.baseSha, branch, worktree })
  saveState(file, state)
  print(state)
}

// 可派发的角色就是存在 Role Contract 的角色：取值来自契约目录本身，不另立一份名单。
// 该目录同时被 scripts/validate-context.mjs 限定为五份共享契约。
function roleContracts() {
  const directory = path.join(import.meta.dirname, '..', '.agents', 'skills', 'herdr-agents', 'roles')
  return new Set(
    fs
      .readdirSync(directory)
      .filter(name => name.endsWith('.md'))
      .map(name => name.slice(0, -3))
  )
}

function assign(options) {
  const taskId = validateTaskId(requireOption(options, 'task'))
  const { file, state } = loadState(taskId)
  const worktree = options.worktree ? resolveWorktree(options.worktree).worktree : state.worktree
  assertWorktreeAvailable(state.commonDir, worktree, taskId)
  state.worktree = worktree
  if (options.owner !== undefined) state.owner = declaredOwner(options)
  if (options.roles) {
    const available = roleContracts()
    const parsed = options.roles
      .split(',')
      .map(role => role.trim())
      .filter(Boolean)
    for (const role of parsed)
      if (!available.has(role)) fail(`unknown role "${role}"; expected one of ${[...available].sort().join(', ')}`)
    state.roles = parsed
  }
  appendEvent(state, 'assign', { owner: state.owner, roles: state.roles, worktree })
  state.updatedAt = now()
  saveState(file, state)
  print(state)
}

function start(options) {
  const taskId = validateTaskId(requireOption(options, 'task'))
  const { file, state } = loadState(taskId)
  assertPhase(state, ['open', 'active'])
  const live = liveState(state)
  assertTaskBranch(state, live, 'task')
  // 只有 open → active 这一次才要求干净：freeze 用 `git add -A` 归一化整个 worktree，
  // 「实施起点没有别人的在制品」是冻结 diff 只含本 task 改动的唯一边界。new 已查过一次，
  // 但 assign/换 worktree/长时间搁置都可能在这之后带进无关改动。
  if (state.phase === 'open' && !live.clean) {
    const dirty = uncommittedPaths(live.worktree)
    fail(
      `task ${taskId} cannot start with uncommitted changes in ${live.worktree}: ${dirty.shown.join(
        ', '
      )} — move them out of this worktree (or drop this task), freeze stages the whole worktree`
    )
  }
  state.phase = 'active'
  appendEvent(state, 'start')
  state.updatedAt = now()
  saveState(file, state)
  print({ ok: true, taskId, phase: state.phase, state, live })
}

function freeze(options) {
  const taskId = validateTaskId(requireOption(options, 'task'))
  const { file, state } = loadState(taskId)
  // frozen/reviewed/approved 也在允许集合内：冻结后任何文件变化都会让证据 stale，
  // 文档要求「重新 freeze」，因此对当前 diff 再次冻结必须可行。
  assertPhase(state, ['active', 'frozen', 'reviewed', 'approved'])
  const live = liveState(state)
  assertTaskBranch(state, live, 'freeze')
  const previousPhase = state.phase
  const normalized = normalizeWorktree(live.worktree)
  const checks = runChecks(live.worktree, state, 'freeze')
  // 归一化与 checks 可能改写文件，快照必须取自其后的工作区。
  const snapshot = currentSnapshot(live.worktree, state.baseSha)
  if (!options['allow-empty'] && snapshot.trackedFiles.length === 0 && snapshot.untrackedFiles.length === 0)
    fail(`task ${taskId} has no changes to freeze; use --allow-empty only for an intentional empty task`)
  state.diffHash = snapshot.hash
  state.review = { required: state.review.required, result: null, diffHash: null, reviewer: null, at: null }
  state.approval = { granted: false, diffHash: null, approver: null, at: null }
  state.phase = 'frozen'
  appendEvent(state, 'freeze', {
    diffHash: snapshot.hash,
    reFreeze: previousPhase !== 'active',
    normalized,
    checks
  })
  state.updatedAt = now()
  saveState(file, state)
  print({ ...state, live: { ...liveState(state), current: snapshot } })
}

// 该 task 的「实施方」身份集合：当前 owner 加上事件里出现过的每一个 owner。assign 可以在
// 任意相位改写 owner，只比对现值就能被「先派给别人、再 approve 自己」绕开，所以独立性核对
// 的是历史，不是某一时刻的字段。
function implementers(state) {
  const ids = new Set([state.owner])
  for (const event of state.events) if (event.owner) ids.add(event.owner)
  return ids
}

function review(options) {
  const taskId = validateTaskId(requireOption(options, 'task'))
  const result = requireOption(options, 'result')
  if (!['pass', 'fail'].includes(result)) fail(`invalid review result: ${result}`)
  const { file, state } = loadState(taskId)
  if (state.level === 't2') fail(`task ${taskId} is level t2; review is not part of its path`)
  assertPhase(state, ['frozen'])
  const reviewer = options.reviewer || process.env.AGENT_TASK_REVIEWER
  if (!reviewer) fail(`review requires --reviewer <id> so independence is auditable`)
  assertAgentId(reviewer, 'reviewer')
  if (implementers(state).has(reviewer))
    fail(`reviewer ${reviewer} is or was an owner of this task; review must come from a different identity`)
  const live = liveState(state)
  assertCurrentHash(state, live, 'review')
  state.review = { required: state.review.required, result, diffHash: state.diffHash, reviewer, at: now() }
  state.phase = result === 'pass' ? 'reviewed' : 'active'
  appendEvent(state, 'review', { result, reviewer, diffHash: state.diffHash })
  state.updatedAt = now()
  saveState(file, state)
  print(state)
}

function approve(options) {
  const taskId = validateTaskId(requireOption(options, 'task'))
  const { file, state } = loadState(taskId)
  if (state.level === 't2') fail(`task ${taskId} is level t2; approval is not part of its path`)
  assertPhase(state, ['reviewed'])
  if (state.review.result !== 'pass') fail(`task ${taskId} requires a passing review before approval`)
  const live = liveState(state)
  assertCurrentHash(state, live, 'approval')
  const approver = options.approver || process.env.AGENT_TASK_APPROVER
  if (!approver) fail(`approval requires --approver <id> so authorization is auditable`)
  assertAgentId(approver, 'approver')
  if (implementers(state).has(approver))
    fail(`approver ${approver} is or was an owner of this task; approval must come from a different identity`)
  if (approver === state.review.reviewer) fail(`approver must be different from the reviewer of this diff`)
  state.approval = { granted: true, diffHash: state.diffHash, approver, at: now() }
  appendEvent(state, 'approve', { approver, diffHash: state.diffHash })
  state.phase = 'approved'
  state.updatedAt = now()
  saveState(file, state)
  print(state)
}

function verify(options) {
  const taskId = validateTaskId(requireOption(options, 'task'))
  const name = requireOption(options, 'name')
  // 没有默认值：verify 只记录证据、不执行任何东西，省略 --result 就等于让内核替
  // 使用者宣布通过，这正是它最容易被误用成留痕工具的地方。
  const result = requireOption(options, 'result')
  if (!['pass', 'fail'].includes(result)) fail(`invalid verification result: ${result}`)
  const { file, state } = loadState(taskId)
  assertPhase(state, ['frozen', 'reviewed', 'approved'])
  const live = liveState(state)
  assertCurrentHash(state, live, 'verification')
  if (result === 'pass' && !live.clean)
    fail(`task ${taskId} has uncommitted changes; verification must cover a committed diff`)
  state.verification.push({ name, result, at: now(), headSha: live.headSha, diffHash: state.diffHash })
  appendEvent(state, 'verify', { name, result })
  state.updatedAt = now()
  saveState(file, state)
  print(state)
}

// done 的级别差异：t0/t1 要求 review pass、approval 与至少一条最新 pass 验证，
// 且快照一致、工作区干净；t2 是快速通道，只要求分支一致——验证与 review 是
// 推荐实践，不作为硬 gate。
function done(options) {
  const taskId = validateTaskId(requireOption(options, 'task'))
  const { file, state } = loadState(taskId)
  if (state.level === 't2') {
    assertPhase(state, ['active', 'frozen', 'reviewed', 'approved'])
    const live = liveState(state)
    assertTaskBranch(state, live, 'done')
  } else {
    assertPhase(state, ['approved'])
    if (state.review.result !== 'pass') fail(`task ${taskId} requires a passing review before done`)
    const lastVerification = state.verification.at(-1)
    if (!lastVerification || lastVerification.result !== 'pass')
      fail(`task ${taskId} does not have a passing latest verification result`)
    const live = liveState(state)
    assertCurrentHash(state, live, 'done')
    if (!live.clean) fail(`task ${taskId} has uncommitted changes and cannot be done`)
    if (live.current.hash !== lastVerification.diffHash)
      fail(`task ${taskId} changed after verification; re-run verification`)
  }
  state.phase = 'done'
  appendEvent(state, 'done')
  state.updatedAt = now()
  saveState(file, state)
  print(state)
}

// drop 取代手工清理：任何未完结状态都可落终态，事件留痕。典型场景是 agent 结束后残留的
// active task 卡住 worktree 提交。它不是唯一能推翻已有证据的动作——重新 freeze 同样会重置
// review/approval——区别在于 freeze 之后还能走完整流程，而 dropped 不可逆：这条 task 的证据
// 到此为止，再开工必须新建。所以署名人必须是可比对的 id，reason 必须是足以让后来者读懂的一句
// 话，而不是一个字符。
function drop(options) {
  const taskId = validateTaskId(requireOption(options, 'task'))
  // 先确认 task 存在、相位可终止，再挑剔参数：id 打错时报「reason 太短」只会把人引向错误的方向。
  const { file, state } = loadState(taskId)
  assertPhase(state, ['open', 'active', 'frozen', 'reviewed', 'approved'])
  const reason = requireOption(options, 'reason')
  if (reason.replace(/\s/g, '').length < 10)
    fail(`drop requires a --reason of at least 10 non-space characters so the event is readable later; got: ${reason}`)
  const by = requireOption(options, 'by')
  assertAgentId(by, 'drop author')
  state.phase = 'dropped'
  appendEvent(state, 'drop', { reason, by })
  state.updatedAt = now()
  saveState(file, state)
  print(state)
}

function status(options) {
  const taskId = validateTaskId(requireOption(options, 'task'))
  const { state } = loadState(taskId)
  const live = liveState(state)
  if (!state.issue)
    console.error(
      `hint: task ${state.taskId} has no linked issue; attach one with "pnpm task issue --task ${state.taskId} --ref <issue-url|N/A>"`
    )
  print({ ...state, live, stale: live.stale })
}

function issue(options) {
  const taskId = validateTaskId(requireOption(options, 'task'))
  const ref = normalizeIssue(requireOption(options, 'ref'))
  const { file, state } = loadState(taskId)
  state.issue = ref
  state.updatedAt = now()
  saveState(file, state)
  print(state)
}

function guard(options) {
  const explicitTask = options.task || process.env.AGENT_TASK_TASK
  const resolved = resolveWorktree(options.worktree)
  const candidates = activeStates(resolved.commonDir).filter(state => state.worktree === resolved.worktree)

  if (explicitTask) {
    const { state } = loadState(validateTaskId(explicitTask))
    if (state.worktree !== resolved.worktree)
      fail(`task ${state.taskId} is assigned to another worktree: ${state.worktree}`)
    candidates.splice(0, candidates.length, state)
  }

  if (candidates.length === 0) {
    // 不静默放行：stdout 的 JSON 在成功的 pre-commit 里看不见，stderr 才进得到用户眼前。
    console.error(
      `task gate: not enforced — no active task in ${resolved.worktree}; implementation changes start with "pnpm task new --task <id> --level <t0|t1|t2>" (contract in docs/agents/workflow.md)`
    )
    print({ ok: true, enforced: false, worktree: resolved.worktree })
    return
  }
  if (candidates.length > 1)
    fail(`multiple active tasks are assigned to worktree: ${candidates.map(state => state.taskId).join(', ')}`)

  const state = candidates[0]
  const live = liveState(state)
  if (live.branchDrift)
    fail(
      `task ${state.taskId} belongs to branch ${state.branch}; current worktree is on ${live.branch || 'detached HEAD'}`
    )
  const allowCommit = () =>
    print({
      ok: true,
      enforced: true,
      taskId: state.taskId,
      level: state.level,
      checks: runChecks(live.worktree, state, 'commit'),
      live
    })
  if (state.level === 't2') {
    // T2 追踪门槛：提交发生在已 start 的 task 内即可，不要求快照证据；仓库政策检查照跑，
    // 这一档大多数时候根本不 freeze，检查若只挂 freeze 就等于对 T2 不存在。
    assertPhase(state, ['active', 'frozen', 'reviewed', 'approved'])
    allowCommit()
    return
  }
  if (live.stale)
    fail(
      `task ${state.taskId} has changes after its last freeze/review/approval; commit is blocked — re-run freeze (it stages the diff and normalizes formatting) and repeat review/approval`
    )
  assertPhase(state, ['approved'])
  if (!state.approval.granted || state.approval.diffHash !== state.diffHash)
    fail(`task ${state.taskId} is not approved for commit`)
  allowCommit()
}

function print(value) {
  console.log(JSON.stringify(value, null, 2))
}

function main() {
  const options = parseArgs(process.argv.slice(2))
  if (!options.command || options.command === 'help') {
    console.log('usage: pnpm task <new|assign|start|freeze|review|approve|verify|done|drop|status|issue|guard> ...')
    return
  }
  const handlers = {
    new: newTask,
    assign,
    start,
    freeze,
    review,
    approve,
    verify,
    done,
    drop,
    status,
    issue,
    guard
  }
  const handler = handlers[options.command]
  if (!handler) fail(`unknown task command: ${options.command}`)
  handler(options)
}

try {
  main()
} catch (error) {
  console.error(`task failed: ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
}
