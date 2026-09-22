// 用法: node scripts/ci-flakes.mjs <artifact-dir> [--json]
//
// flake 榜的读端：把 CI 在失败时留下的 `test-failures.json`（见 .github/scripts/record-test-failures.mjs）
// 聚成「哪个测试在多少次运行里红过」。只读本地目录，不碰网络：
//
//   mkdir -p /tmp/flakes && cd /tmp/flakes
//   gh run download <run-id> --pattern 'ci-test-output-*'      # 每个失败 attempt 一个 run
//   pnpm run flakes:ci .
//
// 刻意不判断「重跑之后是否变绿」：那需要知道同一个 run 的后续 attempt 有没有留下 artifact，而留痕只在
// 失败时写，缺席本身携带不了信息。这份榜单只回答「谁反复红」，修、隔离还是加 retry 由人决定。
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { basename, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const FAILURE_FILE = 'test-failures.json'
// artifact 名带 run id 与 run attempt：`ci-test-output-<run-id>-<attempt>`。
const ARTIFACT_NAME = /^ci-test-output-(\d+)-(\d+)$/

export function walkFailuresFiles(dir) {
  const found = []

  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)

    if (statSync(full).isDirectory()) {
      found.push(...walkFailuresFiles(full))
    } else if (entry === FAILURE_FILE) {
      found.push(full)
    }
  }

  return found.sort()
}

// attempt 归属来自目录名而不是文件内容：留痕写的是「这一步看到了什么」，身份是 artifact 命名给的。
export function provenance(filePath, rootDir) {
  for (const segment of relative(rootDir, filePath).split('/')) {
    const match = segment.match(ARTIFACT_NAME)

    if (match) {
      return { runId: Number(match[1]), attempt: Number(match[2]) }
    }
  }

  return { runId: null, attempt: null }
}

export function readEntries(rootDir) {
  const entries = []

  for (const filePath of walkFailuresFiles(rootDir)) {
    const source = relative(rootDir, filePath).split('/').join('/')

    try {
      const parsed = JSON.parse(readFileSync(filePath, 'utf8'))

      if (!Array.isArray(parsed.failures)) {
        throw new Error('no failures array')
      }

      entries.push({ source, ...provenance(filePath, rootDir), failures: parsed.failures })
    } catch (error) {
      // 一个读不了的 artifact 不该让整份榜消失：记下来源与原因，其余照常统计。
      entries.push({ source, error: `unreadable: ${error.message}` })
    }
  }

  return entries
}

export function keyOf(failure) {
  // suite 级失败（文件根本没加载起来）没有测试名，按文件归并，否则每个 collect error 都会自成一行。
  return failure.test === null ? `${failure.file} [suite]` : `${failure.file} > ${failure.test}`
}

export function tally(entries) {
  const rows = new Map()

  for (const entry of entries) {
    for (const failure of entry.failures ?? []) {
      const key = keyOf(failure)

      if (!rows.has(key)) {
        rows.set(key, { key, file: failure.file, test: failure.test, kind: failure.kind, occurrences: [] })
      }
      rows.get(key).occurrences.push({ source: entry.source, runId: entry.runId, attempt: entry.attempt })
    }
  }

  return (
    [...rows.values()]
      .map(row => {
        const runs = new Set(row.occurrences.map(occurrence => occurrence.runId))

        return {
          key: row.key,
          file: row.file,
          test: row.test,
          kind: row.kind,
          runs: runs.size,
          occurrences: row.occurrences.length,
          sources: row.occurrences.map(occurrence => occurrence.source)
        }
      })
      // 先按「出现过几个不同的 run」排，再按 attempt 总数：同一 run 的两个 attempt 是 retry 出来的，
      // 只证明它红过两次，不如两个不同 run 都红过有说服力。
      .sort((a, b) => b.runs - a.runs || b.occurrences - a.occurrences || a.key.localeCompare(b.key))
  )
}

export function format(rows, entries) {
  const broken = entries.filter(entry => entry.error)
  const lines = []

  if (entries.length === 0) {
    lines.push(`no ${FAILURE_FILE} found under the given directory: nothing has failed since the ledger landed`)
  }

  lines.push(`${entries.length - broken.length} artifact(s) read, ${rows.length} distinct failing test(s)`)

  for (const row of rows) {
    lines.push(`  ${row.runs} run(s) / ${row.occurrences} attempt(s)  ${row.key}`)
  }

  for (const entry of broken) {
    lines.push(`  skipped ${entry.source}: ${entry.error}`)
  }

  return `${lines.join('\n')}\n`
}

export function parseArgs(argv) {
  const positional = []
  let json = false

  for (const entry of argv) {
    if (entry === '--json') {
      json = true
      continue
    }
    if (entry.startsWith('--')) {
      throw new Error(`unsupported argument: ${entry} (supported: --json)`)
    }
    positional.push(entry)
  }

  if (positional.length !== 1) {
    throw new Error('usage: ci-flakes.mjs <artifact-dir> [--json]')
  }

  return { dir: positional[0], json }
}

function main() {
  const { dir, json } = parseArgs(process.argv.slice(2))

  if (!existsSync(dir) || !statSync(dir).isDirectory()) {
    throw new Error(`not a directory: ${dir}`)
  }

  const entries = readEntries(dir)
  const rows = tally(entries)

  console.log(json ? JSON.stringify({ dir, entries, rows }, null, 2) : format(rows, entries))
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    main()
  } catch (error) {
    console.error(`ci-flakes: ${error.message}`)
    process.exitCode = 1
  }
}
