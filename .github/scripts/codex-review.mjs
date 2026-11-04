import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

import { commandError, run } from './lib/github.mjs'
import { RELEASE_BRANCH } from './lib/workflow-topology.mjs'

const BASE_BRANCH = 'main'

export const FINDINGS_ARTIFACT = 'codex-review-findings'
export const CONCLUSION_MARKER = 'codex-review-conclusion'
export const FINDINGS_FILE = 'review-findings.json'
export const META_FILE = 'review-meta.json'
export const SEVERITIES = Object.freeze(['Block', 'Should fix', 'Nit'])

const FINDING_FIELDS = Object.freeze(['severity', 'file', 'line', 'problem', 'suggestion'])
const SHA_PATTERN = /^[0-9a-f]{40,64}$/iu
const FIELD_LIMIT = 700

function emptyCounts() {
  return Object.fromEntries(SEVERITIES.map(severity => [severity, 0]))
}

function requireSha(value, label) {
  if (typeof value !== 'string' || !SHA_PATTERN.test(value)) throw new Error(`${label} is not a commit SHA: ${value}`)
  return value
}

/**
 * 模型输出是门禁的唯一输入，必须先过结构校验：未知档位、未知字段或空文本都会让结论不可信，
 * 宁可判「未审查」，也不带着半截 JSON 去拦或放。
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
  if (typeof value.summary !== 'string' || value.summary.trim() === '') throw new Error('review output needs a summary')
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
  return { summary: value.summary.trim(), findings, counts }
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
  const diff = command('git', ['diff', '--no-color', mergeBaseSha, head])
  return { baseSha: base, headSha: head, mergeBaseSha, diff }
}

export function readConclusion(directory) {
  const findingsPath = path.join(directory, FINDINGS_FILE)
  const metaPath = path.join(directory, META_FILE)
  if (!fs.existsSync(metaPath)) return null
  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'))
  if (!fs.existsSync(findingsPath)) return { meta, findings: null }
  const findings = parseReviewFindings(fs.readFileSync(findingsPath, 'utf8'))
  return { meta: { ...meta, findings: findings.findings, summary: findings.summary }, findings }
}

/**
 * `stale` 是 ADR-0012「结论只覆盖它审查过的那份代码」在 CI 里的形状：head 一旦移动，
 * 旧结论里的 Block 不再描述当前代码，不能继续拿来拦合并。
 */
export function deriveConclusion({ meta, findings, liveHeadSha, error }) {
  const counts = findings?.counts ?? emptyCounts()
  if (error || !findings || !meta) {
    return { status: 'unreviewed', reason: error ?? 'the review job produced no conclusion', counts, blocking: false }
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

function inline(value) {
  const single = String(value).replace(/\s+/gu, ' ').replace(/[<>]/gu, '')
  return single.length > FIELD_LIMIT ? `${single.slice(0, FIELD_LIMIT)}…` : single
}

function location(finding) {
  if (finding.file === '') return finding.line === 0 ? '整体' : `行 ${finding.line}`
  return finding.line === 0 ? finding.file : `${finding.file}:${finding.line}`
}

export function renderConclusion({ conclusion, meta, pullNumber }) {
  const labels = { reviewed: '已审查', unreviewed: '未审查', stale: '已过时' }
  const verdict = conclusion.status === 'reviewed' && conclusion.blocking ? 'blocked' : conclusion.status
  const lines = [
    `<!-- ${CONCLUSION_MARKER} sha=${meta?.head_sha ?? 'none'} status=${verdict} blocks=${conclusion.counts.Block} -->`,
    '',
    '## Codex PR 审查',
    '',
    `- 结论：**${labels[conclusion.status]}**${conclusion.reason ? `（原因：${inline(conclusion.reason)}）` : ''}`,
    `- 审查快照：\`${meta?.head_sha ?? '无'}\``,
    `- 档位统计：Block ${conclusion.counts.Block} · Should fix ${conclusion.counts['Should fix']} · Nit ${conclusion.counts.Nit}`,
    '- 合并判据：只有 Block 让 `codex-gate` 变红；未审查与已过时不拦合并，但结论不覆盖当前 head。',
    '- 这是约定式门禁，GitHub 没有把它设为必需检查；合并前按 `docs/agents/review.md` 核对。'
  ]
  if (meta?.model) lines.push(`- 模型：\`${meta.model}\`（effort \`${meta.effort || 'default'}\`）`)
  if (meta?.reused_from) lines.push(`- 复用：同一 head 已有结论，来自 run \`${meta.reused_from}\`，未再调用模型`)
  lines.push('')

  const findings = [...(meta?.findings ?? [])].sort(
    (left, right) => SEVERITIES.indexOf(left.severity) - SEVERITIES.indexOf(right.severity)
  )
  if (conclusion.status === 'reviewed' && meta?.summary) lines.push(inline(meta.summary), '')
  if (findings.length === 0) {
    lines.push(
      conclusion.status === 'reviewed' ? '没有需要改动的发现。' : '没有可用发现：本次没有拿到模型结论，按未审查处理。'
    )
  }
  for (const finding of findings) {
    lines.push(`- **${finding.severity}** \`${location(finding)}\` — ${inline(finding.problem)}`)
    if (finding.suggestion) lines.push(`  - 建议：${inline(finding.suggestion)}`)
  }
  lines.push('', `PR #${pullNumber} 只保留这一条结论 comment，由 \`codex-review-publish.yml\` 持续更新。`)
  return lines.join('\n')
}

export function createGhReviewAdapter({ repository, spawn = spawnSync, cwd = process.cwd(), env = process.env }) {
  const gh = args => {
    const result = spawn('gh', args, { encoding: 'utf8', cwd, env })
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
  const body = Object.entries(values)
    .map(([key, value]) => `${key}=${inline(value)}`)
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
    `${JSON.stringify({ summary: findings.summary, findings: findings.findings }, null, 2)}\n`
  )
  fs.writeFileSync(path.join(directory, META_FILE), `${JSON.stringify(meta, null, 2)}\n`)
}

function commandPrepare() {
  const env = requireEnv(['CODEX_REVIEW_BASE_SHA', 'CODEX_REVIEW_HEAD_SHA', 'RUNNER_TEMP'])
  const range = resolveReviewRange({ baseSha: env.CODEX_REVIEW_BASE_SHA, headSha: env.CODEX_REVIEW_HEAD_SHA })
  const directory = conclusionDirectory()
  fs.mkdirSync(directory, { recursive: true })
  fs.writeFileSync(path.join(env.RUNNER_TEMP, 'pr.diff'), range.diff)
  fs.writeFileSync(
    path.join(directory, 'review-scope.json'),
    `${JSON.stringify(
      {
        base_sha: range.baseSha,
        head_sha: range.headSha,
        merge_base_sha: range.mergeBaseSha,
        diff_bytes: Buffer.byteLength(range.diff)
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

/** 复用只在 head 自洽时成立；否则删掉半成品，回到调用模型的正常路径。 */
function commandReuse() {
  const env = requireEnv(['CODEX_REVIEW_HEAD_SHA'])
  const directory = conclusionDirectory()
  let reusable = null
  let failure = ''
  try {
    const conclusion = readConclusion(directory)
    if (conclusion?.findings && conclusion.meta.head_sha === env.CODEX_REVIEW_HEAD_SHA) reusable = conclusion
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
  const scopePath = path.join(directory, 'review-scope.json')
  const scope = fs.existsSync(scopePath) ? JSON.parse(fs.readFileSync(scopePath, 'utf8')) : {}
  const identity = {
    head_sha: env.CODEX_REVIEW_HEAD_SHA,
    base_sha: env.CODEX_REVIEW_BASE_SHA,
    merge_base_sha: scope.merge_base_sha ?? '',
    model: process.env.CODEX_REVIEW_MODEL ?? '',
    effort: process.env.CODEX_REVIEW_EFFORT ?? ''
  }
  const reusedPath = path.join(directory, FINDINGS_FILE)

  if (fs.existsSync(reusedPath)) {
    const parsed = parseReviewFindings(fs.readFileSync(reusedPath, 'utf8'))
    writeConclusion(directory, {
      findings: parsed,
      meta: { ...identity, reused_from: process.env.CODEX_REVIEW_PRIOR_RUN_ID ?? '' }
    })
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
    fs.writeFileSync(path.join(directory, META_FILE), `${JSON.stringify({ ...identity, error }, null, 2)}\n`)
    writeOutputs({ blocks: '0', reason: error })
    console.error(`review is unreviewed: ${error}`)
    return
  }

  writeConclusion(directory, { findings: parsed, meta: { ...identity, reused_from: '' } })
  writeOutputs({ blocks: String(parsed.counts.Block), reason: '' })
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
    } else if (!conclusion.findings) readError = conclusion.meta.error ?? 'the review conclusion carries no findings'
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
      error: readError
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
    `- Reviewed head: \`${conclusion?.meta?.head_sha ?? 'none'}\``,
    `- Live head: \`${liveHeadSha || 'none'}\``,
    `- Block ${status.counts.Block} · Should fix ${status.counts['Should fix']} · Nit ${status.counts.Nit}`,
    ...(status.reason ? [`- Reason: ${inline(status.reason)}`] : [])
  ])
  console.log(`codex gate: ${status.status} (Block ${status.counts.Block})${status.reason ? `: ${status.reason}` : ''}`)
  if (status.blocking) {
    console.error(`Block findings must be fixed before merge: ${status.counts.Block} at ${liveHeadSha}`)
    process.exitCode = 1
  }
}

function commandPublish() {
  const env = requireEnv(['GITHUB_REPOSITORY'])
  const adapter = createGhReviewAdapter({ repository: env.GITHUB_REPOSITORY })
  const number = pullNumber()
  if (!number) throw new Error('CODEX_REVIEW_PULL_NUMBER is missing')
  const pull = adapter.pull(number)
  const target = reviewTarget({ pull, repository: env.GITHUB_REPOSITORY, releaseBranch: RELEASE_BRANCH })
  if (!target.ok) {
    console.log(`conclusion publish skipped for #${number}: ${target.reason}`)
    return
  }
  const { conclusion, status } = evaluateGate(adapter, pull)
  const body = renderConclusion({ conclusion: status, meta: conclusion?.meta ?? null, pullNumber: number })
  const existing = adapter.listComments(number).find(comment => (comment.body ?? '').includes(CONCLUSION_MARKER))
  if (existing?.body === body) {
    console.log(`conclusion comment ${existing.id} already current`)
    return
  }
  if (existing) {
    adapter.updateComment(existing.id, body)
    console.log(`updated conclusion comment ${existing.id} (${status.status})`)
    return
  }
  const created = adapter.createComment(number, body)
  console.log(`created conclusion comment ${created.id} (${status.status})`)
}

const commands = {
  prepare: commandPrepare,
  'prior-run': commandPriorRun,
  'resolve-pull': commandResolvePull,
  reuse: commandReuse,
  validate: commandValidate,
  gate: commandGate,
  publish: commandPublish
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
