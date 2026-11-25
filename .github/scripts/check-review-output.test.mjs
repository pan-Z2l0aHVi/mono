import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { inspectReviewOutput, shouldRejectReviewOutput } from './check-review-output.mjs'
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
  { name: 'unparsable output is rejected so --failed reruns the review job', raw: '{not json', expected: true },
  {
    name: 'wrapped valid output passes after normalization',
    raw: [
      '<reasoning>先核对改动。</reasoning>',
      '```json',
      JSON.stringify({
        summary: 'ok',
        coverage: { inspected: ['packages/web-ui/src/button.ts'], uncovered: [] },
        findings: []
      }),
      '```'
    ].join('\n'),
    expected: false
  }
]

{
  for (const item of cases) {
    const raw = payload(item.raw)
    const scope = item.scope ?? nonEmptyScope
    assert.equal(shouldRejectReviewOutput(raw, scope), item.expected, item.name)
    // 与可信判据逐例对齐：guard 判红的集合必须恰好是 validate 判 unreviewed（unusable_output + missing_coverage）的集合，
    // 否则剩下的形态仍会落回「review 绿 / gate 红」，--failed 只重跑 gate。
    const validateRejected = (() => {
      try {
        return coverageGap(parseReviewFindings(raw), scope) !== ''
      } catch {
        return true
      }
    })()
    assert.equal(shouldRejectReviewOutput(raw, scope), validateRejected, `${item.name}: must agree with validate`)
  }
  assert.equal(
    inspectReviewOutput('{not json', nonEmptyScope).code,
    'unusable_output',
    'unparsable output must be classified as unusable_output'
  )
  assert.equal(
    inspectReviewOutput(
      payload({ summary: '', coverage: { inspected: [], uncovered: [] }, findings: [] }),
      nonEmptyScope
    ).code,
    'missing_coverage',
    'empty coverage must be classified as missing_coverage'
  )
  assert.equal(
    shouldRejectReviewOutput(payload({ summary: '', coverage: { inspected: [], uncovered: [] }, findings: [] }), null),
    true,
    'a missing scope fails closed'
  )
}

function runCli({ output, scope, meta, withScope = true }) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'check-review-output-'))
  const outputPath = path.join(directory, 'codex-final-message.json')
  const scopePath = path.join(directory, 'review-scope.json')
  const metaPath = path.join(directory, 'review-meta.json')
  if (output !== undefined) fs.writeFileSync(outputPath, payload(output))
  if (withScope) fs.writeFileSync(scopePath, JSON.stringify(scope ?? nonEmptyScope))
  if (meta !== undefined) fs.writeFileSync(metaPath, JSON.stringify(meta))
  const result = spawnSync(process.execPath, [scriptPath], {
    encoding: 'utf8',
    env: {
      ...process.env,
      CODEX_REVIEW_OUTPUT_PATH: outputPath,
      CODEX_REVIEW_SCOPE_PATH: scopePath,
      CODEX_REVIEW_META_PATH: metaPath
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

  assert.equal(runCli({ output: undefined }).status, 0, 'a missing output file without meta belongs to validate')
  const modelFailed = runCli({
    output: undefined,
    meta: { status: 'error', error_code: 'model_failed', error: 'the review step produced no output file' }
  })
  assert.equal(
    modelFailed.status,
    1,
    'model_failed must also fail the review job so --failed reruns the model leg instead of only the gate'
  )
  assert.match(modelFailed.stderr, /model_failed/)
  assert.match(modelFailed.stderr, /rerun --failed/)
  assert.equal(
    runCli({
      output: undefined,
      meta: { status: 'error', error_code: 'config_missing', error: 'CODEX_REVIEW_API_KEY is missing' }
    }).status,
    0,
    'non-model_failed error meta stays untouched by check-review-output'
  )
  const missingOutputUnreviewed = runCli({
    output: undefined,
    meta: { status: 'unreviewed', error_code: 'unusable_output', error: 'the review step produced no output file' }
  })
  assert.equal(
    missingOutputUnreviewed.status,
    1,
    'a missing output file classified by validate as unreviewed/unusable_output must fail the review job'
  )
  assert.match(missingOutputUnreviewed.stderr, /unusable_output/)

  const incrementalInvalid = runCli({
    output: { summary: 'ok', coverage: { inspected: ['packages/web-ui/src/button.ts'], uncovered: [] }, findings: [] },
    meta: {
      status: 'unreviewed',
      error_code: 'unusable_output',
      error: 'prior_resolutions must cover every prior finding'
    }
  })
  assert.equal(
    incrementalInvalid.status,
    1,
    'an incremental prior_resolutions failure recorded by validate must also fail the review job'
  )
  assert.match(incrementalInvalid.stderr, /prior_resolutions/)

  const unparsable = runCli({ output: '{not json' })
  assert.equal(unparsable.status, 1, 'unparsable output must also fail the review job so --failed reruns it')
  assert.match(unparsable.stderr, /unusable_output/)

  const missingScope = runCli({
    output: { summary: '', coverage: { inspected: [], uncovered: [] }, findings: [] },
    withScope: false
  })
  assert.equal(missingScope.status, 1, 'a missing scope fails closed instead of assuming an empty diff')
}

console.log('.github/scripts/check-review-output.test.mjs: all assertions passed')
