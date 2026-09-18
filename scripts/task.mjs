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
const REVIEWER_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{3,39}$/

function fail(message) {
  throw new Error(message)
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
    if (value === '--') {
      options.commandArgs = rest.slice(index + 1)
      break
    }
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
    .map(file => readStateFile(path.join(directory, file)))
    .filter(state => state.phase !== 'done' && state.phase !== 'dropped')
}

function readStateFile(file) {
  let state
  try {
    state = JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch (error) {
    fail(`cannot read task state ${file}: ${error instanceof Error ? error.message : String(error)}`)
  }
  if (!state || typeof state !== 'object' || !phases.has(state.phase) || typeof state.taskId !== 'string')
    fail(`task state is invalid: ${file}`)
  if (state.version !== SCHEMA_VERSION)
    fail(`task state ${file} has unsupported schema version: ${JSON.stringify(state.version)}`)
  return state
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

// 仓库级政策检查：freeze 在取快照前执行 .agents/checks/ 下每个可执行文件，
// 非零退出即中止并保留输出作为可观察原因。内核不内置任何业务检查；task 上下文
// 通过环境变量注入，检查脚本据此核对冻结 diff 而不必重复探测。
function runChecks(worktree, state) {
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
      fail(`check ${entry} failed; freeze aborted${detail ? `:\n${detail}` : ''}`)
    }
    ran.push(entry)
  }
  return ran
}

function newTask(options) {
  const taskId = validateTaskId(requireOption(options, 'task'))
  const level = requireOption(options, 'level')
  if (!levels.has(level)) fail(`invalid task level: ${level}`)
  const { worktree, commonDir } = resolveWorktree(options.worktree)
  assertWorktreeAvailable(commonDir, worktree, taskId)
  if (gitAt(worktree, 'status', '--porcelain'))
    fail(`worktree has existing changes; isolate them before creating a task: ${worktree}`)
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
    owner: options.owner || process.env.AGENT_TASK_OWNER || os.userInfo().username,
    issue: options.issue ? normalizeIssue(options.issue) : null,
    playbook: options.playbook || null,
    roles: [],
    diffHash: null,
    review: { required: level !== 't2', result: null, diffHash: null, reviewer: null, at: null },
    approval: { granted: false, diffHash: null, approver: null, at: null },
    verification: [],
    events: []
  }
  appendEvent(state, 'new', { level, baseSha: state.baseSha, branch, worktree })
  saveState(file, state)
  print(state)
}

function assign(options) {
  const taskId = validateTaskId(requireOption(options, 'task'))
  const { file, state } = loadState(taskId)
  const worktree = options.worktree ? resolveWorktree(options.worktree).worktree : state.worktree
  assertWorktreeAvailable(state.commonDir, worktree, taskId)
  state.worktree = worktree
  if (options.owner) state.owner = options.owner
  if (options.roles)
    state.roles = options.roles
      .split(',')
      .map(role => role.trim())
      .filter(Boolean)
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
  const checks = runChecks(live.worktree, state)
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

function review(options) {
  const taskId = validateTaskId(requireOption(options, 'task'))
  const result = requireOption(options, 'result')
  if (!['pass', 'fail'].includes(result)) fail(`invalid review result: ${result}`)
  const { file, state } = loadState(taskId)
  if (state.level === 't2') fail(`task ${taskId} is level t2; review is not part of its path`)
  assertPhase(state, ['frozen'])
  const reviewer = options.reviewer || process.env.AGENT_TASK_REVIEWER
  if (!reviewer) fail(`review requires --reviewer <id> so independence is auditable`)
  if (!REVIEWER_ID.test(reviewer)) fail(`invalid reviewer id: ${reviewer}; use [A-Za-z0-9][A-Za-z0-9._-]{3,39}`)
  if (reviewer === state.owner) fail(`reviewer must be different from task owner`)
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
  const result = options.result || 'pass'
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

// drop 取代手工清理：任何未完结状态都可带 reason 强制落终态，事件留痕。
// 典型场景是 agent 结束后残留的 active task 卡住 worktree 提交。
function drop(options) {
  const taskId = validateTaskId(requireOption(options, 'task'))
  const reason = requireOption(options, 'reason')
  const { file, state } = loadState(taskId)
  assertPhase(state, ['open', 'active', 'frozen', 'reviewed', 'approved'])
  state.phase = 'dropped'
  appendEvent(state, 'drop', { reason })
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
  if (state.level === 't2') {
    // T2 追踪门槛：提交发生在已 start 的 task 内即可；不要求快照证据。
    assertPhase(state, ['active', 'frozen', 'reviewed', 'approved'])
    print({ ok: true, enforced: true, taskId: state.taskId, level: state.level, live })
    return
  }
  if (live.stale)
    fail(
      `task ${state.taskId} has changes after its last freeze/review/approval; commit is blocked — re-run freeze (it stages the diff and normalizes formatting) and repeat review/approval`
    )
  assertPhase(state, ['approved'])
  if (!state.approval.granted || state.approval.diffHash !== state.diffHash)
    fail(`task ${state.taskId} is not approved for commit`)
  print({ ok: true, enforced: true, taskId: state.taskId, level: state.level, live })
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
