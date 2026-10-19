import crypto from 'node:crypto'

// 只收已观测到的漂移短语。泛化的「当前」「目前」会把合法的过程描述一起判红，
// 而文风 lint 不在门禁职责内（ADR-0026）。
const VOLATILE_PHRASES = Object.freeze([
  { pattern: /当前规则集/, label: '当前规则集' },
  { pattern: /当前\s*GitHub\s*ruleset/, label: '当前 GitHub ruleset' },
  { pattern: /当前唯一\s*required/, label: '当前唯一 required' },
  { pattern: /当前\s*required/, label: '当前 required' },
  { pattern: /当前只有/, label: '当前只有' },
  { pattern: /目前只有/, label: '目前只有' },
  { pattern: /尚未实现/, label: '尚未实现' },
  { pattern: /仍未实现/, label: '仍未实现' },
  { pattern: /仍是[^\n]{0,20}占位/, label: '仍是…占位' }
])

// 远端写操作只认无歧义的命令形态。散文里的「发布」「合并」可能是领域名词或历史叙述，
// 按词根匹配会把大部分文档误判成写操作流程。
const REMOTE_WRITE =
  /\b(?:git push|gh pr (?:create|merge|comment|review|edit)|npm publish|pnpm publish|git tag|gh release|wails3 package)\b/
export const AUTHORIZATION_POINTER = 'workflow.md#怎么取得这个授权'
const REFERENCE_MARKER = '<!-- corpus-status: reference -->'
const REFERENCE_BANNER = '状态：非权威参考'

export function countNonWhitespace(source) {
  return source.replace(/\s/gu, '').length
}

export function scanVolatilePhrases(entries) {
  const violations = []
  for (const { file, source } of entries) {
    for (const { pattern, label } of VOLATILE_PHRASES) {
      if (pattern.test(source)) violations.push({ file, phrase: label })
    }
  }
  return violations
}

export function findUnroutedAgentDocs(agentsSource, files) {
  return files
    .filter(file => file.startsWith('docs/agents/') && file.endsWith('.md'))
    .filter(file => !agentsSource.includes(file))
    .sort()
}

export function findMissingAuthorizationPointers(entries) {
  return (
    entries
      .filter(
        ({ file }) =>
          file === 'AGENTS.md' ||
          file.endsWith('AGENTS.md') ||
          file.startsWith('docs/agents/') ||
          file.startsWith('.agents/rules/')
      )
      // workflow.md 是授权机制的 owner；要求它指向自己会形成自指。
      .filter(({ file }) => file !== 'docs/agents/workflow.md')
      .filter(({ source }) => REMOTE_WRITE.test(source) && !source.includes(AUTHORIZATION_POINTER))
      .map(({ file }) => file)
      .sort()
  )
}

export function findUnmarkedReferenceDocs(entries) {
  return entries
    .filter(({ source }) => !source.startsWith(REFERENCE_MARKER) || !source.includes(REFERENCE_BANNER))
    .map(({ file }) => file)
    .sort()
}

export function corpusLayer(file) {
  if (file === 'AGENTS.md') return 'entry'
  if (file === 'CONTEXT.md' || file === 'ARCHITECTURE.md') return 'project'
  if (file.endsWith('AGENTS.md') || file.startsWith('docs/agents/') || file.startsWith('.agents/rules/'))
    return 'task-specific'
  if (file.startsWith('docs/adr/')) return 'adr'
  return null
}

// ADR 随决策数量增长，按文件设上限只约束 chunk 体量；研究记录是时点性参考，不设预算。
export function layerTotals(entries) {
  const totals = new Map()
  for (const { file, source } of entries) {
    const layer = corpusLayer(file)
    if (!layer || layer === 'adr') continue
    totals.set(layer, (totals.get(layer) ?? 0) + countNonWhitespace(source))
  }
  return totals
}

export function findBudgetViolations(entries, budget) {
  const layerLimits = budget.layers ?? {}
  const fileViolations = []
  for (const { file, source } of entries) {
    if (corpusLayer(file) !== 'adr') continue
    const size = countNonWhitespace(source)
    if (typeof budget.adrFile === 'number' && size > budget.adrFile)
      fileViolations.push({ file, size, limit: budget.adrFile })
  }
  const violations = []
  for (const [layer, size] of layerTotals(entries)) {
    const limit = layerLimits[layer]
    if (typeof limit !== 'number') violations.push({ layer, size, limit: null })
    else if (size > limit) violations.push({ layer, size, limit })
  }
  return [...violations, ...fileViolations]
}

// 墓碑式提及（「ADR-0009 已删除」）是合法修订记录；只报标题或本节声明层面的退役痕迹。
const RETIRED_SECTION = [/^#{1,6}\s+.*(?:已废止|已删除)/, /(?:本节|此节|该节|以下|以上)[^\n]{0,20}(?:已废止|已删除)/]

export function findRetiredAdrMarkers(entries) {
  const markers = []
  for (const { file, source } of entries) {
    if (!file.startsWith('docs/adr/')) continue
    source.split('\n').forEach((line, index) => {
      if (!RETIRED_SECTION.some(pattern => pattern.test(line))) return
      markers.push({ file, line: index + 1, phrase: line.includes('已废止') ? '已废止' : '已删除' })
    })
  }
  return markers
}

export function contentDigest(entries) {
  const hash = crypto.createHash('sha256')
  // 码元序而非 localeCompare：指纹要跨机器可复现，不能随 ICU/locale 改变文件顺序。
  for (const { file, source } of [...entries].sort((a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : 0))) {
    hash.update(file).update('\0').update(source).update('\0')
  }
  return hash.digest('hex').slice(0, 12)
}
