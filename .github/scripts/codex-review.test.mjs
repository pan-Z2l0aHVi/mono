import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import {
  AUTO_RETRY_LIMIT,
  AUTO_RETRY_STATES,
  CONFIG_ENV,
  CONFIG_FILE,
  CONCLUSION_MARKER,
  FINDINGS_ARTIFACT,
  PRELOAD_END_MARKER,
  PRELOAD_FILE,
  PRELOAD_MAX_FILES,
  PRELOAD_MAX_PATHS,
  PRELOAD_PER_FILE_BYTES,
  PRELOAD_START_MARKER,
  PRELOAD_TOTAL_DIFF_BYTES,
  REVIEW_EXCLUDE_PATHSPECS,
  RISK_TIERS,
  autoRetryDecision,
  buildReviewPreload,
  classifyPathRisk,
  commandAutoRetry,
  commandPrepare,
  createGhReviewAdapter,
  deriveConclusion,
  findPullForHead,
  findReusableRun,
  injectPreloadIntoPrompt,
  inspectConfig,
  normalizeAutoRetryState,
  parseReviewFindings,
  preloadPath,
  rankChangedPaths,
  readConclusion,
  renderConclusion,
  resolveAutoRetryState,
  resolveReviewRange,
  reviewTarget,
  scopePath,
  splitDiffByPath,
  truncateUtf8ByLines,
  trustedPromptPath,
  withPermissionDiagnosis,
  wrapCodeFence
} from './codex-review.mjs'
import { SPAWN_MAX_BUFFER, run } from './lib/github.mjs'
import { RELEASE_BRANCH } from './lib/workflow-topology.mjs'

const headSha = 'a'.repeat(40)
const otherSha = 'b'.repeat(40)
const scriptPath = path.join(import.meta.dirname, 'codex-review.mjs')
const configFingerprint = '0123456789abcdef'
const configuredEnv = Object.fromEntries(CONFIG_ENV.map(name => [name, `value-for-${name}`]))

function writeConfig(directory) {
  fs.writeFileSync(
    path.join(directory, CONFIG_FILE),
    JSON.stringify({
      endpoint: 'https://responses.example.test/v1/responses',
      model: 'configured-model',
      effort: 'configured-effort',
      version: 'configured-version',
      key_present: true,
      fingerprint: configFingerprint
    })
  )
}

function finding(severity) {
  return {
    severity,
    file: 'packages/web-ui/src/button.ts',
    line: 12,
    problem: '深色态描边消失了',
    suggestion: '补一条 dark 下的 border-color'
  }
}

function conclusionText(...severities) {
  return JSON.stringify({ summary: '改动整体可用。', findings: severities.map(finding) })
}

function parsedConclusion(...severities) {
  return parseReviewFindings(conclusionText(...severities))
}

function metaOf(overrides = {}) {
  return {
    head_sha: headSha,
    base_sha: otherSha,
    merge_base_sha: otherSha,
    model: 'configured-model',
    effort: 'configured-effort',
    config_fingerprint: configFingerprint,
    status: 'reviewed',
    ...overrides
  }
}

function writeFixtures(directory, conclusion = conclusionOf('Block'), meta = metaOf()) {
  fs.mkdirSync(directory, { recursive: true })
  fs.writeFileSync(path.join(directory, 'review-findings.json'), JSON.stringify(conclusion))
  fs.writeFileSync(path.join(directory, 'review-meta.json'), JSON.stringify(meta))
}

function conclusionOf(...severities) {
  return {
    summary: '改动整体可用。',
    coverage: { inspected: ['packages/monorepo-kit/src/runner/runner.ts'], uncovered: [] },
    findings: severities.map(finding)
  }
}

{
  const parsed = parsedConclusion('Block', 'Nit')
  assert.deepEqual(parsed.counts, { Block: 1, 'Should fix': 0, Nit: 1 })
  assert.equal(parsed.summary, '改动整体可用。')
  assert.deepEqual(parseReviewFindings('{"summary":"ok","findings":[]}').findings, [])
  assert.deepEqual(parseReviewFindings('{"summary":"ok","findings":[]}').counts, {
    Block: 0,
    'Should fix': 0,
    Nit: 0
  })

  // summary 只进评论的摘要行：缺了它不能让整份 findings 作废（真实 run 上模型给过空串）。
  for (const [label, raw] of [
    ['missing summary', JSON.stringify({ findings: [finding('Should fix')] })],
    ['empty summary', JSON.stringify({ summary: '', findings: [finding('Should fix')] })],
    ['blank summary', JSON.stringify({ summary: '  \n ', findings: [finding('Should fix')] })],
    ['non-string summary', JSON.stringify({ summary: null, findings: [finding('Should fix')] })]
  ]) {
    const tolerant = parseReviewFindings(raw)
    assert.equal(tolerant.summary, '', label)
    assert.equal(tolerant.findings.length, 1, label)
    assert.deepEqual(tolerant.counts, { Block: 0, 'Should fix': 1, Nit: 0 }, label)
  }
}

for (const [label, value] of [
  ['non JSON', 'not json'],
  ['array root', '[]'],
  ['missing findings', JSON.stringify({ summary: 'ok' })],
  ['findings not an array', JSON.stringify({ summary: 'ok', findings: {} })],
  ['unknown severity', JSON.stringify({ summary: 'ok', findings: [{ ...finding('Block'), severity: 'Must fix' }] })],
  ['unknown field', JSON.stringify({ summary: 'ok', findings: [{ ...finding('Block'), extra: 1 }] })],
  [
    'missing field',
    JSON.stringify({ summary: 'ok', findings: [{ severity: 'Block', file: '', line: 0, problem: 'x' }] })
  ],
  ['negative line', JSON.stringify({ summary: 'ok', findings: [{ ...finding('Block'), line: -1 }] })],
  ['fractional line', JSON.stringify({ summary: 'ok', findings: [{ ...finding('Block'), line: 1.5 }] })],
  ['empty problem', JSON.stringify({ summary: 'ok', findings: [{ ...finding('Block'), problem: '  ' }] })]
]) {
  assert.throws(() => parseReviewFindings(value), /./, label)
}

{
  const calls = []
  const command = (name, args) => {
    calls.push([name, ...args])
    if (args[0] === 'merge-base') return `${otherSha}\n`
    if (args[0] === 'diff' && args.includes('--name-only')) return 'src/a.ts\u0000docs/b.md\u0000'
    if (args[0] === 'diff') return 'diff --git a/x b/x\n'
    return ''
  }
  const range = resolveReviewRange({ baseSha: otherSha, headSha, command })
  assert.deepEqual(range, {
    baseSha: otherSha,
    headSha,
    mergeBaseSha: otherSha,
    diff: 'diff --git a/x b/x\n',
    changedPaths: ['src/a.ts', 'docs/b.md']
  })
  // 期望值写在测试里，不从实现常量展开：过滤清单变了，这两条断言必须一起红。
  const excluded = [
    ':(exclude,glob)**/generated/**',
    ':(exclude,glob)apps/*/frontend/bindings/**',
    ':(exclude,glob)**/routeTree.gen.ts',
    ':(exclude,glob)**/typed-router.d.ts',
    ':(exclude,glob)**/auto-imports.d.ts',
    ':(exclude,glob)packages/web-ui/src/icons/index.ts'
  ]
  assert.deepEqual(calls, [
    ['git', 'cat-file', '-e', `${otherSha}^{commit}`],
    ['git', 'cat-file', '-e', `${headSha}^{commit}`],
    ['git', 'merge-base', otherSha, headSha],
    ['git', 'diff', '--no-color', otherSha, headSha, '--', ...excluded],
    ['git', 'diff', '--name-only', '-z', otherSha, headSha, '--', ...excluded]
  ])
  assert.deepEqual([...REVIEW_EXCLUDE_PATHSPECS], excluded)
  assert.throws(() => resolveReviewRange({ baseSha: 'main', headSha, command }), /PR base SHA/)
  const missing = []
  const fetchOnDemand = (name, args) => {
    missing.push([name, ...args])
    if (args[0] === 'cat-file') throw new Error('not found')
    if (args[0] === 'merge-base') return `${otherSha}\n`
    if (args[0] === 'diff') return 'diff\n'
    return ''
  }
  assert.equal(resolveReviewRange({ baseSha: otherSha, headSha, command: fetchOnDemand }).mergeBaseSha, otherSha)
  assert.deepEqual(
    missing.filter(([, ...args]) => args[0] === 'fetch'),
    [
      ['git', 'fetch', '--no-tags', 'origin', otherSha],
      ['git', 'fetch', '--no-tags', 'origin', headSha]
    ]
  )
  assert.throws(
    () =>
      resolveReviewRange({
        baseSha: otherSha,
        headSha: 'nope',
        command: (name, args) => (args[0] === 'merge-base' ? 'x\n' : '')
      }),
    /PR head SHA/
  )
  assert.throws(
    () =>
      resolveReviewRange({
        baseSha: otherSha,
        headSha,
        command: (name, args) => (args[0] === 'merge-base' ? 'not-a-sha\n' : '')
      }),
    /merge base SHA/
  )
}

{
  const reviewed = deriveConclusion({
    meta: metaOf(),
    findings: parsedConclusion('Block'),
    liveHeadSha: headSha,
    error: ''
  })
  assert.equal(reviewed.status, 'reviewed')
  assert.equal(reviewed.blocking, true)

  const clean = deriveConclusion({ meta: metaOf(), findings: parsedConclusion('Nit'), liveHeadSha: headSha, error: '' })
  assert.equal(clean.status, 'reviewed')
  assert.equal(clean.blocking, false)

  const stale = deriveConclusion({
    meta: metaOf(),
    findings: parsedConclusion('Block'),
    liveHeadSha: otherSha,
    error: ''
  })
  assert.equal(stale.status, 'stale')
  assert.equal(stale.blocking, false, 'a Block that no longer describes the head must not gate the merge')
  assert.match(stale.reason, /head moved/)

  // 缺产物、读失败、配置故障与调用故障都不能再静默放绿。
  for (const [label, input] of [
    ['missing artifact', { meta: null, findings: null, liveHeadSha: headSha, error: 'the review artifact is missing' }],
    ['gateway error', { meta: metaOf(), findings: null, liveHeadSha: headSha, error: 'gateway returned 502' }],
    ['no findings', { meta: metaOf(), findings: null, liveHeadSha: headSha, error: '' }],
    [
      'config error',
      {
        meta: metaOf({ status: 'error', error_code: 'config_missing', error: 'missing CODEX_REVIEW_MODEL' }),
        findings: null,
        liveHeadSha: headSha,
        error: ''
      }
    ]
  ]) {
    const status = deriveConclusion(input)
    assert.equal(status.status, 'error', label)
    assert.equal(status.blocking, true, label)
    assert.deepEqual(status.counts, { Block: 0, 'Should fix': 0, Nit: 0 }, label)
  }

  const configError = deriveConclusion({
    meta: metaOf({ status: 'error', error_code: 'config_missing', error: 'missing CODEX_REVIEW_MODEL' }),
    findings: parsedConclusion('Block'),
    liveHeadSha: headSha,
    error: ''
  })
  assert.equal(configError.code, 'config_missing')
  assert.equal(configError.blocking, true, 'an error outranks findings from an earlier run')

  const notApplicable = deriveConclusion({
    meta: null,
    findings: null,
    liveHeadSha: headSha,
    error: 'the review artifact is missing',
    notApplicable: true
  })
  assert.equal(notApplicable.status, 'not_applicable')
  assert.equal(notApplicable.blocking, false)

  const unreviewed = deriveConclusion({
    meta: metaOf({ status: 'unreviewed', error: 'the review step produced no output file' }),
    findings: null,
    liveHeadSha: headSha,
    error: ''
  })
  assert.equal(unreviewed.status, 'unreviewed')
  assert.equal(unreviewed.code, 'unusable_output')
  assert.equal(unreviewed.blocking, true, 'a model that completed without a usable conclusion must turn the gate red')

  const complete = inspectConfig(configuredEnv)
  assert.equal(complete.present, true)
  assert.deepEqual(complete.missing, [])
  assert.equal(complete.config.key_present, true)
  const incomplete = inspectConfig({ ...configuredEnv, CODEX_REVIEW_MODEL: '', CODEX_VERSION: ' ' })
  assert.deepEqual(incomplete.missing, ['CODEX_REVIEW_MODEL', 'CODEX_VERSION'])
  assert.equal(
    inspectConfig({ ...configuredEnv, CODEX_REVIEW_MODEL: 'other-model' }).config.fingerprint ===
      complete.config.fingerprint,
    false,
    'changing the model must change the fingerprint'
  )
  assert.equal(
    JSON.stringify(complete.config).includes(configuredEnv.CODEX_REVIEW_API_KEY),
    false,
    'the config snapshot must never carry the API key value'
  )
  const padded = inspectConfig({
    ...configuredEnv,
    CODEX_REVIEW_MODEL: `  ${configuredEnv.CODEX_REVIEW_MODEL}  `
  })
  assert.equal(padded.config.model, configuredEnv.CODEX_REVIEW_MODEL)
  assert.equal(
    padded.config.fingerprint,
    complete.config.fingerprint,
    'whitespace padding must not look like a configuration change'
  )
  assert.equal(inspectConfig({ ...configuredEnv, CODEX_REVIEW_API_KEY: '   ' }).present, false)
}

{
  const parsed = parsedConclusion('Should fix', 'Block')
  const meta = { ...metaOf(), summary: parsed.summary, findings: parsed.findings, reused_from: '1234' }
  const body = renderConclusion({
    conclusion: deriveConclusion({ meta, findings: parsed, liveHeadSha: headSha, error: '' }),
    meta,
    pullNumber: 54
  })
  assert.ok(body.startsWith(`<!-- ${CONCLUSION_MARKER} sha=${headSha} status=blocked blocks=1 -->`))
  assert.match(body, /结论：\*\*已审查\*\*/)
  assert.match(body, /packages\/web-ui\/src\/button\.ts:12/)
  assert.match(body, /Block 1 · Should fix 1 · Nit 0/)
  assert.match(body, /模型：`configured-model`/)
  assert.match(body, /Block`、`error` 与「未审查」让/)
  assert.match(body, /run `1234`/)
  assert.ok(body.indexOf('**Block**') < body.indexOf('**Should fix**'), 'Block renders before Should fix')
  assert.deepEqual(
    meta.findings.map(entry => entry.severity),
    ['Should fix', 'Block'],
    'rendering must not reorder input'
  )

  const escaped = renderConclusion({
    conclusion: deriveConclusion({
      meta,
      findings: null,
      liveHeadSha: headSha,
      error: '<script>alert(1)</script> broke'
    }),
    meta,
    pullNumber: 54
  })
  assert.ok(!escaped.includes('<script>'), 'model text must not inject HTML into the comment')
  assert.match(escaped, /&lt;script&gt;alert\(1\)&lt;\/script&gt; broke/)

  // 尖括号转义不能吃掉泛型：真实 run 里 Plugin<ToolchainApi, KitCtx> 被删成了 PluginToolchainApi, KitCtx。
  const genericParsed = parseReviewFindings(
    JSON.stringify({
      summary: '比较 Array<T> 与 <div> 的写法',
      findings: [
        {
          ...finding('Should fix'),
          suggestion: '把返回类型标注为 `Plugin<ToolchainApi, KitCtx>`。'
        }
      ]
    })
  )
  const genericMeta = { ...metaOf(), summary: genericParsed.summary, findings: genericParsed.findings }
  const generic = renderConclusion({
    conclusion: deriveConclusion({ meta: genericMeta, findings: genericParsed, liveHeadSha: headSha, error: '' }),
    meta: genericMeta,
    pullNumber: 54
  })
  assert.match(generic, /Array&lt;T&gt; 与 &lt;div&gt;/)
  assert.match(generic, /<code>Plugin&lt;ToolchainApi, KitCtx&gt;<\/code>/)
  assert.ok(!generic.includes('PluginToolchainApi'), 'generic parameters must survive escaping')
  assert.ok(!generic.includes('<div>'), 'summary must not inject HTML either')

  // 代码段之外才转义：反引号里的比较符必须原样保留，否则会显示成实体。
  const codeSpanParsed = parseReviewFindings(
    JSON.stringify({
      summary: '格式化',
      findings: [{ ...finding('Nit'), problem: '条件 `a < b` 永远为假', suggestion: '' }]
    })
  )
  const codeSpanMeta = { ...metaOf(), summary: codeSpanParsed.summary, findings: codeSpanParsed.findings }
  const codeSpan = renderConclusion({
    conclusion: deriveConclusion({ meta: codeSpanMeta, findings: codeSpanParsed, liveHeadSha: headSha, error: '' }),
    meta: codeSpanMeta,
    pullNumber: 54
  })
  assert.match(codeSpan, /<code>a &lt; b<\/code>/)

  // 未闭合的反引号不是代码段：后面的 <b> 仍要转义。审查在 PR #520 上抓到的正是这个绕过。
  const unclosedParsed = parseReviewFindings(
    JSON.stringify({ summary: '边界', findings: [{ ...finding('Nit'), problem: '`<b>hack', suggestion: '' }] })
  )
  const unclosedMeta = { ...metaOf(), summary: unclosedParsed.summary, findings: unclosedParsed.findings }
  const unclosed = renderConclusion({
    conclusion: deriveConclusion({ meta: unclosedMeta, findings: unclosedParsed, liveHeadSha: headSha, error: '' }),
    meta: unclosedMeta,
    pullNumber: 54
  })
  assert.ok(!unclosed.includes('<b>'), 'an unclosed backtick must not become a code span')
  assert.match(unclosed, /`&lt;b&gt;hack/)

  // 长度不匹配的反引号 run 同样不是代码段。
  const mismatchedParsed = parseReviewFindings(
    JSON.stringify({ summary: '边界', findings: [{ ...finding('Nit'), problem: '``a` <b>', suggestion: '' }] })
  )
  const mismatchedMeta = { ...metaOf(), summary: mismatchedParsed.summary, findings: mismatchedParsed.findings }
  const mismatched = renderConclusion({
    conclusion: deriveConclusion({ meta: mismatchedMeta, findings: mismatchedParsed, liveHeadSha: headSha, error: '' }),
    meta: mismatchedMeta,
    pullNumber: 54
  })
  assert.ok(!mismatched.includes('<b>'), 'a mismatched backtick run must not swallow the following text')
  assert.match(mismatched, /``a` &lt;b&gt;/)

  // 反斜杠转义的反引号不能开代码段：CommonMark 把它当普通字符，后面的 <b> 仍是 HTML。
  const escapedTickParsed = parseReviewFindings(
    JSON.stringify({ summary: '边界', findings: [{ ...finding('Nit'), problem: '\\`<b>`', suggestion: '' }] })
  )
  const escapedTickMeta = { ...metaOf(), summary: escapedTickParsed.summary, findings: escapedTickParsed.findings }
  const escapedTick = renderConclusion({
    conclusion: deriveConclusion({
      meta: escapedTickMeta,
      findings: escapedTickParsed,
      liveHeadSha: headSha,
      error: ''
    }),
    meta: escapedTickMeta,
    pullNumber: 54
  })
  assert.ok(!escapedTick.includes('<b>'), 'a backslash-escaped backtick must not open a code span')
  assert.match(escapedTick, /&lt;b&gt;/)

  // 未闭合的反引号之后仍可能有合法代码段：CommonMark 只把该 run 当普通文本，不能吞掉后文。
  const unmatchedParsed = parseReviewFindings(
    JSON.stringify({ summary: '边界', findings: [{ ...finding('Nit'), problem: '` ``Plugin<T>``', suggestion: '' }] })
  )
  const unmatchedMeta = { ...metaOf(), summary: unmatchedParsed.summary, findings: unmatchedParsed.findings }
  const unmatched = renderConclusion({
    conclusion: deriveConclusion({ meta: unmatchedMeta, findings: unmatchedParsed, liveHeadSha: headSha, error: '' }),
    meta: unmatchedMeta,
    pullNumber: 54
  })
  assert.match(unmatched, /<code>Plugin&lt;T&gt;<\/code>/, 'a later valid code span must still be recognised')
  assert.ok(!unmatched.includes('<T>'), 'code content must stay escaped')

  // 文件名里的反引号会提前闭合包裹它的代码段；保留原路径，改用更长的围栏。
  const pathParsed = parseReviewFindings(
    JSON.stringify({ summary: '路径', findings: [{ ...finding('Nit'), file: 'src/`<b>x.ts' }] })
  )
  const pathMeta = { ...metaOf(), summary: pathParsed.summary, findings: pathParsed.findings }
  const pathBody = renderConclusion({
    conclusion: deriveConclusion({ meta: pathMeta, findings: pathParsed, liveHeadSha: headSha, error: '' }),
    meta: pathMeta,
    pullNumber: 54
  })
  assert.ok(
    pathBody.includes('<code>src/`&lt;b&gt;x.ts:12</code>'),
    'the path must keep its backtick inside the code element'
  )

  // 路径里的换行会提前结束段落，代码段随之失效；先折成一行再包。
  const multilineParsed = parseReviewFindings(
    JSON.stringify({
      summary: '路径',
      findings: [{ ...finding('Nit'), file: 'src/a.ts\n\n<img src=x>', line: 3 }]
    })
  )
  const multilineMeta = { ...metaOf(), summary: multilineParsed.summary, findings: multilineParsed.findings }
  const multiline = renderConclusion({
    conclusion: deriveConclusion({ meta: multilineMeta, findings: multilineParsed, liveHeadSha: headSha, error: '' }),
    meta: multilineMeta,
    pullNumber: 54
  })
  assert.ok(!multiline.includes('\n\n<img'), 'a multi-line path must not break out of the code span')
  assert.ok(multiline.includes('<code>src/a.ts &lt;img src=x&gt;:3</code>'))

  const unreviewedMeta = { status: 'unreviewed', error: 'the review step produced no output file' }
  const unreviewed = renderConclusion({
    conclusion: deriveConclusion({ meta: unreviewedMeta, findings: null, liveHeadSha: headSha, error: '' }),
    meta: unreviewedMeta,
    pullNumber: 54
  })
  assert.match(unreviewed, /sha=none status=unreviewed blocks=0/)
  assert.match(unreviewed, /结论：\*\*未审查\*\*/)
  assert.match(unreviewed, /故障码：`unusable_output`/)
  assert.match(unreviewed, /本次没有可用结论/)
  assert.match(unreviewed, /重跑整条 run/, 'unusable_output still needs a full rerun')

  // 只有 missing_coverage 会让审查腿一并判红，才该提示 --failed。
  const missingMeta = { ...unreviewedMeta, error_code: 'missing_coverage' }
  const missingCoverage = renderConclusion({
    conclusion: deriveConclusion({ meta: missingMeta, findings: null, liveHeadSha: headSha, error: '' }),
    meta: missingMeta,
    pullNumber: 54
  })
  assert.match(missingCoverage, /故障码：`missing_coverage`/)
  assert.match(missingCoverage, /gh run rerun --failed/, 'missing_coverage points at the failed-job rerun')

  const failed = renderConclusion({
    conclusion: deriveConclusion({
      meta: metaOf({ status: 'error', error_code: 'config_missing', error: 'missing CODEX_REVIEW_MODEL' }),
      findings: null,
      liveHeadSha: headSha,
      error: ''
    }),
    meta: metaOf({ status: 'error', error_code: 'config_missing', error: 'missing CODEX_REVIEW_MODEL' }),
    pullNumber: 54
  })
  assert.match(failed, /status=error blocks=0/)
  assert.match(failed, /结论：\*\*审查失败\*\*/)
  assert.match(failed, /故障码：`config_missing`/)
  assert.match(failed, /检查 GitHub 后台的 secrets\/variables/)
}

{
  // 空壳结论的自动恢复：判码、两个 attempt 维度的硬上限与「拿不到 attempt 就不重跑」都在纯函数里，
  // 真正的 rerun 由 commandAutoRetry 按 action 执行。
  const emptyMeta = { status: 'unreviewed', error_code: 'missing_coverage', error: 'no inspected path' }
  const decision = (overrides = {}) =>
    autoRetryDecision({
      meta: emptyMeta,
      runAttempt: 1,
      runConclusion: 'failure',
      reportAttempt: 1,
      ...overrides
    })

  assert.equal(AUTO_RETRY_LIMIT, 1, 'the auto retry is a single attempt')
  assert.deepEqual(decision(), {
    action: 'rerun',
    state: 'triggered',
    reason: 'first attempt produced an empty review conclusion'
  })

  // 重跑完成会再触发一次 workflow_run；第二次必须停下，否则模型腿会被无限重跑。
  for (const runAttempt of [2, 3, 10, '2']) {
    assert.deepEqual(
      decision({ runAttempt }),
      {
        action: 'skip',
        state: 'exhausted',
        reason: `run_attempt ${runAttempt} already used the single auto retry`
      },
      `run_attempt ${runAttempt} must exhaust the auto retry`
    )
  }

  // 写回腿自身被人工 re-run 时 payload 仍是原始事件（CI run attempt 仍为 1），
  // 只有 github.run_attempt 递增。不判它就会再 POST 一次 rerun-failed-jobs，突破硬上限。
  for (const reportAttempt of [2, 3, 10, '2']) {
    const result = decision({ reportAttempt })
    assert.equal(result.action, 'skip', `reportAttempt ${reportAttempt} must not rerun again`)
    assert.equal(result.state, 'exhausted', 'a re-run report leg must not fall back to the manual hint')
    assert.match(result.reason, /report workflow was re-run/)
  }

  // 两个维度都不可信时不重跑：宁可转人工，也不冒循环风险。
  for (const reportAttempt of [undefined, null, NaN, 0, -1, '', 'abc']) {
    const result = decision({ reportAttempt })
    assert.equal(result.action, 'skip', `reportAttempt ${String(reportAttempt)} must not retry`)
    assert.equal(result.state, 'none')
  }

  // 两个维度都必须合法且为 1：任一已重跑过就停下，且不会出现「CI attempt=2 但 report attempt=1」误放行。
  for (const overrides of [
    { runAttempt: 2, reportAttempt: 1 },
    { runAttempt: 1, reportAttempt: 2 },
    { runAttempt: 2, reportAttempt: 2 }
  ]) {
    assert.equal(decision(overrides).state, 'exhausted', JSON.stringify(overrides))
  }

  // 总闸门最先判：CI 没判红时不因 attempt 已用尽误报 exhausted；不可读字段也优先于「已用尽」。
  for (const runConclusion of ['success', 'cancelled', undefined]) {
    const result = decision({ runConclusion, reportAttempt: 2 })
    assert.equal(result.action, 'skip', `a ${String(runConclusion)} run needs no recovery`)
    assert.equal(result.state, 'none', 'a non-failure CI run must not claim an exhausted auto retry')
  }
  for (const overrides of [
    { runAttempt: 2, reportAttempt: 'abc' },
    { runAttempt: 2, reportAttempt: undefined },
    { runAttempt: undefined, reportAttempt: 2 },
    { runAttempt: undefined, reportAttempt: undefined }
  ]) {
    const result = decision(overrides)
    assert.equal(result.action, 'skip', `${JSON.stringify(overrides)} must not retry`)
    assert.equal(result.state, 'none', 'any unreadable attempt wins over an exhausted one')
  }

  // attempt 不可信时不重跑：宁可转人工，也不冒循环风险。
  for (const runAttempt of [undefined, null, NaN, 0, -1, '', 'abc']) {
    const result = decision({ runAttempt })
    assert.equal(result.action, 'skip', `runAttempt ${String(runAttempt)} must not retry`)
    assert.equal(result.state, 'none')
  }

  // 分流不变：unusable_output / error / reviewed 一律不进自动重跑。
  for (const meta of [
    { status: 'unreviewed', error_code: 'unusable_output' },
    { status: 'error', error_code: 'model_failed' },
    { status: 'reviewed' },
    null
  ]) {
    const result = decision({ meta })
    assert.equal(result.action, 'skip', `meta ${JSON.stringify(meta)} must not retry`)
    assert.equal(result.state, 'none')
  }
  for (const runConclusion of ['success', 'cancelled', undefined]) {
    assert.equal(decision({ runConclusion }).action, 'skip', `a ${String(runConclusion)} run needs no recovery`)
  }
}

{
  const emptyMeta = { status: 'unreviewed', error_code: 'missing_coverage', error: 'no inspected path' }
  const render = (autoRetry, meta = emptyMeta) =>
    renderConclusion({
      conclusion: deriveConclusion({ meta, findings: null, liveHeadSha: headSha, error: '' }),
      meta,
      pullNumber: 54,
      autoRetry
    })

  const triggered = render('triggered')
  assert.match(triggered, /- 自动恢复：写回腿已用 `gh run rerun --failed` 重跑审查与门禁腿一次/)
  assert.match(triggered, /不要手动再重跑/)
  assert.match(triggered, /恢复状态见上方「自动恢复」行/)

  const exhausted = render('exhausted')
  assert.match(exhausted, /自动重跑 1 次仍不可用/)
  assert.match(exhausted, /完整独立审查/)
  assert.ok(!exhausted.includes('不要手动再重跑'), 'an exhausted retry must not promise another rerun')

  const failedRetry = render('failed')
  assert.match(failedRetry, /自动重跑调用失败/)
  assert.match(failedRetry, /actions: write/)

  const legacy = render('none')
  // 保留手动重跑出口是有意的可操作指引，但必须带三重限定：先诊断、仅限 CI 判红、不要连续重跑。
  assert.match(legacy, /gh run rerun --failed/, 'the manual hint stays when no auto retry happened')
  assert.match(legacy, /- 恢复指引：本次没有触发自动重跑/)
  assert.match(legacy, /先看写回腿运行页 Summary/, 'a broken env must be diagnosed before a manual rerun')
  assert.match(legacy, /仅当 CI 确实判 `failure`/, 'a green CI run must not be rerun manually')
  assert.match(legacy, /不要连续重跑/, 'the hint must not induce an unbounded manual rerun loop')
  assert.ok(!legacy.includes('- 自动恢复：'), 'no auto retry means no auto recovery line')

  // 步骤被跳过 / output 丢失会传空串：不能冒充某个恢复档，也不能退回误导性的旧文案。
  const emptyState = render('')
  assert.match(emptyState, /- 恢复指引：本次没有触发自动重跑/)
  assert.ok(!emptyState.includes('- 自动恢复：'), 'an empty state must not impersonate a recovery state')

  // unusable_output 不能借 autoRetry 显示自动重跑文案，仍按「重跑整条 run」处置。
  const unusableMeta = {
    status: 'unreviewed',
    error_code: 'unusable_output',
    error: 'the review step produced no output file'
  }
  const unusable = render('triggered', unusableMeta)
  assert.match(unusable, /重跑整条 run/, 'unusable_output still needs a full rerun')
  assert.ok(!unusable.includes('- 自动恢复：'), 'only missing_coverage gets an auto recovery line')

  // 空壳结论也可能带 findings：自动恢复行挂在故障码旁，不依赖「无 findings」分支。
  const withFinding = render('triggered', { ...emptyMeta, findings: [finding('Nit')], summary: 'one nit' })
  assert.match(withFinding, /- 自动恢复：写回腿已用/, 'a missing_coverage conclusion with findings is still recovered')

  // 带 findings 且没有自动恢复时也得有指引：正文的「无 findings」分支此时不会出现。
  const withFindingNoRetry = render('none', { ...emptyMeta, findings: [finding('Nit')], summary: 'one nit' })
  assert.match(withFindingNoRetry, /- 恢复指引：本次没有触发自动重跑/, 'a conclusion with findings still gets a hint')
}

{
  // 重跑走 POST；201 空响应体不能触发 JSON.parse。attempt 与 conclusion 改由 payload 注入，不再发 GET。
  const calls = []
  const spawn = (command, args) => {
    calls.push({ command, args })
    return { status: 0, stdout: '' }
  }
  const adapter = createGhReviewAdapter({ repository: 'acme/repo', spawn })
  assert.equal(adapter.rerunFailed('42'), '', 'an empty 201 body is not parsed as JSON')
  assert.deepEqual(calls[0].args, ['api', '-X', 'POST', 'repos/acme/repo/actions/runs/42/rerun-failed-jobs'])
  assert.equal(adapter.run, undefined, 'the removed GET call must not come back')
}

{
  // state 的合法档位是白名单：空串（步骤跳过 / output 丢失）与未知值都不能冒充某个恢复档。
  assert.deepEqual(AUTO_RETRY_STATES, ['none', 'triggered', 'exhausted', 'failed'])
  for (const value of ['', undefined, null, 'weird', 0]) {
    assert.equal(normalizeAutoRetryState(value), 'none', `state ${String(value)} must fall back to none`)
  }
  for (const value of AUTO_RETRY_STATES) assert.equal(normalizeAutoRetryState(value), value)

  // 恢复状态的最终解析在脚本里求值，不依赖 Actions 表达式的 && / || 返回操作数语义。
  const resolve = (state, outcome) =>
    resolveAutoRetryState({ CODEX_REVIEW_AUTO_RETRY_STATE: state, CODEX_REVIEW_AUTO_RETRY_OUTCOME: outcome })
  for (const outcome of ['success', 'failure', 'skipped']) {
    for (const value of AUTO_RETRY_STATES.filter(state => state !== 'none')) {
      assert.equal(resolve(value, outcome), value, `an explicit ${value} state wins over ${outcome}`)
    }
  }
  assert.equal(resolve('', 'failure'), 'failed', 'a crashed step without an output still reports failed')
  assert.equal(resolve('', 'skipped'), 'none', 'a skipped step must not report a failed retry')
  assert.equal(resolve('', 'success'), 'none')
  assert.equal(resolve('weird', 'failure'), 'failed', 'unknown states fall through to the outcome fallback')
  assert.equal(resolve('weird', 'success'), 'none')
}

{
  // commandAutoRetry 是编排层：所有异常路径都必须写出 state=failed，且不能把异常抛给 main。
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-auto-retry-'))
  const outputPath = path.join(tmp, 'output')
  const summaryPath = path.join(tmp, 'summary')
  const conclusionDir = path.join(tmp, 'conclusion')
  fs.mkdirSync(conclusionDir)
  const saved = {
    output: process.env.GITHUB_OUTPUT,
    summary: process.env.GITHUB_STEP_SUMMARY,
    error: console.error
  }
  process.env.GITHUB_OUTPUT = outputPath
  process.env.GITHUB_STEP_SUMMARY = summaryPath
  // ::error 在真实 CI 里会被 runner 解析成 annotation；单测故意走异常路径，这里静音避免假报警。
  console.error = () => {}
  const metaPath = path.join(conclusionDir, 'review-meta.json')
  const emptyMeta = { status: 'unreviewed', error_code: 'missing_coverage', error: 'no inspected path' }
  const baseEnv = {
    GITHUB_REPOSITORY: 'acme/repo',
    WORKFLOW_RUN_ID: '42',
    WORKFLOW_RUN_ATTEMPT: '1',
    WORKFLOW_REPORT_ATTEMPT: '1',
    CODEX_REVIEW_RUN_CONCLUSION: 'failure',
    CODEX_REVIEW_CONCLUSION_DIR: conclusionDir
  }
  const invoke = ({ env = baseEnv, adapter, meta = emptyMeta } = {}) => {
    fs.writeFileSync(outputPath, '')
    fs.writeFileSync(summaryPath, '')
    if (meta === 'broken') fs.writeFileSync(metaPath, '{ not json')
    else if (meta === null) fs.rmSync(metaPath, { force: true })
    else fs.writeFileSync(metaPath, JSON.stringify(meta))
    const result = commandAutoRetry({ env, adapter })
    return {
      result,
      outputs: fs.readFileSync(outputPath, 'utf8'),
      summary: fs.readFileSync(summaryPath, 'utf8')
    }
  }
  try {
    const reruns = []
    const adapter = { rerunFailed: id => reruns.push(id) }

    const triggered = invoke({ adapter })
    assert.equal(triggered.result.state, 'triggered')
    assert.deepEqual(reruns, ['42'], 'attempt 1 must rerun exactly once')
    assert.match(triggered.outputs, /retried=true/)
    assert.match(triggered.outputs, /state=triggered/)

    const exhausted = invoke({ adapter, env: { ...baseEnv, WORKFLOW_RUN_ATTEMPT: '2' } })
    assert.equal(exhausted.result.state, 'exhausted')
    assert.deepEqual(reruns, ['42'], 'attempt 2 must not rerun again')
    assert.match(exhausted.outputs, /state=exhausted/)

    // 写回腿自身被 re-run：CI run attempt 仍是 1，但这一步必须停在 exhausted，且 Summary 两个维度都留痕。
    const reRunReport = invoke({ adapter, env: { ...baseEnv, WORKFLOW_REPORT_ATTEMPT: '2' } })
    assert.equal(reRunReport.result.state, 'exhausted')
    assert.match(reRunReport.result.reason, /report workflow was re-run/)
    assert.deepEqual(reruns, ['42'], 'a re-run report leg must not POST rerun-failed-jobs again')
    assert.match(reRunReport.outputs, /state=exhausted/)
    assert.match(reRunReport.summary, /CI attempt `1` \/ 写回腿 attempt `2`/)

    // github.run_attempt 缺失时保守跳过；评论会转人工，但绝不能再触发重跑。
    const missingReportAttempt = invoke({
      adapter,
      env: Object.fromEntries(Object.entries(baseEnv).filter(([key]) => key !== 'WORKFLOW_REPORT_ATTEMPT'))
    })
    assert.equal(missingReportAttempt.result.state, 'none')
    assert.deepEqual(reruns, ['42'], 'an unreadable report attempt must not rerun')
    assert.match(missingReportAttempt.outputs, /state=none/, 'the step output must still be written')
    assert.match(missingReportAttempt.summary, /写回腿 attempt `unknown`/)

    // CI 已成功 + 写回腿被 re-run：总闸门先判，不再误报 exhausted。
    const ciSucceeded = invoke({
      adapter,
      env: { ...baseEnv, WORKFLOW_REPORT_ATTEMPT: '2', CODEX_REVIEW_RUN_CONCLUSION: 'success' }
    })
    assert.equal(ciSucceeded.result.state, 'none')
    assert.deepEqual(reruns, ['42'], 'a successful CI run must not be recovered')

    const skipped = invoke({ adapter, meta: { status: 'unreviewed', error_code: 'unusable_output' } })
    assert.equal(skipped.result.state, 'none')
    assert.deepEqual(reruns, ['42'], 'unusable_output stays out of the auto retry')

    // 三种异常：重跑调用失败、meta 损坏、payload env 缺失；都写 failed 且不抛。
    const failedCases = [
      {
        name: 'rerunFailed throws',
        adapter: {
          rerunFailed: id => {
            reruns.push(id)
            throw new Error('403 denied')
          }
        }
      },
      { name: 'broken meta', adapter, meta: 'broken' },
      { name: 'missing run id', adapter, env: { ...baseEnv, WORKFLOW_RUN_ID: '' } }
    ]
    for (const testCase of failedCases) {
      const outcome = invoke(testCase)
      assert.equal(outcome.result.state, 'failed', `${testCase.name} must land on failed`)
      assert.match(outcome.outputs, /state=failed/, `${testCase.name} must write the output`)
      assert.match(outcome.summary, /恢复状态：`failed`/, `${testCase.name} must leave a Summary trace`)
    }
    assert.deepEqual(reruns, ['42', '42'], 'a failed rerun must not silently retry again')
  } finally {
    console.error = saved.error
    if (saved.output === undefined) delete process.env.GITHUB_OUTPUT
    else process.env.GITHUB_OUTPUT = saved.output
    if (saved.summary === undefined) delete process.env.GITHUB_STEP_SUMMARY
    else process.env.GITHUB_STEP_SUMMARY = saved.summary
    fs.rmSync(tmp, { recursive: true, force: true })
  }
}

{
  const runEntry = id => ({ id, name: 'CI', head_sha: headSha, conclusion: 'success' })
  const adapter = (runs, artifacts = [{ name: FINDINGS_ARTIFACT, id: 7 }]) => ({
    runs: () => runs,
    artifacts: () => artifacts
  })

  assert.deepEqual(
    findReusableRun({
      adapter: adapter([
        runEntry(10),
        runEntry(30),
        { ...runEntry(20), conclusion: 'failure' },
        { ...runEntry(40), name: 'Wails verify' },
        { ...runEntry(50), head_sha: otherSha }
      ]),
      headSha,
      currentRunId: '60'
    }),
    { runId: '30', artifactId: 7 },
    'the newest successful CI run on this head wins'
  )
  assert.equal(
    findReusableRun({ adapter: adapter([runEntry(40)]), headSha, currentRunId: '40' }),
    null,
    'the current run must not reuse its own in-flight conclusion'
  )
  assert.equal(
    findReusableRun({ adapter: adapter([runEntry(30)], []), headSha, currentRunId: '40' }),
    null,
    'a run without the findings artifact is not reusable'
  )
}

{
  const pullOf = (number, sha, updated_at) => ({ number, head: { sha }, updated_at })
  const adapter = pulls => ({ pulls: () => pulls })

  assert.equal(
    findPullForHead({
      adapter: adapter([
        pullOf(10, otherSha, '2026-01-01'),
        pullOf(11, headSha, '2026-01-02'),
        pullOf(12, headSha, '2026-03-04')
      ]),
      headSha
    }),
    12,
    'the pull request most recently touching this head wins'
  )
  assert.equal(
    findPullForHead({ adapter: adapter([pullOf(10, otherSha, '2026-01-01')]), headSha }),
    null,
    'a PR whose head moved on is not the owner of this SHA'
  )
  assert.equal(findPullForHead({ adapter: adapter([]), headSha }), null)
  assert.equal(findPullForHead({ adapter: adapter(undefined), headSha }), null, 'a null payload is no pull request')
}

{
  const calls = []
  const spawn = (command, args) => {
    calls.push(args)
    const endpoint = String(args.at(-1))
    if (args.includes('POST') || args.includes('PATCH')) return { status: 0, stdout: '{"id":9,"body":"posted"}' }
    if (endpoint.includes('/issues/54/comments')) return { status: 0, stdout: '[{"id":9,"body":"other"}]' }
    if (endpoint.includes('/pulls/54')) return { status: 0, stdout: JSON.stringify({ head: { sha: headSha } }) }
    if (endpoint.includes(`/commits/${headSha}/pulls`)) {
      return { status: 0, stdout: `[{"number":54,"head":{"sha":"${headSha}"},"updated_at":"2026-01-01T00:00:00Z"}]` }
    }
    if (endpoint.includes('/actions/runs?')) return { status: 0, stdout: '{"workflow_runs":[]}' }
    if (endpoint.includes('/actions/runs/30/artifacts')) return { status: 0, stdout: '{"artifacts":[]}' }
    return { status: 1, stdout: '', stderr: 'HTTP 404: Not Found' }
  }
  const adapter = createGhReviewAdapter({ repository: 'owner/repo', spawn, cwd: '/tmp', env: {} })
  assert.equal(adapter.pull(54).head.sha, headSha)
  assert.equal(findPullForHead({ adapter, headSha }), 54)
  assert.deepEqual(adapter.listComments(54), [{ id: 9, body: 'other' }])
  assert.equal(adapter.createComment(54, 'body').id, 9)
  assert.equal(adapter.updateComment(9, 'body').id, 9)
  assert.deepEqual(adapter.runs(headSha), [])
  assert.deepEqual(adapter.artifacts(30), [])
  assert.throws(() => adapter.artifacts(31), /HTTP 404/)
  const posted = calls.find(args => args.includes('POST'))
  assert.ok(posted.includes('body=body'), 'the comment body travels as a gh api form field')
  assert.equal(posted.at(-1), 'repos/owner/repo/issues/54/comments')
}

{
  // ci.yml 只能写死分支名，这里钉住常量和它一致。
  assert.equal(RELEASE_BRANCH, 'changeset-release/main')
  const pullOf = overrides => ({
    number: 54,
    state: 'open',
    base: { ref: 'main' },
    head: { ref: 'feature/x', sha: headSha, repo: { full_name: 'owner/repo' } },
    ...overrides
  })
  const target = pull => reviewTarget({ pull, repository: 'owner/repo', releaseBranch: RELEASE_BRANCH })

  assert.deepEqual(target(pullOf()), { ok: true, number: 54, headRef: 'feature/x', headSha })
  assert.match(target(pullOf({ state: 'closed' })).reason, /is closed/)
  assert.match(target(pullOf({ base: { ref: 'topic' } })).reason, /not main/)
  assert.match(
    target(pullOf({ head: { ref: 'feature/x', sha: headSha, repo: { full_name: 'someone/else' } } })).reason,
    /fork/
  )
  assert.match(
    target(pullOf({ head: { ref: RELEASE_BRANCH, sha: headSha, repo: { full_name: 'owner/repo' } } })).reason,
    /release branch/
  )
}

{
  const directory = tempConclusion(conclusionOf('Block'), metaOf())
  const conclusion = readConclusion(directory)
  assert.equal(conclusion.meta.head_sha, headSha)
  assert.equal(conclusion.meta.summary, '改动整体可用。')
  assert.equal(conclusion.findings.counts.Block, 1)
  assert.equal(readConclusion(fs.mkdtempSync(path.join(os.tmpdir(), 'codex-review-empty-'))), null)
  fs.writeFileSync(path.join(directory, 'review-findings.json'), 'oops')
  assert.throws(() => readConclusion(directory), /not valid JSON/)
  fs.rmSync(directory, { recursive: true, force: true })
}

function tempConclusion(conclusion, meta) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-review-conclusion-'))
  writeFixtures(directory, conclusion, meta)
  return directory
}

function runCli(command, { env = {}, conclusionDir }) {
  const outputPath = path.join(conclusionDir, 'output')
  const summaryPath = path.join(conclusionDir, 'summary')
  fs.writeFileSync(outputPath, '')
  fs.writeFileSync(summaryPath, '')
  const result = spawnSync(process.execPath, [scriptPath, command], {
    encoding: 'utf8',
    env: {
      PATH: process.env.PATH,
      GITHUB_OUTPUT: outputPath,
      GITHUB_STEP_SUMMARY: summaryPath,
      GITHUB_REPOSITORY: 'owner/repo',
      GITHUB_REF: 'refs/pull/54/merge',
      RUNNER_TEMP: conclusionDir,
      CODEX_REVIEW_CONCLUSION_DIR: conclusionDir,
      ...env
    }
  })
  const outputs = Object.fromEntries(
    fs
      .readFileSync(outputPath, 'utf8')
      .split('\n')
      .filter(line => line.includes('='))
      .map(line => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1)])
  )
  return { result, outputs, summary: fs.readFileSync(summaryPath, 'utf8') }
}

{
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-review-gate-'))

  const missing = runCli('gate', { env: { CODEX_REVIEW_LIVE_HEAD_SHA: headSha }, conclusionDir: directory })
  assert.equal(missing.result.status, 1, 'a missing conclusion is an error, never a silent green gate')
  assert.match(missing.summary, /Status: \*\*error\*\*/)
  assert.match(missing.summary, /review artifact is missing/)

  const skipped = runCli('gate', {
    env: { CODEX_REVIEW_LIVE_HEAD_SHA: headSha, CODEX_REVIEW_NOT_APPLICABLE: 'true' },
    conclusionDir: directory
  })
  assert.equal(skipped.result.status, 0, 'a skipped review job is not applicable, not a failure')
  assert.match(skipped.summary, /Status: \*\*not_applicable\*\*/)

  writeFixtures(directory, conclusionOf('Block'), metaOf())
  const blocking = runCli('gate', { env: { CODEX_REVIEW_LIVE_HEAD_SHA: headSha }, conclusionDir: directory })
  assert.equal(blocking.result.status, 1, 'a fresh Block must fail the gate')
  assert.match(blocking.summary, /Status: \*\*reviewed\*\*/)
  assert.match(blocking.summary, /Block 1 · Should fix 0 · Nit 0/)
  assert.match(blocking.summary, new RegExp(`Reviewed head: \`${headSha}\``))

  const stale = runCli('gate', { env: { CODEX_REVIEW_LIVE_HEAD_SHA: otherSha }, conclusionDir: directory })
  assert.equal(stale.result.status, 0, 'the same Block must not gate a head the review never saw')
  assert.match(stale.summary, /Status: \*\*stale\*\*/)

  writeFixtures(directory, conclusionOf('Nit'), metaOf())
  const clean = runCli('gate', { env: { CODEX_REVIEW_LIVE_HEAD_SHA: headSha }, conclusionDir: directory })
  assert.equal(clean.result.status, 0)
  fs.rmSync(directory, { recursive: true, force: true })
}

{
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-review-validate-'))
  const runnerTemp = path.join(directory, 'runner-temp')
  const conclusionDir = path.join(directory, 'conclusion')
  fs.mkdirSync(runnerTemp, { recursive: true })
  fs.mkdirSync(conclusionDir, { recursive: true })
  const validateEnv = {
    RUNNER_TEMP: runnerTemp,
    CODEX_REVIEW_CONCLUSION_DIR: conclusionDir,
    CODEX_REVIEW_HEAD_SHA: headSha,
    CODEX_REVIEW_BASE_SHA: otherSha,
    CODEX_REVIEW_STEP_OUTCOME: 'success'
  }
  writeConfig(runnerTemp)
  fs.writeFileSync(
    path.join(runnerTemp, 'codex-final-message.json'),
    JSON.stringify({
      summary: '有两处要改。',
      coverage: { inspected: ['src/app.ts'], uncovered: [] },
      findings: [finding('Block'), finding('Should fix')]
    })
  )
  const validated = runCli('validate', { env: validateEnv, conclusionDir })
  assert.equal(validated.result.status, 0, validated.result.stderr)
  assert.equal(validated.outputs.blocks, '1')
  const persisted = readConclusion(conclusionDir)
  assert.equal(persisted.meta.head_sha, headSha)
  assert.equal(persisted.meta.model, 'configured-model')
  assert.equal(persisted.meta.config_fingerprint, configFingerprint)
  assert.equal(persisted.meta.status, 'reviewed')
  assert.equal(persisted.findings.counts['Should fix'], 1)

  fs.rmSync(path.join(runnerTemp, 'codex-final-message.json'))
  fs.rmSync(path.join(conclusionDir, 'review-findings.json'))
  fs.rmSync(path.join(conclusionDir, 'review-meta.json'))
  const broken = runCli('validate', { env: validateEnv, conclusionDir })
  assert.equal(broken.result.status, 0, 'validate records the gap; the gate is what judges it')
  assert.equal(broken.outputs.blocks, '0')
  assert.match(broken.outputs.reason, /no output file/)
  assert.equal(fs.existsSync(path.join(conclusionDir, 'review-findings.json')), false)
  assert.equal(readConclusion(conclusionDir).meta.status, 'unreviewed')
  const gateAfterBreak = runCli('gate', { env: { CODEX_REVIEW_LIVE_HEAD_SHA: headSha }, conclusionDir })
  assert.equal(gateAfterBreak.result.status, 1, 'no usable conclusion must not look like a green review')
  assert.match(gateAfterBreak.summary, /Status: \*\*unreviewed\*\*/)
  assert.match(gateAfterBreak.summary, /unusable_output/)

  // 同一个「没有输出文件」，outcome=failure 说明 action 崩了，必须让 gate 变红。
  const crashed = runCli('validate', {
    env: { ...validateEnv, CODEX_REVIEW_STEP_OUTCOME: 'failure' },
    conclusionDir
  })
  assert.equal(crashed.result.status, 0)
  const gateAfterCrash = runCli('gate', { env: { CODEX_REVIEW_LIVE_HEAD_SHA: headSha }, conclusionDir })
  assert.equal(gateAfterCrash.result.status, 1, 'a crashed model action must not be masked by continue-on-error')
  assert.match(gateAfterCrash.summary, /Status: \*\*error\*\*/)

  // 模型给了 findings 但 summary 是空串：结论照样成立，不会退化成 unreviewed。
  fs.writeFileSync(
    path.join(runnerTemp, 'codex-final-message.json'),
    JSON.stringify({
      summary: '',
      coverage: { inspected: ['src/app.ts'], uncovered: [] },
      findings: [finding('Should fix')]
    })
  )
  const missingSummary = runCli('validate', { env: validateEnv, conclusionDir })
  assert.equal(missingSummary.result.status, 0, missingSummary.result.stderr)
  assert.equal(missingSummary.outputs.blocks, '0')
  assert.equal(readConclusion(conclusionDir).meta.status, 'reviewed')
  assert.equal(readConclusion(conclusionDir).findings.counts['Should fix'], 1)
  const gateAfterMissingSummary = runCli('gate', {
    env: { CODEX_REVIEW_LIVE_HEAD_SHA: headSha },
    conclusionDir
  })
  assert.equal(gateAfterMissingSummary.result.status, 0, 'a cosmetic gap must not invalidate the findings')
  assert.match(gateAfterMissingSummary.summary, /Status: \*\*reviewed\*\*/)

  // 没有配置快照时 validate 不能把 error 结论覆盖成 unreviewed。
  fs.rmSync(path.join(runnerTemp, CONFIG_FILE))
  const unconfigured = runCli('validate', { env: validateEnv, conclusionDir })
  assert.equal(unconfigured.result.status, 0)
  const gateUnconfigured = runCli('gate', { env: { CODEX_REVIEW_LIVE_HEAD_SHA: headSha }, conclusionDir })
  assert.equal(gateUnconfigured.result.status, 1)
  assert.match(gateUnconfigured.summary, /Status: \*\*error\*\*/)

  writeConfig(runnerTemp)
  fs.writeFileSync(
    path.join(runnerTemp, 'codex-final-message.json'),
    '{"summary":"ok","findings":[{"severity":"Blocker","file":"","line":0,"problem":"x","suggestion":"y"}]}'
  )
  const wrongSeverity = runCli('validate', { env: validateEnv, conclusionDir })
  assert.equal(wrongSeverity.result.status, 0)
  assert.match(wrongSeverity.outputs.reason, /unknown severity/)
  fs.rmSync(directory, { recursive: true, force: true })
}

{
  // preflight 是配置缺失的第一道也是唯一一道写 error 结论的地方。
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-review-preflight-'))
  const ready = runCli('preflight', { env: configuredEnv, conclusionDir: directory })
  assert.equal(ready.result.status, 0, ready.result.stderr)
  assert.equal(ready.outputs.configured, 'true')
  assert.equal(ready.outputs.missing, '')
  assert.ok(fs.existsSync(path.join(directory, CONFIG_FILE)))
  assert.ok(
    !fs.readFileSync(path.join(directory, CONFIG_FILE), 'utf8').includes('value-for-CODEX_REVIEW_API_KEY'),
    'the config snapshot must never persist the API key'
  )

  fs.rmSync(path.join(directory, CONFIG_FILE))
  const incomplete = runCli('preflight', {
    env: { ...configuredEnv, CODEX_RESPONSES_ENDPOINT: '', CODEX_REVIEW_EFFORT: '' },
    conclusionDir: directory
  })
  assert.equal(incomplete.result.status, 0, 'a missing configuration is a red gate, not a crashed step')
  assert.equal(incomplete.outputs.configured, 'false')
  assert.equal(incomplete.outputs.missing, 'CODEX_RESPONSES_ENDPOINT,CODEX_REVIEW_EFFORT')
  assert.equal(fs.existsSync(path.join(directory, CONFIG_FILE)), false)
  const meta = JSON.parse(fs.readFileSync(path.join(directory, 'review-meta.json'), 'utf8'))
  assert.equal(meta.status, 'error')
  assert.equal(meta.error_code, 'config_missing')
  assert.deepEqual(meta.missing, ['CODEX_RESPONSES_ENDPOINT', 'CODEX_REVIEW_EFFORT'])
  const gate = runCli('gate', { env: { CODEX_REVIEW_LIVE_HEAD_SHA: headSha }, conclusionDir: directory })
  assert.equal(gate.result.status, 1)
  assert.match(gate.summary, /Status: \*\*error\*\*/)
  fs.rmSync(directory, { recursive: true, force: true })
}

{
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-review-reuse-'))
  // 上一轮 artifact 解在独立目录：它与本轮结论目录各有自己的 review-scope.json。
  const priorDirectory = `${directory}-prior`
  const reuseEnv = {
    CODEX_REVIEW_HEAD_SHA: headSha,
    CODEX_REVIEW_PRIOR_RUN_ID: '4321',
    CODEX_REVIEW_PRIOR_DIR: priorDirectory,
    RUNNER_TEMP: directory
  }
  writeConfig(directory)

  writeFixtures(priorDirectory, conclusionOf('Nit'), metaOf())
  const reused = runCli('reuse', { env: reuseEnv, conclusionDir: directory })
  assert.equal(reused.result.status, 0, reused.result.stderr)
  assert.equal(reused.outputs.reused, 'true')
  assert.equal(readConclusion(directory).meta.reused_from, '4321')

  // 旧契约产物（没有 coverage）不能复用：否则一次没有证据的空结论会借复用这条路回到绿色。
  const legacy = conclusionOf('Nit')
  delete legacy.coverage
  legacy.findings = []
  writeFixtures(priorDirectory, legacy, metaOf())
  const upgraded = runCli('reuse', { env: reuseEnv, conclusionDir: directory })
  assert.equal(upgraded.outputs.reused, 'false', 'a conclusion written before the coverage contract must not be reused')
  assert.match(upgraded.outputs.reason, /coverage/)
  assert.equal(
    fs.existsSync(path.join(directory, 'review-findings.json')),
    false,
    'the stale conclusion is discarded so the model has to produce coverage for this head'
  )

  // 有 findings 但缺 coverage 同样是旧契约产物：不能因为「有发现」就放过。
  const legacyFindings = conclusionOf('Nit')
  delete legacyFindings.coverage
  writeFixtures(priorDirectory, legacyFindings, metaOf())
  const stale = runCli('reuse', { env: reuseEnv, conclusionDir: directory })
  assert.equal(stale.outputs.reused, 'false', 'findings do not excuse a missing coverage list')
  assert.match(stale.outputs.reason, /coverage/)

  writeFixtures(priorDirectory, conclusionOf('Nit'), metaOf({ head_sha: otherSha }))
  const drifted = runCli('reuse', { env: reuseEnv, conclusionDir: directory })
  assert.equal(drifted.outputs.reused, 'false')
  assert.equal(drifted.outputs.reason, '', 'a head mismatch is expected, not a read failure')
  assert.equal(
    fs.existsSync(path.join(directory, 'review-findings.json')),
    false,
    'a mismatched conclusion must not be reused'
  )

  writeFixtures(priorDirectory, conclusionOf('Nit'), metaOf())
  fs.writeFileSync(path.join(priorDirectory, 'review-findings.json'), 'not json')
  const corrupt = runCli('reuse', { env: reuseEnv, conclusionDir: directory })
  assert.equal(corrupt.result.status, 0, 'a corrupt conclusion degrades to a fresh model call')
  assert.equal(corrupt.outputs.reused, 'false')
  assert.match(corrupt.outputs.reason, /not valid JSON/)

  writeFixtures(priorDirectory, conclusionOf('Nit'), metaOf({ config_fingerprint: 'another-configuration' }))
  const reconfigured = runCli('reuse', { env: reuseEnv, conclusionDir: directory })
  assert.equal(reconfigured.outputs.reused, 'false')
  assert.match(
    reconfigured.outputs.reason,
    /configuration changed/,
    'a changed model or endpoint must force a fresh review'
  )

  writeFixtures(priorDirectory, conclusionOf('Nit'), metaOf({ status: 'error', error_code: 'config_missing' }))
  const priorError = runCli('reuse', { env: reuseEnv, conclusionDir: directory })
  assert.equal(priorError.outputs.reused, 'false')
  assert.match(priorError.outputs.reason, /no reviewable conclusion/, 'a failed prior run must never be reused')

  fs.rmSync(path.join(directory, CONFIG_FILE))
  writeFixtures(priorDirectory, conclusionOf('Nit'), metaOf())
  const noConfig = runCli('reuse', { env: reuseEnv, conclusionDir: directory })
  assert.equal(noConfig.outputs.reused, 'false')
  assert.match(noConfig.outputs.reason, /configuration snapshot is missing/)
  fs.rmSync(directory, { recursive: true, force: true })
  fs.rmSync(priorDirectory, { recursive: true, force: true })
}

{
  // 上一轮 artifact 带着上一轮的 scope：它不能覆盖本轮 prepare 写的范围，
  // 否则覆盖判定会拿一份对不上当前 diff 的 changed_paths，旧产物反而更容易变绿。
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-review-scope-'))
  const priorDirectory = `${directory}-prior`
  writeConfig(directory)
  const currentScope = {
    empty_diff: false,
    diff_bytes: 8192,
    changed_paths: ['packages/monorepo-kit/src/runner/runner.ts']
  }
  fs.writeFileSync(path.join(directory, 'review-scope.json'), JSON.stringify(currentScope))
  writeFixtures(priorDirectory, conclusionOf(), metaOf())
  fs.writeFileSync(
    path.join(priorDirectory, 'review-scope.json'),
    JSON.stringify({ empty_diff: false, diff_bytes: 4096 })
  )
  const ran = runCli('reuse', {
    env: { CODEX_REVIEW_HEAD_SHA: headSha, CODEX_REVIEW_PRIOR_DIR: priorDirectory, RUNNER_TEMP: directory },
    conclusionDir: directory
  })
  assert.equal(ran.outputs.reused, 'true', ran.result.stderr)
  assert.deepEqual(
    JSON.parse(fs.readFileSync(path.join(directory, 'review-scope.json'), 'utf8')),
    currentScope,
    'the current review range survives a reuse artifact download'
  )
  fs.rmSync(directory, { recursive: true, force: true })
  fs.rmSync(priorDirectory, { recursive: true, force: true })
}

{
  // 读写 PR 的 403 都必须带排查清单；诊断只认权限类错误，不能吞掉其它失败。
  const call = withPermissionDiagnosis('54')
  assert.equal(
    call(() => 'ok'),
    'ok'
  )
  for (const message of [
    'gh api failed (exit 1): Resource not accessible by integration',
    'gh api failed (exit 1): HTTP 403: forbidden',
    'gh api failed (exit 1): 403 Forbidden'
  ]) {
    assert.throws(
      () =>
        call(() => {
          throw new Error(message)
        }),
      /cannot access PR #54 or its comments/
    )
  }
  // gh 会把 `-f body=<评论正文>` 拼进 error.message；正文里的 "403" 不能触发权限诊断。
  for (const message of [
    'gh api failed (exit 1): HTTP 500: upstream unavailable',
    'gh api -X POST -f body=fix issue 403 repos/owner/repo/issues/54/comments failed (exit 1): HTTP 500'
  ]) {
    const other = new Error(message)
    assert.throws(
      () =>
        call(() => {
          throw other
        }),
      error => error === other,
      'non-permission failures must surface unchanged'
    )
  }
}

{
  // 端到端：把 gh 换成受控替身，分别让读评论、写评论、非权限调用失败。
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-review-report-'))
  const bin = path.join(directory, 'bin')
  fs.mkdirSync(bin)
  const fakeGh = path.join(bin, 'gh')
  fs.writeFileSync(
    fakeGh,
    `#!/bin/sh
case "$*" in
  *"-X POST"*)
    if [ "$FAKE_GH_FAIL_AT" = "write" ] || [ "$FAKE_GH_FAIL_AT" = "server" ]; then
      echo "gh: $FAKE_GH_ERROR" >&2
      exit 1
    fi
    printf '%s\\n' '{"id":9001}'
    ;;
  *"/pulls/54")
    printf '%s\\n' '{"number":54,"state":"open","base":{"ref":"main"},"head":{"ref":"feature","sha":"${headSha}","repo":{"full_name":"owner/repo"}}}'
    ;;
  *"/comments?per_page=100")
    if [ "$FAKE_GH_FAIL_AT" = "read" ]; then
      echo "gh: $FAKE_GH_ERROR" >&2
      exit 1
    fi
    printf '%s\\n' '[]'
    ;;
  *)
    echo "unexpected gh invocation: $*" >&2
    exit 2
    ;;
esac
`,
    { mode: 0o755 }
  )
  writeFixtures(directory, conclusionOf('Nit'), metaOf())
  const reportEnv = failAt => ({
    PATH: `${bin}:${process.env.PATH}`,
    CODEX_REVIEW_LIVE_HEAD_SHA: headSha,
    FAKE_GH_FAIL_AT: failAt,
    FAKE_GH_ERROR: 'Resource not accessible by integration (HTTP 403)'
  })

  const created = runCli('report', { env: reportEnv('none'), conclusionDir: directory })
  assert.equal(created.result.status, 0, created.result.stderr)
  assert.match(created.result.stdout, /created conclusion comment 9001/)
  // 运行页要能回答「这次到底发了什么」：只有日志里的 console.log 不够。
  assert.match(created.summary, /已创建结论评论 #9001/)
  assert.match(created.summary, /Block 0 · Should fix 0 · Nit 1/)

  for (const failAt of ['read', 'write']) {
    const denied = runCli('report', { env: reportEnv(failAt), conclusionDir: directory })
    assert.equal(denied.result.status, 1, `${failAt} 403 must fail the report step`)
    assert.match(denied.result.stderr, /cannot access PR #54 or its comments/, failAt)
    assert.match(denied.result.stderr, /pull-requests: write/, failAt)
    assert.match(denied.result.stderr, /Workflow permissions/, failAt)
    assert.match(denied.result.stderr, /organization policy/, failAt)
  }

  const serverError = runCli('report', {
    env: { ...reportEnv('server'), FAKE_GH_ERROR: 'HTTP 500: upstream unavailable' },
    conclusionDir: directory
  })
  assert.equal(serverError.result.status, 1)
  assert.match(serverError.result.stderr, /HTTP 500/, 'the original failure must still be visible')
  assert.doesNotMatch(serverError.result.stderr, /cannot access PR #54/, 'a 500 is not a permission diagnosis')
  fs.rmSync(directory, { recursive: true, force: true })
}

{
  // 生成产物必须在 diff 入口就剔掉，而不是指望模型自己忽略；嵌套与根级 generated/ 都要覆盖。
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-review-scope-'))
  const git = args => run('git', ['-C', directory, ...args])
  const commit = message =>
    git(['-c', 'commit.gpgsign=false', '-c', 'core.hooksPath=/dev/null', 'commit', '-q', '-m', message])
  git(['-c', 'init.defaultBranch=main', 'init', '-q'])
  git(['config', 'user.email', 'scope@example.test'])
  git(['config', 'user.name', 'Scope Test'])
  fs.mkdirSync(path.join(directory, 'src/generated'), { recursive: true })
  fs.mkdirSync(path.join(directory, 'generated'), { recursive: true })
  fs.writeFileSync(path.join(directory, 'src/generated/hash-a.js'), 'export const a = 1\n')
  fs.writeFileSync(path.join(directory, 'generated/root.js'), 'export const root = 1\n')
  fs.writeFileSync(path.join(directory, 'src/real.ts'), 'export const real = 1\n')
  git(['add', '.'])
  commit('base')
  const baseSha = git(['rev-parse', 'HEAD']).trim()
  fs.rmSync(path.join(directory, 'src/generated/hash-a.js'))
  fs.writeFileSync(path.join(directory, 'src/generated/hash-b.js'), 'export const a = 2\n')
  fs.writeFileSync(path.join(directory, 'generated/root.js'), 'export const root = 2\n')
  fs.writeFileSync(path.join(directory, 'src/real.ts'), 'export const real = 2\n')
  git(['add', '-A'])
  commit('head')
  const headSha = git(['rev-parse', 'HEAD']).trim()
  const range = resolveReviewRange({ baseSha, headSha, command: (_name, args) => git(args) })
  assert.match(range.diff, /src\/real\.ts/, 'real source must stay in the review diff')
  assert.doesNotMatch(range.diff, /src\/generated\//, 'nested generated artifacts must be excluded')
  assert.doesNotMatch(range.diff, /generated\/root\.js/, 'root-level generated artifacts must be excluded')
  fs.rmSync(directory, { recursive: true, force: true })
}

{
  // 回归：大 PR 的 git diff 曾撑爆 spawnSync 默认 1 MiB 缓冲，让 prepare 在 preflight 之前就失败。
  const bytes = 2 * 1024 * 1024
  const output = run(process.execPath, ['-e', `process.stdout.write('x'.repeat(${bytes}))`])
  assert.equal(output.length, bytes, 'large stdout must not hit ENOBUFS')
  assert.equal(SPAWN_MAX_BUFFER, 64 * 1024 * 1024, 'the documented buffer ceiling must stay explicit')
  assert.throws(
    () => run(process.execPath, ['-e', "process.stdout.write('x'.repeat(4096))"], { maxBuffer: 1024 }),
    /exceeded the configured 1024 bytes buffer/,
    'an overridden maxBuffer must be reported with the actual limit'
  )
}

{
  // coverage 是「空 findings」与「没查就收尾」之间唯一的区分依据，结构错误直接作废整份结论。
  const parsed = parseReviewFindings(
    JSON.stringify({
      summary: '把审查契约补上覆盖清单。',
      coverage: { inspected: [' .github/scripts/codex-review.mjs ', 'docs/agents/review.md'], uncovered: [] },
      findings: []
    })
  )
  assert.deepEqual(
    parsed.coverage,
    { inspected: ['.github/scripts/codex-review.mjs', 'docs/agents/review.md'], uncovered: [] },
    'coverage entries are trimmed and kept in order'
  )
  assert.equal(
    parseReviewFindings(JSON.stringify({ summary: '', findings: [] })).coverage,
    null,
    'an absent coverage block stays null so validate can name the failure'
  )
  for (const [payload, expected] of [
    [{ summary: '', coverage: [], findings: [] }, /coverage must be an object/],
    [{ summary: '', coverage: { inspected: [], uncovered: [], extra: 1 }, findings: [] }, /unknown fields: extra/],
    [
      { summary: '', coverage: { inspected: [], uncovered: [] }, findings: [{ ...finding('Nit'), extra: 1 }] },
      /unknown fields/
    ],
    [{ summary: '', coverage: { uncovered: [] }, findings: [] }, /coverage is missing inspected/],
    [
      { summary: '', coverage: { inspected: 'src/a.ts', uncovered: [] }, findings: [] },
      /coverage\.inspected must be an array/
    ],
    [
      { summary: '', coverage: { inspected: [7], uncovered: [] }, findings: [] },
      /coverage\.inspected\[0\] must be a non-empty string/
    ],
    [
      { summary: '', coverage: { inspected: ['   '], uncovered: [] }, findings: [] },
      /coverage\.inspected\[0\] must be a non-empty string/
    ]
  ]) {
    assert.throws(() => parseReviewFindings(JSON.stringify(payload)), expected)
  }
}

{
  // 评论是就地更新的，创建时间不会动；正文必须自己带上生成时间与覆盖度，否则读者无法判断新旧。
  const parsed = parseReviewFindings(
    JSON.stringify({
      summary: '把审查契约补上覆盖清单。',
      coverage: { inspected: ['src/a.ts', 'src/b.ts'], uncovered: ['src/c.ts:9 打不开'] },
      findings: []
    })
  )
  const meta = metaOf({ generated_at: '2026-11-06T11:14:38Z' })
  const body = renderConclusion({
    conclusion: deriveConclusion({ meta, findings: parsed, liveHeadSha: headSha }),
    meta: { ...meta, summary: parsed.summary, coverage: parsed.coverage, findings: parsed.findings },
    pullNumber: 519
  })
  assert.match(body, /结论生成于：`2026-11-06 11:14Z`/, 'the generation stamp must survive in-place edits')
  assert.match(body, /覆盖：检查 2 个文件，另有 1 处未覆盖/, 'coverage counts must be in the header')
  assert.match(body, /\*\*未覆盖\*\*/)
  assert.match(body, /- src\/c\.ts:9 打不开/, 'uncovered entries must be listed for the reader')

  const withoutCoverage = renderConclusion({
    conclusion: deriveConclusion({ meta, findings: parsedConclusion(), liveHeadSha: headSha }),
    meta: { ...meta, summary: '改动整体可用。', findings: [] },
    pullNumber: 519
  })
  assert.match(
    withoutCoverage,
    /覆盖：本次结论没有附覆盖清单/,
    'a reviewed conclusion without coverage cannot claim coverage'
  )

  const many = parseReviewFindings(
    JSON.stringify({
      summary: '覆盖清单很长。',
      coverage: {
        inspected: ['src/a.ts'],
        uncovered: Array.from({ length: 8 }, (_, index) => `src/f${index}.ts:1 需要判断`)
      },
      findings: []
    })
  )
  const capped = renderConclusion({
    conclusion: deriveConclusion({ meta, findings: many, liveHeadSha: headSha }),
    meta: { ...meta, summary: many.summary, coverage: many.coverage, findings: many.findings },
    pullNumber: 519
  })
  assert.match(
    capped,
    /其余 3 处见 `review-findings\.json`/,
    'the comment lists a capped slice, the artifact keeps the rest'
  )

  // 结论作废时清单跟着作废：空清单 +「无未覆盖项」会和上面的「未审查」说反话，
  // 「未覆盖」段落也会借回「这些位置要人工复核」的含义。
  const voidedMeta = metaOf({
    status: 'unreviewed',
    error_code: 'missing_coverage',
    error: 'the review reported no findings without listing a single inspected path'
  })
  const renderVoided = coverage => {
    const parsedVoid = parseReviewFindings(JSON.stringify({ summary: '...', coverage, findings: [] }))
    return renderConclusion({
      conclusion: deriveConclusion({ meta: voidedMeta, findings: parsedVoid, liveHeadSha: headSha }),
      meta: {
        ...voidedMeta,
        summary: parsedVoid.summary,
        coverage: parsedVoid.coverage,
        findings: parsedVoid.findings
      },
      pullNumber: 519
    })
  }

  // PR #519 的形状：清单是空数组，旧渲染会写成「检查 0 个文件，无未覆盖项」。
  const emptyVoided = renderVoided({ inspected: [], uncovered: [] })
  assert.match(emptyVoided, /覆盖：本次结论作废，覆盖清单不构成审查范围/)
  assert.ok(!emptyVoided.includes('无未覆盖项'), 'a void conclusion may not claim that nothing was left uncovered')
  assert.ok(!emptyVoided.includes('- 覆盖：检查'), 'a void conclusion may not print coverage counts')

  // 清单里真有未覆盖项时也不能渲染成待复核清单。
  const listedVoided = renderVoided({ inspected: [], uncovered: ['src/c.ts:9 打不开'] })
  assert.ok(
    !listedVoided.includes('**未覆盖**'),
    'a void conclusion may not ask for the uncovered entries to be rechecked'
  )
}

{
  // 提示词给的路径必须与 prepare 真正写出的位置同源（同一个 scopePath / preloadPath）：只改结论目录不改 prompt，
  // 模型会自己猜路径、拿到空清单，然后按「diff 太大」提前收尾。
  const prompt = fs.readFileSync(path.join(import.meta.dirname, '../codex/prompts/review.md'), 'utf8')
  const expected = scopePath({ RUNNER_TEMP: '$RUNNER_TEMP' })
  const expectedPreload = preloadPath({ RUNNER_TEMP: '$RUNNER_TEMP' })
  assert.ok(prompt.includes(expected), `the review prompt must point at ${expected}`)
  assert.ok(prompt.includes(expectedPreload), `the review prompt must point at ${expectedPreload}`)
  assert.ok(prompt.includes(PRELOAD_START_MARKER), 'the review prompt must carry the preload start marker')
  assert.ok(prompt.includes(PRELOAD_END_MARKER), 'the review prompt must carry the preload end marker')
  assert.ok(
    prompt.indexOf(PRELOAD_START_MARKER) < prompt.indexOf(PRELOAD_END_MARKER),
    'the preload start marker must precede the end marker'
  )
  assert.ok(prompt.includes('changed_paths'), 'the review prompt must name the changed-path list')
  assert.ok(
    prompt.includes('docs/agents/generated-artifacts.md'),
    'the review prompt must point at the generated-artifact criteria instead of inventing a list'
  )
  assert.ok(
    prompt.includes('coverage.uncovered'),
    'the review prompt must say filtered artifacts are not uncovered items'
  )
}

{
  // 收口纪律：#519 在 60 分钟上限处被掐断时，prompt 把 changed_paths 当成「逐个文件读完」的硬任务。
  // 钉住「候选清单 + 风险排序 + uncovered 合法出口 + 不许假 inspected」四件事，防止改回硬目标。
  const prompt = fs.readFileSync(path.join(import.meta.dirname, '../codex/prompts/review.md'), 'utf8')
  const closing = prompt.split('## 调查与收口')[1]?.split('## 输出')[0] ?? ''
  assert.ok(closing, 'the review prompt must have an investigation and closing section')
  for (const phrase of ['按风险分配', '证据够了就交卷', 'coverage.uncovered', 'coverage.inspected', '人工逐项复核']) {
    assert.ok(closing.includes(phrase), `the closing discipline must mention ${phrase}`)
  }
  assert.match(prompt, /候选清单，不是必须逐条读完的任务清单/)
  assert.doesNotMatch(
    prompt,
    /按 `changed_paths` 逐个文件读/,
    'the changed-path list must not become a read-everything task again'
  )
  const schema = JSON.parse(
    fs.readFileSync(path.join(import.meta.dirname, '../codex/schemas/review-findings.schema.json'), 'utf8')
  )
  assert.match(
    schema.properties.coverage.properties.uncovered.description,
    /does not void the conclusion/,
    'the schema must tell the model that a non-empty uncovered list is a valid close'
  )
  assert.match(
    schema.properties.coverage.properties.inspected.description,
    /do not add unread paths/,
    'the schema must forbid padding inspected with unread files'
  )
  const rubric = fs.readFileSync(path.join(import.meta.dirname, '../../docs/agents/review.md'), 'utf8')
  assert.match(rubric, /调查预算按风险分配/, 'the rubric must own the same closing policy as the prompt')
  assert.match(rubric, /必须由人工逐项复核/, 'the rubric must keep the human recheck duty for uncovered items')
}

{
  // 从文档的过滤路径表解析清单，与脚本常量做双向比对：单向的字符串包含只能发现
  // 「脚本新增而文档没跟上」，发现不了「文档新增而脚本没跟上」。
  const criteria = fs.readFileSync(path.join(import.meta.dirname, '../../docs/agents/generated-artifacts.md'), 'utf8')
  const section = criteria.split('## 审查范围与编辑拦截的分工')[1].split('## 新增生成物时')[0]
  const documented = section
    .split('\n')
    .filter(line => line.startsWith('| '))
    .flatMap(line => [...(line.split('|')[1] ?? '').matchAll(/`([^`]+)`/gu)].map(match => `:(exclude,glob)${match[1]}`))
  assert.deepEqual(documented, [...REVIEW_EXCLUDE_PATHSPECS])
}

{
  // `.claude/settings.json` 的 deny 是「编辑拦截」的路径权威，REVIEW_EXCLUDE_PATHSPECS 是「审查
  // 滤除」的最小 glob 集：一条 deny 可以由多条 pathspec 联合覆盖（icons/** 拆成 barrel 与
  // generated/）。三层护栏：显式覆盖表挡单侧增删，真实入库文件集合挡「同步改表」的绕过，
  // 临时 git 仓库挡 pathspec 写错。覆盖表与样例是人工维护的，新增生成物仍须按判据核对。
  const settings = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, '../../.claude/settings.json'), 'utf8'))
  assert.ok(
    settings.permissions && typeof settings.permissions === 'object',
    'the deny list must live under permissions.deny'
  )
  const deny = settings.permissions.deny
  assert.ok(Array.isArray(deny) && deny.length > 0, 'the deny list must not disappear')
  const editPrefix = 'Edit(./'
  const nonEdit = deny.filter(entry => !entry.startsWith(editPrefix))
  assert.deepEqual(
    nonEdit,
    ['Read(./**/.env)', 'Read(./**/.env.local)'],
    'only the two .env read guards may sit outside the Edit(...) generated-artifact entries'
  )
  const deniedPaths = deny
    .filter(entry => entry.startsWith(editPrefix) && entry.endsWith(')'))
    .map(entry => entry.slice(editPrefix.length, -1))
  assert.equal(deniedPaths.length + nonEdit.length, deny.length, 'every deny entry must be classified')

  const coverage = {
    'apps/*/frontend/bindings/**': {
      pathspecs: ['apps/*/frontend/bindings/**'],
      samples: ['apps/interweave/frontend/bindings/github.com/example/service/models.ts']
    },
    'apps/*/src/generated/**': {
      pathspecs: ['**/generated/**'],
      samples: ['apps/react-web-ui-demo/src/generated/button.meta.js']
    },
    '**/auto-imports.d.ts': {
      pathspecs: ['**/auto-imports.d.ts'],
      samples: ['apps/interweave/frontend/auto-imports.d.ts']
    },
    '**/routeTree.gen.ts': {
      pathspecs: ['**/routeTree.gen.ts'],
      samples: ['apps/react-web-ui-demo/src/routeTree.gen.ts']
    },
    '**/typed-router.d.ts': {
      pathspecs: ['**/typed-router.d.ts'],
      samples: ['apps/vue-web-ui-demo/typed-router.d.ts']
    },
    'packages/web-ui/src/icons/**': {
      pathspecs: ['**/generated/**', 'packages/web-ui/src/icons/index.ts'],
      samples: ['packages/web-ui/src/icons/index.ts', 'packages/web-ui/src/icons/generated/gallery.ts']
    }
  }
  assert.deepEqual(
    [...deniedPaths].sort(),
    Object.keys(coverage).sort(),
    'a new or renamed Edit(...) deny entry must be matched with review pathspecs in this table'
  )
  const pathspecs = REVIEW_EXCLUDE_PATHSPECS.map(entry => entry.replace(':(exclude,glob)', ''))
  const mapped = Object.values(coverage).flatMap(entry => entry.pathspecs)
  for (const entry of mapped) {
    assert.ok(pathspecs.includes(entry), `coverage table points at a pathspec the script does not use: ${entry}`)
  }
  assert.deepEqual(
    [...new Set(mapped)].sort(),
    [...pathspecs].sort(),
    'every review pathspec must be justified by a deny entry'
  )

  // 覆盖表是人工数据：只靠它能「同步改 deny + 覆盖表」绕过。用 git 自己的 glob 引擎把两份
  // 名单落到真实入库文件上，集合必须完全相同——新增生成物只要已有文件入库，漏改审查侧就红。
  // 尚无文件入库的新路径不在这道断言的射程内，仍按 docs/agents/generated-artifacts.md 核对。
  const repository = path.join(import.meta.dirname, '../..')
  const trackedBy = glob =>
    new Set(
      run('git', ['-C', repository, 'ls-files', '-z', '--', `:(glob)${glob}`])
        .split('\0')
        .filter(Boolean)
    )
  const matchedBy = globs => [...new Set(globs.flatMap(glob => [...trackedBy(glob)]))].sort()
  const deniedFiles = matchedBy(deniedPaths)
  const excludedFiles = matchedBy(pathspecs)
  assert.ok(deniedFiles.length > 0, 'the deny list must match tracked generated files')
  assert.deepEqual(
    deniedFiles,
    excludedFiles,
    'every tracked file denied for edits must be excluded from the review diff, and vice versa'
  )

  // 集合断言挡不住 glob 写错：把每条 deny 的样例路径与一个手写源码文件做成真实 diff，
  // 确认只有源码留在 changed_paths 里。
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-review-deny-'))
  try {
    const git = args => run('git', ['-C', directory, ...args])
    const commit = message =>
      git(['-c', 'commit.gpgsign=false', '-c', 'core.hooksPath=/dev/null', 'commit', '-q', '-m', message])
    git(['-c', 'init.defaultBranch=main', 'init', '-q'])
    git(['config', 'user.email', 'deny@example.test'])
    git(['config', 'user.name', 'Deny Test'])
    const samples = Object.values(coverage).flatMap(entry => entry.samples)
    const source = 'packages/web-ui/src/button.ts'
    for (const file of [...samples, source]) {
      fs.mkdirSync(path.join(directory, path.dirname(file)), { recursive: true })
      fs.writeFileSync(path.join(directory, file), 'base\n')
    }
    git(['add', '.'])
    commit('base')
    const baseSha = git(['rev-parse', 'HEAD']).trim()
    for (const file of [...samples, source]) {
      fs.writeFileSync(path.join(directory, file), 'head\n')
    }
    git(['add', '-A'])
    commit('head')
    const headSha = git(['rev-parse', 'HEAD']).trim()
    const range = resolveReviewRange({ baseSha, headSha, command: (_name, args) => git(args) })
    assert.deepEqual(
      range.changedPaths,
      [source],
      'every path guarded by a deny Edit(...) entry must be filtered out of the review scope'
    )
  } finally {
    fs.rmSync(directory, { recursive: true, force: true })
  }
}

{
  // 排除清单属于审查输入：它进了复用指纹，清单变更后同 head 的旧结论才不会借复用回到绿色。
  const env = {
    CODEX_RESPONSES_ENDPOINT: 'e',
    CODEX_REVIEW_MODEL: 'm',
    CODEX_REVIEW_EFFORT: 'high',
    CODEX_VERSION: 'v',
    CODEX_REVIEW_API_KEY: 'k'
  }
  const { config } = inspectConfig(env)
  const values = { endpoint: 'e', model: 'm', effort: 'high', version: 'v', key_present: true }
  assert.equal(
    config.fingerprint,
    createHash('sha256')
      .update(JSON.stringify({ ...values, excluded_pathspecs: REVIEW_EXCLUDE_PATHSPECS }))
      .digest('hex')
      .slice(0, 16)
  )
  assert.notEqual(
    config.fingerprint,
    createHash('sha256').update(JSON.stringify(values)).digest('hex').slice(0, 16),
    'the fingerprint must include the review exclusion scope'
  )
}

{
  // 端到端：没有 findings 又没交覆盖清单 → unreviewed + missing_coverage，门必须变红。
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-review-coverage-'))
  writeConfig(directory)
  const runValidate = () =>
    runCli('validate', {
      env: { CODEX_REVIEW_HEAD_SHA: headSha, CODEX_REVIEW_BASE_SHA: otherSha, CODEX_REVIEW_STEP_OUTCOME: 'success' },
      conclusionDir: directory
    })
  const metaAfter = () => JSON.parse(fs.readFileSync(path.join(directory, 'review-meta.json'), 'utf8'))
  const writeOutput = payload => {
    fs.writeFileSync(path.join(directory, 'codex-final-message.json'), JSON.stringify(payload))
    for (const name of ['review-meta.json', 'review-findings.json'])
      fs.rmSync(path.join(directory, name), { force: true })
  }

  fs.writeFileSync(
    path.join(directory, 'review-scope.json'),
    JSON.stringify({
      empty_diff: false,
      diff_bytes: 4096,
      changed_paths: ['packages/monorepo-kit/src/runner/runner.ts']
    })
  )
  // 有 findings 也不能省掉覆盖清单：交一条 Nit 就绕开整条覆盖规则，是这条契约的漏洞。
  writeOutput({ summary: '有一处小问题。', findings: [finding('Nit')] })
  runValidate()
  assert.equal(metaAfter().status, 'unreviewed', 'findings do not excuse a missing coverage list')
  assert.equal(metaAfter().error_code, 'missing_coverage')
  // 结论不可用不等于把已经看到的发现丢掉：findings 留着，红色由 status 表达。
  const preserved = readConclusion(directory)
  assert.equal(preserved.findings.counts.Nit, 1, 'the findings survive a missing coverage list')
  assert.equal(
    deriveConclusion({ meta: preserved.meta, findings: preserved.findings, liveHeadSha: headSha }).status,
    'unreviewed',
    'findings must not upgrade an unusable conclusion'
  )

  writeOutput({ summary: 'Inspecting shell i18n and related exec checks.', findings: [] })
  const emptyVerdict = runValidate()
  assert.equal(metaAfter().status, 'unreviewed', 'no findings without coverage is not a reviewed conclusion')
  assert.equal(metaAfter().error_code, 'missing_coverage')
  assert.match(emptyVerdict.result.stderr, /rerun --failed/, 'validate must point at the failed-job rerun')

  // 只读了判据文档不算审查过改动：inspected 必须命中本次 diff 改过的路径。
  writeOutput({
    summary: '改动整体可用。',
    coverage: { inspected: ['docs/agents/review.md'], uncovered: [] },
    findings: []
  })
  runValidate()
  assert.equal(metaAfter().status, 'unreviewed', 'reading the rubric is not reading the change')
  assert.equal(metaAfter().error_code, 'missing_coverage')

  // 没有 changed_paths 的 scope（上一轮 artifact 的形状）不能当放行条件：判定必须 fail closed，
  // 否则覆盖了本次范围的旧 scope 会让任意 inspected 都通过。
  fs.writeFileSync(path.join(directory, 'review-scope.json'), JSON.stringify({ empty_diff: false, diff_bytes: 4096 }))
  writeOutput({
    summary: '改动整体可用。',
    coverage: { inspected: ['docs/agents/review.md'], uncovered: [] },
    findings: []
  })
  runValidate()
  assert.equal(metaAfter().status, 'unreviewed', 'a scope without changed paths narrows nothing')
  assert.equal(metaAfter().error_code, 'missing_coverage')
  fs.writeFileSync(
    path.join(directory, 'review-scope.json'),
    JSON.stringify({
      empty_diff: false,
      diff_bytes: 4096,
      changed_paths: ['packages/monorepo-kit/src/runner/runner.ts']
    })
  )

  writeOutput({
    summary: '改动整体可用。',
    coverage: { inspected: ['packages/monorepo-kit/src/runner/runner.ts'], uncovered: [] },
    findings: []
  })
  runValidate()
  assert.equal(metaAfter().status, 'reviewed', 'coverage turns an empty findings list into a reviewable conclusion')
  assert.ok(metaAfter().generated_at, 'every conclusion records when it was generated')

  // 模型把路径写成 `path:line` 时仍算命中：写法不同不代表没读，判成 miss 只是假红。
  writeOutput({
    summary: '改动整体可用。',
    coverage: { inspected: ['./packages/monorepo-kit/src/runner/runner.ts:42'], uncovered: [] },
    findings: []
  })
  runValidate()
  assert.equal(metaAfter().status, 'reviewed', 'a path with a line suffix still points at a changed file')

  // 写父目录不等于读过里面的文件：命中必须是改动文件本身。
  for (const entry of ['packages/monorepo-kit/src/runner', 'packages/monorepo-kit/src/runner:1']) {
    writeOutput({
      summary: '改动整体可用。',
      coverage: { inspected: [entry], uncovered: [] },
      findings: []
    })
    runValidate()
    assert.equal(
      metaAfter().status,
      'unreviewed',
      `a directory entry (${entry}) must not stand in for the changed file`
    )
  }

  // 反过来：PR 改的就是判据文档时，读过该文档就是读过了改动。
  fs.writeFileSync(
    path.join(directory, 'review-scope.json'),
    JSON.stringify({ empty_diff: false, diff_bytes: 1024, changed_paths: ['docs/agents/review.md'] })
  )
  writeOutput({
    summary: '只改了判据文档。',
    coverage: { inspected: ['docs/agents/review.md'], uncovered: [] },
    findings: []
  })
  runValidate()
  assert.equal(metaAfter().status, 'reviewed', 'a rubric document is a reviewable change when the diff touches it')
  fs.writeFileSync(
    path.join(directory, 'review-scope.json'),
    JSON.stringify({
      empty_diff: false,
      diff_bytes: 4096,
      changed_paths: ['packages/monorepo-kit/src/runner/runner.ts']
    })
  )

  // 空 diff 豁免：没有源码改动可读时，空的 inspected 不是缺证据。
  fs.writeFileSync(path.join(directory, 'review-scope.json'), JSON.stringify({ empty_diff: true, diff_bytes: 0 }))
  writeOutput({ summary: '只改了生成物。', findings: [] })
  runValidate()
  assert.equal(metaAfter().status, 'reviewed', 'an empty diff needs no coverage evidence')

  // 复用路径的兜底：即使别的写入口塞进一份没有覆盖清单的旧结论，也不能让它变绿。
  fs.rmSync(path.join(directory, 'codex-final-message.json'), { force: true })
  fs.writeFileSync(
    path.join(directory, 'review-scope.json'),
    JSON.stringify({ empty_diff: false, diff_bytes: 4096, changed_paths: ['src/app.ts'] })
  )
  fs.writeFileSync(
    path.join(directory, 'review-findings.json'),
    JSON.stringify({ summary: '历史结论。', findings: [] })
  )
  fs.writeFileSync(path.join(directory, 'review-meta.json'), JSON.stringify(metaOf({ reused_from: '99' })))
  runValidate()
  assert.equal(metaAfter().status, 'unreviewed', 'a reused conclusion without coverage is not a review')
  assert.equal(metaAfter().error_code, 'missing_coverage')

  // 复用有覆盖清单的结论时沿用上一次的生成时间，不能把旧结论标成刚出炉。
  const reusable = { summary: '历史结论。', coverage: { inspected: ['src/app.ts'], uncovered: [] }, findings: [] }
  fs.writeFileSync(path.join(directory, 'review-findings.json'), JSON.stringify(reusable))
  fs.writeFileSync(
    path.join(directory, 'review-meta.json'),
    JSON.stringify(metaOf({ reused_from: '99', generated_at: '2026-11-06T11:14:38Z' }))
  )
  runValidate()
  assert.equal(metaAfter().status, 'reviewed', 'a reused conclusion that carries coverage stays reviewable')
  assert.equal(metaAfter().generated_at, '2026-11-06T11:14:38Z', 'reuse keeps the earlier generation time')

  // 上一次没记生成时间就不写，不能拿当前时间冒充它的生成时间。
  fs.writeFileSync(path.join(directory, 'review-findings.json'), JSON.stringify(reusable))
  fs.writeFileSync(path.join(directory, 'review-meta.json'), JSON.stringify(metaOf({ reused_from: '99' })))
  runValidate()
  assert.equal(metaAfter().generated_at, undefined, 'a reused conclusion without a timestamp gets none invented')

  fs.rmSync(directory, { recursive: true, force: true })
}

{
  // B1 风险分档与排序：CI/脚本/配置/manifest/公共入口 barrel (rank 0, high) →
  // packages/ & apps/ 运行时源码 (rank 1, high) → 测试/ADR/agent 文档 (rank 2, medium) →
  // 其余文档/样式/changeset (rank 3, low)；同档保持 git diff 的相对顺序。
  assert.deepEqual(RISK_TIERS, ['high', 'medium', 'low'])
  assert.equal(PRELOAD_FILE, 'review-preload.md')
  assert.equal(PRELOAD_MAX_PATHS, 30)
  assert.equal(PRELOAD_MAX_FILES, 8)
  assert.equal(PRELOAD_PER_FILE_BYTES, 4096)
  assert.equal(PRELOAD_TOTAL_DIFF_BYTES, 24576)

  for (const [filePath, expected] of [
    ['.github/workflows/ci.yml', { rank: 0, tier: 'high', category: 'contract-or-infra' }],
    ['.github/scripts/codex-review.mjs', { rank: 0, tier: 'high', category: 'contract-or-infra' }],
    ['.agents/skills/task-ledger/ledger.mjs', { rank: 0, tier: 'high', category: 'contract-or-infra' }],
    ['skills/task-ledger/ledger.mjs', { rank: 0, tier: 'high', category: 'contract-or-infra' }],
    ['package.json', { rank: 0, tier: 'high', category: 'contract-or-infra' }],
    ['packages/web-ui/package.json', { rank: 0, tier: 'high', category: 'contract-or-infra' }],
    ['packages/web-ui/src/index.ts', { rank: 0, tier: 'high', category: 'contract-or-infra' }],
    ['packages/web-ui/src/button.ts', { rank: 1, tier: 'high', category: 'runtime-source' }],
    ['apps/interweave/main.go', { rank: 1, tier: 'high', category: 'runtime-source' }],
    ['.github/scripts/codex-review.test.mjs', { rank: 2, tier: 'medium', category: 'test' }],
    ['packages/web-ui/src/button.test.ts', { rank: 2, tier: 'medium', category: 'test' }],
    ['docs/adr/0021-codex-review-gate.md', { rank: 2, tier: 'medium', category: 'policy-or-adr' }],
    ['docs/agents/review.md', { rank: 2, tier: 'medium', category: 'policy-or-adr' }],
    ['.agents/rules/code-style.md', { rank: 2, tier: 'medium', category: 'policy-or-adr' }],
    ['skills/task-ledger/SKILL.md', { rank: 2, tier: 'medium', category: 'policy-or-adr' }],
    ['AGENTS.md', { rank: 2, tier: 'medium', category: 'policy-or-adr' }],
    ['.changeset/codex-review-preload-b1.md', { rank: 3, tier: 'low', category: 'other' }],
    ['packages/web-ui/src/button.css', { rank: 3, tier: 'low', category: 'other' }],
    ['README.md', { rank: 3, tier: 'low', category: 'other' }]
  ]) {
    assert.deepEqual(classifyPathRisk(filePath), expected, `risk classification for ${filePath}`)
  }

  const ranked = rankChangedPaths([
    '.changeset/note.md',
    'docs/agents/review.md',
    'packages/web-ui/src/button.ts',
    '.github/scripts/codex-review.test.mjs',
    '.github/scripts/codex-review.mjs',
    'apps/interweave/service.go',
    'packages/web-ui/package.json'
  ])
  assert.deepEqual(
    ranked.map(entry => entry.path),
    [
      '.github/scripts/codex-review.mjs',
      'packages/web-ui/package.json',
      'packages/web-ui/src/button.ts',
      'apps/interweave/service.go',
      'docs/agents/review.md',
      '.github/scripts/codex-review.test.mjs',
      '.changeset/note.md'
    ],
    'rankChangedPaths must sort by risk rank while keeping relative order within each rank'
  )
}

{
  // splitDiffByPath：覆盖修改、新增、删除、重命名、纯 mode 变更与 Git C 风格八进制引号路径，
  // 且不启动任何额外 git 子进程。
  const sampleDiff = [
    'diff --git a/packages/web-ui/src/button.ts b/packages/web-ui/src/button.ts',
    'index 1111111..2222222 100644',
    '--- a/packages/web-ui/src/button.ts',
    '+++ b/packages/web-ui/src/button.ts',
    '@@ -1 +1 @@',
    '-export const a = 1',
    '+export const a = 2',
    'diff --git a/src/deleted.ts b/src/deleted.ts',
    'deleted file mode 100644',
    'index 3333333..0000000',
    '--- a/src/deleted.ts',
    '+++ /dev/null',
    '@@ -1 +0,0 @@',
    '-gone',
    'diff --git a/src/old-name.ts b/src/new-name.ts',
    'similarity index 100%',
    'rename from src/old-name.ts',
    'rename to src/new-name.ts',
    'diff --git a/scripts/mode-only.sh b/scripts/mode-only.sh',
    'old mode 100644',
    'new mode 100755',
    'diff --git "a/scripts/\\344\\270\\255\\346\\226\\207.sh" "b/scripts/\\344\\270\\255\\346\\226\\207.sh"',
    'old mode 100644',
    'new mode 100755',
    // "docs/中文.md" in UTF-8 octal: \344\270\255\346\226\207
    'diff --git "a/docs/\\344\\270\\255\\346\\226\\207.md" "b/docs/\\344\\270\\255\\346\\226\\207.md"',
    'new file mode 100644',
    'index 0000000..4444444',
    '--- /dev/null',
    '+++ "b/docs/\\344\\270\\255\\346\\226\\207.md"',
    '@@ -0,0 +1 @@',
    '+# 标题'
  ].join('\n')

  const changedPaths = [
    'packages/web-ui/src/button.ts',
    'src/deleted.ts',
    'src/new-name.ts',
    'scripts/mode-only.sh',
    'scripts/中文.sh',
    'docs/中文.md'
  ]
  const byPath = splitDiffByPath(sampleDiff, changedPaths)
  assert.deepEqual([...byPath.keys()], changedPaths)
  assert.match(byPath.get('packages/web-ui/src/button.ts'), /\+export const a = 2/)
  assert.match(byPath.get('src/deleted.ts'), /deleted file mode 100644/)
  assert.match(byPath.get('src/new-name.ts'), /rename to src\/new-name\.ts/)
  assert.match(byPath.get('scripts/mode-only.sh'), /new mode 100755/)
  assert.match(byPath.get('scripts/中文.sh'), /new mode 100755/)
  assert.match(byPath.get('docs/中文.md'), /\+# 标题/)
  assert.equal(splitDiffByPath('', changedPaths).size, 0)
}

{
  // truncateUtf8ByLines 与 wrapCodeFence：行边界截断、多字节 UTF-8 不产生 U+FFFD、
  // 动态加长反引号围栏防止 diff 内容里的 ``` 提前闭合代码块。
  const short = truncateUtf8ByLines('line1\nline2', 100)
  assert.deepEqual(short, { text: 'line1\nline2', truncated: false, shownBytes: 11, totalBytes: 11 })

  const multiLine = truncateUtf8ByLines('first-line\nsecond-line\nthird-line', 15)
  assert.equal(multiLine.text, 'first-line')
  assert.equal(multiLine.truncated, true)
  assert.equal(multiLine.shownBytes, 10)

  // 单行超长且含多字节中文字符（每字 3 bytes）：10 bytes 预算只能容纳 3 个汉字（9 bytes），不能切出半个字节。
  const utf8SingleLine = truncateUtf8ByLines('中文字符测试数据', 10)
  assert.equal(utf8SingleLine.text, '中文字')
  assert.equal(utf8SingleLine.truncated, true)
  assert.equal(utf8SingleLine.shownBytes, 9)
  assert.ok(!utf8SingleLine.text.includes('\uFFFD'), 'UTF-8 truncation must never split a multi-byte codepoint')

  assert.deepEqual(truncateUtf8ByLines('abc', 0), { text: '', truncated: true, shownBytes: 0, totalBytes: 3 })

  assert.equal(wrapCodeFence('+normal line', 'diff'), '```diff\n+normal line\n```')
  const fencedWithBackticks = wrapCodeFence('+```markdown\n+````nested\n+```', 'diff')
  assert.ok(
    fencedWithBackticks.startsWith('`````diff\n') && fencedWithBackticks.endsWith('\n`````'),
    'wrapCodeFence must use a fence strictly longer than any backtick run inside the diff'
  )
}

{
  // buildReviewPreload：验证按风险排序、单文件与总字节预算截断、路径数上限，以及空 diff 豁免。
  const diffBlock = (filePath, bodyLine) =>
    [
      `diff --git a/${filePath} b/${filePath}`,
      `--- a/${filePath}`,
      `+++ b/${filePath}`,
      '@@ -1 +1 @@',
      `+${bodyLine}`
    ].join('\n')

  const lowPath = '.changeset/low.md'
  const medPath = 'docs/agents/review.md'
  const highRuntime = 'packages/web-ui/src/button.ts'
  const highInfra = '.github/scripts/codex-review.mjs'
  const fullDiff = [
    diffBlock(lowPath, 'low change'),
    diffBlock(medPath, 'medium change'),
    diffBlock(highRuntime, 'x'.repeat(240)),
    diffBlock(highInfra, 'infra change')
  ].join('\n')

  const preload = buildReviewPreload(
    {
      baseSha: otherSha,
      headSha,
      mergeBaseSha: otherSha,
      diff: fullDiff,
      changedPaths: [lowPath, medPath, highRuntime, highInfra]
    },
    { maxPaths: 3, maxFiles: 2, perFileBytes: 220, totalDiffBytes: 360 }
  )

  assert.deepEqual(
    preload.rankedPaths.map(entry => entry.path),
    [highInfra, highRuntime, medPath, lowPath]
  )
  assert.deepEqual(preload.preloadedPaths, [highInfra, highRuntime])
  assert.deepEqual(preload.truncatedPaths, [highRuntime], 'the oversized runtime file must be marked truncated')
  assert.deepEqual(preload.omittedPaths, [medPath, lowPath])
  assert.match(preload.markdown, /### 判据速览/)
  assert.match(preload.markdown, /`\[high\]`/)
  assert.match(preload.markdown, /`\.github\/scripts\/codex-review\.mjs`（已预注入完整 diff）/)
  assert.match(preload.markdown, /`packages\/web-ui\/src\/button\.ts`（已预注入截断 diff）/)
  assert.match(preload.markdown, /`docs\/agents\/review\.md`（未预注入，按需 git diff）/)
  assert.match(preload.markdown, /其余 1 个路径见 `\$RUNNER_TEMP\/codex-review\/review-scope\.json`/)
  assert.ok(preload.preloadBytes > 0)

  const emptyPreload = buildReviewPreload({
    baseSha: otherSha,
    headSha,
    mergeBaseSha: otherSha,
    diff: '',
    changedPaths: []
  })
  assert.deepEqual(emptyPreload.preloadedPaths, [])
  assert.deepEqual(emptyPreload.truncatedPaths, [])
  assert.match(emptyPreload.markdown, /empty_diff: true/)
}

{
  // commandPrepare 与 injectPreloadIntoPrompt：写出 pr.diff、review-preload.md、含 preloaded_paths/preload_bytes 的
  // review-scope.json，并幂等替换 staged prompt 里的 <!-- codex-review-preload:start/end --> 区块。
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-review-prepare-'))
  try {
    const promptPath = trustedPromptPath({ RUNNER_TEMP: tempRoot })
    fs.mkdirSync(path.dirname(promptPath), { recursive: true })
    const templatePrompt = fs.readFileSync(path.join(import.meta.dirname, '../codex/prompts/review.md'), 'utf8')
    fs.writeFileSync(promptPath, templatePrompt)
    const outputFile = path.join(tempRoot, 'github-output.txt')
    fs.writeFileSync(outputFile, '')

    const diffText = [
      'diff --git a/.github/scripts/codex-review.mjs b/.github/scripts/codex-review.mjs',
      '--- a/.github/scripts/codex-review.mjs',
      '+++ b/.github/scripts/codex-review.mjs',
      '@@ -1 +1,3 @@',
      '-const oldVal = 1',
      '+const newVal = 2',
      `+const startMarker = '${PRELOAD_START_MARKER}'`,
      `+const endMarker = '${PRELOAD_END_MARKER}'`,
      'diff --git a/packages/web-ui/src/button.ts b/packages/web-ui/src/button.ts',
      '--- a/packages/web-ui/src/button.ts',
      '+++ b/packages/web-ui/src/button.ts',
      '@@ -1 +1 @@',
      '-export const btn = false',
      '+export const btn = true',
      ''
    ].join('\n')

    const fakeGit = (_name, args) => {
      if (args[0] === 'merge-base') return `${otherSha}\n`
      if (args[0] === 'diff' && args.includes('--name-only')) {
        return 'packages/web-ui/src/button.ts\u0000.github/scripts/codex-review.mjs\u0000'
      }
      if (args[0] === 'diff') return diffText
      return ''
    }

    const env = {
      RUNNER_TEMP: tempRoot,
      CODEX_REVIEW_BASE_SHA: otherSha,
      CODEX_REVIEW_HEAD_SHA: headSha,
      GITHUB_OUTPUT: outputFile
    }

    commandPrepare({ env, command: fakeGit })
    const firstPrompt = fs.readFileSync(promptPath, 'utf8')
    // 第二次执行必须幂等，不得叠加第二个预注入块。
    commandPrepare({ env, command: fakeGit })
    const secondPrompt = fs.readFileSync(promptPath, 'utf8')
    assert.equal(secondPrompt, firstPrompt, 'commandPrepare prompt injection must be idempotent')
    assert.equal(secondPrompt.split(PRELOAD_START_MARKER).length - 1, 1, 'start marker must appear once')
    assert.equal(secondPrompt.split(PRELOAD_END_MARKER).length - 1, 1, 'end marker must appear once')
    assert.ok(!secondPrompt.includes('若未注入，请读'), 'placeholder inside markers must be replaced')
    assert.match(secondPrompt, /\+const newVal = 2/)

    const writtenPreload = fs.readFileSync(preloadPath(env), 'utf8')
    assert.match(writtenPreload, /\+const newVal = 2/)
    assert.match(writtenPreload, /\+export const btn = true/)

    const scope = JSON.parse(fs.readFileSync(scopePath(env), 'utf8'))
    assert.deepEqual(scope.changed_paths, ['packages/web-ui/src/button.ts', '.github/scripts/codex-review.mjs'])
    assert.deepEqual(scope.preloaded_paths, ['.github/scripts/codex-review.mjs', 'packages/web-ui/src/button.ts'])
    assert.ok(Number.isInteger(scope.preload_bytes) && scope.preload_bytes > 0)

    const outputs = fs.readFileSync(outputFile, 'utf8')
    assert.ok(outputs.includes(`preload_path=${preloadPath(env)}`))

    // 没有起止标记的模板也能追加预注入块，再次注入同样保持幂等。
    const unmarked = '# Title\n\nBody text.'
    const injectedOnce = injectPreloadIntoPrompt(unmarked, 'Preload body')
    const injectedTwice = injectPreloadIntoPrompt(injectedOnce, 'Updated preload body')
    assert.equal(injectedTwice.split(PRELOAD_START_MARKER).length - 1, 1)
    assert.ok(injectedTwice.includes('Updated preload body'))
    assert.ok(!injectedTwice.includes('Preload body'))
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true })
  }
}

console.log('.github/scripts/codex-review.test.mjs: all assertions passed')
