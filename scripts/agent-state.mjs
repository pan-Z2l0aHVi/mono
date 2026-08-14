import fs from 'node:fs'
import path from 'node:path'

const rawArgs = process.argv.slice(2)
const command = rawArgs.shift()
const options = parseOptions(rawArgs)
const root = path.resolve(options.root || path.resolve(import.meta.dirname, '..'))
const stateDirectory = path.join(root, '.agent-state', 'tasks')
const statuses = new Set(['in_progress', 'blocked', 'completed'])

if (!['write', 'read', 'list'].includes(command))
  fail('Usage: node scripts/agent-state.mjs <write|read|list> [options]')
if (command === 'write' && (!options.task || !options.input)) {
  fail('Usage: node scripts/agent-state.mjs write --task <task-id> --input <record.json> [--root <directory>]')
}
if (command === 'read' && !options.task) {
  fail('Usage: node scripts/agent-state.mjs read --task <task-id> [--root <directory>]')
}
if (command === 'list' && (options.task || options.input)) {
  fail('Usage: node scripts/agent-state.mjs list [--root <directory>]')
}

if (command === 'write') writeState()
if (command === 'read') readState()
if (command === 'list') listStates()

function parseOptions(args) {
  const result = { input: '', root: '', task: '' }

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]
    if (!['--input', '--root', '--task'].includes(argument)) fail(`agent-state: unknown option ${argument}`)

    const value = args[index + 1]
    if (!value || value.startsWith('--')) fail(`agent-state: ${argument} requires a value`)
    result[argument.slice(2)] = value
    index += 1
  }

  return result
}

function fail(message) {
  console.error(message)
  process.exit(1)
}

function validateTaskId(taskId) {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/.test(taskId)) {
    fail('agent-state: task id must contain only letters, numbers, dots, underscores, or hyphens')
  }
}

function readRecord(input) {
  const inputFile = path.resolve(process.cwd(), input)
  let record
  try {
    record = JSON.parse(fs.readFileSync(inputFile, 'utf8'))
  } catch (error) {
    fail(`agent-state: cannot read JSON input ${input}: ${error instanceof Error ? error.message : String(error)}`)
  }

  if (!record || Array.isArray(record) || typeof record !== 'object') fail('agent-state: record must be a JSON object')
  return record
}

function validateStringArray(record, key) {
  if (record[key] === undefined) return []
  if (!Array.isArray(record[key]) || record[key].some(value => typeof value !== 'string')) {
    fail(`agent-state: ${key} must be an array of strings`)
  }
  return [...new Set(record[key])]
}

function validateVerification(record) {
  if (record.verification === undefined) return []
  if (!Array.isArray(record.verification)) fail('agent-state: verification must be an array')

  return record.verification.map((item, index) => {
    if (!item || Array.isArray(item) || typeof item !== 'object') {
      fail(`agent-state: verification[${index}] must be an object`)
    }
    if (typeof item.command !== 'string' || !item.command) {
      fail(`agent-state: verification[${index}].command must be a non-empty string`)
    }
    if (!['passed', 'failed', 'not_run'].includes(item.status)) {
      fail(`agent-state: verification[${index}].status must be passed, failed, or not_run`)
    }
    if (item.note !== undefined && typeof item.note !== 'string') {
      fail(`agent-state: verification[${index}].note must be a string when provided`)
    }

    return item.note === undefined ? { command: item.command, status: item.status } : item
  })
}

function normalizeRecord(taskId, record) {
  if (!statuses.has(record.status)) {
    fail(`agent-state: status must be one of ${[...statuses].join(', ')}`)
  }
  if (typeof record.summary !== 'string' || !record.summary.trim()) {
    fail('agent-state: summary must be a non-empty string')
  }

  return {
    schemaVersion: 1,
    taskId,
    status: record.status,
    summary: record.summary,
    contextFiles: validateStringArray(record, 'contextFiles'),
    changedPaths: validateStringArray(record, 'changedPaths'),
    verification: validateVerification(record),
    risks: validateStringArray(record, 'risks'),
    updatedAt: new Date().toISOString()
  }
}

function stateFile(taskId) {
  validateTaskId(taskId)
  return path.join(stateDirectory, `${taskId}.json`)
}

function writeState() {
  const taskId = options.task
  const output = stateFile(taskId)
  const record = normalizeRecord(taskId, readRecord(options.input))

  fs.mkdirSync(stateDirectory, { recursive: true })
  fs.writeFileSync(output, `${JSON.stringify(record, null, 2)}\n`)
  console.log(`agent-state: wrote ${path.relative(root, output)}`)
}

function readState() {
  const input = stateFile(options.task)
  if (!fs.existsSync(input)) fail(`agent-state: task state not found: ${options.task}`)
  process.stdout.write(fs.readFileSync(input, 'utf8'))
}

function listStates() {
  if (!fs.existsSync(stateDirectory)) {
    console.log('[]')
    return
  }

  const states = fs
    .readdirSync(stateDirectory)
    .filter(file => file.endsWith('.json'))
    .sort()
    .map(file => {
      const record = JSON.parse(fs.readFileSync(path.join(stateDirectory, file), 'utf8'))
      return {
        taskId: record.taskId,
        status: record.status,
        summary: record.summary,
        updatedAt: record.updatedAt
      }
    })
  console.log(JSON.stringify(states, null, 2))
}
