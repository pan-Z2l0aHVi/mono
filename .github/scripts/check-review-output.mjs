import fs from 'node:fs'
import path from 'node:path'

import { coverageGap, parseReviewFindings } from './codex-review.mjs'

/**
 * 无可用结论：diff 非空而模型交出没有覆盖证据的空壳（`missing_coverage`），或模型未产出可用结论
 * （`unusable_output`，例如未闭合的推理标签块、工具调用标签泄漏、增量 `prior_resolutions` 失配，
 * 或模型步骤成功退出却未写出输出文件）。
 *
 * 这两类故障下 `run_codex` 与 `validate` 原本都以 0 退出，只有 `codex-gate` 判红，造成
 * 「review 绿 / gate 红」割裂；`gh run rerun --failed` 因此只会重跑 gate、拿同一份坏 artifact
 * 二次判红。
 *
 * 判据复用 `parseReviewFindings`、`coverageGap` 以及前一步 `validate` 落盘的 `review-meta.json`，
 * 与 `validate` 判 `unreviewed`（`unusable_output` + `missing_coverage`）的集合完全对齐。
 * 这一步只让 review job 一起变红，好让 `--failed` 重跑模型 job；它不判绿、不改判结论，
 * 结论仍由取自 PR base 的 trusted `validate` / `gate` 裁决。脚本从工作区（PR head）读取，本 PR 即生效。
 */
export function inspectReviewOutput(raw, scope, meta = null) {
  if (meta?.status === 'error') {
    return { rejected: false, code: '', reason: '' }
  }
  if (raw === null || raw === undefined) {
    if (meta?.status === 'unreviewed') {
      return {
        rejected: true,
        code: meta.error_code || 'unusable_output',
        reason: meta.error || 'the review step produced no output file'
      }
    }
    return { rejected: false, code: '', reason: '' }
  }
  let parsed
  try {
    parsed = parseReviewFindings(raw)
  } catch (error) {
    return {
      rejected: true,
      code: 'unusable_output',
      reason: error instanceof Error ? error.message : String(error)
    }
  }
  // scope 读不到时按「非空 diff、无 changed_paths」处理：无法证明 empty_diff，fail closed。
  const effectiveScope = scope ?? { empty_diff: false, changed_paths: [] }
  const gap = coverageGap(parsed, effectiveScope)
  if (gap !== '') {
    return { rejected: true, code: 'missing_coverage', reason: gap }
  }
  if (meta?.status === 'unreviewed') {
    return {
      rejected: true,
      code: meta.error_code || 'unusable_output',
      reason: meta.error || 'review conclusion is unreviewed'
    }
  }
  return { rejected: false, code: '', reason: '' }
}

export function shouldRejectReviewOutput(raw, scope, meta = null) {
  return inspectReviewOutput(raw, scope, meta).rejected
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch {
    return null
  }
}

// 与 codex-review.mjs 同款入口守卫：不依赖 import.meta.main，旧 Node 上也不会静默跳过。
if (import.meta.url === `file://${process.argv[1]}`) {
  const runnerTemp = process.env.RUNNER_TEMP ?? ''
  const outputPath = process.env.CODEX_REVIEW_OUTPUT_PATH ?? path.join(runnerTemp, 'codex-final-message.json')
  const scopePath = process.env.CODEX_REVIEW_SCOPE_PATH ?? path.join(runnerTemp, 'codex-review', 'review-scope.json')
  const metaPath = process.env.CODEX_REVIEW_META_PATH ?? path.join(path.dirname(scopePath), 'review-meta.json')
  const meta = fs.existsSync(metaPath) ? readJson(metaPath) : null

  if (!fs.existsSync(outputPath)) {
    const verdict = inspectReviewOutput(null, null, meta)
    if (verdict.rejected) {
      console.error(`Codex review returned no usable conclusion (${verdict.code}): ${verdict.reason}`)
      console.error('The review job fails with the gate so `gh run rerun --failed` reruns the model leg.')
      console.error('A repeat after rerunning means the prompt or the output contract needs fixing.')
      process.exitCode = 1
    } else {
      console.log('check-review-output: no model output; validate decides')
    }
  } else {
    const scope = fs.existsSync(scopePath) ? readJson(scopePath) : null
    if (scope === null)
      console.error(`check-review-output: scope unavailable at ${scopePath}; assuming a non-empty diff`)
    const raw = fs.readFileSync(outputPath, 'utf8')
    const verdict = inspectReviewOutput(raw, scope, meta)
    if (verdict.rejected) {
      console.error(`Codex review returned no usable conclusion (${verdict.code}): ${verdict.reason}`)
      console.error('The review job fails with the gate so `gh run rerun --failed` reruns the model leg.')
      console.error('A repeat after rerunning means the prompt or the output contract needs fixing.')
      process.exitCode = 1
    } else {
      console.log('check-review-output: conclusion passes the output and coverage checks')
    }
  }
}
