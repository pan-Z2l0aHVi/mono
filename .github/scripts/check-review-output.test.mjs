import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { shouldRejectReviewOutput } from './check-review-output.mjs'
import { coverageGap, parseReviewFindings } from './codex-review.mjs'

const scriptPath = path.join(import.meta.dirname, 'check-review-output.mjs')
const nonEmptyScope = { empty_diff: false, diff_bytes: 4096, changed_paths: ['packages/web-ui/src/button.ts'] }
const payload = value => (typeof value === 'string' ? value : JSON.stringify(value))
const nitFinding = {
  severity: 'Nit',
  file: 'packages/web-ui/src/button.ts',
  line: 12,
  problem: '深色态描边消失了',
  suggestion: '补一条 dark 下的 border-color'
}

const cases = [
  {
    name: 'empty shell',
    raw: { summary: '', coverage: { inspected: [], uncovered: [] }, findings: [] },
    expected: true
  },
  {
    name: 'coverage block absent',
    raw: { summary: 'ok', findings: [] },
    expected: true
  },
  {
    name: 'findings without a coverage block',
    raw: { summary: 'ok', findings: [nitFinding] },
    expected: true
  },
  {
    name: 'uncovered entries do not prove any file was inspected',
    raw: { summary: '', coverage: { inspected: [], uncovered: ['src/app.ts:1 not read'] }, findings: [] },
    expected: true
  },
  {
    name: 'only the rubric was inspected',
    raw: { summary: 'ok', coverage: { inspected: ['docs/agents/review.md'], uncovered: [] }, findings: [] },
    expected: true
  },
  {
    name: 'inspected hits a changed path',
    raw: {
      summary: 'ok',
      coverage: { inspected: ['./packages/web-ui/src/button.ts:42'], uncovered: [] },
      findings: []
    },
    expected: false
  },
  {
    name: 'findings with coverage',
    raw: { summary: 'ok', coverage: { inspected: ['src/app.ts'], uncovered: [] }, findings: [nitFinding] },
    expected: false
  },
  {
    name: 'empty diff is exempt',
    raw: { summary: 'generated only', coverage: { inspected: [], uncovered: [] }, findings: [] },
    scope: { empty_diff: true, diff_bytes: 0 },
    expected: false
  },
  { name: 'unparsable output belongs to validate', raw: '{not json', expected: false }
]

{
  for (const item of cases) {
    const raw = payload(item.raw)
    const scope = item.scope ?? nonEmptyScope
    assert.equal(shouldRejectReviewOutput(raw, scope), item.expected, item.name)
    // 与可信判据逐例对齐：guard 判红的集合必须恰好是 validate 判 missing_coverage 的集合，
    // 否则剩下的形态仍会落回「review 绿 / gate 红」，--failed 只重跑 gate。
    const validateGap = (() => {
      try {
        return coverageGap(parseReviewFindings(raw), scope) !== ''
      } catch {
        return false
      }
    })()
    assert.equal(shouldRejectReviewOutput(raw, scope), validateGap, `${item.name}: must agree with validate`)
  }
  assert.equal(
    shouldRejectReviewOutput(payload({ summary: '', coverage: { inspected: [], uncovered: [] }, findings: [] }), null),
    true,
    'a missing scope fails closed'
  )
}

function runCli({ output, scope, withScope = true }) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'check-review-output-'))
  const outputPath = path.join(directory, 'codex-final-message.json')
  const scopePath = path.join(directory, 'review-scope.json')
  if (output !== undefined) fs.writeFileSync(outputPath, payload(output))
  if (withScope) fs.writeFileSync(scopePath, JSON.stringify(scope ?? nonEmptyScope))
  const result = spawnSync(process.execPath, [scriptPath], {
    encoding: 'utf8',
    env: {
      ...process.env,
      CODEX_REVIEW_OUTPUT_PATH: outputPath,
      CODEX_REVIEW_SCOPE_PATH: scopePath
    }
  })
  fs.rmSync(directory, { recursive: true, force: true })
  return result
}

{
  // 端到端：空壳必须让 review job 一起变红，`--failed` 才会重跑模型 job。
  const empty = runCli({ output: { summary: '', coverage: { inspected: [], uncovered: [] }, findings: [] } })
  assert.equal(empty.status, 1, 'an empty conclusion must fail the review job')
  assert.match(empty.stderr, /rerun --failed/)

  const reviewed = runCli({
    output: { summary: 'ok', coverage: { inspected: ['packages/web-ui/src/button.ts'], uncovered: [] }, findings: [] }
  })
  assert.equal(reviewed.status, 0, 'a conclusion whose inspected hits a changed path is not rejected here')

  const emptyDiff = runCli({
    output: { summary: 'generated only', coverage: { inspected: [], uncovered: [] }, findings: [] },
    scope: { empty_diff: true, diff_bytes: 0 }
  })
  assert.equal(emptyDiff.status, 0, 'an empty diff is exempt')

  assert.equal(runCli({ output: undefined }).status, 0, 'a missing output file belongs to validate')
  assert.equal(runCli({ output: '{not json' }).status, 0, 'unparsable output belongs to validate')

  const missingScope = runCli({
    output: { summary: '', coverage: { inspected: [], uncovered: [] }, findings: [] },
    withScope: false
  })
  assert.equal(missingScope.status, 1, 'a missing scope fails closed instead of assuming an empty diff')
}

console.log('.github/scripts/check-review-output.test.mjs: all assertions passed')
