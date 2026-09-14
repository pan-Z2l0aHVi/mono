import { execFileSync } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const root = path.resolve(process.env.AGENT_WORKFLOW_ROOT ?? path.join(import.meta.dirname, '..'))
const phases = new Set([
  'initialized',
  'assigned',
  'editing',
  'frozen',
  'reviewed',
  'approved',
  'committed',
  'integrated',
  'verified',
  'closed'
])
const modes = new Set(['direct', 'orchestrated', 'release', 'hotfix'])
const roles = new Set(['manager', 'designer', 'lib-coder', 'biz-coder', 'reviewer'])
const SCHEMA_VERSION = 2

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
  return path.join(commonDir, 'agent-workflow')
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
    .filter(state => state.phase !== 'closed')
}

function readStateFile(file) {
  let state
  try {
    state = JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch (error) {
    fail(`cannot read workflow state ${file}: ${error instanceof Error ? error.message : String(error)}`)
  }
  if (!state || typeof state !== 'object' || !phases.has(state.phase) || typeof state.taskId !== 'string')
    fail(`workflow state is invalid: ${file}`)
  if (state.version !== 1 && state.version !== SCHEMA_VERSION)
    fail(`workflow state ${file} has unsupported schema version: ${JSON.stringify(state.version)}`)
  // v1 状态容忍：缺省字段在读取时补默认值（不做迁移写回），旧状态可读、可继续推进。
  if (state.issue === undefined) state.issue = null
  if (Array.isArray(state.verification))
    state.verification = state.verification.map(entry => ({ scope: 'task', ...entry }))
  return state
}

function assertWorktreeAvailable(commonDir, worktree, taskId) {
  const owner = activeStates(commonDir).find(state => state.taskId !== taskId && state.worktree === worktree)
  if (owner) fail(`worktree is already assigned to active task ${owner.taskId}: ${worktree}`)
}

function loadState(taskId) {
  const { commonDir } = resolveWorktree()
  const file = stateFile(commonDir, taskId)
  if (!fs.existsSync(file)) fail(`workflow task is not initialized: ${taskId}`)
  return { file, state: readStateFile(file) }
}

function saveState(file, state) {
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 })
  const temporary = `${file}.${process.pid}.${crypto.randomBytes(4).toString('hex')}.tmp`
  fs.writeFileSync(temporary, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 })
  fs.renameSync(temporary, file)
}

function now() {
  return new Date().toISOString()
}

// freeze 与 commit 必须收敛到同一起点：先全量 staging（快照语义本来就覆盖全部
// tracked+untracked 文件，staging 只是把 index 同步到工作区），再执行与 pre-commit
// 完全相同的 staged 修复管线（同一 fixer 集、同一文件集）。vp staged 会把 fix 产物
// 自动 re-stage，因此 freeze 快照落在归一化后的内容上，commit 时的 vp staged 成为
// no-op——「lint-staged 在 commit 时改写文件导致 freeze 失效」的竞态被结构性消除。
// 仅在具备 vp 工具链的仓库执行；测试 fixture 与纯 git 仓库跳过归一化。
function normalizeStaged(worktree) {
  gitAt(worktree, 'add', '-A')
  if (!fs.existsSync(path.join(worktree, 'node_modules', '.bin', 'vp'))) return false
  try {
    execFileSync('pnpm', ['exec', 'vp', 'staged'], { cwd: worktree, stdio: 'pipe' })
  } catch (error) {
    const detail = error?.stderr?.toString().trim() || error?.stdout?.toString().trim()
    fail(
      `staged normalization failed in ${worktree}; fix the reported issues and re-run freeze${detail ? `: ${detail}` : ''}`
    )
  }
  return true
}

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

function assertTaskBranch(state, live, label = 'workflow evidence') {
  if (live.branchDrift)
    fail(`${label} belongs to branch ${state.branch}; current worktree is on ${live.branch || 'detached HEAD'}`)
}

function assertCurrentHash(state, live, label = 'workflow evidence') {
  assertTaskBranch(state, live, label)
  if (live.stale)
    fail(
      `${label} is stale for task ${state.taskId}; re-run freeze (it stages the diff and normalizes formatting) and repeat review/approval`
    )
}

function init(options) {
  const taskId = validateTaskId(requireOption(options, 'task'))
  const mode = requireOption(options, 'mode')
  if (!modes.has(mode)) fail(`invalid workflow mode: ${mode}`)
  const { worktree, commonDir } = resolveWorktree(options.worktree)
  assertWorktreeAvailable(commonDir, worktree, taskId)
  if (gitAt(worktree, 'status', '--porcelain'))
    fail(`worktree has existing changes; isolate them before initializing a task: ${worktree}`)
  const branch = gitAt(worktree, 'branch', '--show-current')
  if (!branch) fail(`task worktree must be attached to a branch: ${worktree}`)
  const file = stateFile(commonDir, taskId)
  if (fs.existsSync(file)) fail(`workflow task already exists: ${taskId}`)
  const state = {
    version: SCHEMA_VERSION,
    taskId,
    mode,
    phase: 'initialized',
    createdAt: now(),
    updatedAt: now(),
    commonDir,
    baseSha: gitAt(worktree, 'rev-parse', 'HEAD'),
    branch,
    worktree,
    owner: options.owner || process.env.AGENT_WORKFLOW_OWNER || os.userInfo().username,
    issue: options.issue ? normalizeIssue(options.issue) : null,
    roles: [],
    allowedPaths: [],
    affectedWorkspaces: [],
    diffHash: null,
    review: { required: options.review !== 'skip', result: null, diffHash: null, reviewer: null, at: null },
    approval: { granted: false, diffHash: null, approver: null, at: null },
    verification: []
  }
  saveState(file, state)
  print(state)
}

function assign(options) {
  const taskId = validateTaskId(requireOption(options, 'task'))
  const { file, state } = loadState(taskId)
  const role = requireOption(options, 'role')
  if (!roles.has(role)) fail(`invalid role: ${role}`)
  assertPhase(state, ['initialized', 'assigned', 'editing'])
  const resolved = resolveWorktree(requireOption(options, 'worktree'))
  if (resolved.commonDir !== state.commonDir) fail(`worktree belongs to another Git repository: ${resolved.worktree}`)
  assertWorktreeAvailable(state.commonDir, resolved.worktree, taskId)
  const live = liveState({ ...state, worktree: resolved.worktree, commonDir: resolved.commonDir })
  if (!live.clean) fail(`assigned worktree has existing changes; isolate them before assignment: ${resolved.worktree}`)
  if (live.headSha !== state.baseSha)
    fail(`assigned worktree is not at task base SHA ${state.baseSha}: ${resolved.worktree}`)
  if (live.branch !== state.branch) fail(`assigned worktree is on branch ${live.branch}, expected ${state.branch}`)
  state.worktree = resolved.worktree
  state.commonDir = resolved.commonDir
  state.branch = live.branch
  state.owner = options.owner || state.owner
  state.roles = [...new Set([...state.roles, role])]
  state.phase = 'assigned'
  state.updatedAt = now()
  saveState(file, state)
  print(state)
}

function freeze(options) {
  const taskId = validateTaskId(requireOption(options, 'task'))
  const { file, state } = loadState(taskId)
  // 'frozen' 也在允许集合内：freeze 之后任何文件变化都会让证据 stale，
  // 文档要求「必须重新 freeze」，因此对当前 diff 再次冻结必须可行。
  assertPhase(state, ['assigned', 'editing', 'frozen', 'reviewed', 'approved'])
  const live = liveState(state)
  assertTaskBranch(state, live, 'freeze')
  normalizeStaged(live.worktree)
  // 归一化可能改写文件（vp staged fix 产物），快照必须取自归一化之后的工作区。
  const normalized = liveState(state)
  if (!options['allow-empty']) {
    const empty = normalized.current.trackedFiles.length === 0 && normalized.current.untrackedFiles.length === 0
    if (empty) fail(`task ${taskId} has no changes to freeze; use --allow-empty only for an intentional empty task`)
  }
  state.diffHash = normalized.current.hash
  state.review = { required: state.review.required, result: null, diffHash: null, reviewer: null, at: null }
  state.approval = { granted: false, diffHash: null, approver: null, at: null }
  state.phase = 'frozen'
  state.updatedAt = now()
  saveState(file, state)
  print({ ...state, live: normalized })
}

function review(options) {
  const taskId = validateTaskId(requireOption(options, 'task'))
  const result = requireOption(options, 'result')
  if (!['pass', 'fail', 'skip'].includes(result)) fail(`invalid review result: ${result}`)
  const { file, state } = loadState(taskId)
  assertPhase(state, ['frozen', 'reviewed'])
  if (result === 'skip' && state.review.required) fail(`task ${taskId} requires an independent review`)
  const reviewer = options.reviewer || process.env.AGENT_WORKFLOW_REVIEWER
  if (result !== 'skip' && !reviewer) fail(`review requires --reviewer <id> so independence is auditable`)
  if (result !== 'skip' && reviewer === state.owner) fail(`reviewer must be different from task owner`)
  const live = liveState(state)
  assertCurrentHash(state, live, 'review')
  state.review = {
    required: state.review.required,
    result,
    diffHash: state.diffHash,
    reviewer: reviewer || null,
    at: now()
  }
  state.approval = { granted: false, diffHash: null, approver: null, at: null }
  state.phase = ['pass', 'skip'].includes(result) ? 'reviewed' : 'editing'
  state.updatedAt = now()
  saveState(file, state)
  print(state)
}

function approve(options) {
  const taskId = validateTaskId(requireOption(options, 'task'))
  const { file, state } = loadState(taskId)
  assertPhase(state, ['reviewed'])
  if (state.review.required && state.review.result !== 'pass')
    fail(`task ${taskId} requires a passing review before approval`)
  if (!state.review.required && !['pass', 'skip'].includes(state.review.result))
    fail(`task ${taskId} requires a review decision before approval`)
  const live = liveState(state)
  assertCurrentHash(state, live, 'approval')
  const approver = options.approver || process.env.AGENT_WORKFLOW_APPROVER
  if (!approver) fail(`approval requires --approver <id> so authorization is auditable`)
  state.approval = { granted: true, diffHash: state.diffHash, approver, at: now() }
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
  assertPhase(state, ['integrated', 'verified'])
  if (!options['post-merge']) {
    const live = liveState(state)
    assertCurrentHash(state, live, 'verification')
    if (result === 'pass' && !live.clean)
      fail(`task ${taskId} has uncommitted changes; verification must cover a committed diff`)
    state.verification.push({
      scope: 'task',
      name,
      result,
      at: now(),
      headSha: live.headSha,
      diffHash: live.current.hash
    })
    state.phase = result === 'pass' ? 'verified' : state.phase === 'verified' ? 'integrated' : state.phase
    state.updatedAt = now()
    saveState(file, state)
    print(state)
    return
  }
  // post-merge：验证发生在整合 worktree（如 release 分支）上，不再约束 task 分支，
  // 也不改变 phase——它记录的是「合并结果被验证过」这一事实，供 close 硬校验消费。
  const integrationPath = requireOption(options, 'worktree')
  const { worktree, commonDir } = resolveWorktree(integrationPath)
  if (commonDir !== state.commonDir) fail(`integration worktree belongs to another Git repository: ${worktree}`)
  if (worktree === state.worktree)
    fail(`post-merge verification must run on an integration worktree, not the task worktree: ${worktree}`)
  if (gitAt(worktree, 'status', '--porcelain') !== '')
    fail(
      `integration worktree has uncommitted changes; post-merge verification must cover a committed integration state: ${worktree}`
    )
  const integrationHead = gitAt(worktree, 'rev-parse', 'HEAD')
  const lastTaskVerification = state.verification.filter(entry => entry.scope !== 'post-merge').at(-1)
  if (!lastTaskVerification || lastTaskVerification.result !== 'pass')
    fail(`task ${taskId} does not have a passing task-scope verification; verify on the task branch before post-merge`)
  // 祖先证明：task 分支的验证点必须真实进入整合 head，防止对不包含该任务的
  // 状态记录 post-merge 证据。squash merge 不产生祖先关系，不支持（release 模式
  // 由 release.md 的两段验证覆盖）。
  let isAncestor = false
  try {
    execFileSync(
      'git',
      ['-C', worktree, 'merge-base', '--is-ancestor', lastTaskVerification.headSha, integrationHead],
      {
        stdio: 'ignore'
      }
    )
    isAncestor = true
  } catch {
    isAncestor = false
  }
  if (!isAncestor)
    fail(
      `task verification head ${lastTaskVerification.headSha.slice(0, 12)} is not an ancestor of integration head ${integrationHead.slice(0, 12)}; squash merges are not supported for post-merge verification (see release.md)`
    )
  state.verification.push({
    scope: 'post-merge',
    name,
    result,
    at: now(),
    headSha: integrationHead,
    // 整合快照指纹：integration worktree 已强制 clean，HEAD tree 即其完整内容。
    diffHash: gitAt(worktree, 'rev-parse', 'HEAD^{tree}'),
    worktree,
    taskHeadSha: lastTaskVerification.headSha
  })
  state.updatedAt = now()
  saveState(file, state)
  print(state)
}

// close 硬校验（close 与 check --phase close 共享）：最近一条 task-scope 验证必须
// pass、task diff 与验证时一致且工作区干净；orchestrated 模式额外要求至少一条 pass
// 的 post-merge 验证——「带病关闭」缺口的根治点。direct/hotfix/release 豁免：
// direct 单 worktree 爆炸半径小；hotfix 是紧急通道；release 的合并目标是 main
// （squash 语义），无法用祖先表达，由 release.md 的两段验证覆盖。
function assertClosable(state, live) {
  const lastTaskVerification = state.verification.filter(entry => entry.scope !== 'post-merge').at(-1)
  if (!lastTaskVerification || lastTaskVerification.result !== 'pass')
    fail(`task ${state.taskId} does not have a passing latest task-scope verification result`)
  if (state.mode === 'orchestrated') {
    const postMerge = state.verification.filter(entry => entry.scope === 'post-merge')
    if (!postMerge.some(entry => entry.result === 'pass'))
      fail(
        `orchestrated task ${state.taskId} requires at least one passing post-merge verification before close; run "pnpm agent:workflow verify --task ${state.taskId} --post-merge --worktree <integration worktree>"`
      )
  }
  if (!live.clean || live.current.hash !== lastTaskVerification.diffHash)
    fail(`task ${state.taskId} changed after verification; re-run verification`)
}

function close(options) {
  const taskId = validateTaskId(requireOption(options, 'task'))
  const { file, state } = loadState(taskId)
  assertPhase(state, ['verified'])
  const live = liveState(state)
  assertCurrentHash(state, live, 'close')
  assertClosable(state, live)
  state.phase = 'closed'
  state.updatedAt = now()
  saveState(file, state)
  print(state)
}

function check(options) {
  const taskId = validateTaskId(requireOption(options, 'task'))
  const phase = requireOption(options, 'phase')
  const { file, state } = loadState(taskId)
  const live = liveState(state)
  if (live.branchDrift)
    fail(`task ${taskId} belongs to branch ${state.branch}; current worktree is on ${live.branch || 'detached HEAD'}`)
  if (phase === 'edit') {
    assertPhase(state, ['assigned', 'editing'])
    if (state.phase === 'assigned') state.phase = 'editing'
  } else {
    if (live.stale)
      fail(
        `task ${taskId} has changes after its last freeze/review/approval; current diff is stale — re-run freeze (it stages the diff and normalizes formatting) and repeat review/approval`
      )
    if (phase === 'commit') {
      assertPhase(state, ['approved'])
      if (!state.approval.granted || state.approval.diffHash !== state.diffHash)
        fail(`task ${taskId} is not approved for commit`)
    } else if (phase === 'integrate') {
      assertPhase(state, ['approved', 'committed'])
      if (!live.clean) fail(`task ${taskId} has uncommitted changes and cannot be integrated`)
      if (state.phase === 'approved') {
        if (live.headSha === state.baseSha) fail(`task ${taskId} has not been committed`)
        state.phase = 'committed'
      }
      state.phase = 'integrated'
    } else if (phase === 'merge') assertPhase(state, ['integrated', 'verified'])
    else if (phase === 'close') {
      assertPhase(state, ['verified'])
      assertClosable(state, live)
    } else fail(`unsupported check phase: ${phase}`)
  }
  state.updatedAt = now()
  saveState(file, state)
  print({ ok: true, taskId, phase, state, live })
}

function guardCommit(options) {
  const explicitTask = options.task || process.env.AGENT_WORKFLOW_TASK
  const resolved = resolveWorktree(options.worktree)
  const candidates = activeStates(resolved.commonDir).filter(state => state.worktree === resolved.worktree)

  if (explicitTask) {
    const { state } = loadState(validateTaskId(explicitTask))
    if (state.worktree !== resolved.worktree)
      fail(`workflow task ${state.taskId} is assigned to another worktree: ${state.worktree}`)
    candidates.splice(0, candidates.length, state)
  }

  if (candidates.length === 0) {
    print({ ok: true, enforced: false, worktree: resolved.worktree })
    return
  }
  if (candidates.length > 1)
    fail(`multiple active workflow tasks are assigned to worktree: ${candidates.map(state => state.taskId).join(', ')}`)

  const state = candidates[0]
  const live = liveState(state)
  if (live.branchDrift)
    fail(
      `task ${state.taskId} belongs to branch ${state.branch}; current worktree is on ${live.branch || 'detached HEAD'}`
    )
  if (live.stale)
    fail(
      `task ${state.taskId} has changes after its last freeze/review/approval; commit is blocked — re-run freeze (it stages the diff and normalizes formatting) and repeat review/approval`
    )
  assertPhase(state, ['approved'])
  if (!state.approval.granted || state.approval.diffHash !== state.diffHash)
    fail(`task ${state.taskId} is not approved for commit`)
  print({ ok: true, enforced: true, taskId: state.taskId, live })
}

// init 不接受重跑，因此事后补挂 issue 必须有独立入口；这是杀死「事后 reactive」
// 漏建 issue 模式的兜底通道，不是常态路径——常态是 init --issue 一步到位。
function issue(options) {
  const taskId = validateTaskId(requireOption(options, 'task'))
  const ref = normalizeIssue(requireOption(options, 'ref'))
  const { file, state } = loadState(taskId)
  if (state.phase === 'closed') fail(`task ${taskId} is closed; an issue reference can no longer be attached`)
  state.issue = ref
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
      `hint: task ${state.taskId} has no linked issue; attach one with "pnpm agent:workflow issue --task ${state.taskId} --ref <issue-url|N/A>"`
    )
  print({ ...state, live, stale: live.stale })
}

function print(value) {
  console.log(JSON.stringify(value, null, 2))
}

function main() {
  const options = parseArgs(process.argv.slice(2))
  if (!options.command || options.command === 'help') {
    console.log(
      'usage: pnpm agent:workflow <init|assign|freeze|review|approve|check|guard-commit|verify|issue|status|close> ...'
    )
    return
  }
  const handlers = {
    init,
    assign,
    freeze,
    review,
    approve,
    check,
    'guard-commit': guardCommit,
    verify,
    issue,
    status,
    close
  }
  const handler = handlers[options.command]
  if (!handler) fail(`unknown workflow command: ${options.command}`)
  handler(options)
}

try {
  main()
} catch (error) {
  console.error(`agent-workflow failed: ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
}
