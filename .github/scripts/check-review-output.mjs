import fs from 'node:fs'
import path from 'node:path'

import { coverageGap, parseReviewFindings } from './codex-review.mjs'

/**
 * 空壳结论：diff 非空，模型却交出没有覆盖证据的结论。
 *
 * PR #527 连续两轮里，模型在读完判据文档、还没打开任何改动文件时就交出 schema 允许的空
 * 对象，`run_codex` 与 review job 都标 `success`，只有 gate 判红。结果是「review 绿 / gate 红」
 * 割裂，且 `gh run rerun --failed` 只会重跑 gate、artifact 还是同一份空壳，必然二次判红。
 *
 * 判据直接复用 `coverageGap` / `parseReviewFindings`，与 `validate` 判 `missing_coverage`
 * 的集合逐例对齐：不只是「无 findings + 无 inspected」，还包括整个 coverage 缺席、
 * 以及 inspected 没命中本次 changed_paths（只读了判据文档就收尾）。这一步只让 review
 * job 一起变红，好让 `--failed` 重跑模型 job；它不判绿、不改判结论，结论仍由取自 PR base
 * 的 trusted `validate` / `gate` 裁决。脚本从工作区（PR head）读取，本 PR 即生效。
 */
export function shouldRejectReviewOutput(raw, scope) {
  let parsed
  try {
    parsed = parseReviewFindings(raw)
  } catch {
    // 结构错误（坏 JSON、缺 findings、未知档位…）由 validate 判 unusable_output：
    // 这里不越权，也不把「模型 job 崩了」洗成一次普通的空结论。
    return false
  }
  // scope 读不到时按「非空 diff、无 changed_paths」处理：无法证明 empty_diff，fail closed。
  const effectiveScope = scope ?? { empty_diff: false, changed_paths: [] }
  return coverageGap(parsed, effectiveScope) !== ''
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

  if (!fs.existsSync(outputPath)) {
    console.log('check-review-output: no model output; validate decides')
  } else {
    const scope = fs.existsSync(scopePath) ? readJson(scopePath) : null
    if (scope === null)
      console.error(`check-review-output: scope unavailable at ${scopePath}; assuming a non-empty diff`)
    const raw = fs.readFileSync(outputPath, 'utf8')
    if (shouldRejectReviewOutput(raw, scope)) {
      console.error('Codex review returned no usable coverage evidence (missing_coverage).')
      console.error('The review job fails with the gate so `gh run rerun --failed` reruns the model leg.')
      console.error('A repeat after rerunning means the prompt or the output contract needs fixing.')
      process.exitCode = 1
    } else {
      console.log('check-review-output: conclusion passes the coverage gap check')
    }
  }
}
