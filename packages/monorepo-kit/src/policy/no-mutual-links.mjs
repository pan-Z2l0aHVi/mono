import fs from 'node:fs'
import path from 'node:path'

// 指令面链接方向守卫：完整扫描面与入口命名豁免见 docs/agents/agent-context.md「链接方向」。
// 互指图只解析行内 Markdown `[label](target)` 链接；引用式 `[label][id]` 不纳入既定判据。
export const name = 'no-mutual-links'

const ENTRY_NAME = /^[A-Z0-9_-]+\.md$/
const LINK = /(?<!!)\[[^\]]*\]\(([^)]*)\)/g

function walkMarkdown(root, directory, files) {
  const absolute = path.join(root, directory)
  if (!fs.existsSync(absolute)) return
  for (const entry of fs.readdirSync(absolute, { withFileTypes: true })) {
    const full = path.join(absolute, entry.name)
    if (entry.isDirectory()) {
      walkMarkdown(root, path.relative(root, full), files)
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.add(path.relative(root, full).split(path.sep).join('/'))
    }
  }
}

function walkAgentsFiles(root, directory, files) {
  const absolute = path.join(root, directory)
  if (!fs.existsSync(absolute)) return
  for (const entry of fs.readdirSync(absolute, { withFileTypes: true })) {
    const full = path.join(absolute, entry.name)
    if (entry.isDirectory()) walkAgentsFiles(root, path.relative(root, full), files)
    else if (entry.isFile() && entry.name === 'AGENTS.md')
      files.add(path.relative(root, full).split(path.sep).join('/'))
  }
}

function addIfFile(root, file, files) {
  if (fs.existsSync(path.join(root, file))) files.add(file)
}

function normalize(target) {
  const stack = []
  for (const segment of target.split('/')) {
    if (segment === '' || segment === '.') continue
    if (segment === '..') {
      if (stack.length > 0) stack.pop()
    } else {
      stack.push(segment)
    }
  }
  return stack.join('/')
}

function basename(file) {
  return file.slice(file.lastIndexOf('/') + 1)
}

function parseTarget(raw) {
  let target = raw.replace(/\s+/g, ' ').trim()
  if (target.startsWith('<')) target = target.slice(1).replace(/>.*$/, '')
  else target = target.replace(/\s.*$/, '')
  if (!target) return null
  if (/^(?:https?:|mailto:|#)/.test(target) || target.startsWith('/')) return null
  target = target.replace(/#.*$/, '')
  return target || null
}

function collectFiles(root) {
  const files = new Set()
  for (const file of ['AGENTS.md', 'CLAUDE.md', 'CONTEXT.md', 'ARCHITECTURE.md', 'CONTRIBUTING.md'])
    addIfFile(root, file, files)
  for (const directory of ['docs/agents', 'docs/adr', '.agents']) walkMarkdown(root, directory, files)
  addIfFile(root, 'skills/README.md', files)

  let locked
  try {
    locked = new Set(Object.keys(JSON.parse(fs.readFileSync(path.join(root, 'skills-lock.json'), 'utf8')).skills))
  } catch {
    throw new Error('cannot run: skills-lock.json is missing or unreadable')
  }

  // `.agents/skills-vendored` 中锁定上游件不属于本仓语料；其他 .agents Markdown 保留。
  // 边遍历边删除是 Set 迭代器的定义行为：删掉当前条目不影响后续访问，所以不需要先复制一份。
  for (const file of files) {
    const parts = file.split('/')
    if (parts[0] === '.agents' && parts[1] === 'skills-vendored' && locked.has(parts[2])) files.delete(file)
  }

  // 根 skills/ 的 README 是独立门面；skill 正文按消费面 `.agents/skills/` 归一，跳过锁定上游件。
  const skillFiles = new Set()
  walkMarkdown(root, 'skills', skillFiles)
  for (const file of skillFiles) {
    const match = /^skills\/([^/]+)\/(.+)$/.exec(file)
    if (match && !locked.has(match[1])) files.add(`.agents/skills/${match[1]}/${match[2]}`)
  }

  for (const directory of ['packages', 'apps']) {
    walkAgentsFiles(root, directory, files)
    const absolute = path.join(root, directory)
    if (!fs.existsSync(absolute)) continue
    for (const entry of fs.readdirSync(absolute, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue
      addIfFile(root, `${directory}/${entry.name}/README.md`, files)
    }
  }

  return [...files].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
}

export async function run({ root }) {
  const files = collectFiles(root)
  if (files.length === 0) throw new Error('cannot run: instruction scan found 0 Markdown files')

  const known = new Set(files)
  const edges = new Set()
  const ruleEdges = new Set()

  for (const source of files) {
    const actual = source.startsWith('.agents/skills/') ? `skills/${source.slice('.agents/skills/'.length)}` : source
    let text
    try {
      text = fs.readFileSync(path.join(root, actual), 'utf8')
    } catch {
      throw new Error(`cannot read scan entry: ${source}`)
    }
    for (const match of text.matchAll(LINK)) {
      const target = parseTarget(match[1])
      if (!target) continue
      const directory = source.includes('/') ? source.slice(0, source.lastIndexOf('/')) : '.'
      const resolved = normalize(`${directory}/${target}`)
      if (!known.has(resolved)) continue
      edges.add(`${source}\u0000${resolved}`)
      if (source.startsWith('docs/agents/') && resolved.startsWith('.agents/rules/'))
        ruleEdges.add(`${source}\u0000${resolved}`)
    }
  }

  if (edges.size === 0) throw new Error('cannot run: instruction scan found 0 local Markdown links')

  const violations = []
  for (const key of ruleEdges) {
    const [source, target] = key.split('\u0000')
    violations.push(`docs-to-rules link forbidden: ${source} -> ${target}`)
  }
  for (const key of edges) {
    const [source, target] = key.split('\u0000')
    if (source >= target || !edges.has(`${target}\u0000${source}`)) continue
    if (ENTRY_NAME.test(basename(source)) || ENTRY_NAME.test(basename(target))) continue
    violations.push(`mutual links forbidden: ${source} <-> ${target}`)
  }
  violations.sort()
  if (violations.length > 0) throw new Error(violations.join('\n'))

  return `${files.length} Markdown files, ${edges.size} local edges`
}
