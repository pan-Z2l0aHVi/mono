import fs from 'node:fs'
import path from 'node:path'

export interface CorpusFile {
  /** 语料内逻辑路径（POSIX 相对路径）：链接解析与方向判定都以它为准 */
  readonly path: string
  /** 仓库根下的真实相对路径（POSIX）：镜像面的逻辑路径与磁盘路径不同 */
  readonly file: string
}

export interface InlineLink {
  readonly rawTarget: string
  readonly location: string
  readonly fragment: string
}

export interface ExtractInlineLinksOptions {
  /** 是否保留以 `/` 开头的仓库根相对链接；默认 `true` */
  readonly allowRootRelative?: boolean
}

export function relativePosix(root: string, file: string): string {
  return (path.relative(root, file) || '.').split(path.sep).join('/')
}

export function walkFiles(
  root: string,
  directory: string,
  predicate: (absoluteFile: string) => boolean = () => true
): string[] {
  const absolute = path.join(root, directory)
  if (!fs.existsSync(absolute)) return []
  const files: string[] = []
  for (const entry of fs.readdirSync(absolute, { withFileTypes: true })) {
    const file = path.join(absolute, entry.name)
    if (entry.isDirectory()) files.push(...walkFiles(root, path.relative(root, file), predicate))
    else if (predicate(file)) files.push(file)
  }
  return files
}

function collectNamedRecursive(
  root: string,
  directory: string,
  names: ReadonlySet<string>,
  entries: CorpusFile[]
): void {
  const absolute = path.join(root, directory)
  if (!fs.existsSync(absolute)) return
  for (const entry of fs.readdirSync(absolute, { withFileTypes: true })) {
    const relative = `${directory}/${entry.name}`
    if (entry.isDirectory()) {
      collectNamedRecursive(root, relative, names, entries)
    } else if (entry.isFile() && names.has(entry.name)) {
      entries.push({ path: relative, file: relative })
    }
  }
}

/**
 * 收集 workspace 根目录下的指令面文件：
 * - `deep`：递归收集匹配文件名；
 * - `shallow`：若目录自身是包（含 `package.json`），只收其根部；否则只收直接子目录，不递归。
 */
export function collectWorkspaceFiles(
  root: string,
  directory: string,
  options: { readonly deep?: readonly string[]; readonly shallow?: readonly string[] }
): CorpusFile[] {
  const entries: CorpusFile[] = []
  if (options.deep && options.deep.length > 0) {
    collectNamedRecursive(root, directory, new Set(options.deep), entries)
  }
  const shallow = options.shallow ?? []
  if (shallow.length > 0) {
    const absolute = path.join(root, directory)
    if (fs.existsSync(path.join(absolute, 'package.json'))) {
      for (const name of shallow) {
        const file = `${directory}/${name}`
        if (fs.existsSync(path.join(root, file))) entries.push({ path: file, file })
      }
    } else if (fs.existsSync(absolute)) {
      for (const entry of fs.readdirSync(absolute, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue
        for (const name of shallow) {
          const file = `${directory}/${entry.name}/${name}`
          if (fs.existsSync(path.join(root, file))) entries.push({ path: file, file })
        }
      }
    }
  }
  return entries
}

/**
 * 将 `entity` 目录下非锁定的 skill Markdown 映射回消费面 `surface` 路径，跳过实体根下的门面文档。
 */
export function collectMirrorFiles(
  root: string,
  options: {
    readonly entity: string
    readonly surface: string
    readonly isLocked: (skillName: string) => boolean
  }
): CorpusFile[] {
  const prefix = `${options.entity}/`
  const results: CorpusFile[] = []
  for (const absolute of walkFiles(root, options.entity, file => file.endsWith('.md'))) {
    const file = relativePosix(root, absolute)
    if (!file.startsWith(prefix)) continue
    const relative = file.slice(prefix.length)
    if (!relative.includes('/')) continue
    const skillName = relative.slice(0, relative.indexOf('/'))
    if (options.isLocked(skillName)) continue
    results.push({ path: `${options.surface}/${relative}`, file })
  }
  return results
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

export function stripCodeSegments(source: string): string {
  const kept: string[] = []
  let fence: { char: string; length: number } | null = null
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
export function parseLocalLinkTarget(rawTarget: string): { location: string; fragment: string } | null {
  const trimmed = rawTarget.trim()
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
export function readInlineLinkTarget(source: string, startIndex: number): string | null {
  let depth = 1
  let inAngle = false
  for (let index = startIndex; index < source.length; index += 1) {
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
    if (char === '<' && index === startIndex) inAngle = true
    else if (char === '(') depth += 1
    else if (char === ')') {
      depth -= 1
      if (depth === 0) return source.slice(startIndex, index)
    }
  }
  return null
}

// 相对 target 有两种解析习惯：按当前文件所在目录，或按仓库根。两者结果只在仓库根下的文档里相同，
// 更深的文档写 `docs/input.md` 会落到两个不同文件，换个查看器就跳错——所以非根文档必须显式 `./`、`../`。
// `.` 与 `..` 本身已经是显式的相对写法，不在此列。
export function isUnqualifiedRelativeTarget(rawTarget: string): boolean {
  if (rawTarget === '.' || rawTarget === '..') return false
  if (rawTarget.startsWith('./') || rawTarget.startsWith('../')) return false
  return !path.posix.isAbsolute(rawTarget)
}

const INLINE_LINK_START = /(?<!!)\[[^\]]*\]\(/g

/**
 * 剥离围栏代码块与行内 code 后扫描行内 Markdown 链接（忽略 `![]()` 图片语法），
 * 使用平衡括号读取 destination 并归一本地 target。
 */
export function extractInlineLinks(source: string, options: ExtractInlineLinksOptions = {}): InlineLink[] {
  const allowRootRelative = options.allowRootRelative ?? true
  const stripped = stripCodeSegments(source)
  const links: InlineLink[] = []
  for (const match of stripped.matchAll(INLINE_LINK_START)) {
    const raw = readInlineLinkTarget(stripped, match.index + match[0].length)
    if (raw === null) continue
    const rawTarget = raw.trim()
    const parsed = parseLocalLinkTarget(rawTarget)
    if (!parsed) continue
    if (!allowRootRelative && parsed.location.startsWith('/')) continue
    links.push({ rawTarget, location: parsed.location, fragment: parsed.fragment })
  }
  return links
}

/**
 * Markdown 节标题转 GitHub 风格 anchor：小写、去标点、空格转 `-`、折叠连续/首尾 `-`。
 */
export function ghAnchor(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/[^\p{Alphabetic}\p{N}\s-]/gu, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * 提取 Markdown 文档中的所有节级锚点；显式 `{#name}` 优先于 GitHub 风格标题推导。
 */
export function extractMarkdownAnchors(source: string): ReadonlySet<string> {
  const anchors = new Set<string>()
  for (const match of source.matchAll(/^#{1,6}\s+(.*)$/gm)) {
    const heading = match[1].trim()
    const explicit = /^(.+?)\s*\{#([^}]+)\}$/.exec(heading)
    anchors.add(explicit ? explicit[2].trim() : ghAnchor(heading))
  }
  return anchors
}
