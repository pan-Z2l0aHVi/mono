// 用法: node .github/scripts/record-test-failures.mjs <test-log> <failures-json>
//
// CI 的 Test step 把输出 tee 到 $RUNNER_TEMP，失败时由 `if: failure()` 的后处理步骤调用这里：抽
// vitest 的 FAIL 行写进 step summary，并落一份 JSON 给保留 1 天的 artifact。
//
// 这里刻意不改判据、不重试：旧 attempt 的日志在 GitHub 侧事后拿不到，所以台账必须先开始积累，
// 有了榜单再决定修、隔离还是加重试。日志解析是尽力而为，真正的原始证据是那份 artifact。
import { appendFile, readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const ansi = /\x1B\[[0-9;]*m/g
// `FAIL` 行的形状在 CI 与本地不同：project 标签可能是 `chromium`，也可能是 `browser (chromium)`；
// 结尾可能是 ` > suite > test`（用例失败），也可能是 ` [ <file> ]`（整个 suite 加载失败）。
// 所以只锚定「FAIL 前缀 + spec 路径」，其余按路径前后的残片判断，而不是枚举标签。
const specPath = /(?<file>\S+\.(?:spec|test)\.\w+)(?<tail>.*)$/

export function parseTestLog(text) {
  const plain = text.replace(ansi, '')
  const failures = []

  for (const line of plain.split(/\r?\n/)) {
    // vitest 把 `FAIL` 打印成带前后空格的 badge，去掉 ANSI 后行首仍有空格。
    const fail = line.match(/^\s*FAIL\s+(.*)$/)
    if (!fail) {
      continue
    }

    const rest = fail[1].trim()
    const spec = rest.match(specPath)
    if (!spec) {
      continue
    }

    const tail = spec.groups.tail.trim()
    const testName = tail.startsWith('>') ? tail.slice(1).trim() : null

    failures.push({
      project: rest.slice(0, spec.index).trim() || null,
      file: spec.groups.file,
      test: testName,
      kind: testName === null ? 'suite' : 'test'
    })
  }

  const counts = {}
  for (const label of ['Test Files', 'Tests']) {
    const match = plain.match(new RegExp(`^\\s*${label}\\s+(.*)$`, 'm'))
    counts[label.toLowerCase().replace(' ', '')] = match ? match[1].trim() : null
  }

  return { counts, failures }
}

export function formatSummary({ counts, failures }, note) {
  const lines = ['## Test failures (best-effort)', '']

  if (note) {
    lines.push(`> ${note}`, '')
  }

  lines.push(`- Test Files: ${counts.testfiles ?? 'not reported'}`, `- Tests: ${counts.tests ?? 'not reported'}`, '')

  if (failures.length === 0) {
    lines.push(
      'No `FAIL` line was found in the captured log. The failure happened outside the test task; read the uploaded log.',
      ''
    )
  } else {
    for (const failure of failures) {
      const project = failure.project ? `\`${failure.project}\` ` : ''
      const target = failure.test ?? '(suite failed to load)'
      lines.push(`- ${project}\`${failure.file}\` — ${target}`)
    }
    lines.push('')
  }

  lines.push('原始日志与机器可读清单在 `ci-test-output-*` artifact 里，保留 1 天；那里才是判据来源。')
  return `${lines.join('\n')}\n`
}

// 同一个文件既是 CI 里跑的 CLI，也是 scripts/record-test-failures.test.mjs 导入的解析模块，所以入口
// 要按「是否被直接执行」来判断 —— 否则 import 就会去读不存在的位置参数。
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [logPath, jsonPath] = process.argv.slice(2)

  if (!logPath || !jsonPath) {
    console.error('usage: record-test-failures.mjs <test-log> <failures-json>')
    process.exit(1)
  }

  let result
  let note = null

  try {
    result = parseTestLog(await readFile(logPath, 'utf8'))
  } catch (error) {
    // 留痕步骤自己不能把原始失败盖过去：读不到日志就写清楚，并以成功退出。
    note = `Could not read the captured test log: ${error.message}`
    result = { counts: { testfiles: null, tests: null }, failures: [] }
  }

  await writeFile(jsonPath, `${JSON.stringify(result, null, 2)}\n`)

  if (process.env.GITHUB_STEP_SUMMARY) {
    await appendFile(process.env.GITHUB_STEP_SUMMARY, formatSummary(result, note))
  }

  console.log(`record-test-failures: ${result.failures.length} failure line(s)`)
}
