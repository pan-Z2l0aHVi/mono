import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { formatSummary, parseTestLog } from '../.github/scripts/record-test-failures.mjs'

// 断言用的日志是从真实输出里抄的：一条来自 GitHub runner（project 标签是 `browser (chromium)`，带
// ANSI），一条来自本地 `vp test run`（标签是 `chromium`）。判据必须对这两种形状同时成立，否则台账
// 会在某个 runner 上静默变空。
const escape = '\u001B'
const ciLog = [
  `${escape}[41m${escape}[1m FAIL ${escape}[22m${escape}[49m ${escape}[30m${escape}[42m browser (chromium) ${escape}[49m${escape}[39m src/components/editable-text/__tests__/editable-text.browser.spec.ts${escape}[2m > ${escape}[22mWebUiEditableText 布局契约（浏览器）${escape}[2m > ${escape}[22m同文案文字态/编辑态 overlay 逐像素一致`,
  ' FAIL   chromium  src/env/__tests__/zz-probe.spec.ts > probe suite > fails on purpose',
  ' FAIL   chromium  src/dom/__tests__/broken.spec.ts [ src/dom/__tests__/broken.spec.ts ]',
  ' FAIL   something without a spec path',
  `${escape}[2m Test Files ${escape}[22m ${escape}[1m${escape}[31m2 failed${escape}[39m${escape}[22m${escape}[2m | ${escape}[22m${escape}[1m${escape}[32m121 passed${escape}[39m${escape}[22m${escape}[90m (123)${escape}[39m`,
  '      Tests  1 failed | 117 passed (118)'
].join('\n')

const parsed = parseTestLog(ciLog)

assert.deepEqual(parsed.failures, [
  {
    project: 'browser (chromium)',
    file: 'src/components/editable-text/__tests__/editable-text.browser.spec.ts',
    test: 'WebUiEditableText 布局契约（浏览器） > 同文案文字态/编辑态 overlay 逐像素一致',
    kind: 'test'
  },
  {
    project: 'chromium',
    file: 'src/env/__tests__/zz-probe.spec.ts',
    test: 'probe suite > fails on purpose',
    kind: 'test'
  },
  {
    project: 'chromium',
    file: 'src/dom/__tests__/broken.spec.ts',
    test: null,
    kind: 'suite'
  }
])

assert.deepEqual(parsed.counts, { testfiles: '2 failed | 121 passed (123)', tests: '1 failed | 117 passed (118)' })

// 全通过的日志、以及完全读不出计数的日志，都不该凭空造出失败条目。
assert.deepEqual(
  parseTestLog(' ✓  src/a.spec.ts (3 tests)\n Test Files  1 passed (1)\n      Tests  3 passed (3)').failures,
  []
)
const empty = parseTestLog('turbo cache hit, nothing here')
assert.deepEqual(empty.failures, [])
assert.deepEqual(empty.counts, { testfiles: null, tests: null })

const summary = formatSummary(parsed)
assert.match(summary, /editable-text\.browser\.spec\.ts` — WebUiEditableText/)
assert.match(summary, /broken\.spec\.ts` — \(suite failed to load\)/)
assert.ok(!summary.includes('something without a spec path'), 'unparseable FAIL lines must not leak into the summary')
assert.match(formatSummary(empty, 'log missing'), /log missing/)
assert.match(formatSummary(empty), /No `FAIL` line was found/)

// CLI 形状就是 CI 用到的形状：位置参数决定日志与 JSON 落点，summary 走 $GITHUB_STEP_SUMMARY。
const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'greypan-record-failures-'))

try {
  const logPath = path.join(fixture, 'test-output.log')
  const jsonPath = path.join(fixture, 'failures.json')
  const summaryPath = path.join(fixture, 'step-summary.md')
  fs.writeFileSync(logPath, `${ciLog}\n`)
  fs.writeFileSync(summaryPath, '')

  const script = path.resolve(import.meta.dirname, '..', '.github', 'scripts', 'record-test-failures.mjs')
  const stdout = execFileSync(process.execPath, [script, logPath, jsonPath], {
    env: { ...process.env, GITHUB_STEP_SUMMARY: summaryPath },
    encoding: 'utf8'
  })

  assert.match(stdout, /3 failure line\(s\)/)
  assert.deepEqual(JSON.parse(fs.readFileSync(jsonPath, 'utf8')).failures.length, 3)
  assert.equal(fs.readFileSync(summaryPath, 'utf8'), summary)

  // 日志不存在时必须以成功退出并把原因写进 summary：留痕步骤不能把原始失败盖成第二个红色 step。
  fs.writeFileSync(summaryPath, '')
  const missing = path.join(fixture, 'does-not-exist.log')
  execFileSync(process.execPath, [script, missing, jsonPath], {
    env: { ...process.env, GITHUB_STEP_SUMMARY: summaryPath },
    encoding: 'utf8'
  })
  const written = fs.readFileSync(summaryPath, 'utf8')
  assert.match(written, /Could not read the captured test log/)
  assert.deepEqual(JSON.parse(fs.readFileSync(jsonPath, 'utf8')).failures, [])
} finally {
  fs.rmSync(fixture, { recursive: true, force: true })
}

console.log('scripts/record-test-failures.test.mjs: all assertions passed')
