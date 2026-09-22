import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { format, keyOf, parseArgs, provenance, readEntries, tally, walkFailuresFiles } from './ci-flakes.mjs'

// 台账的读端必须能吃到 `gh run download` 的原样布局：每个 artifact 解到同名目录里，run id 与 attempt
// 只写在目录名上。fixture 的形状就是 .github/scripts/record-test-failures.mjs 真正写出的那份 JSON。
const flaky = { project: 'chromium', file: 'src/dom/__tests__/editor.spec.ts', test: 'paste 后保留选区', kind: 'test' }
const other = { project: 'chromium', file: 'src/env/__tests__/probe.spec.ts', test: 'fails on purpose', kind: 'test' }
const suite = { project: 'node', file: 'src/loader/__tests__/broken.spec.ts', test: null, kind: 'suite' }

function ledger(failures) {
  return `${JSON.stringify({ counts: { testfiles: '1 failed | 9 passed (10)', tests: null }, failures }, null, 2)}\n`
}

assert.equal(keyOf(flaky), `${flaky.file} > ${flaky.test}`)
assert.equal(keyOf(suite), `${suite.file} [suite]`)

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'greypan-ci-flakes-'))
const put = (dir, name, text) => {
  const full = path.join(root, dir)
  fs.mkdirSync(full, { recursive: true })
  fs.writeFileSync(path.join(full, name), text)
}

put('ci-test-output-101-1', 'test-failures.json', ledger([flaky, other]))
put('ci-test-output-101-2', 'test-failures.json', ledger([flaky]))
put('ci-test-output-202-1', 'test-failures.json', ledger([flaky, suite]))
put('nested/ci-test-output-303-1', 'test-failures.json', ledger([flaky]))
// 没有 artifact 命名的祖先目录时，仍然统计，只是给不出 attempt 归属。
put('flat', 'test-failures.json', ledger([other]))
put('ci-test-output-404-1', 'test-failures.json', '{ this is not json')

try {
  const files = walkFailuresFiles(root)
  assert.equal(files.length, 6, 'every test-failures.json below the root must be found')
  assert.ok(files.every(file => file.endsWith(`${path.sep}test-failures.json`)))

  assert.deepEqual(provenance(path.join(root, 'nested/ci-test-output-303-1/test-failures.json'), root), {
    runId: 303,
    attempt: 1
  })
  assert.deepEqual(provenance(path.join(root, 'flat/test-failures.json'), root), { runId: null, attempt: null })

  const entries = readEntries(root)
  assert.equal(entries.length, 6)
  const broken = entries.filter(entry => entry.error)
  assert.equal(broken.length, 1)
  assert.equal(broken[0].source, path.join('ci-test-output-404-1', 'test-failures.json'))
  assert.match(broken[0].error, /^unreadable: /)
  // 坏文件必须被点名但不吞掉同伴：它的兄弟 artifact 照常解析。
  assert.ok(
    entries.find(entry => entry.source === path.join('ci-test-output-202-1', 'test-failures.json'))?.failures.length ===
      2
  )

  const rows = tally(entries)
  assert.deepEqual(
    rows.map(row => [row.key, row.runs, row.occurrences]),
    [
      // 101 的两个 attempt 只算一个 run：retry 变红两次，不如两个不同 run 都红过。
      [`${flaky.file} > ${flaky.test}`, 3, 4],
      [`${other.file} > ${other.test}`, 2, 2],
      [`${suite.file} [suite]`, 1, 1]
    ],
    'ranked by distinct runs, then attempts'
  )
  assert.deepEqual(rows[0].sources, [
    path.join('ci-test-output-101-1', 'test-failures.json'),
    path.join('ci-test-output-101-2', 'test-failures.json'),
    path.join('ci-test-output-202-1', 'test-failures.json'),
    path.join('nested', 'ci-test-output-303-1', 'test-failures.json')
  ])

  const printed = format(rows, entries)
  assert.match(printed, /^5 artifact\(s\) read, 3 distinct failing test\(s\)$/m)
  assert.match(printed, /  3 run\(s\) \/ 4 attempt\(s\)  src\/dom\/__tests__\/editor\.spec\.ts > paste 后保留选区\n/)
  assert.match(printed, /skipped ci-test-output-404-1[\\/]test-failures\.json: unreadable: /)

  const empty = fs.mkdtempSync(path.join(os.tmpdir(), 'greypan-ci-flakes-empty-'))
  try {
    const nothing = readEntries(empty)
    assert.deepEqual(nothing, [])
    assert.match(format([], nothing), /no test-failures\.json found under the given directory/)
  } finally {
    fs.rmSync(empty, { recursive: true, force: true })
  }

  const script = path.resolve(import.meta.dirname, 'ci-flakes.mjs')
  assert.match(execFileSync(process.execPath, [script, root], { encoding: 'utf8' }), /3 distinct failing test\(s\)/)
  assert.match(execFileSync(process.execPath, [script, root, '--json'], { encoding: 'utf8' }), /"runs": 3/)

  // 参数错了要说清楚，不能默默输出一份空榜单：路径不存在、参数个数不对、未知旗标都是退出码 1。
  const cases = [
    { args: [path.join(root, 'nope')], expect: /^ci-flakes: not a directory: /m },
    { args: [root, root], expect: /^ci-flakes: usage: ci-flakes\.mjs/m },
    { args: ['--nope', root], expect: /^ci-flakes: unsupported argument: --nope/m }
  ]

  for (const { args, expect } of cases) {
    let result

    try {
      execFileSync(process.execPath, [script, ...args], { encoding: 'utf8', stdio: 'pipe' })
      result = { status: 0, stderr: '' }
    } catch (error) {
      result = { status: error.status, stderr: String(error.stderr) }
    }

    assert.equal(result.status, 1, `${args.join(' ')} must not exit 0`)
    assert.match(result.stderr, expect, `${args.join(' ')} stderr`)
  }
} finally {
  fs.rmSync(root, { recursive: true, force: true })
}

// 写端与读端的 schema 得由同一个测试钉住：`record-test-failures.mjs` 一旦改名 `failures` 或不再区分
// `test: null`，这里不会报错，只会交出一份永远为空的榜单。
const bridge = fs.mkdtempSync(path.join(os.tmpdir(), 'greypan-ci-flakes-bridge-'))

try {
  const artifactDir = path.join(bridge, 'ci-test-output-555-1')
  fs.mkdirSync(artifactDir)
  const logPath = path.join(bridge, 'test-output.log')
  fs.writeFileSync(
    logPath,
    [
      ' FAIL   chromium  src/env/__tests__/probe.spec.ts > probe suite > fails on purpose',
      ' FAIL   node  src/loader/__tests__/broken.spec.ts [ src/loader/__tests__/broken.spec.ts ]'
    ].join('\n')
  )

  const recorder = path.resolve(import.meta.dirname, '..', '.github', 'scripts', 'record-test-failures.mjs')
  execFileSync(process.execPath, [recorder, logPath, path.join(artifactDir, 'test-failures.json')], {
    encoding: 'utf8',
    // 清掉 CI 环境：本地跑时如果被赋值了，写端会往 step summary 追加内容。
    env: { ...process.env, GITHUB_STEP_SUMMARY: '' },
    stdio: 'pipe'
  })

  assert.deepEqual(
    tally(readEntries(bridge)).map(row => row.key),
    ['src/env/__tests__/probe.spec.ts > probe suite > fails on purpose', 'src/loader/__tests__/broken.spec.ts [suite]'],
    'failures written by the recorder must be readable by this aggregator'
  )
} finally {
  fs.rmSync(bridge, { recursive: true, force: true })
}

assert.deepEqual(parseArgs(['dir']), { dir: 'dir', json: false })
assert.deepEqual(parseArgs(['dir', '--json']), { dir: 'dir', json: true })
assert.throws(() => parseArgs([]), /usage: ci-flakes\.mjs/)
assert.throws(() => parseArgs(['a', 'b']), /usage: ci-flakes\.mjs/)
assert.throws(() => parseArgs(['--days=3', 'a']), /unsupported argument: --days=3/)

console.log('scripts/ci-flakes.test.mjs: all assertions passed')
