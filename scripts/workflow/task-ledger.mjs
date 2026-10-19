#!/usr/bin/env node
// 本地 task 台账。状态只记录归属、进度与引用；提交边界由独立只读 checks 负责，PR 政策由 CI 负责。
// state 位于系统临时目录，可丢失；它不是 review、测试或 CI 通过的证据。
import { execFileSync } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const statuses = new Set(['open', 'active', 'closed', 'dropped'])
const levels = new Set(['t0', 't1', 't2'])
const SCHEMA_VERSION = 3
const AGENT_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{3,39}$/

function fail(message) {
  throw new Error(message)
}

function parseArgs(argv) {
  const [command, ...rest] = argv
  const options = { command, positional: [] }
  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index]
    if (token === '--') break
    if (!token.startsWith('--')) {
      options.positional.push(token)
      continue
    }
    const equals = token.indexOf('=')
    const key = token.slice(2, equals < 0 ? undefined : equals)
    if (!key) fail('empty option')
    if (equals >= 0) {
      options[key] = token.slice(equals + 1)
      continue
    }
    const next = rest[index + 1]
    if (next !== undefined && !next.startsWith('--')) {
      options[key] = next
      index += 1
    } else options[key] = true
  }
  return options
}

function requireOption(options, name) {
  const value = options[name]
  if (typeof value !== 'string' || value.length === 0) fail('missing required option --' + name)
  return value
}

function validateTaskId(taskId) {
  if (typeof taskId !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,100}$/.test(taskId))
    fail('invalid task id: ' + String(taskId))
  return taskId
}

function assertAgentId(value, label) {
  if (typeof value !== 'string' || !AGENT_ID.test(value))
    fail('invalid ' + label + ' id: ' + JSON.stringify(value) + '; use 4-40 letters, digits, dot, underscore or hyphen')
  return value
}

function normalizeIssue(value) {
  if (typeof value !== 'string')
    fail('invalid issue reference: ' + JSON.stringify(value) + '; use a full https:// URL or N/A')
  if (value === 'N/A') return value
  if (!value.startsWith('https://')) fail('invalid issue reference: ' + value + '; use a full https:// URL or N/A')
  if (/\s/.test(value)) fail('invalid issue reference: ' + value + '; must not contain whitespace')
  return value
}

function normalizePr(value) {
  if (typeof value !== 'string')
    fail('invalid PR reference: ' + JSON.stringify(value) + '; use a GitHub pull request URL or N/A')
  if (value === 'N/A') return value
  let parsed
  try {
    parsed = new URL(value)
  } catch {
    fail('invalid PR reference: ' + value + '; use a GitHub pull request URL or N/A')
  }
  if (parsed.protocol !== 'https:' || !/\/pull\/\d+\/?$/.test(parsed.pathname))
    fail('invalid PR reference: ' + value + '; use an https://.../pull/<number> URL or N/A')
  return value
}

function gitAt(worktree, ...args) {
  try {
    return execFileSync('git', ['-C', worktree, ...args], { encoding: 'utf8' }).trimEnd()
  } catch (error) {
    const detail = error?.stderr?.toString().trim()
    fail('git -C ' + worktree + ' ' + args.join(' ') + ' failed' + (detail ? ': ' + detail : ''))
  }
}

function taskRoot() {
  return path.resolve(process.env.AGENT_TASK_ROOT ?? path.join(import.meta.dirname, '../..'))
}

function resolveWorktree(value = '.', base = taskRoot()) {
  const candidate = path.resolve(base, value)
  if (!fs.existsSync(candidate) || !fs.statSync(candidate).isDirectory()) fail('worktree does not exist: ' + candidate)
  const worktree = fs.realpathSync(gitAt(candidate, 'rev-parse', '--show-toplevel'))
  const commonPath = path.resolve(worktree, gitAt(worktree, 'rev-parse', '--git-common-dir'))
  return { worktree, commonDir: fs.realpathSync(commonPath) }
}

function taskStateDir() {
  return path.resolve(process.env.AGENT_TASK_STATE_DIR ?? path.join(os.tmpdir(), 'greypan', 'tasks'))
}

function stateFile(taskId) {
  return path.join(taskStateDir(), validateTaskId(taskId) + '.json')
}

function projectState(raw, file) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || typeof raw.taskId !== 'string')
    fail('task ledger record is invalid: ' + file)
  if (![1, 2, SCHEMA_VERSION].includes(raw.version))
    fail('task ledger record ' + file + ' has unsupported schema version: ' + JSON.stringify(raw.version))
  if (!Array.isArray(raw.events) || typeof raw.commonDir !== 'string' || typeof raw.worktree !== 'string')
    fail('task ledger record is invalid: ' + file)
  if (!levels.has(raw.level)) fail('task ledger record is invalid: ' + file)

  if (raw.version === SCHEMA_VERSION) {
    if (!statuses.has(raw.status)) fail('task ledger record is invalid: ' + file)
    for (const field of ['phase', 'diffHash', 'review', 'approval', 'verification']) {
      if (Object.hasOwn(raw, field)) fail('task ledger record is invalid: legacy field ' + field + ' in ' + file)
    }
    return { state: { ...raw }, migratedFrom: null }
  }

  const legacyStatuses =
    raw.version === 1
      ? new Map([
          ['open', 'open'],
          ['active', 'active'],
          ['frozen', 'active'],
          ['reviewed', 'active'],
          ['approved', 'active'],
          ['done', 'closed'],
          ['dropped', 'dropped']
        ])
      : new Map([
          ['open', 'open'],
          ['active', 'active'],
          ['done', 'closed'],
          ['dropped', 'dropped']
        ])
  const status = legacyStatuses.get(raw.phase)
  if (!status) fail('task ledger record is invalid: ' + file)

  const state = { ...raw, version: SCHEMA_VERSION, status }
  delete state.phase
  delete state.diffHash
  delete state.review
  delete state.approval
  delete state.verification
  if (raw.version === 1) state.pr = null
  return { state, migratedFrom: raw.version }
}

function readStateFile(file) {
  let raw
  try {
    raw = JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch (error) {
    fail('cannot read task state ' + file + ': ' + (error instanceof Error ? error.message : String(error)))
  }
  return projectState(raw, file)
}

function partialCommonDir(file) {
  try {
    const raw = JSON.parse(fs.readFileSync(file, 'utf8'))
    return typeof raw?.commonDir === 'string' ? raw.commonDir : undefined
  } catch {
    return undefined
  }
}

function listStates(commonDir) {
  const directory = taskStateDir()
  if (!fs.existsSync(directory)) return []
  return fs
    .readdirSync(directory)
    .filter(name => name.endsWith('.json'))
    .flatMap(name => {
      const file = path.join(directory, name)
      try {
        const { state } = readStateFile(file)
        if (state.commonDir !== commonDir || ['closed', 'dropped'].includes(state.status)) return []
        return [state]
      } catch (error) {
        const owner = partialCommonDir(file)
        if (owner === undefined || owner === commonDir)
          console.error('warning: skipping unreadable task state; ' + error.message)
        return []
      }
    })
}

function assertWorktreeAvailable(commonDir, worktree, taskId) {
  const owner = listStates(commonDir).find(state => state.taskId !== taskId && state.worktree === worktree)
  if (owner) fail('worktree is already assigned to active task ' + owner.taskId + ': ' + worktree)
}

function loadState(taskId) {
  const file = stateFile(taskId)
  if (!fs.existsSync(file)) fail('task is not initialized: ' + taskId)
  return { file, ...readStateFile(file) }
}

function saveState(file, state) {
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 })
  const temporary = file + '.' + process.pid + '.' + crypto.randomBytes(4).toString('hex') + '.tmp'
  try {
    fs.writeFileSync(temporary, JSON.stringify(state, null, 2) + '\n', { mode: 0o600 })
    fs.renameSync(temporary, file)
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary)
  }
}

function now() {
  return new Date().toISOString()
}

function appendEvent(state, event, detail = {}) {
  state.events.push({ at: now(), event, ...detail })
}

function prepareMutation(loaded) {
  const { state, migratedFrom } = loaded
  if (migratedFrom !== null) appendEvent(state, 'migration', { fromVersion: migratedFrom, toVersion: SCHEMA_VERSION })
  state.version = SCHEMA_VERSION
  state.updatedAt = now()
  return state
}

function assertStatus(state, allowed) {
  if (!allowed.includes(state.status))
    fail('task ' + state.taskId + ' has status ' + state.status + '; expected ' + allowed.join(' or '))
}

function liveState(state) {
  const { worktree, commonDir } = resolveWorktree(state.worktree)
  if (commonDir !== state.commonDir) fail('task ' + state.taskId + ' belongs to another Git repository')
  const branch = gitAt(worktree, 'branch', '--show-current')
  return {
    worktree,
    branch,
    headSha: gitAt(worktree, 'rev-parse', 'HEAD'),
    clean: gitAt(worktree, 'status', '--porcelain') === '',
    branchDrift: branch !== state.branch
  }
}

function assertTaskBranch(state, live, label = 'task') {
  if (live.branchDrift)
    fail(label + ' belongs to branch ' + state.branch + '; current worktree is on ' + (live.branch || 'detached HEAD'))
}

function uncommittedPaths(worktree) {
  const lines = gitAt(worktree, '-c', 'core.quotePath=false', 'status', '--porcelain').split('\n').filter(Boolean)
  const shown = lines.slice(0, 5).map(line => {
    const entry = line.slice(3)
    return entry.includes(' -> ') ? entry.slice(entry.indexOf(' -> ') + 4) : entry
  })
  if (lines.length > shown.length) shown.push('... (+' + (lines.length - shown.length) + ')')
  return { count: lines.length, shown }
}

function declaredOwner(options) {
  if (options.owner !== undefined) return assertAgentId(options.owner, 'owner')
  if (process.env.AGENT_TASK_OWNER) return assertAgentId(process.env.AGENT_TASK_OWNER, 'owner')
  return os.userInfo().username
}

function newTask(options) {
  const taskId = validateTaskId(requireOption(options, 'task'))
  const level = requireOption(options, 'level')
  if (!levels.has(level)) fail('invalid task level: ' + level)
  const { worktree, commonDir } = resolveWorktree(options.worktree)
  assertWorktreeAvailable(commonDir, worktree, taskId)
  if (level !== 't2') {
    const dirty = uncommittedPaths(worktree)
    if (dirty.count)
      fail(
        'worktree has existing changes; a ' + level.toUpperCase() + ' task must start clean: ' + dirty.shown.join(', ')
      )
  }
  const branch = gitAt(worktree, 'branch', '--show-current')
  if (!branch) fail('task worktree must be attached to a branch: ' + worktree)
  const file = stateFile(taskId)
  if (fs.existsSync(file)) fail('task already exists: ' + taskId)
  const timestamp = now()
  const state = {
    version: SCHEMA_VERSION,
    taskId,
    level,
    status: 'open',
    createdAt: timestamp,
    updatedAt: timestamp,
    commonDir,
    baseSha: gitAt(worktree, 'rev-parse', 'HEAD'),
    branch,
    worktree,
    owner: declaredOwner(options),
    issue: options.issue === undefined ? null : normalizeIssue(options.issue),
    playbook: options.playbook || null,
    pr: null,
    events: []
  }
  appendEvent(state, 'new', { level, owner: state.owner, baseSha: state.baseSha, branch, worktree })
  saveState(file, state)
  print(state)
}

function assign(options) {
  const taskId = validateTaskId(requireOption(options, 'task'))
  if (Object.hasOwn(options, 'roles')) fail('assign does not accept --roles; role coordination is not task state')
  const loaded = loadState(taskId)
  const state = prepareMutation(loaded)
  const target = options.worktree === undefined ? resolveWorktree(state.worktree) : resolveWorktree(options.worktree)
  if (target.commonDir !== state.commonDir) fail('assigned worktree belongs to another Git repository')
  assertWorktreeAvailable(state.commonDir, target.worktree, taskId)
  if (options.owner !== undefined) state.owner = declaredOwner(options)
  state.worktree = target.worktree
  appendEvent(state, 'assign', { owner: state.owner, worktree: state.worktree })
  saveState(loaded.file, state)
  print(state)
}

function start(options) {
  const taskId = validateTaskId(requireOption(options, 'task'))
  const loaded = loadState(taskId)
  const state = loaded.state
  assertStatus(state, ['open', 'active'])
  const live = liveState(state)
  assertTaskBranch(state, live)
  if (state.status === 'open' && state.level !== 't2' && !live.clean) {
    const dirty = uncommittedPaths(live.worktree)
    fail('task ' + taskId + ' cannot start with uncommitted changes: ' + dirty.shown.join(', '))
  }
  prepareMutation(loaded)
  state.status = 'active'
  appendEvent(state, 'start')
  saveState(loaded.file, state)
  print({ ...state, live })
}

function updateIssue(options) {
  const taskId = validateTaskId(requireOption(options, 'task'))
  const ref = normalizeIssue(requireOption(options, 'ref'))
  const loaded = loadState(taskId)
  const state = prepareMutation(loaded)
  state.issue = ref
  appendEvent(state, 'issue', { issue: state.issue })
  saveState(loaded.file, state)
  print(state)
}

function recordPr(options) {
  const taskId = validateTaskId(requireOption(options, 'task'))
  const loaded = loadState(taskId)
  const state = loaded.state
  assertStatus(state, ['active'])
  const live = liveState(state)
  assertTaskBranch(state, live, 'PR reference')
  prepareMutation(loaded)
  state.pr = normalizePr(requireOption(options, 'ref'))
  appendEvent(state, 'pr', { ref: state.pr })
  saveState(loaded.file, state)
  print({ ...state, note: 'PR reference recorded; this does not indicate CI or review status' })
}

function close(options) {
  const taskId = validateTaskId(requireOption(options, 'task'))
  const loaded = loadState(taskId)
  const state = loaded.state
  assertStatus(state, ['active'])
  const live = liveState(state)
  assertTaskBranch(state, live, 'task')
  prepareMutation(loaded)
  state.status = 'closed'
  appendEvent(state, 'close')
  saveState(loaded.file, state)
  print({ ...state, live })
}

function drop(options) {
  const taskId = validateTaskId(requireOption(options, 'task'))
  const loaded = loadState(taskId)
  const state = loaded.state
  assertStatus(state, ['open', 'active'])
  const reason = requireOption(options, 'reason')
  if (reason.replace(/\s/g, '').length < 10)
    fail('drop requires a --reason of at least 10 non-space characters; got: ' + reason)
  const by = assertAgentId(requireOption(options, 'by'), 'drop author')
  prepareMutation(loaded)
  state.status = 'dropped'
  appendEvent(state, 'drop', { reason, by })
  saveState(loaded.file, state)
  print(state)
}

function status(options) {
  const taskId = validateTaskId(requireOption(options, 'task'))
  const loaded = loadState(taskId)
  const live = liveState(loaded.state)
  print({
    ...loaded.state,
    ...(loaded.migratedFrom === null ? {} : { migrationPendingFrom: loaded.migratedFrom }),
    live
  })
}

function print(value) {
  process.stdout.write(JSON.stringify(value, null, 2) + '\n')
}

function help() {
  process.stdout.write(
    [
      'Usage: pnpm agent:task-ledger <command> --task <id> [options]',
      '',
      'Commands: new, assign, start, status, issue --ref, pr, close, drop',
      'The ledger records ownership, worktree identity, issue/PR references and events; it does not run checks, fixers or builds.',
      'close closes the local ledger record; it does not state that review, CI, merge or release succeeded.'
    ].join('\n') + '\n'
  )
}

function main() {
  const options = parseArgs(process.argv.slice(2))
  switch (options.command) {
    case 'new':
      return newTask(options)
    case 'assign':
      return assign(options)
    case 'start':
      return start(options)
    case 'status':
      return status(options)
    case 'issue':
      return updateIssue(options)
    case 'pr':
      return recordPr(options)
    case 'close':
      return close(options)
    case 'drop':
      return drop(options)
    case 'help':
    case '--help':
    case undefined:
      return help()
    default:
      return fail('unknown task-ledger command: ' + options.command + '; run pnpm agent:task-ledger help')
  }
}

try {
  main()
} catch (error) {
  process.stderr.write('task-ledger failed: ' + (error instanceof Error ? error.message : String(error)) + '\n')
  process.exitCode = 1
}
