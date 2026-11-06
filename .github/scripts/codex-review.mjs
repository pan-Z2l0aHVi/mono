import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

import { SPAWN_MAX_BUFFER, commandError, run } from './lib/github.mjs'
import { CODEX_CONFIG_ENV, RELEASE_BRANCH } from './lib/workflow-topology.mjs'

const BASE_BRANCH = 'main'

export const FINDINGS_ARTIFACT = 'codex-review-findings'
export const CONCLUSION_MARKER = 'codex-review-conclusion'
export const FINDINGS_FILE = 'review-findings.json'
export const META_FILE = 'review-meta.json'
export const SCOPE_FILE = 'review-scope.json'
export const CONFIG_FILE = 'codex-config.json'
export const SEVERITIES = Object.freeze(['Block', 'Should fix', 'Nit'])

// 顺序即诊断输出顺序，与 CI 拓扑断言共用同一份名单。密钥只判「有没有」，值从不写进快照、日志或 PR 评论。
export const CONFIG_ENV = CODEX_CONFIG_ENV

// 路径层面的批量 churn 过滤：md-to-meta 的 meta/codeblock 随 markdown 重建整批换名，
// icons/generated 等入库产物同样只随 generator 变，塞进审查 diff 只会淹没真实改动。
// 用 glob magic 让前导 **/ 同时覆盖嵌套与根级 generated/；review-scope.json 留痕便于审计。
export const REVIEW_EXCLUDE_PATHSPECS = Object.freeze([':(exclude,glob)**/generated/**'])

const FINDING_FIELDS = Object.freeze(['severity', 'file', 'line', 'problem', 'suggestion'])
const COVERAGE_FIELDS = Object.freeze(['inspected', 'uncovered'])
const SHA_PATTERN = /^[0-9a-f]{40,64}$/iu
const FIELD_LIMIT = 700
// 未覆盖清单是给人看的行动提示，不是全量报表；超出部分留在 artifact 里，别把评论撑爆。
const UNCOVERED_LIMIT = 5

function emptyCounts() {
  return Object.fromEntries(SEVERITIES.map(severity => [severity, 0]))
}

function requireSha(value, label) {
  if (typeof value !== 'string' || !SHA_PATTERN.test(value)) throw new Error(`${label} is not a commit SHA: ${value}`)
  return value
}

/**
 * `coverage` 是「这次到底查了什么」的唯一凭据，也是空 findings 与「没查就收尾」之间唯一的区分。
 * 结构错了按契约失败处理（整份结论作废）；整个字段缺席则交给 validate 判 `missing_coverage`，
 * 好让故障码说清是「模型没交证据」而不是「输出不可解析」。
 */
function parseCoverage(value) {
  if (value === undefined || value === null) return null
  if (typeof value !== 'object' || Array.isArray(value)) throw new Error('review output coverage must be an object')
  const unknown = Object.keys(value).filter(key => !COVERAGE_FIELDS.includes(key))
  if (unknown.length > 0) throw new Error(`review output coverage has unknown fields: ${unknown.join(', ')}`)
  const coverage = {}
  for (const field of COVERAGE_FIELDS) {
    if (!(field in value)) throw new Error(`review output coverage is missing ${field}`)
    if (!Array.isArray(value[field])) throw new Error(`review output coverage.${field} must be an array`)
    coverage[field] = value[field].map((entry, index) => {
      if (typeof entry !== 'string' || entry.trim() === '') {
        throw new Error(`review output coverage.${field}[${index}] must be a non-empty string`)
      }
      return entry.trim()
    })
  }
  return coverage
}

/**
 * 模型输出是门禁的唯一输入，必须先过结构校验：未知档位、未知字段或空文本都会让结论不可信，
 * 宁可判「未审查」，也不带着半截 JSON 去拦或放。
 * `summary` 只是评论顶部的一行摘要，缺它不影响档位与阻断判定，因此不做硬校验：
 * 把装饰性字段判成致命错误，代价是整份 findings 作废、门却在绿色里沉默。
 */
export function parseReviewFindings(raw) {
  let value
  try {
    value = JSON.parse(raw)
  } catch (error) {
    throw new Error(`review output is not valid JSON: ${error.message}`)
  }
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('review output must be a JSON object')
  const summary = typeof value.summary === 'string' ? value.summary.trim() : ''
  const coverage = parseCoverage(value.coverage)
  if (!Array.isArray(value.findings)) throw new Error('review output needs a findings array')

  const findings = value.findings.map((entry, index) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new Error(`finding ${index} must be an object`)
    }
    const unknown = Object.keys(entry).filter(key => !FINDING_FIELDS.includes(key))
    if (unknown.length > 0) throw new Error(`finding ${index} has unknown fields: ${unknown.join(', ')}`)
    for (const field of FINDING_FIELDS) {
      if (!(field in entry)) throw new Error(`finding ${index} is missing ${field}`)
    }
    if (!SEVERITIES.includes(entry.severity))
      throw new Error(`finding ${index} has unknown severity: ${entry.severity}`)
    for (const field of ['file', 'problem', 'suggestion']) {
      if (typeof entry[field] !== 'string') throw new Error(`finding ${index}.${field} must be a string`)
    }
    if (entry.problem.trim() === '') throw new Error(`finding ${index}.problem must not be empty`)
    if (!Number.isInteger(entry.line) || entry.line < 0) {
      throw new Error(`finding ${index}.line must be a non-negative integer`)
    }
    return {
      severity: entry.severity,
      file: entry.file.trim(),
      line: entry.line,
      problem: entry.problem.trim(),
      suggestion: entry.suggestion.trim()
    }
  })

  const counts = emptyCounts()
  for (const finding of findings) counts[finding.severity] += 1
  return { summary, coverage, findings, counts }
}

/**
 * `coverage` 是结论的一部分，不是可选装饰：schema 已列为必填，缺了就是模型没按契约输出，
 * 不论有没有 findings 都判 `missing_coverage`——否则交一条 Nit 就能绕开整条覆盖规则。
 * 空 findings 时另外要求清单真的落到本次改动的路径上：只读了判据文档就收尾，正是要区分的早停。
 * 返回空串表示通过，否则返回写进结论的失败原因。diff 为空时整条豁免：那时没有改动可读。
 */
function coverageGap(parsed, scope) {
  if (scope.empty_diff) return ''
  if (!parsed.coverage) return 'the conclusion carries no coverage list'
  if (parsed.findings.length > 0) return ''
  const inspected = parsed.coverage.inspected ?? []
  if (inspected.length === 0) return 'the review reported no findings without listing a single inspected path'
  const changed = Array.isArray(scope.changed_paths) ? scope.changed_paths : []
  if (!inspected.some(entry => touchesChangedPath(entry, changed)))
    return 'the review reported no findings but inspected none of the changed paths'
  return ''
}

/**
 * 旧结论要被复用，还得先来自当前契约：`coverage` 是这一版才加上的必填字段，
 * 没有它的产物一律不能沿用，否则一次没有证据的审查会借复用回到绿色。
 */
function reuseCoverageGap(parsed, scope) {
  if (!parsed.coverage) return 'the prior conclusion carries no coverage list'
  return coverageGap(parsed, scope)
}

/**
 * `inspected` 里的路径可能带 `./`、`path:line` 后缀、结尾斜杠，或只写到改动文件所在的目录，
 * 按最宽松的方式对齐：这些写法都指向同一个文件，判成 miss 只会制造假红。
 */
function touchesChangedPath(entry, changed) {
  const normalized = String(entry)
    .trim()
    .replace(/^\.\//u, '')
    .replace(/:\d+(?::\d+)?$/u, '')
    .replace(/\/+$/u, '')
  if (normalized === '') return false
  return changed.some(file => file === normalized || file.startsWith(`${normalized}/`))
}

export function resolveReviewRange({ baseSha, headSha, command = run }) {
  const base = requireSha(baseSha, 'PR base SHA')
  const head = requireSha(headSha, 'PR head SHA')
  for (const sha of [base, head]) {
    try {
      command('git', ['cat-file', '-e', `${sha}^{commit}`])
    } catch {
      // PR 分支落后 base 时，检出 head 不会带上 base 的最新提交，merge base 之外还要能读到 base。
      command('git', ['fetch', '--no-tags', 'origin', sha])
    }
  }
  const mergeBaseSha = requireSha(command('git', ['merge-base', base, head]).trim(), 'merge base SHA')
  const diff = command('git', ['diff', '--no-color', mergeBaseSha, head, '--', ...REVIEW_EXCLUDE_PATHSPECS])
  // 覆盖度判定需要知道「这次到底改了哪些文件」，否则只读了判据文档也能自称审查过。
  const names = command('git', ['diff', '--name-only', '-z', mergeBaseSha, head, '--', ...REVIEW_EXCLUDE_PATHSPECS])
  const changedPaths = names.split('\u0000').filter(name => name !== '')
  return { baseSha: base, headSha: head, mergeBaseSha, diff, changedPaths }
}

export function readConclusion(directory) {
  const findingsPath = path.join(directory, FINDINGS_FILE)
  const metaPath = path.join(directory, META_FILE)
  if (!fs.existsSync(metaPath)) return null
  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'))
  if (!fs.existsSync(findingsPath)) return { meta, findings: null }
  const findings = parseReviewFindings(fs.readFileSync(findingsPath, 'utf8'))
  return {
    meta: { ...meta, findings: findings.findings, summary: findings.summary, coverage: findings.coverage },
    findings
  }
}

/** 配置快照只保留非密钥字段，指纹把端点/模型/强度/版本/密钥有无绑成复用键的一部分。 */
export function inspectConfig(env = process.env) {
  const text = name => (env[name] ?? '').trim()
  const missing = CONFIG_ENV.filter(name => text(name) === '')
  const values = {
    endpoint: text('CODEX_RESPONSES_ENDPOINT'),
    model: text('CODEX_REVIEW_MODEL'),
    effort: text('CODEX_REVIEW_EFFORT'),
    version: text('CODEX_VERSION'),
    key_present: text('CODEX_REVIEW_API_KEY') !== ''
  }
  const fingerprint = createHash('sha256').update(JSON.stringify(values)).digest('hex').slice(0, 16)
  return { present: missing.length === 0, missing, config: { ...values, fingerprint } }
}

export function readConfig(env = process.env) {
  const file = path.join(env.RUNNER_TEMP ?? '.', CONFIG_FILE)
  if (!fs.existsSync(file)) return null
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    return null
  }
}

/**
 * `error` 是配置或调用故障，`unreviewed` 是模型跑完却没给出可用结论；两者都是审查链路的故障，
 * 都要让门变红。绿色只留给「已审查」「已过时」与「不适用」——绿色必须意味着有结论可读。
 */
export function deriveConclusion({ meta, findings, liveHeadSha, error, notApplicable = false }) {
  const counts = findings?.counts ?? emptyCounts()
  if (meta?.status === 'error') {
    return {
      status: 'error',
      reason: meta.error ?? 'the Codex review failed',
      code: meta.error_code ?? 'unknown',
      counts,
      blocking: true
    }
  }
  // 状态是权威：`unreviewed` 即使带着 findings 也不是「已审查」，
  // findings 只说明这次审查看到了什么，不能把一份不可用的结论洗成绿色。
  if (meta?.status === 'unreviewed') {
    return {
      status: 'unreviewed',
      reason: meta.error ?? error ?? 'the review job produced no conclusion',
      code: meta.error_code ?? 'unusable_output',
      counts,
      blocking: true
    }
  }
  if (error || !findings || !meta) {
    if (notApplicable) {
      return {
        status: 'not_applicable',
        reason: error ?? 'the review job did not run for this pull request',
        counts,
        blocking: false
      }
    }
    return {
      status: 'error',
      reason: error ?? 'the review job produced no conclusion',
      code: 'artifact_missing',
      counts,
      blocking: true
    }
  }
  if (meta.head_sha !== liveHeadSha) {
    return {
      status: 'stale',
      reason: `the PR head moved from ${meta.head_sha} to ${liveHeadSha}`,
      counts,
      blocking: false
    }
  }
  return { status: 'reviewed', reason: '', counts, blocking: counts.Block > 0 }
}

/**
 * 评论正文会交给 GitHub 渲染 Markdown。模型文本里的尖括号必须当文本处理，
 * 否则 `<script>` 会变成 HTML；直接删除又会吃掉 `Plugin<ToolchainApi, KitCtx>`。
 * 这里不把「代码段识别正确」当作安全前提：先把所有内容按 HTML 转义，
 * 命中代码段时再包一层自己生成的 `<code>`。即使识别错了，输入也已转义，
 * 最坏结果只是格式不对，不会漏出标签。
 */
function isEscaped(text, index) {
  let backslashes = 0
  for (let cursor = index - 1; cursor >= 0 && text[cursor] === '\\'; cursor -= 1) backslashes += 1
  return backslashes % 2 === 1
}

function escapeHtml(value) {
  return String(value).replace(/&/gu, '&amp;').replace(/</gu, '&lt;').replace(/>/gu, '&gt;')
}

function richText(value) {
  const text = oneLine(value)
  let result = ''
  let index = 0
  while (index < text.length) {
    let tick = text.indexOf('`', index)
    // CommonMark：反斜杠转义的反引号是普通字符；代码段内反斜杠不转义，所以只查开符。
    while (tick !== -1 && isEscaped(text, tick)) tick = text.indexOf('`', tick + 1)
    if (tick === -1) {
      result += escapeHtml(text.slice(index))
      break
    }
    result += escapeHtml(text.slice(index, tick))
    let runEnd = tick
    while (text[runEnd] === '`') runEnd += 1
    const run = runEnd - tick
    let close = -1
    let search = runEnd
    while (search < text.length) {
      const next = text.indexOf('`', search)
      if (next === -1) break
      let end = next
      while (text[end] === '`') end += 1
      if (end - next === run) {
        close = next
        break
      }
      search = end
    }
    if (close === -1) {
      // 没有同长度闭合的 run 是普通文本，后面的合法代码段仍要识别。
      result += escapeHtml(text.slice(tick, runEnd))
      index = runEnd
      continue
    }
    // CommonMark 会去掉代码段首尾各一个空格（内容全是空格时除外）。
    let content = text.slice(runEnd, close)
    if (content.length > 1 && content.startsWith(' ') && content.endsWith(' ') && content.trim() !== '') {
      content = content.slice(1, -1)
    }
    result += `<code>${escapeHtml(content)}</code>`
    index = close + run
  }
  return result
}

function plainText(value) {
  return escapeHtml(oneLine(value))
}

function codeSpan(value) {
  return `<code>${escapeHtml(oneLine(value))}</code>`
}

function oneLine(value) {
  const single = String(value).replace(/\s+/gu, ' ')
  return single.length > FIELD_LIMIT ? `${single.slice(0, FIELD_LIMIT)}…` : single
}

function location(finding) {
  // 路径会进行内代码：换行会断开段落，先折成一行。
  const file = finding.file.replace(/\s+/gu, ' ')
  if (file === '') return finding.line === 0 ? '整体' : `行 ${finding.line}`
  return finding.line === 0 ? file : `${file}:${finding.line}`
}

// 评论是就地更新的：创建时间永远停在第一次写回那一刻，所以「这版结论是什么时候生成的」
// 只能由正文自己说明，否则读者会把一条已刷新的结论当成旧的。
function stamp(value) {
  if (typeof value !== 'string' || value === '') return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = part => String(part).padStart(2, '0')
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}Z`
}

export function renderConclusion({ conclusion, meta, pullNumber }) {
  const labels = {
    reviewed: '已审查',
    unreviewed: '未审查',
    stale: '已过时',
    error: '审查失败',
    not_applicable: '不适用'
  }
  const verdict = conclusion.status === 'reviewed' && conclusion.blocking ? 'blocked' : conclusion.status
  const lines = [
    `<!-- ${CONCLUSION_MARKER} sha=${meta?.head_sha ?? 'none'} status=${verdict} blocks=${conclusion.counts.Block} -->`,
    '',
    '## Codex PR 审查',
    '',
    `- 结论：**${labels[conclusion.status]}**${conclusion.reason ? `（原因：${richText(conclusion.reason)}）` : ''}`,
    `- 审查快照：\`${meta?.head_sha ?? '无'}\``,
    `- 档位统计：Block ${conclusion.counts.Block} · Should fix ${conclusion.counts['Should fix']} · Nit ${conclusion.counts.Nit}`,
    '- 合并判据：`Block`、`error` 与「未审查」让 `codex-gate` 变红；已过时与不适用不拦合并，但结论不覆盖当前 head。',
    '- 这是约定式门禁，GitHub 没有把它设为必需检查；合并前按 `docs/agents/review.md` 核对。'
  ]
  if (conclusion.code) {
    lines.push(`- 故障码：\`${plainText(conclusion.code)}\``)
    if (Array.isArray(meta?.missing) && meta.missing.length > 0) {
      lines.push(`- 缺失配置：\`${meta.missing.map(name => plainText(name)).join('`、`')}\``)
    }
  }
  if (meta?.model) lines.push(`- 模型：\`${meta.model}\`（effort \`${meta.effort || 'default'}\`）`)
  if (meta?.reused_from) lines.push(`- 复用：同一 head 已有结论，来自 run \`${meta.reused_from}\`，未再调用模型`)
  const generated = stamp(meta?.generated_at)
  if (generated) lines.push(`- 结论生成于：\`${generated}\`（评论就地更新，创建时间不会变）`)
  const coverage = meta?.coverage
    ? { inspected: meta.coverage.inspected ?? [], uncovered: meta.coverage.uncovered ?? [] }
    : null
  if (coverage) {
    const uncovered = coverage.uncovered.length
    lines.push(
      `- 覆盖：检查 ${coverage.inspected.length} 个文件${uncovered > 0 ? `，另有 ${uncovered} 处未覆盖` : '，无未覆盖项'}`
    )
  } else if (conclusion.status === 'reviewed') {
    lines.push('- 覆盖：本次结论没有附覆盖清单，无法核对查过哪些文件')
  }
  lines.push('')

  const findings = [...(meta?.findings ?? [])].sort(
    (left, right) => SEVERITIES.indexOf(left.severity) - SEVERITIES.indexOf(right.severity)
  )
  if (conclusion.status === 'reviewed' && meta?.summary) lines.push(richText(meta.summary), '')
  if (coverage && coverage.uncovered.length > 0) {
    const shown = coverage.uncovered.slice(0, UNCOVERED_LIMIT)
    lines.push('**未覆盖**', '')
    for (const entry of shown) lines.push(`- ${richText(entry)}`)
    if (coverage.uncovered.length > shown.length) {
      lines.push(`- 其余 ${coverage.uncovered.length - shown.length} 处见 \`review-findings.json\``)
    }
    lines.push('')
  }
  if (findings.length === 0) {
    if (conclusion.status === 'reviewed') lines.push('没有需要改动的发现。')
    else if (conclusion.status === 'error')
      lines.push('本次审查没有跑成：检查 GitHub 后台的 secrets/variables 与 CI 日志，配置齐全后重跑。')
    else if (conclusion.status === 'unreviewed')
      lines.push('本次没有可用结论：模型腿跑完了但输出不可用，重跑整条 run；重复出现就按故障码修输出契约。')
    else lines.push('没有可用发现：本次没有拿到模型结论，不能当作已审查。')
  }
  for (const finding of findings) {
    lines.push(`- **${finding.severity}** ${codeSpan(location(finding))} — ${richText(finding.problem)}`)
    if (finding.suggestion) lines.push(`  - 建议：${richText(finding.suggestion)}`)
  }
  lines.push('', `PR #${pullNumber} 只保留这一条结论 comment，由 \`codex-review-report.yml\` 持续更新。`)
  return lines.join('\n')
}

export function createGhReviewAdapter({ repository, spawn = spawnSync, cwd = process.cwd(), env = process.env }) {
  const gh = args => {
    const result = spawn('gh', args, { encoding: 'utf8', cwd, env, maxBuffer: SPAWN_MAX_BUFFER })
    if (result.status !== 0) throw commandError('gh', args, result)
    return result.stdout ?? ''
  }
  const get = endpoint => JSON.parse(gh(['api', endpoint]))

  return {
    pull: number => get(`repos/${repository}/pulls/${number}`),
    // workflow_run 里没有 PR 上下文，只能用 head SHA 反查它属于哪个 PR。
    pulls: sha => get(`repos/${repository}/commits/${sha}/pulls`),
    listComments: number => get(`repos/${repository}/issues/${number}/comments?per_page=100`),
    createComment: (number, body) =>
      JSON.parse(gh(['api', '-X', 'POST', '-f', `body=${body}`, `repos/${repository}/issues/${number}/comments`])),
    updateComment: (commentId, body) =>
      JSON.parse(gh(['api', '-X', 'PATCH', '-f', `body=${body}`, `repos/${repository}/issues/comments/${commentId}`])),
    runs: headSha =>
      get(`repos/${repository}/actions/runs?head_sha=${headSha}&event=pull_request&status=completed&per_page=20`)
        .workflow_runs ?? [],
    artifacts: runId => get(`repos/${repository}/actions/runs/${runId}/artifacts`).artifacts ?? []
  }
}

/** 同 head 已有可信结论时复用，避免标题编辑与手动重跑重复消耗模型调用。 */
export function findReusableRun({ adapter, headSha, currentRunId }) {
  const candidates = adapter
    .runs(headSha)
    .filter(
      entry =>
        entry?.name === 'CI' &&
        entry?.head_sha === headSha &&
        entry?.conclusion === 'success' &&
        String(entry?.id) !== String(currentRunId)
    )
    .sort((left, right) => Number(right.id) - Number(left.id))

  for (const entry of candidates) {
    const artifact = adapter.artifacts(entry.id).find(item => item?.name === FINDINGS_ARTIFACT)
    if (artifact) return { runId: String(entry.id), artifactId: artifact.id }
  }
  return null
}

/** 同一个 head SHA 可能挂在多个 PR 上（关掉又重开）；取最近更新的那一个。 */
export function findPullForHead({ adapter, headSha }) {
  const candidates = (adapter.pulls(headSha) ?? []).filter(
    pull => pull?.head?.sha === headSha && Number.isFinite(pull?.number)
  )
  candidates.sort((left, right) => String(right.updated_at ?? '').localeCompare(String(left.updated_at ?? '')))
  return candidates[0]?.number ?? null
}

export function conclusionDirectory(env = process.env) {
  return env.CODEX_REVIEW_CONCLUSION_DIR ?? path.join(env.RUNNER_TEMP ?? '.', 'codex-review')
}

/**
 * 上一轮 artifact 必须解到独立目录：它带着上一轮的 `review-scope.json`，
 * 与本轮 `prepare` 写的同名文件放在一起会覆盖掉本次范围（其中的 `changed_paths`），
 * 覆盖判定于是拿到一份对不上当前 diff 的 scope。
 */
export function priorConclusionDirectory(env = process.env) {
  return env.CODEX_REVIEW_PRIOR_DIR ?? `${conclusionDirectory(env)}-prior`
}

/**
 * 只有「同源仓库、base 是 main、非版本分支、仍开着」的 PR 才接受结论回写与自动修：
 * fork PR 拿不到仓库 secret，也没有可信的作者身份；版本分支的 PR 由发布流程自己负责。
 */
export function reviewTarget({ pull, repository, releaseBranch }) {
  if (pull?.state !== 'open') return { ok: false, reason: `the pull request is ${pull?.state ?? 'unknown'}` }
  if (pull?.base?.ref !== BASE_BRANCH)
    return { ok: false, reason: `the PR base is ${pull?.base?.ref ?? 'unknown'}, not ${BASE_BRANCH}` }
  if (pull?.head?.repo?.full_name !== repository) return { ok: false, reason: 'the PR head lives in a fork' }
  if (pull?.head?.ref === releaseBranch)
    return { ok: false, reason: 'the version release branch has no review conclusion' }
  return { ok: true, number: pull.number, headRef: pull.head.ref, headSha: pull.head.sha }
}

export function pullNumberFromRef(ref) {
  return ref.match(/^refs\/pull\/(\d+)\/merge$/u)?.[1] ?? null
}

function writeOutputs(values) {
  const target = process.env.GITHUB_OUTPUT
  if (!target) return
  // step output 不是 Markdown：这里只需要压成一行，转义会污染下游读到的原值。
  const body = Object.entries(values)
    .map(([key, value]) => `${key}=${oneLine(value)}`)
    .join('\n')
  fs.appendFileSync(target, `${body}\n`)
}

function appendSummary(lines) {
  const target = process.env.GITHUB_STEP_SUMMARY
  if (target) fs.appendFileSync(target, `${lines.join('\n')}\n`)
}

function requireEnv(names) {
  return Object.fromEntries(
    names.map(name => {
      const value = process.env[name]
      if (value === undefined || value === '') throw new Error(`${name} is missing`)
      return [name, value]
    })
  )
}

function writeConclusion(directory, { findings, meta }) {
  fs.writeFileSync(
    path.join(directory, FINDINGS_FILE),
    `${JSON.stringify(
      { summary: findings.summary, coverage: findings.coverage, findings: findings.findings },
      null,
      2
    )}\n`
  )
  fs.writeFileSync(path.join(directory, META_FILE), `${JSON.stringify(meta, null, 2)}\n`)
}

function readScope() {
  const scopePath = path.join(conclusionDirectory(), SCOPE_FILE)
  return fs.existsSync(scopePath) ? JSON.parse(fs.readFileSync(scopePath, 'utf8')) : {}
}

function identityFromEnv() {
  const scope = readScope()
  const config = readConfig()
  return {
    head_sha: process.env.CODEX_REVIEW_HEAD_SHA ?? '',
    base_sha: process.env.CODEX_REVIEW_BASE_SHA ?? '',
    // 评论是就地更新的，创建时间永远停在第一次写回那一刻；结论自己的生成时间只能记在这里。
    generated_at: new Date().toISOString(),
    merge_base_sha: scope.merge_base_sha ?? '',
    model: config?.model ?? '',
    effort: config?.effort ?? '',
    config_fingerprint: config?.fingerprint ?? ''
  }
}

function writeErrorMeta(directory, identity, errorCode, reason, missing = []) {
  fs.rmSync(path.join(directory, FINDINGS_FILE), { force: true })
  fs.writeFileSync(
    path.join(directory, META_FILE),
    `${JSON.stringify({ ...identity, status: 'error', error_code: errorCode, error: reason, missing }, null, 2)}\n`
  )
}

/** 缺配置是仓库状态故障，不是模型概率性输出：写 error 结论让门变红，且只记变量名不记值。 */
function commandPreflight() {
  const env = requireEnv(['RUNNER_TEMP'])
  const { present, missing, config } = inspectConfig()
  const configPath = path.join(env.RUNNER_TEMP, CONFIG_FILE)
  const directory = conclusionDirectory()
  fs.mkdirSync(directory, { recursive: true })
  if (!present) {
    fs.rmSync(configPath, { force: true })
    const reason = `missing repository configuration: ${missing.join(', ')}`
    writeErrorMeta(directory, identityFromEnv(), 'config_missing', reason, missing)
    writeOutputs({ configured: 'false', missing: missing.join(','), fingerprint: '' })
    appendSummary(['## Codex review configuration', '', `- Status: **incomplete** — ${reason}`])
    console.error(`codex configuration is incomplete: ${missing.join(', ')} (values are never logged)`)
    return
  }
  fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`)
  writeOutputs({ configured: 'true', missing: '', fingerprint: config.fingerprint })
  appendSummary(['## Codex review configuration', '', `- Status: **complete** (fingerprint \`${config.fingerprint}\`)`])
  console.log(`codex configuration complete (fingerprint ${config.fingerprint}); values are never logged`)
}

function commandPrepare() {
  const env = requireEnv(['CODEX_REVIEW_BASE_SHA', 'CODEX_REVIEW_HEAD_SHA', 'RUNNER_TEMP'])
  const range = resolveReviewRange({ baseSha: env.CODEX_REVIEW_BASE_SHA, headSha: env.CODEX_REVIEW_HEAD_SHA })
  const directory = conclusionDirectory()
  fs.mkdirSync(directory, { recursive: true })
  fs.writeFileSync(path.join(env.RUNNER_TEMP, 'pr.diff'), range.diff)
  fs.writeFileSync(
    path.join(directory, SCOPE_FILE),
    `${JSON.stringify(
      {
        base_sha: range.baseSha,
        head_sha: range.headSha,
        merge_base_sha: range.mergeBaseSha,
        diff_bytes: Buffer.byteLength(range.diff),
        empty_diff: Buffer.byteLength(range.diff) === 0,
        changed_paths: range.changedPaths,
        excluded_pathspecs: REVIEW_EXCLUDE_PATHSPECS
      },
      null,
      2
    )}\n`
  )
  writeOutputs({
    base_sha: range.baseSha,
    head_sha: range.headSha,
    merge_base_sha: range.mergeBaseSha,
    diff_path: path.join(env.RUNNER_TEMP, 'pr.diff'),
    diff_bytes: String(Buffer.byteLength(range.diff))
  })
  console.log(`review range ${range.mergeBaseSha}..${range.headSha} (${Buffer.byteLength(range.diff)} bytes)`)
}

function commandResolvePull() {
  const env = requireEnv(['GITHUB_REPOSITORY', 'CODEX_REVIEW_HEAD_SHA'])
  const number = findPullForHead({
    adapter: createGhReviewAdapter({ repository: env.GITHUB_REPOSITORY }),
    headSha: env.CODEX_REVIEW_HEAD_SHA
  })
  writeOutputs({ pull_number: String(number ?? '') })
  console.log(
    number ? `head ${env.CODEX_REVIEW_HEAD_SHA} belongs to pull request #${number}` : 'no pull request owns this head'
  )
}

function commandPriorRun() {
  const env = requireEnv(['GITHUB_REPOSITORY', 'GITHUB_RUN_ID', 'CODEX_REVIEW_HEAD_SHA'])
  const reuse = findReusableRun({
    adapter: createGhReviewAdapter({ repository: env.GITHUB_REPOSITORY }),
    headSha: env.CODEX_REVIEW_HEAD_SHA,
    currentRunId: env.GITHUB_RUN_ID
  })
  writeOutputs({ prior_run_id: reuse?.runId ?? '' })
  console.log(reuse ? `earlier conclusion available in run ${reuse.runId}` : 'no earlier conclusion for this head')
}

/**
 * 复用要求 head、状态、配置指纹与覆盖清单四者都自洽：配置换了不能沿用旧模型的结论，
 * 缺少覆盖清单的旧契约产物也不能沿用——否则一次没有证据的空结论会借复用这条路回到绿色。
 */
function commandReuse() {
  const env = requireEnv(['CODEX_REVIEW_HEAD_SHA'])
  // 读上一轮的 artifact，写回本轮的目录；两者的 scope 不能混用。
  const prior = priorConclusionDirectory()
  const directory = conclusionDirectory()
  const config = readConfig()
  let reusable = null
  let failure = ''
  try {
    const conclusion = readConclusion(prior)
    if (!conclusion?.findings) failure = 'no usable conclusion'
    else if (conclusion.meta.head_sha !== env.CODEX_REVIEW_HEAD_SHA) failure = ''
    else if (!config) failure = 'the configuration snapshot is missing'
    else if (conclusion.meta.status === 'error' || conclusion.meta.status === 'unreviewed')
      failure = 'the prior run has no reviewable conclusion'
    else if (conclusion.meta.config_fingerprint !== config.fingerprint) failure = 'the repository configuration changed'
    else if (reuseCoverageGap(conclusion.findings, readScope()) !== '')
      failure = 'the prior conclusion carries no coverage evidence'
    else reusable = conclusion
  } catch (error) {
    failure = error.message
  }
  if (!reusable) {
    for (const name of [FINDINGS_FILE, META_FILE]) fs.rmSync(path.join(directory, name), { force: true })
    writeOutputs({ reused: 'false', reason: failure })
    console.log(failure ? `discarded unusable conclusion: ${failure}` : 'no conclusion to reuse')
    return
  }
  writeConclusion(directory, {
    findings: reusable.findings,
    meta: { ...reusable.meta, reused_from: process.env.CODEX_REVIEW_PRIOR_RUN_ID ?? '' }
  })
  writeOutputs({ reused: 'true', reason: '' })
  console.log(`reusing conclusion for ${reusable.meta.head_sha}`)
}

function commandValidate() {
  const env = requireEnv(['CODEX_REVIEW_HEAD_SHA', 'CODEX_REVIEW_BASE_SHA', 'RUNNER_TEMP'])
  const directory = conclusionDirectory()
  fs.mkdirSync(directory, { recursive: true })
  const identity = identityFromEnv()
  const config = readConfig()
  const reusedPath = path.join(directory, FINDINGS_FILE)

  if (!config) {
    const metaPath = path.join(directory, META_FILE)
    const existing = fs.existsSync(metaPath) ? JSON.parse(fs.readFileSync(metaPath, 'utf8')) : null
    if (existing?.status === 'error' && existing?.error_code === 'config_missing') {
      writeOutputs({ blocks: '0', reason: existing.error })
      console.error(`review is error: ${existing.error}`)
      return
    }
    writeErrorMeta(directory, identity, 'config_missing', 'the Codex configuration preflight did not run')
    writeOutputs({ blocks: '0', reason: 'configuration missing' })
    console.error('review is error: configuration preflight did not run')
    return
  }

  if (fs.existsSync(reusedPath)) {
    const parsed = parseReviewFindings(fs.readFileSync(reusedPath, 'utf8'))
    const metaPath = path.join(directory, META_FILE)
    const prior = fs.existsSync(metaPath) ? JSON.parse(fs.readFileSync(metaPath, 'utf8')) : {}
    // 兜底：正常路径上 `reuse` 已经挡掉了没有覆盖清单的旧产物，这里再判一次，
    // 免得任何其它写入口把一次没有证据的空结论洗成绿色。
    const gap = reuseCoverageGap(parsed, readScope())
    if (gap !== '') {
      // findings 留着：结论不可用由 status 表达，把已经看到的 Block 丢掉只会让作者少一条线索。
      writeConclusion(directory, {
        findings: parsed,
        meta: { ...identity, status: 'unreviewed', error_code: 'missing_coverage', error: gap }
      })
      writeOutputs({ blocks: String(parsed.counts.Block), reason: gap })
      console.error(`review is unreviewed: ${gap}`)
      return
    }
    const meta = { ...identity, status: 'reviewed', reused_from: process.env.CODEX_REVIEW_PRIOR_RUN_ID ?? '' }
    // 复用的结论是上一次生成的：它没记时间就不写，绝不拿当前时间冒充它的生成时间。
    if (typeof prior.generated_at === 'string' && prior.generated_at !== '') meta.generated_at = prior.generated_at
    else delete meta.generated_at
    writeConclusion(directory, { findings: parsed, meta })
    writeOutputs({ blocks: String(parsed.counts.Block), reason: 'reused conclusion' })
    console.log(`reused conclusion: Block ${parsed.counts.Block}`)
    return
  }

  const outputPath = path.join(env.RUNNER_TEMP, 'codex-final-message.json')
  let parsed = null
  let error = ''
  if (!fs.existsSync(outputPath)) {
    error = 'the review step produced no output file'
  } else {
    try {
      parsed = parseReviewFindings(fs.readFileSync(outputPath, 'utf8'))
    } catch (failure) {
      error = failure.message
    }
  }

  if (!parsed) {
    fs.rmSync(reusedPath, { force: true })
    // continue-on-error 掩住的是 conclusion，不是 outcome：模型腿崩了就是故障，不能伪装成「未审查」。
    if (process.env.CODEX_REVIEW_STEP_OUTCOME === 'failure') {
      writeErrorMeta(directory, identity, 'model_failed', error)
      writeOutputs({ blocks: '0', reason: error })
      console.error(`review is error: ${error}`)
      return
    }
    fs.writeFileSync(
      path.join(directory, META_FILE),
      `${JSON.stringify({ ...identity, status: 'unreviewed', error_code: 'unusable_output', error }, null, 2)}\n`
    )
    writeOutputs({ blocks: '0', reason: error })
    console.error(`review is unreviewed: ${error}`)
    return
  }

  // 覆盖清单是结论的一部分，也是空 findings 与「没查就收尾」唯一的区分；判据见 `coverageGap`。
  const scope = readScope()
  const gap = coverageGap(parsed, scope)
  if (gap !== '') {
    // findings 留着：结论不可用由 status 表达，把已经看到的 Block 丢掉只会让作者少一条线索。
    writeConclusion(directory, {
      findings: parsed,
      meta: { ...identity, status: 'unreviewed', error_code: 'missing_coverage', error: gap }
    })
    writeOutputs({ blocks: String(parsed.counts.Block), reason: gap })
    console.error(`review is unreviewed: ${gap}`)
    console.error('Rerun the whole CI run once; a repeat means the review output contract needs fixing.')
    return
  }

  writeConclusion(directory, { findings: parsed, meta: { ...identity, status: 'reviewed', reused_from: '' } })
  writeOutputs({ blocks: String(parsed.counts.Block), reason: '' })
  if (parsed.summary === '') console.log('review output carries no summary; the conclusion stands on its findings')
  if (parsed.coverage) {
    console.log(
      `review coverage: ${parsed.coverage.inspected.length} inspected, ${parsed.coverage.uncovered.length} uncovered`
    )
  }
  console.log(
    `review conclusion: Block ${parsed.counts.Block}, Should fix ${parsed.counts['Should fix']}, Nit ${parsed.counts.Nit}`
  )
}

function pullNumber() {
  return pullNumberFromRef(process.env.GITHUB_REF ?? '') ?? process.env.CODEX_REVIEW_PULL_NUMBER ?? ''
}

function evaluateGate(adapter, pull = null) {
  const directory = conclusionDirectory()
  let conclusion = null
  let readError = ''
  try {
    conclusion = readConclusion(directory)
  } catch (error) {
    readError = error.message
  }
  const number = pullNumber()
  if (readError === '') {
    if (!conclusion) {
      if (!number) readError = 'CI did not run for a pull request'
      else {
        const runConclusion = process.env.CODEX_REVIEW_RUN_CONCLUSION ?? ''
        readError = runConclusion
          ? `the review artifact is missing (CI run ${runConclusion})`
          : 'the review artifact is missing'
      }
    } else if (!conclusion.findings && !['error', 'unreviewed'].includes(conclusion.meta?.status)) {
      readError = conclusion.meta.error ?? 'the review conclusion carries no findings'
    }
  }
  let liveHeadSha = process.env.CODEX_REVIEW_LIVE_HEAD_SHA ?? ''
  if (!liveHeadSha && number) liveHeadSha = requireSha((pull ?? adapter.pull(number)).head.sha, 'live PR head SHA')
  return {
    conclusion,
    number,
    liveHeadSha,
    status: deriveConclusion({
      meta: conclusion?.meta ?? null,
      findings: conclusion?.findings ?? null,
      liveHeadSha: liveHeadSha || conclusion?.meta?.head_sha || 'unknown',
      error: readError,
      notApplicable: process.env.CODEX_REVIEW_NOT_APPLICABLE === 'true'
    })
  }
}

function commandGate() {
  const env = requireEnv(['GITHUB_REPOSITORY'])
  const adapter = createGhReviewAdapter({ repository: env.GITHUB_REPOSITORY })
  const { conclusion, liveHeadSha, status } = evaluateGate(adapter)
  appendSummary([
    '## Codex review gate',
    '',
    `- Status: **${status.status}**`,
    ...(status.code ? [`- Code: \`${plainText(status.code)}\``] : []),
    `- Reviewed head: \`${conclusion?.meta?.head_sha ?? 'none'}\``,
    `- Live head: \`${liveHeadSha || 'none'}\``,
    `- Block ${status.counts.Block} · Should fix ${status.counts['Should fix']} · Nit ${status.counts.Nit}`,
    ...(status.reason ? [`- Reason: ${richText(status.reason)}`] : [])
  ])
  console.log(`codex gate: ${status.status} (Block ${status.counts.Block})${status.reason ? `: ${status.reason}` : ''}`)
  if (status.blocking) {
    if (status.status === 'error') {
      console.error(`Codex review failed (${status.code}): ${status.reason}`)
      console.error('Fix the repository configuration or the model invocation, then rerun CI.')
    } else if (status.status === 'unreviewed') {
      console.error(`Codex review produced no usable conclusion (${status.code}): ${status.reason}`)
      console.error('Rerun the whole CI run once; a repeat means the review output contract needs fixing.')
    } else {
      console.error(`Block findings must be fixed before merge: ${status.counts.Block} at ${liveHeadSha}`)
    }
    process.exitCode = 1
  }
}

// workflow_run 的 token 权限有三处会被降级：job permissions、仓库 Workflow permissions、组织策略。
// 读写 PR 的 403 都必须带着排查清单失败，不能只留一句 "Resource not accessible by integration"。
export function withPermissionDiagnosis(number) {
  return action => {
    try {
      return action()
    } catch (error) {
      // gh 把 POST 的评论正文也拼进 error.message（`-f body=...`），只认诊断性短语，
      // 避免正文里出现 "403" 这类字样就把一次普通失败误报成权限故障。
      if (!/Resource not accessible by integration|\bHTTP\s*403\b|\b403\s+Forbidden\b/iu.test(error.message)) {
        throw error
      }
      throw new Error(
        `the write-back token cannot access PR #${number} or its comments. Check (1) report-conclusion grants ` +
          `pull-requests: write, (2) Settings > Actions > General > Workflow permissions allows write, ` +
          `(3) no organization policy downgrades the workflow_run token. Original: ${error.message}`
      )
    }
  }
}

// 写回腿的绿色必须能读懂：同一个 success，既可能是「发了评论」，也可能是「什么都没发」。
// 所以每条返回路径都往运行页写一行结果，把「没发」的原因留在 Summary 里而不是只留在日志。
function appendReportSummary({ number, status, meta, outcome }) {
  const counts = status?.counts
  appendSummary([
    '## Codex 审查结论写回',
    '',
    `- PR：#${number}`,
    `- 结果：${outcome}`,
    ...(status
      ? [
          `- 结论：**${status.status}**`,
          `- 档位：Block ${counts.Block} · Should fix ${counts['Should fix']} · Nit ${counts.Nit}`,
          `- 审查快照：\`${meta?.head_sha ?? '无'}\``
        ]
      : []),
    '- 本运行只写回既有结论；是否拦合并由 CI run 的 `Codex review gate` 判定。'
  ])
}

function commandReport() {
  const env = requireEnv(['GITHUB_REPOSITORY'])
  const adapter = createGhReviewAdapter({ repository: env.GITHUB_REPOSITORY })
  const number = pullNumber()
  if (!number) throw new Error('CODEX_REVIEW_PULL_NUMBER is missing')
  const call = withPermissionDiagnosis(number)
  const pull = call(() => adapter.pull(number))
  const target = reviewTarget({ pull, repository: env.GITHUB_REPOSITORY, releaseBranch: RELEASE_BRANCH })
  if (!target.ok) {
    console.log(`conclusion report skipped for #${number}: ${target.reason}`)
    appendReportSummary({ number, outcome: `未写回：${target.reason}` })
    return
  }
  const { conclusion, status } = call(() => evaluateGate(adapter, pull))
  const meta = conclusion?.meta ?? null
  const body = renderConclusion({ conclusion: status, meta, pullNumber: number })
  const existing = call(() => adapter.listComments(number)).find(comment =>
    (comment.body ?? '').includes(CONCLUSION_MARKER)
  )
  if (existing?.body === body) {
    console.log(`conclusion comment ${existing.id} already current`)
    appendReportSummary({ number, status, meta, outcome: `结论评论 #${existing.id} 已是最新，未改动` })
    return
  }
  if (existing) {
    call(() => adapter.updateComment(existing.id, body))
    console.log(`updated conclusion comment ${existing.id} (${status.status})`)
    appendReportSummary({ number, status, meta, outcome: `已更新结论评论 #${existing.id}` })
    return
  }
  const created = call(() => adapter.createComment(number, body))
  console.log(`created conclusion comment ${created.id} (${status.status})`)
  appendReportSummary({ number, status, meta, outcome: `已创建结论评论 #${created.id}` })
}

const commands = {
  preflight: commandPreflight,
  prepare: commandPrepare,
  'prior-run': commandPriorRun,
  'resolve-pull': commandResolvePull,
  reuse: commandReuse,
  validate: commandValidate,
  gate: commandGate,
  report: commandReport
}

function main() {
  const name = process.argv[2]
  const handler = commands[name]
  if (!handler) throw new Error(`usage: node codex-review.mjs <${Object.keys(commands).join('|')}>`)
  handler()
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    main()
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
