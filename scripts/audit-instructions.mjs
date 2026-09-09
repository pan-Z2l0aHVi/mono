import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const args = process.argv.slice(2)
const json = args.includes('--json')
const strict = args.includes('--strict')
const includeGenerated = args.includes('--include-generated')

const roots = [
  'AGENTS.md',
  'CLAUDE.md',
  'GEMINI.md',
  'CONTEXT.md',
  'ARCHITECTURE.md',
  'CONTRIBUTING.md',
  '.agents/agents',
  '.agents/rules',
  '.agents/skills',
  'docs/agents',
  'packages',
  'apps'
]
const ignoredDirectories = new Set(['node_modules', 'dist', '.turbo', '.git', '.vitest-attachments'])
const files = []

function walk(relative) {
  const absolute = path.join(root, relative)
  if (!fs.existsSync(absolute)) return
  const stat = fs.statSync(absolute)
  if (stat.isFile()) {
    if (includeGenerated || !ignoredDirectories.has(path.basename(path.dirname(absolute)))) files.push(relative)
    return
  }
  for (const entry of fs.readdirSync(absolute, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue
    const child = path.posix.join(relative, entry.name)
    if (entry.isDirectory()) walk(child)
    else if (
      entry.name.endsWith('.md') &&
      (entry.name === 'AGENTS.md' || relative.startsWith('.agents') || relative.startsWith('docs/agents'))
    )
      files.push(child)
  }
}

for (const entry of roots) walk(entry)

const imperativePattern = /(?:必须|不得|禁止|不要|仅允许|只能|先读|先查|应当|需要)/g
const filesReport = files.map(file => {
  const content = fs.readFileSync(path.join(root, file), 'utf8')
  const lines = content.split(/\r?\n/)
  const imperatives = [...content.matchAll(imperativePattern)].length
  const links = [...content.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)].map(match => match[1])
  return {
    file,
    lines: lines.length,
    imperatives,
    imperativeDensity: Number((imperatives / Math.max(lines.length, 1)).toFixed(3)),
    links: links.filter(link => !/^(?:https?:|mailto:|#)/.test(link)).length
  }
})

const repeatedTerms = ['生成文件', '真实浏览器', '公共契约', 'find:usages', 'definePlugin', 'Shadow DOM']
const duplicates = repeatedTerms
  .map(term => ({
    term,
    files: filesReport
      .filter(item => fs.readFileSync(path.join(root, item.file), 'utf8').includes(term))
      .map(item => item.file)
  }))
  .filter(item => item.files.length > 1)

const alwaysLoaded = filesReport.filter(item => ['AGENTS.md', 'CLAUDE.md', 'GEMINI.md'].includes(item.file))
const highDensity = filesReport
  .filter(item => item.imperatives >= 5)
  .sort((left, right) => right.imperatives - left.imperatives)
const result = {
  command: 'audit-instructions',
  strict,
  scope: files.sort(),
  summary: {
    markdownFiles: files.length,
    totalLines: filesReport.reduce((sum, item) => sum + item.lines, 0),
    totalImperatives: filesReport.reduce((sum, item) => sum + item.imperatives, 0),
    alwaysLoadedLines: alwaysLoaded.reduce((sum, item) => sum + item.lines, 0)
  },
  highDensity,
  duplicates,
  guidance: [
    '优先把可由 lint、formatter、类型、测试或 manifest 证明的规则移出常驻 context。',
    '重复词条不是语义冲突证明；修改前要对照权威来源和加载条件人工复核。',
    '高密度文件是审计候选，不是自动删除清单。'
  ]
}

const strictErrors = []
const readRoot = file => (fs.existsSync(path.join(root, file)) ? fs.readFileSync(path.join(root, file), 'utf8') : '')
const rootAgents = readRoot('AGENTS.md')
const workflow = readRoot('docs/agents/workflow.md')
const manager = readRoot('.agents/agents/manager.md')
const preCommit = readRoot('.vite-hooks/pre-commit')
for (const [file, content, markers] of [
  ['AGENTS.md', rootAgents, ['## Mutation Gate', 'docs/agents/workflow.md', 'agent:workflow init']],
  ['docs/agents/workflow.md', workflow, ['## 先建立任务', '## 状态机', '## 失败和恢复']],
  ['.agents/agents/manager.md', manager, ['Manager 启动后第一项工作必须读取']],
  ['.vite-hooks/pre-commit', preCommit, ['agent:workflow guard-commit']]
]) {
  for (const marker of markers)
    if (!content.includes(marker)) strictErrors.push(`${file}: missing mandatory marker ${marker}`)
}
for (const file of ['docs/agents/worktrees.md', 'docs/agents/release.md', 'docs/agents/task-packet.md'])
  if (!fs.existsSync(path.join(root, file))) strictErrors.push(`missing workflow companion document: ${file}`)
for (const legacy of ['持久开发 worktree：每个活跃子包', 'Reviewer worktree', 'Harness 选择', 'Agent 启动权限'])
  if (workflow.includes(legacy)) strictErrors.push(`docs/agents/workflow.md: retired workflow model remains: ${legacy}`)
result.strictErrors = strictErrors

if (json) console.log(JSON.stringify(result, null, 2))
else {
  console.log('audit-instructions report')
  console.log(`markdown files: ${result.summary.markdownFiles}`)
  console.log(`total lines: ${result.summary.totalLines}`)
  console.log(`imperative terms: ${result.summary.totalImperatives}`)
  console.log(`always-loaded lines: ${result.summary.alwaysLoadedLines}`)
  if (strict) console.log(`strict errors: ${strictErrors.length}`)
  console.log('high-density files:')
  for (const item of highDensity)
    console.log(`- ${item.file}: ${item.imperatives} imperative terms / ${item.lines} lines`)
  console.log('repeated topic candidates:')
  for (const item of duplicates) console.log(`- ${item.term}: ${item.files.join(', ')}`)
}

if (strict && strictErrors.length) {
  console.error(`audit-instructions --strict failed with ${strictErrors.length} error(s):`)
  console.error(strictErrors.map(error => `- ${error}`).join('\n'))
  process.exitCode = 1
}
