import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const errors = []

const relative = file => path.relative(root, file) || '.'
const exists = file => fs.existsSync(path.join(root, file))
const read = file => fs.readFileSync(path.join(root, file), 'utf8')

function walk(directory, predicate = () => true) {
  const absolute = path.join(root, directory)
  if (!fs.existsSync(absolute)) return []
  const files = []
  for (const entry of fs.readdirSync(absolute, { withFileTypes: true })) {
    const file = path.join(absolute, entry.name)
    if (entry.isDirectory()) files.push(...walk(path.relative(root, file), predicate))
    else if (predicate(file)) files.push(file)
  }
  return files
}

function addError(message) {
  errors.push(message)
}

for (const file of ['AGENTS.md', 'CLAUDE.md', 'CONTEXT.md', 'docs/agents/context.md']) {
  if (!exists(file)) addError(`missing required context file: ${file}`)
}

if (exists('CLAUDE.md')) {
  const claudeStat = fs.lstatSync(path.join(root, 'CLAUDE.md'))
  const claudeSource = read('CLAUDE.md')
  if (claudeStat.isSymbolicLink()) addError('CLAUDE.md must remain a thin regular-file adapter, not a symlink')
  if (!claudeSource.includes('薄适配入口') || !claudeSource.includes('AGENTS.md'))
    addError('CLAUDE.md is missing the shared-entry adapter contract')
}

if (exists('package.json')) {
  try {
    const packageJson = JSON.parse(read('package.json'))
    for (const script of ['check:context', 'check:contracts', 'repo:impact', 'repo:verify', 'test:repo-tools']) {
      if (typeof packageJson.scripts?.[script] !== 'string') addError(`package.json is missing scripts.${script}`)
    }
  } catch (error) {
    addError(`package.json cannot be parsed: ${error instanceof Error ? error.message : String(error)}`)
  }
} else {
  addError('missing required context file: package.json')
}

for (const directory of ['packages', 'apps']) {
  const absolute = path.join(root, directory)
  if (!fs.existsSync(absolute)) continue

  for (const entry of fs.readdirSync(absolute, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const workspaceRoot = path.join(absolute, entry.name)
    if (
      fs.existsSync(path.join(workspaceRoot, 'package.json')) &&
      !fs.existsSync(path.join(workspaceRoot, 'AGENTS.md'))
    ) {
      addError(`${directory}/${entry.name}: missing nearest AGENTS.md for workspace context routing`)
    }
  }
}

const symlinks = {
  '.claude/rules': '../.agents/rules',
  '.claude/skills': '../.agents/skills',
  '.claude/agents': '../.agents/agents'
}
for (const [file, expectedTarget] of Object.entries(symlinks)) {
  const absolute = path.join(root, file)
  try {
    const stat = fs.lstatSync(absolute)
    if (!stat.isSymbolicLink()) addError(`${file} must be a symlink to ${expectedTarget}`)
    else if (fs.readlinkSync(absolute) !== expectedTarget) addError(`${file} must target ${expectedTarget}`)
    else if (!fs.existsSync(absolute)) addError(`${file} points to a missing target`)
  } catch {
    addError(`missing required symlink: ${file}`)
  }
}

const markdownFiles = [
  ...['AGENTS.md', 'CLAUDE.md', 'CONTEXT.md'].filter(exists).map(file => path.join(root, file)),
  ...walk('docs/agents', file => file.endsWith('.md')),
  ...walk('docs/adr', file => file.endsWith('.md')),
  ...walk('.agents', file => file.endsWith('.md'))
]
const linkPattern = /(?<!!?)\[[^\]]*\]\(([^)]+)\)/g
for (const file of markdownFiles) {
  const source = fs.readFileSync(file, 'utf8')
  for (const match of source.matchAll(linkPattern)) {
    const target = match[1].trim()
    if (!target || /^(?:https?:|mailto:|#)/.test(target)) continue
    const location = target.split('#', 1)[0]
    if (!location) continue
    const resolved = path.resolve(path.dirname(file), location)
    if (!fs.existsSync(resolved)) addError(`${relative(file)}: broken local link ${target}`)
  }
}

function parseFrontmatter(file) {
  const source = fs.readFileSync(file, 'utf8')
  if (!source.startsWith('---\n')) {
    addError(`${relative(file)}: missing YAML frontmatter`)
    return
  }
  const closing = source.indexOf('\n---\n', 4)
  if (closing < 0) {
    addError(`${relative(file)}: unterminated YAML frontmatter`)
    return
  }
  const frontmatter = source.slice(4, closing)
  for (const key of ['name', 'description']) {
    if (!new RegExp(`^${key}:\\s*\\S`, 'm').test(frontmatter)) {
      addError(`${relative(file)}: frontmatter requires ${key}`)
    }
  }
}

for (const file of walk('.agents/skills', file => path.basename(file) === 'SKILL.md')) parseFrontmatter(file)
for (const file of walk('.agents/agents', file => file.endsWith('.md'))) parseFrontmatter(file)

if (exists('CONTEXT.md')) {
  const context = read('CONTEXT.md')
  const adrDirectory = path.join(root, 'docs/adr')
  if (fs.existsSync(adrDirectory)) {
    for (const file of fs.readdirSync(adrDirectory).filter(file => file.endsWith('.md'))) {
      if (!context.includes(`docs/adr/${file}`)) addError(`CONTEXT.md does not index docs/adr/${file}`)
    }
  } else {
    addError('missing required directory: docs/adr')
  }
}

if (errors.length) {
  console.error(`context-check failed with ${errors.length} error(s):`)
  console.error(errors.map(error => `- ${error}`).join('\n'))
  process.exit(1)
}

const digest = crypto.createHash('sha256').update(markdownFiles.sort().join('\n')).digest('hex').slice(0, 12)
console.log(`context-check passed (${markdownFiles.length} Markdown files, index ${digest})`)
