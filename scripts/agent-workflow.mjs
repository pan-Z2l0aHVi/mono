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
  if (live.stale) fail(`${label} is stale for task ${state.taskId}; freeze the current diff again`)
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
    version: 1,
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
  assertPhase(state, ['assigned', 'editing', 'reviewed', 'approved'])
  const live = liveState(state)
  assertTaskBranch(state, live, 'freeze')
  if (!options['allow-empty']) {
    const empty = live.current.trackedFiles.length === 0 && live.current.untrackedFiles.length === 0
    if (empty) fail(`task ${taskId} has no changes to freeze; use --allow-empty only for an intentional empty task`)
  }
  state.diffHash = live.current.hash
  state.review = { required: state.review.required, result: null, diffHash: null, reviewer: null, at: null }
  state.approval = { granted: false, diffHash: null, approver: null, at: null }
  state.phase = 'frozen'
  state.updatedAt = now()
  saveState(file, state)
  print({ ...state, live })
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
  const live = liveState(state)
  assertCurrentHash(state, live, 'verification')
  if (result === 'pass' && !live.clean)
    fail(`task ${taskId} has uncommitted changes; verification must cover a committed diff`)
  state.verification.push({ name, result, at: now(), headSha: live.headSha, diffHash: live.current.hash })
  state.phase = result === 'pass' ? 'verified' : state.phase === 'verified' ? 'integrated' : state.phase
  state.updatedAt = now()
  saveState(file, state)
  print(state)
}

function close(options) {
  const taskId = validateTaskId(requireOption(options, 'task'))
  const { file, state } = loadState(taskId)
  assertPhase(state, ['verified'])
  const lastVerification = state.verification.at(-1)
  if (!lastVerification || lastVerification.result !== 'pass')
    fail(`task ${taskId} does not have a passing latest verification result`)
  const live = liveState(state)
  assertCurrentHash(state, live, 'close')
  if (!live.clean || live.current.hash !== lastVerification.diffHash)
    fail(`task ${taskId} changed after verification; re-run verification`)
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
    if (live.stale) fail(`task ${taskId} has changes after its last freeze/review/approval; current diff is stale`)
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
      const lastVerification = state.verification.at(-1)
      if (!lastVerification || lastVerification.result !== 'pass')
        fail(`task ${taskId} does not have a passing latest verification result`)
      if (!live.clean || live.current.hash !== lastVerification.diffHash)
        fail(`task ${taskId} changed after verification; re-run verification`)
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
  if (live.stale) fail(`task ${state.taskId} has changes after its last freeze/review/approval; commit is blocked`)
  assertPhase(state, ['approved'])
  if (!state.approval.granted || state.approval.diffHash !== state.diffHash)
    fail(`task ${state.taskId} is not approved for commit`)
  print({ ok: true, enforced: true, taskId: state.taskId, live })
}

function status(options) {
  const taskId = validateTaskId(requireOption(options, 'task'))
  const { state } = loadState(taskId)
  const live = liveState(state)
  print({ ...state, live, stale: live.stale })
}

function print(value) {
  console.log(JSON.stringify(value, null, 2))
}

function main() {
  const options = parseArgs(process.argv.slice(2))
  if (!options.command || options.command === 'help') {
    console.log(
      'usage: pnpm agent:workflow <init|assign|freeze|review|approve|check|guard-commit|verify|status|close> ...'
    )
    return
  }
  const handlers = { init, assign, freeze, review, approve, check, 'guard-commit': guardCommit, verify, status, close }
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
