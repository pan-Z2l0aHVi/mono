// 校验共享构建任务不携带宿主假设。
//
// apps/interweave/build/Taskfile.yml 会以 `common` 被 Windows 与 macOS 两侧 include，
// 因此它的每一条命令都会在 Windows runner 上执行；POSIX 绝对路径在那儿必然失败。
// 宿主专有的产物（例如 DMG 卷标图标）属于 build/<platform>/Taskfile.yml。
//
// 用法：node apps/interweave/scripts/check-build-tasks.mjs
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const sharedTaskfilePath = new URL('../build/Taskfile.yml', import.meta.url)

// cmds 列表项里的绝对路径 token：前一个字符是行首或空白，token 以 `/` 开头并至少含一层路径段
const absolutePathPattern = /(?:^|\s)\/[\w.@-]+(?:\/[\w.@-]+)*/g

function findAbsolutePaths(lines) {
  const findings = []
  let inCmds = false
  let cmdsIndent = 0

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    const indent = line.length - line.trimStart().length
    const trimmed = line.trim()

    if (trimmed === '') continue

    // 只审查 cmds 块；块内条目缩进大于 `cmds:`，遇到同级或更浅的键即结束
    if (inCmds && indent <= cmdsIndent) {
      inCmds = false
    }

    if (trimmed === 'cmds:') {
      inCmds = true
      cmdsIndent = indent
      continue
    }

    if (!inCmds || trimmed.startsWith('#')) continue

    for (const match of trimmed.matchAll(absolutePathPattern)) {
      findings.push({ line: index + 1, token: match[0].trim() })
    }
  }

  return findings
}

const lines = (await readFile(sharedTaskfilePath, 'utf8')).split(/\r?\n/)
const findings = findAbsolutePaths(lines)

if (findings.length > 0) {
  const report = findings.map(({ line, token }) => `  - line ${line}: ${token}`).join('\n')
  console.error(
    `Build task check: ${fileURLToPath(sharedTaskfilePath)} runs on every host, including Windows runners.\n` +
      `Move the darwin-only step into the matching build/<platform>/Taskfile.yml, or use a path relative to the task.\n` +
      `Offending absolute paths:\n${report}`
  )
  process.exit(1)
}

console.log('Build task check: shared Taskfile is host-neutral.')
