import crypto from 'node:crypto'
import path from 'node:path'

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

// 围栏代码块与行内 code 里的 `[label](target)` 不是链接：研究笔录常直接贴正则字面量
// （`/[?&](?:worker|raw)\b/`），朴素的行内链接模式会把 `[...](...)` 当成断链。
// 链接扫描前先剥掉这两类片段；剥掉后不再回报行号，所以偏移变化无碍。
//
// 逐行配对而不是一条跨行正则：CommonMark 的围栏只由**同字符、不短于开启行**的围栏行关闭，
// 混用 ``` 与 ~~~ 或 4 反引号里夹 ``` 都会让单条正则提前闭合，把代码泄漏成正文；
// 未闭合的围栏延续到文件尾，也要按这个语义剥。
const FENCE = /^ {0,3}(`{3,}|~{3,})/
const INLINE_CODE = /(`+)([\s\S]*?)\1/g

export function stripCodeSegments(source) {
  const kept = []
  /** @type {{ char: string, length: number } | null} */
  let fence = null
  for (const line of source.split('\n')) {
    const marker = FENCE.exec(line)
    if (fence) {
      // 关闭行必须只有围栏字符（允许行尾空格），且同字符、不短于开启行。
      const closes =
        marker &&
        marker[1][0] === fence.char &&
        marker[1].length >= fence.length &&
        !line.slice(marker[0].length).trim()
      if (closes) fence = null
      kept.push('')
      continue
    }
    // 反引号围栏的 info string 里不能再出现反引号（CommonMark），这种行不是围栏开启。
    if (marker && marker[1][0] === '`' && line.slice(marker[0].length).includes('`')) {
      kept.push(line)
      continue
    }
    if (marker) {
      fence = { char: marker[1][0], length: marker[1].length }
      kept.push('')
      continue
    }
    // 行内 code 按行剥：等长反引号串配对，`` ``a ` b`` `` 这种跨反引号写法也能整段消失。
    kept.push(line.replace(INLINE_CODE, ''))
  }
  return kept.join('\n')
}

// 链接 target 归一为 `{ location, fragment }`；返回 null 表示「不需要判定文件可触达性」：
//   - 远程与协议链接（http(s)、mailto、tel、vscode…）离线无法判定，域名失效也不是本仓漂移；
//   - 纯锚点（`#foo`）只指向本文件，不存在文件可达性问题；
//   - 只有 query 没有路径（`?raw`）同样是本文件派生，不是路径。
// `file.md?raw` 的 query 在文件系统上不存在：剥掉再判可达性，否则会报成断链。
// `[x](./a.md "标题")` 的 title 不是路径的一部分，按 CommonMark 在空白处截断（`<…>` 包裹的除外）。
export function parseLocalLinkTarget(raw) {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const angleEnd = trimmed.startsWith('<') ? trimmed.indexOf('>') : -1
  const spaceStart = trimmed.search(/\s/)
  const target = angleEnd >= 0 ? trimmed.slice(1, angleEnd) : spaceStart >= 0 ? trimmed.slice(0, spaceStart) : trimmed
  if (!target) return null
  if (/^[a-z][a-z0-9+.-]*:/i.test(target)) return null
  if (target.startsWith('#')) return null
  const hashIndex = target.indexOf('#')
  const fragment = hashIndex < 0 ? '' : target.slice(hashIndex + 1).trim()
  const beforeFragment = hashIndex < 0 ? target : target.slice(0, hashIndex)
  const queryIndex = beforeFragment.indexOf('?')
  const location = (queryIndex < 0 ? beforeFragment : beforeFragment.slice(0, queryIndex)).trim()
  return location ? { location, fragment } : null
}

// 从 `](` 之后的偏移读出一条行内链接的 destination。destination 里的括号是合法的
// （`./a_(b)/c.md`），正则的 `[^)]+` 会把路径切成半截，所以按平衡括号扫。
// 行内链接不跨行：到行尾仍未闭合，说明这不是一条完整链接——返回 null 跳过，
// 而不是把后文一并吞成 target。
export function readInlineLinkTarget(source, start) {
  let depth = 1
  let inAngle = false
  for (let index = start; index < source.length; index += 1) {
    const char = source[index]
    if (char === '\\') {
      index += 1
      continue
    }
    if (char === '\n') return null
    if (inAngle) {
      if (char === '>') inAngle = false
      continue
    }
    if (char === '<' && index === start) inAngle = true
    else if (char === '(') depth += 1
    else if (char === ')') {
      depth -= 1
      if (depth === 0) return source.slice(start, index)
    }
  }
  return null
}

// 相对 target 有两种解析习惯：按当前文件所在目录，或按仓库根。两者结果只在仓库根下的文档里相同，
// 更深的文档写 `docs/input.md` 会落到两个不同文件，换个查看器就跳错——所以非根文档必须显式 `./`、`../`。
// `.` 与 `..` 本身已经是显式的相对写法，不在此列。
export function isUnqualifiedRelativeTarget(location) {
  if (location === '.' || location === '..') return false
  if (location.startsWith('./') || location.startsWith('../')) return false
  return !path.posix.isAbsolute(location)
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
