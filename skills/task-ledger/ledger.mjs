#!/usr/bin/env node
// 通用 task 台账：只记录归属、进度与引用；分级与流程见同目录 SKILL.md。
// 状态位于系统临时目录，可丢失；它不是 review、测试或 CI 证据。
import { execFileSync } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const SCHEMA_VERSION = 1
const STATUSES = new Set(['open', 'active', 'closed', 'dropped'])
const LEVELS = new Set(['T0', 'T1', 'T2'])
const TASK_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,100}$/
const OWNER_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/
const REF_KIND = /^[a-z][a-z0-9-]{0,31}$/
const MAX_REF_VALUE = 2000

function fail(message) {
  throw new Error(message)
}

function parseArgs(argv) {
  const [command, ...rest] = argv
  const options = { command, positional: [] }
  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index]
    if (token === '--') {
      options.positional.push(...rest.slice(index + 1))
      break
    }
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
  if (typeof value !== 'string' || value.trim().length === 0) fail('missing required option --' + name)
  return value
}

function assertNoExtra(options, maximum) {
  if (options.positional.length > maximum)
    fail('unexpected argument: ' + options.positional[maximum] + '; run with help for usage')
}

function validateTaskId(value) {
  if (typeof value !== 'string' || !TASK_ID.test(value)) fail('invalid task id: ' + String(value))
  return value
}

function resolveTaskId(options) {
  const positional = options.positional[0]
  const alias = options.task
  if (positional !== undefined && alias !== undefined) fail('pass either a positional task id or --task, not both')
  return validateTaskId(positional ?? alias)
}

function normalizeLevel(value) {
  const level = String(value).toUpperCase()
  if (!LEVELS.has(level)) fail('invalid task level: ' + String(value) + '; use T0, T1 or T2')
  return level
}

function normalizeOwner(value) {
  if (typeof value !== 'string' || !OWNER_ID.test(value))
    fail('invalid owner id: ' + JSON.stringify(value) + '; use 1-64 letters, digits, dot, underscore or hyphen')
  return value
}

function validateRefKind(value) {
  if (typeof value !== 'string' || !REF_KIND.test(value))
    fail('invalid ref kind: ' + String(value) + '; use lowercase letters, digits and hyphens')
  return value
}

function validateRefValue(value) {
  if (typeof value !== 'string' || value.trim().length === 0) fail('missing ref value')
  if (value.length > MAX_REF_VALUE) fail('ref value is too long (max ' + MAX_REF_VALUE + ' characters)')
  if (/[\r\n]/.test(value)) fail('ref value must not contain line breaks')
  return value
}

function tryGit(cwd, args) {
  try {
    return execFileSync('git', ['-C', cwd, ...args], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    }).trim()
  } catch (error) {
    if (error?.code === 'ENOENT') fail('git is required to resolve the repository')
    return null
  }
}

function resolveRepo(options) {
  if (options.root !== undefined && typeof options.root !== 'string') fail('--root requires a path')
  const candidate = path.resolve(options.root ?? process.env.AGENT_TASK_ROOT ?? process.cwd())
  if (!fs.existsSync(candidate) || !fs.statSync(candidate).isDirectory())
    fail('repository root does not exist: ' + candidate)
  const top = tryGit(candidate, ['rev-parse', '--show-toplevel'])
  if (!top) fail('not a Git repository: ' + candidate)
  const root = fs.realpathSync(top)
  const common = tryGit(root, ['rev-parse', '--git-common-dir'])
  if (!common) fail('cannot resolve Git common directory for ' + root)
  const gitCommonDir = fs.realpathSync(path.resolve(root, common))
  const repoId = crypto.createHash('sha256').update(gitCommonDir).digest('hex').slice(0, 16)
  return { root, gitCommonDir, repoId }
}

function resolveBase(root, ref) {
  const sha = tryGit(root, ['rev-parse', '--verify', ref + '^{commit}'])
  if (!sha || !/^[0-9a-f]{40,64}$/i.test(sha)) fail('base ref does not resolve to a commit: ' + ref)
  return sha
}

function stateDir(repo) {
  return process.env.AGENT_TASK_STATE_DIR
    ? path.resolve(process.env.AGENT_TASK_STATE_DIR)
    : path.join(os.tmpdir(), 'agent-task-ledger', repo.repoId)
}

function stateFile(repo, id) {
  return path.join(stateDir(repo), id + '.json')
}

function packetFile(repo, id) {
  return path.join(stateDir(repo), id + '.md')
}

function now() {
  return new Date().toISOString()
}

function appendEvent(state, event, detail = {}) {
  state.events.push({ at: now(), event, ...detail })
}

function assertState(raw, file) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) fail('task ledger record is invalid: ' + file)
  if (raw.schema !== SCHEMA_VERSION)
    fail('task ledger record ' + file + ' has unsupported schema version: ' + JSON.stringify(raw.schema))
  if (typeof raw.id !== 'string' || !TASK_ID.test(raw.id)) fail('task ledger record is invalid: ' + file)
  if (!LEVELS.has(raw.level)) fail('task ledger record is invalid: ' + file)
  if (!STATUSES.has(raw.status)) fail('task ledger record is invalid: ' + file)
  if (typeof raw.owner !== 'string' || !OWNER_ID.test(raw.owner)) fail('task ledger record is invalid: ' + file)
  if (typeof raw.base !== 'string' || !/^[0-9a-f]{40,64}$/i.test(raw.base))
    fail('task ledger record is invalid: ' + file)
  if (raw.branch !== null && typeof raw.branch !== 'string') fail('task ledger record is invalid: ' + file)
  if (typeof raw.repoRoot !== 'string' || typeof raw.gitCommonDir !== 'string')
    fail('task ledger record is invalid: ' + file)
  if (!raw.refs || typeof raw.refs !== 'object' || Array.isArray(raw.refs))
    fail('task ledger record is invalid: ' + file)
  for (const [kind, value] of Object.entries(raw.refs)) {
    if (!REF_KIND.test(kind) || typeof value !== 'string' || value.length > MAX_REF_VALUE || /[\r\n]/.test(value))
      fail('task ledger record is invalid: ' + file)
  }
  if (!Array.isArray(raw.events) || !raw.events.every(event => event && typeof event.event === 'string'))
    fail('task ledger record is invalid: ' + file)
  if (typeof raw.createdAt !== 'string' || typeof raw.updatedAt !== 'string')
    fail('task ledger record is invalid: ' + file)
  return raw
}

function readState(repo, id) {
  const file = stateFile(repo, id)
  if (!fs.existsSync(file)) fail('task is not initialized: ' + id)
  let raw
  try {
    raw = JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch (error) {
    fail('cannot read task state ' + file + ': ' + (error instanceof Error ? error.message : String(error)))
  }
  return { file, state: assertState(raw, file) }
}

function loadTask(options, id) {
  const repo = resolveRepo(options)
  const loaded = readState(repo, id)
  if (loaded.state.gitCommonDir !== repo.gitCommonDir) fail('task ' + id + ' belongs to another Git repository')
  return { repo, ...loaded }
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

function packetContent(state) {
  return [
    '# ' + state.id,
    '',
    '- Level: ' + state.level,
    '- Owner: ' + state.owner,
    '- Base: ' + state.base,
    '- Branch: ' + (state.branch ?? 'detached HEAD'),
    '- Worktree (optional):',
    '- Refs:',
    '',
    '## Goal',
    '',
    '## Non-goals',
    '',
    '## Acceptance',
    '',
    '## Verification',
    '',
    '## Recovery',
    ''
  ].join('\n')
}

function writePacketIfAbsent(repo, state) {
  const file = packetFile(repo, state.id)
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 })
  try {
    fs.writeFileSync(file, packetContent(state), { mode: 0o600, flag: 'wx' })
  } catch (error) {
    if (error?.code !== 'EEXIST') throw error
  }
}

function newTask(options) {
  assertNoExtra(options, 1)
  const id = resolveTaskId(options)
  const level = normalizeLevel(requireOption(options, 'level'))
  const owner = normalizeOwner(requireOption(options, 'owner'))
  if (options.base !== undefined && typeof options.base !== 'string') fail('--base requires a value')
  const repo = resolveRepo(options)
  const base = resolveBase(repo.root, options.base ?? 'HEAD')
  const branch = tryGit(repo.root, ['branch', '--show-current']) || null
  const file = stateFile(repo, id)
  if (fs.existsSync(file)) fail('task already exists: ' + id)
  const timestamp = now()
  const state = {
    schema: SCHEMA_VERSION,
    id,
    level,
    status: 'open',
    owner,
    base,
    branch,
    repoRoot: repo.root,
    gitCommonDir: repo.gitCommonDir,
    refs: {},
    createdAt: timestamp,
    updatedAt: timestamp,
    events: []
  }
  appendEvent(state, 'new', { level, owner, base, branch })
  saveState(file, state)
  writePacketIfAbsent(repo, state)
  print(state)
}

function start(options) {
  assertNoExtra(options, 1)
  const id = resolveTaskId(options)
  const { file, state } = loadTask(options, id)
  if (state.status === 'closed' || state.status === 'dropped')
    fail('task ' + id + ' is ' + state.status + '; cannot start')
  if (state.status === 'active') {
    print({ ...state, note: 'task is already active' })
    return
  }
  state.status = 'active'
  state.updatedAt = now()
  appendEvent(state, 'start')
  saveState(file, state)
  print(state)
}

function ref(options) {
  assertNoExtra(options, 3)
  const id = resolveTaskId(options)
  const kind = validateRefKind(options.positional[1])
  const remove = options.remove === true
  const value = options.positional[2]
  if (remove) {
    if (value !== undefined) fail('ref --remove does not accept a value')
  } else validateRefValue(value)
  const { file, state } = loadTask(options, id)
  if (remove) {
    if (!Object.hasOwn(state.refs, kind)) fail('ref not found: ' + kind)
    delete state.refs[kind]
  } else state.refs[kind] = value
  state.updatedAt = now()
  appendEvent(state, 'ref', remove ? { kind, removed: true } : { kind, value })
  saveState(file, state)
  print(state)
}

function close(options) {
  assertNoExtra(options, 1)
  const id = resolveTaskId(options)
  const { file, state } = loadTask(options, id)
  if (state.status === 'dropped') fail('task ' + id + ' is dropped; cannot close')
  if (state.status === 'closed') {
    print({ ...state, note: 'task is already closed' })
    return
  }
  state.status = 'closed'
  state.updatedAt = now()
  appendEvent(state, 'close')
  saveState(file, state)
  print({
    ...state,
    note: 'close records local completion only; it does not assert review, CI, merge or release success'
  })
}

function drop(options) {
  assertNoExtra(options, 1)
  const id = resolveTaskId(options)
  const { file, state } = loadTask(options, id)
  if (state.status === 'closed') fail('task ' + id + ' is closed; cannot drop')
  if (state.status === 'dropped') {
    print({ ...state, note: 'task is already dropped' })
    return
  }
  const reason = options.reason
  if (reason !== undefined && (typeof reason !== 'string' || reason.trim().length === 0))
    fail('--reason must be a non-empty string')
  state.status = 'dropped'
  state.updatedAt = now()
  appendEvent(state, 'drop', reason === undefined ? {} : { reason })
  saveState(file, state)
  print(state)
}

function readStateForListing(file) {
  try {
    return assertState(JSON.parse(fs.readFileSync(file, 'utf8')), file)
  } catch (error) {
    process.stderr.write('warning: skipping unreadable task state; ' + (error instanceof Error ? error.message : String(error)) + '\n')
    return null
  }
}

function status(options) {
  assertNoExtra(options, 1)
  if (options.positional[0] !== undefined || options.task !== undefined) {
    const { state } = loadTask(options, resolveTaskId(options))
    print(state)
    return
  }
  const repo = resolveRepo(options)
  const directory = stateDir(repo)
  const states = fs.existsSync(directory)
    ? fs
        .readdirSync(directory)
        .filter(name => name.endsWith('.json'))
        .map(name => readStateForListing(path.join(directory, name)))
        .filter(state => state && state.gitCommonDir === repo.gitCommonDir)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))
    : []
  if (options.json === true) {
    print(states)
    return
  }
  if (states.length === 0) {
    process.stdout.write('no tasks for ' + repo.root + '\n')
    return
  }
  for (const state of states)
    process.stdout.write(
      [state.id, state.level, state.status, state.owner, state.branch ?? 'detached', state.base].join('\t') + '\n'
    )
}

function print(value) {
  process.stdout.write(JSON.stringify(value, null, 2) + '\n')
}

function help() {
  process.stdout.write(
    [
      'Usage: node ledger.mjs <command> [options]',
      '',
      'Commands:',
      '  new <id> --level <T0|T1|T2> --owner <owner> [--base <git-ref>]',
      '  start <id>',
      '  status [<id>] [--json]',
      '  ref <id> <kind> <value>',
      '  ref <id> <kind> --remove',
      '  close <id>',
      '  drop <id> [--reason <text>]',
      '  help',
      '',
      'Options:',
      '  --root <path>  repository root (default: AGENT_TASK_ROOT or cwd)',
      '  --task <id>    alias for the positional task id',
      '  --json         JSON output for status listings',
      '',
      'Storage: <tmp>/agent-task-ledger/<repo-id>/ (AGENT_TASK_STATE_DIR overrides it)',
      'The ledger records local ownership, progress and refs; it is not review, test or CI evidence.'
    ].join('\n') + '\n'
  )
}

function main() {
  const options = parseArgs(process.argv.slice(2))
  switch (options.command) {
    case 'new':
      return newTask(options)
    case 'start':
      return start(options)
    case 'status':
      return status(options)
    case 'ref':
      return ref(options)
    case 'close':
      return close(options)
    case 'drop':
      return drop(options)
    case 'help':
    case '--help':
    case undefined:
      return help()
    default:
      return fail('unknown task-ledger command: ' + options.command + '; run with help')
  }
}

try {
  main()
} catch (error) {
  process.stderr.write('task-ledger failed: ' + (error instanceof Error ? error.message : String(error)) + '\n')
  process.exitCode = 1
}
