import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const args = process.argv.slice(2)
const json = args.includes('--json')
const strict = args.includes('--strict')
const includeGenerated = args.includes('--include-generated')
// --warn 把所有 strict 断言降级为报告，用于采集基线或排查新模型换代后的指令漂移。
const warn = args.includes('--warn')

const roots = [
  'AGENTS.md',
  'CLAUDE.md',
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

const readFile = file => fs.readFileSync(path.join(root, file), 'utf8')
const exists = file => fs.existsSync(path.join(root, file))

const imperativePattern = /(?:必须|不得|禁止|不要|仅允许|只能|先读|先查|应当|需要)/g
const filesReport = files.map(file => {
  const content = readFile(file)
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

// ── 约束预算与重复检测的作用域 ──
// 只覆盖「约束层」：根入口、共享 rules、角色契约、references 与 docs/agents。
// 刻意排除 `.agents/skills/`（第三方 skill 必须保持上游原文，升级会天然改变字符数）、
// `packages/**` 与 `apps/**` 的包级 AGENTS.md（它们随 workspace 增减，属任务路由而非约束层）。
const instructionEntries = [
  'AGENTS.md',
  'CLAUDE.md',
  'CONTEXT.md',
  'ARCHITECTURE.md',
  'CONTRIBUTING.md',
  '.agents/rules',
  '.agents/agents',
  '.agents/references',
  'docs/agents'
]
const instructionFiles = []
function collectInstruction(relative) {
  const absolute = path.join(root, relative)
  if (!fs.existsSync(absolute)) return
  if (fs.statSync(absolute).isFile()) {
    instructionFiles.push(relative)
    return
  }
  for (const entry of fs.readdirSync(absolute, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (ignoredDirectories.has(entry.name)) continue
      collectInstruction(path.posix.join(relative, entry.name))
    } else if (entry.name.endsWith('.md')) instructionFiles.push(path.posix.join(relative, entry.name))
  }
}
for (const entry of instructionEntries) collectInstruction(entry)
instructionFiles.sort()

const instructionMeasures = instructionFiles.map(file => {
  const content = readFile(file)
  return {
    file,
    characters: content.length,
    imperatives: [...content.matchAll(imperativePattern)].length
  }
})
const sumBy = key => instructionMeasures.reduce((sum, item) => sum + item[key], 0)

// ── 双向门 1：约束预算基线 ──
// 约束预算只能通过修改 scripts/instruction-budget.json 放宽，因此每一次「加约束」
// 都会出现在 diff 里被评审看见。基线文件不存在时本项只报告不阻塞（首次采集阶段）。
function readStore(file) {
  if (!exists(file)) return null
  try {
    return JSON.parse(readFile(file))
  } catch (error) {
    return { __error: `${file} cannot be parsed: ${error instanceof Error ? error.message : String(error)}` }
  }
}

const budgetStore = readStore('scripts/instruction-budget.json')
const budgetViolations = []
const budgetExceeded = []
const budgetUnbudgeted = []
const budgetTotals = { characters: sumBy('characters'), imperatives: sumBy('imperatives') }
let budgetBaseline = null
// 基线文件本身就是门的一部分：删掉或清空它必须让 --strict 失败，否则双向门可以被「删除基线」而不是
// 「修改基线」绕过——那样这个动作就不会出现在 diff 的评审视野里。
if (!budgetStore)
  budgetViolations.push('scripts/instruction-budget.json is missing; the instruction budget gate cannot be evaluated')
else if (budgetStore.__error) budgetViolations.push(budgetStore.__error)
else {
  budgetBaseline = budgetStore.totals ?? {}
  const tolerance = Number(budgetStore.tolerance)
  if (!Number.isFinite(tolerance) || tolerance < 0)
    budgetViolations.push(
      `scripts/instruction-budget.json: tolerance must be a non-negative number, got ${JSON.stringify(budgetStore.tolerance)}`
    )
  for (const key of ['characters', 'imperatives']) {
    if (!Number.isFinite(budgetBaseline[key]))
      budgetViolations.push(
        `scripts/instruction-budget.json: totals.${key} must be a number, got ${JSON.stringify(budgetBaseline[key])}`
      )
  }
  if (budgetViolations.length === 0) {
    const baselineFiles = budgetStore.files ?? {}
    for (const measure of instructionMeasures) {
      const base = baselineFiles[measure.file]
      if (!base) {
        budgetUnbudgeted.push({ file: measure.file, characters: measure.characters, imperatives: measure.imperatives })
        continue
      }
      const exceededCharacters = measure.characters > base.characters * (1 + tolerance)
      const exceededImperatives = measure.imperatives > base.imperatives * (1 + tolerance)
      if (exceededCharacters || exceededImperatives) {
        budgetExceeded.push({
          file: measure.file,
          characters: measure.characters,
          baselineCharacters: base.characters,
          imperatives: measure.imperatives,
          baselineImperatives: base.imperatives
        })
        if (exceededCharacters)
          budgetViolations.push(
            `${measure.file}: ${measure.characters} characters exceed the instruction budget baseline ${base.characters}`
          )
        if (exceededImperatives)
          budgetViolations.push(
            `${measure.file}: ${measure.imperatives} imperative terms exceed the instruction budget baseline ${base.imperatives}`
          )
      }
    }
    for (const [key, label] of [
      ['characters', 'characters'],
      ['imperatives', 'imperative terms']
    ]) {
      if (budgetTotals[key] > budgetBaseline[key] * (1 + tolerance))
        budgetViolations.push(
          `instruction layer: total ${label} ${budgetTotals[key]} exceed the baseline ${budgetBaseline[key]}`
        )
    }
  }
}

// ── 双向门 2：已被工具强制的规则 ──
// 删掉的规则不得换个写法长回来。命中即失败，除非同时删除这里的条目（会出现在 diff 里）。
const toolStore = readStore('scripts/tool-enforced-rules.json')
const toolEnforcedHits = []
const toolEnforcedViolations = []
// 同预算基线：规则清单本身也必须存在，否则「删除清单」会成为重新引入被禁规则的静默通道。
if (!toolStore)
  toolEnforcedViolations.push(
    'scripts/tool-enforced-rules.json is missing; the tool-enforced rule gate cannot be evaluated'
  )
else if (toolStore.__error) toolEnforcedViolations.push(toolStore.__error)
else {
  const expandTargets = entries => {
    const list = Array.isArray(entries) && entries.length > 0 ? entries : instructionEntries
    const matched = new Set()
    for (const entry of list) {
      const prefix = entry.endsWith('/') ? entry : `${entry}/`
      for (const file of instructionFiles) if (file === entry || file.startsWith(prefix)) matched.add(file)
    }
    return [...matched].sort()
  }
  for (const rule of toolStore.rules ?? []) {
    let pattern = null
    try {
      pattern = new RegExp(rule.pattern)
    } catch (error) {
      toolEnforcedViolations.push(
        `tool-enforced rule ${rule.id}: invalid pattern (${error instanceof Error ? error.message : String(error)})`
      )
      continue
    }
    for (const file of expandTargets(rule.files)) {
      readFile(file)
        .split('\n')
        .forEach((line, index) => {
          if (!pattern.test(line)) return
          toolEnforcedHits.push({
            rule: rule.id,
            file,
            line: index + 1,
            text: line.trim(),
            evidence: rule.evidence
          })
          toolEnforcedViolations.push(
            `${file}:${index + 1} restates a rule already enforced by tooling (${rule.id}); evidence: ${rule.evidence}`
          )
        })
    }
  }
}

// ── 双向门 3：重述块检测 ──
// 基于规范化文本的定长滑窗，找出共享窗口数达到阈值的文件对。共享窗口数说明同一处方
// 被写在了两处，按 `context.md`「只能有一个流程权威来源」应合并为一处指针 + 一处权威。
const REPEATED_WINDOW = 40
const REPEATED_THRESHOLD = 6
const normalizeForShingles = source =>
  source
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]*`/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\s+/g, '')
    .replace(/[^\p{Script=Han}\p{L}\p{N}]/gu, '')
    .toLowerCase()
const shingleSets = new Map(
  instructionFiles.map(file => {
    const text = normalizeForShingles(readFile(file))
    const set = new Set()
    for (let index = 0; index + REPEATED_WINDOW <= text.length; index += 1)
      set.add(text.slice(index, index + REPEATED_WINDOW))
    return [file, set]
  })
)
const repeatedPairs = []
const shingleNames = [...shingleSets.keys()]
for (let left = 0; left < shingleNames.length; left += 1) {
  for (let right = left + 1; right < shingleNames.length; right += 1) {
    const leftSet = shingleSets.get(shingleNames[left])
    const rightSet = shingleSets.get(shingleNames[right])
    let shared = 0
    for (const window of leftSet) if (rightSet.has(window)) shared += 1
    if (shared >= REPEATED_THRESHOLD)
      repeatedPairs.push({ files: [shingleNames[left], shingleNames[right]], sharedWindows: shared })
  }
}
repeatedPairs.sort((left, right) => right.sharedWindows - left.sharedWindows)
const repeatedBaseline = Number.isFinite(budgetStore?.repeatedBlockPairs) ? budgetStore.repeatedBlockPairs : null
const repeatedViolations = []
if (repeatedBaseline === null)
  repeatedViolations.push(
    'scripts/instruction-budget.json: repeatedBlockPairs must be a number; the repeated block gate cannot be evaluated'
  )
else if (repeatedPairs.length > repeatedBaseline)
  repeatedViolations.push(
    `instruction layer: ${repeatedPairs.length} repeated block pairs exceed the baseline ${repeatedBaseline}`
  )

// ── 不变量锚点 ──
// 校验器钉锚点而不是钉措辞：正文可以按新模型重写，只要锚点还在。换模型时不必改脚本。
const invariantAnchors = [
  { anchor: 'task-state-trigger', files: ['AGENTS.md'] },
  { anchor: 'orchestration-routing', files: ['AGENTS.md', 'docs/agents/workflow.md'] },
  { anchor: 'handoff-fields', files: ['AGENTS.md', 'docs/agents/task-packet.md'] },
  { anchor: 'executor-binding', files: ['AGENTS.md'] },
  { anchor: 'workflow-states', files: ['docs/agents/workflow.md'] },
  { anchor: 'risk-tiering', files: ['docs/agents/workflow.md'] },
  { anchor: 'pre-authorized-ops', files: ['docs/agents/workflow.md'] },
  {
    anchor: 'role-sections',
    files: instructionFiles.filter(file => file.startsWith('.agents/agents/'))
  }
]
const anchorViolations = []
for (const { anchor, files: targets } of invariantAnchors) {
  for (const file of targets) {
    if (!exists(file)) {
      anchorViolations.push(`missing anchor file ${file} for <!-- invariant:${anchor} -->`)
      continue
    }
    if (!readFile(file).includes(`<!-- invariant:${anchor} -->`))
      anchorViolations.push(`${file}: missing anchor <!-- invariant:${anchor} -->`)
  }
}

const alwaysLoaded = filesReport.filter(item => ['AGENTS.md', 'CLAUDE.md'].includes(item.file))
const highDensity = filesReport
  .filter(item => item.imperatives >= 5)
  .sort((left, right) => right.imperatives - left.imperatives)

const budget = {
  scope: instructionEntries,
  baseline: budgetStore && !budgetStore.__error ? 'scripts/instruction-budget.json' : null,
  tolerance: Number(budgetStore?.tolerance ?? 0),
  totals: budgetTotals,
  baselineTotals: budgetBaseline,
  exceeded: budgetExceeded,
  unbudgeted: budgetUnbudgeted,
  violations: budgetViolations
}
const repeatedBlocks = {
  window: REPEATED_WINDOW,
  threshold: REPEATED_THRESHOLD,
  baseline: repeatedBaseline,
  count: repeatedPairs.length,
  exceeded: repeatedViolations.length > 0,
  pairs: repeatedPairs,
  violations: repeatedViolations
}

// 兼容既有消费者：`duplicates` 过去是 6 个硬编码词条的文件列表，现在改为滑窗文件对。
const result = {
  command: 'audit-instructions',
  strict,
  warn,
  scope: files.sort(),
  summary: {
    markdownFiles: files.length,
    totalLines: filesReport.reduce((sum, item) => sum + item.lines, 0),
    totalImperatives: filesReport.reduce((sum, item) => sum + item.imperatives, 0),
    alwaysLoadedLines: alwaysLoaded.reduce((sum, item) => sum + item.lines, 0),
    instructionFiles: instructionFiles.length,
    instructionCharacters: budgetTotals.characters,
    instructionImperatives: budgetTotals.imperatives
  },
  highDensity,
  duplicates: repeatedPairs,
  budget,
  toolEnforcedHits,
  repeatedBlocks,
  guidance: [
    '优先把可由 lint、formatter、类型、测试或 manifest 证明的规则移出常驻 context。',
    '重复词条不是语义冲突证明；修改前要对照权威来源和加载条件人工复核。',
    '高密度文件是审计候选，不是自动删除清单。',
    '约束预算只能通过修改 scripts/instruction-budget.json 放宽；这个动作会出现在 diff 里。',
    '不变量用 <!-- invariant:... --> 锚点表达；校验器只钉锚点，正文可以随模型换代重写。'
  ]
}

const strictErrors = []
const rootAgents = exists('AGENTS.md') ? readFile('AGENTS.md') : ''
const preCommit = exists('.vite-hooks/pre-commit') ? readFile('.vite-hooks/pre-commit') : ''
// 只保留无法从结构推断的入口断言：入口链接、init 命令字面量、提交 hook 与配套文档。
for (const [file, content, markers] of [
  ['AGENTS.md', rootAgents, ['docs/agents/workflow.md', 'agent:workflow init']],
  ['.vite-hooks/pre-commit', preCommit, ['agent:workflow guard-commit']]
]) {
  for (const marker of markers)
    if (!content.includes(marker)) strictErrors.push(`${file}: missing mandatory marker ${marker}`)
}
for (const file of ['docs/agents/worktrees.md', 'docs/agents/release.md', 'docs/agents/task-packet.md'])
  if (!exists(file)) strictErrors.push(`missing workflow companion document: ${file}`)
for (const file of ['AGENTS.md', 'CLAUDE.md', 'CONTEXT.md', 'ARCHITECTURE.md', 'CONTRIBUTING.md'])
  if (!exists(file)) strictErrors.push(`missing entry document: ${file}`)

strictErrors.push(...anchorViolations, ...budgetViolations, ...toolEnforcedViolations, ...repeatedViolations)
result.strictErrors = strictErrors

if (json) console.log(JSON.stringify(result, null, 2))
else {
  console.log('audit-instructions report')
  console.log(`markdown files: ${result.summary.markdownFiles}`)
  console.log(`total lines: ${result.summary.totalLines}`)
  console.log(`imperative terms: ${result.summary.totalImperatives}`)
  console.log(`always-loaded lines: ${result.summary.alwaysLoadedLines}`)
  console.log(
    `instruction layer: ${result.summary.instructionFiles} files / ${result.summary.instructionCharacters} chars / ${result.summary.instructionImperatives} imperative terms`
  )
  if (strict) console.log(`strict errors: ${strictErrors.length}`)
  console.log('high-density files:')
  for (const item of highDensity)
    console.log(`- ${item.file}: ${item.imperatives} imperative terms / ${item.lines} lines`)
  console.log(`budget: ${budget.baseline ? `baseline ${budget.baseline}` : 'no baseline declared (advisory)'}`)
  for (const item of budget.exceeded)
    console.log(
      `- exceeded ${item.file}: ${item.characters}/${item.baselineCharacters} chars, ${item.imperatives}/${item.baselineImperatives} imperative terms`
    )
  for (const item of budget.unbudgeted) console.log(`- unbudgeted ${item.file}: ${item.characters} chars`)
  console.log(`tool-enforced rules: ${toolEnforcedHits.length} hit(s)`)
  for (const hit of toolEnforcedHits)
    console.log(`- ${hit.file}:${hit.line} restates ${hit.rule} (evidence: ${hit.evidence})`)
  console.log(
    `repeated block pairs: ${repeatedPairs.length} (window ${REPEATED_WINDOW}, threshold ${REPEATED_THRESHOLD})`
  )
  for (const item of repeatedPairs)
    console.log(`- ${item.files[0]} <-> ${item.files[1]}: ${item.sharedWindows} shared windows`)
}

if (strict && strictErrors.length && !warn) {
  console.error(`audit-instructions --strict failed with ${strictErrors.length} error(s):`)
  console.error(strictErrors.map(error => `- ${error}`).join('\n'))
  process.exitCode = 1
}
