import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

import {
  DIRECT_ENGINE_NAME,
  DIRECT_ERROR_FILE,
  DIRECT_ERROR_PREFIX,
  DIRECT_RUNTIME_FILE,
  DIRECT_UNUSABLE_FILE,
  pickDirectRuntimeMetrics,
  runDirectReview,
  sanitizeDirectError
} from './lib/codex-direct-review.mjs'
import { SPAWN_MAX_BUFFER, commandError, resolvePullNumber, run } from './lib/github.mjs'
import { CODEX_CONFIG_ENV, RELEASE_BRANCH } from './lib/workflow-topology.mjs'

const BASE_BRANCH = 'main'

export const FINDINGS_ARTIFACT = 'codex-review-findings'
export const CONCLUSION_MARKER = 'codex-review-conclusion'
export const FINDINGS_FILE = 'review-findings.json'
export const META_FILE = 'review-meta.json'
export const SCOPE_FILE = 'review-scope.json'
export const PRELOAD_FILE = 'review-preload.md'
export const CONFIG_FILE = 'codex-config.json'
export const SEVERITIES = Object.freeze(['Block', 'Should fix', 'Nit'])
export const RISK_TIERS = Object.freeze(['high', 'medium', 'low'])
export const PRELOAD_START_MARKER = '<!-- codex-review-preload:start -->'
export const PRELOAD_END_MARKER = '<!-- codex-review-preload:end -->'
export const PRELOAD_MAX_PATHS = 30
export const PRELOAD_MAX_FILES = 8
export const PRELOAD_PER_FILE_BYTES = 4 * 1024
export const PRELOAD_TOTAL_DIFF_BYTES = 24 * 1024
export const REPO_QUERY_TIMEOUT_MS = 10_000
export const REPO_QUERY_MAX_PATHS = 200

// 顺序即诊断输出顺序，与 CI 拓扑断言共用同一份名单。密钥只判「有没有」，值从不写进快照、日志或 PR 评论。
export const CONFIG_ENV = CODEX_CONFIG_ENV

// 入库生成物整批滤出审查输入：它们由 generator 完整重建，没有需要人判断的改动，既不需要 diff
// 也不需要逐行 review，留在 pr.diff 与 changed_paths 里只会淹没真实源码、吃掉大 PR 的审查预算。
// 判据、清单与同步要求见 docs/agents/generated-artifacts.md；路径参考 .claude/settings.json 的 deny
// 名单，按清单取可表达的最小 glob：单文件生成物收到具体文件，目录型产物仍按目录通配。用 glob magic
// 让前导 **/ 同时覆盖嵌套与根级路径；review-scope.json 记 excluded_pathspecs 便于审计。
// 这份名单必须留在取自 PR base 的可信脚本里：从 PR head 的工作树读名单等于让作者自定义审查范围。
export const REVIEW_EXCLUDE_PATHSPECS = Object.freeze([
  ':(exclude,glob)**/generated/**',
  ':(exclude,glob)apps/*/frontend/bindings/**',
  ':(exclude,glob)**/routeTree.gen.ts',
  ':(exclude,glob)**/typed-router.d.ts',
  ':(exclude,glob)**/auto-imports.d.ts',
  ':(exclude,glob)packages/web-ui/src/icons/index.ts'
])

const FINDING_FIELDS = Object.freeze(['severity', 'file', 'line', 'problem', 'suggestion'])
const COVERAGE_FIELDS = Object.freeze(['inspected', 'uncovered'])
const SHA_PATTERN = /^[0-9a-f]{40,64}$/iu
const FIELD_LIMIT = 700
// 未覆盖清单是给人看的行动提示，不是全量报表；超出部分留在 artifact 里，别把评论撑爆。
const UNCOVERED_LIMIT = 5

// 结论评论只有一条，就地更新会把上一版刷掉。状态轨迹留最近若干条，够回答「这次恢复了吗」。
const TRAJECTORY_LIMIT = 8
const TRAJECTORY_PREFIX = '- 状态轨迹：'
// 轨迹条目会被下一版正文重新解析再写一次，所以只有形状受控的故障码才进条目。
const TRAJECTORY_CODE_PATTERN = /^[A-Za-z0-9_-]{1,40}$/u

// 模型 job 的原始错误只在 CI run 的 job 日志里；写回 job 读它来做分流指引，job 名与 ci.yml 的 `name:` 一致。
const REVIEW_JOB_NAME = 'Codex review'
// 日志里的 `ERROR:` 被颜色码包住（`ESC[1mESC[31mERROR:`），不先剥掉就找不到 JSON 载荷。
// 匹配对象就是 ESC 控制字符本身，这里的 no-control-regex 告警是误报。
// eslint-disable-next-line no-control-regex
const ANSI_PATTERN = /\u001b\[[0-9;]*m/gu
// 轨迹历史只从 marker 行的这个字段读回；可见行仅做展示，不参与续写。
const MARKER_TRAJECTORY_FIELD = / traj=(.+) -->$/u
// 读回的轨迹条目必须整条符合形状，否则视为被人工编辑过或被拼坏的字段，不给它续写的资格。
const TRAJECTORY_ENTRY_PATTERN =
  /^(?:\d{2}-\d{2} \d{2}:\d{2}Z )?(reviewed|blocked|stale|unreviewed|error|not_applicable)(?:\([A-Za-z0-9_-]{1,40}\))?(?:\/(none|triggered|exhausted|failed))?$/u

// 空壳与不可用输出都只自动重跑一次：重跑完成会再触发一次 workflow_run，第二次必须停下来转人工。
export const AUTO_RETRY_ERROR_CODES = Object.freeze(['missing_coverage', 'unusable_output'])
export const AUTO_RETRY_LIMIT = 1
export const AUTO_RETRY_STATES = ['none', 'triggered', 'exhausted', 'failed']

// 步骤被跳过或 output 丢失时 state 会是空串；白名单外的任何值都不能当成某个恢复档渲染。
export function normalizeAutoRetryState(value) {
  return AUTO_RETRY_STATES.includes(value) ? value : 'none'
}

/**
 * 结论评论最终用哪一档恢复状态。
 * 兜底判定放在脚本里而不是写成 `state || (outcome == 'failure' && 'failed') || 'none'`：
 * 后者依赖 Actions 表达式「&& / || 返回操作数」这一未明文记录的语义，脚本内判定可做求值级单测。
 */
export function resolveAutoRetryState(env = process.env) {
  const state = normalizeAutoRetryState(env.CODEX_REVIEW_AUTO_RETRY_STATE)
  if (state !== 'none') return state
  // 进程级崩溃导致 output 没写出来时，失败步骤的 outcome 仍是 failure；被跳过的步骤是 skipped。
  return env.CODEX_REVIEW_AUTO_RETRY_OUTCOME === 'failure' ? 'failed' : 'none'
}

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

// 模型偶尔把前置推理块或 markdown 围栏写进最终答复：前导的成对闭合 XML 推理标签块（4–12 位 ASCII 字母标签名，
// 如 <reasoning>...</reasoning> 或 <thought>...</thought>），或包住整份 JSON 的围栏。
// 只剥前导完整推理块与整体围栏（推理永远先于结论生成，不剥尾随块），按开闭标签名同名（忽略大小写）配对，
// 且块体内部不跨越同名标签，不做「从散文里抠最外层花括号」。
const LEADING_TAG_OPEN = /^<([a-zA-Z]{4,12})(?:[ \t][^>\n/]*)?>/u
const WHOLE_CODE_FENCE = /^\s*(`{3,})[^\n]*\n([\s\S]*?)\n?\1\s*$/u

function stripLeadingWrapperBlock(text) {
  const trimmed = text.trimStart()
  const match = LEADING_TAG_OPEN.exec(trimmed)
  if (!match) return null
  const openRaw = match[0]
  const tag = match[1]
  const afterOpen = trimmed.slice(openRaw.length)
  const closeMatch = new RegExp(`</${tag}>`, 'iu').exec(afterOpen)
  if (!closeMatch) return null
  const inner = afterOpen.slice(0, closeMatch.index)
  if (new RegExp(`</?${tag}(?=[>\\s/])`, 'iu').test(inner)) return null
  return afterOpen.slice(closeMatch.index + closeMatch[0].length)
}

/**
 * 剥掉 JSON 之外的前导推理块与外层代码围栏，返回剥完的文本与用到的步骤（`reasoning-block` / `code-fence`）。
 * 未闭合的推理块或尾随内容不剥：那时分不清哪一段是推理、哪一段是结论，只能按不可用处理。
 * 调用方把步骤写进结论 meta，清洗过的事实与原始答复一样可审计。
 */
export function normalizeReviewOutput(raw) {
  let text = String(raw).replace(/^\uFEFF/u, '')
  const steps = []
  let changed = true
  while (changed) {
    changed = false
    const stripped = stripLeadingWrapperBlock(text)
    if (stripped !== null) {
      text = stripped
      steps.push('reasoning-block')
      changed = true
      continue
    }
    const fence = WHOLE_CODE_FENCE.exec(text)
    if (fence) {
      text = fence[2]
      steps.push('code-fence')
      changed = true
    }
  }
  return { text: text.trim(), steps: [...new Set(steps)] }
}

/**
 * 先按原样解析，失败后才剥包装层重试。原样合法的输出永不走清洗分支，
 * 因此这条路径只影响本来就会被判 `unusable_output` 的输入。
 */
function parseReviewJson(raw) {
  try {
    return { value: JSON.parse(raw), steps: [] }
  } catch (error) {
    const { text, steps } = normalizeReviewOutput(raw)
    try {
      return { value: JSON.parse(text), steps }
    } catch (normalizedError) {
      const wrapper = steps.length > 0 ? ` after removing ${steps.join(' and ')}` : ''
      const detail = steps.length > 0 ? normalizedError.message : error.message
      throw new Error(`review output is not valid JSON${wrapper}: ${detail}`)
    }
  }
}

/**
 * 模型输出是门禁的唯一输入，必须先过结构校验：未知档位、未知字段或空文本都会让结论不可信，
 * 宁可判「未审查」，也不带着半截 JSON 去拦或放。
 * `summary` 只是评论顶部的一行摘要，缺它不影响档位与阻断判定，因此不做硬校验：
 * 把装饰性字段判成致命错误，代价是整份 findings 作废、门却在绿色里沉默。
 * 返回值里的 `sanitized` 记录这次剥掉了哪层包装；结构校验对剥完的文本照常全量执行。
 */
export function parseReviewFindings(raw) {
  const { value, steps } = parseReviewJson(raw)
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
  return { summary, coverage, findings, counts, sanitized: steps }
}

/** 增量结果必须逐项处置历史发现，覆盖和未覆盖记录跨轮累计。 */
export function inheritReviewHistory(parsed, raw, prior) {
  // 与本轮结论共用同一条解析路径，否则带包装层的增量输出会在这里二次判死。
  const resolutions = parseReviewJson(raw).value.prior_resolutions
  if (!Array.isArray(resolutions) || resolutions.length !== prior.findings.length)
    throw new Error('incremental review must account for every prior finding')
  const byIndex = new Map()
  for (const entry of resolutions) {
    if (
      !entry ||
      !Number.isInteger(entry.index) ||
      entry.index < 0 ||
      entry.index >= prior.findings.length ||
      typeof entry.resolved !== 'boolean' ||
      typeof entry.evidence !== 'string' ||
      !entry.evidence.trim() ||
      byIndex.has(entry.index)
    )
      throw new Error('invalid prior finding resolution')
    byIndex.set(entry.index, entry)
  }
  const findings = [...parsed.findings, ...prior.findings.filter((_, index) => !byIndex.get(index).resolved)]
  const counts = emptyCounts()
  for (const finding of findings) counts[finding.severity]++
  return {
    ...parsed,
    findings,
    counts,
    coverage: {
      inspected: [...new Set([...prior.coverage.inspected, ...parsed.coverage.inspected])],
      uncovered: [...new Set([...prior.coverage.uncovered, ...parsed.coverage.uncovered])]
    }
  }
}

/**
 * `coverage` 是结论的一部分，不是可选装饰：schema 已列为必填，缺了就是模型没按契约输出，
 * 不论有没有 findings 都判 `missing_coverage`——否则交一条 Nit 就能绕开整条覆盖规则。
 * 空 findings 时另外要求清单真的落到本次改动的路径上：只读了判据文档就收尾，正是要区分的早停。
 * 返回空串表示通过，否则返回写进结论的失败原因。diff 为空时整条豁免：那时没有改动可读。
 */
export function coverageGap(parsed, scope) {
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
 * `inspected` 里的路径可能带 `./`、`path:line` 后缀或结尾斜杠，按最宽松的方式归一。
 * 只接受与改动文件**完全相等**的路径：写父目录（`docs`）不等于读过 `docs/agents/review.md`，
 * 拿目录当命中会把「哪条改动被看过」这个唯一判据换成「看过某个目录」。
 */
function touchesChangedPath(entry, changed) {
  const normalized = String(entry)
    .trim()
    .replace(/^\.\//u, '')
    .replace(/:\d+(?::\d+)?$/u, '')
    .replace(/\/+$/u, '')
  if (normalized === '') return false
  return changed.includes(normalized)
}

export function resolveReviewRange({ baseSha, headSha, priorHeadSha, command = run }) {
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
  let startSha = mergeBaseSha
  let diffBaseSha = mergeBaseSha
  if (priorHeadSha) {
    const prior = requireSha(priorHeadSha, 'prior review head SHA')
    try {
      command('git', ['cat-file', '-e', `${prior}^{commit}`])
    } catch {
      command('git', ['fetch', '--no-tags', 'origin', prior])
    }
    command('git', ['merge-base', '--is-ancestor', prior, head])
    try {
      command('git', ['merge-base', '--is-ancestor', mergeBaseSha, prior])
      diffBaseSha = prior
    } catch {
      // PR 分支通过 merge commit 合入更新后的 base（如 gh pr update-branch）时，merge-base 前移到
      // 新 base 提交，不再是 prior 的祖先。用 git merge-tree --write-tree 合成 prior 与新 merge-base
      // 的无冲突三方合并树作为 diff 起点，滤掉纯上游 base 改动、只保留 prior 之后 PR 分支的净增量；
      // 存在合并冲突时命令非零退出，由调用方回退全量审查。
      const mergedTree = command('git', ['merge-tree', '--write-tree', prior, mergeBaseSha]).trim()
      diffBaseSha = requireSha(mergedTree, 'incremental merge-tree SHA')
    }
    startSha = prior
  }
  const diff = command('git', ['diff', '--no-color', diffBaseSha, head, '--', ...REVIEW_EXCLUDE_PATHSPECS])
  // 覆盖度判定需要知道「这次到底改了哪些文件」，否则只读了判据文档也能自称审查过。
  const names = command('git', ['diff', '--name-only', '-z', diffBaseSha, head, '--', ...REVIEW_EXCLUDE_PATHSPECS])
  const changedPaths = names.split('\u0000').filter(name => name !== '')
  return {
    baseSha: base,
    headSha: head,
    mergeBaseSha,
    ...(priorHeadSha ? { startSha, ...(diffBaseSha !== startSha ? { diffBaseSha } : {}) } : {}),
    diff,
    changedPaths
  }
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

function stripPreloadBlock(promptText) {
  const start = promptText.indexOf(PRELOAD_START_MARKER)
  const end = promptText.indexOf(PRELOAD_END_MARKER)
  if (start !== -1 && end !== -1 && end > start) {
    return `${promptText.slice(0, start)}${PRELOAD_START_MARKER}\n${PRELOAD_END_MARKER}${promptText.slice(end + PRELOAD_END_MARKER.length)}`
  }
  return promptText
}

function readTrustedAssetHashes(trustedRoot) {
  const promptFile = path.join(trustedRoot, 'codex/prompts/review.md')
  const directPromptFile = path.join(trustedRoot, 'codex/prompts/review-direct.md')
  const schemaFile = path.join(trustedRoot, 'codex/schemas/review-findings.schema.json')
  const turn1SchemaFile = path.join(trustedRoot, 'codex/schemas/review-turn1.schema.json')
  if (
    !fs.existsSync(promptFile) ||
    !fs.existsSync(directPromptFile) ||
    !fs.existsSync(schemaFile) ||
    !fs.existsSync(turn1SchemaFile)
  ) {
    return null
  }
  try {
    // 剥掉 prepare 运行时注入的 PR 预注入区块，让同一模板在 prepare 前后算出同一指纹。
    const promptText = stripPreloadBlock(fs.readFileSync(promptFile, 'utf8'))
    const directPromptText = fs.readFileSync(directPromptFile, 'utf8')
    const schemaText = fs.readFileSync(schemaFile, 'utf8')
    const turn1SchemaText = fs.readFileSync(turn1SchemaFile, 'utf8')
    return {
      review_prompt_sha256: createHash('sha256').update(promptText).digest('hex'),
      review_direct_prompt_sha256: createHash('sha256').update(directPromptText).digest('hex'),
      review_schema_sha256: createHash('sha256').update(schemaText).digest('hex'),
      review_turn1_schema_sha256: createHash('sha256').update(turn1SchemaText).digest('hex')
    }
  } catch {
    return null
  }
}

/** 配置快照只保留非密钥字段；指纹把后台配置、排除清单、附加请求头模板哈希与可信审查契约绑成复用键的一部分。 */
export function inspectConfig(env = process.env, { trustedRoot = path.resolve(import.meta.dirname, '..') } = {}) {
  const text = name => (env[name] ?? '').trim()
  const missing = CONFIG_ENV.filter(name => text(name) === '')
  const values = {
    endpoint: text('CODEX_RESPONSES_ENDPOINT'),
    model: text('CODEX_REVIEW_MODEL'),
    effort: text('CODEX_REVIEW_EFFORT'),
    version: text('CODEX_VERSION'),
    key_present: text('CODEX_REVIEW_API_KEY') !== ''
  }
  // 排除清单、可信 prompt/schema 与附加请求头模板（仅取哈希，绝不落明文到配置快照）也是审查输入：
  // 任意项变更或契约文件缺失（fail-closed 返回空指纹）都不能让旧结论借复用回到绿色。
  const extraHeadersRaw = text('CODEX_REVIEW_EXTRA_HEADERS')
  const extraHeadersSha256 = extraHeadersRaw ? createHash('sha256').update(extraHeadersRaw).digest('hex') : ''
  const assetHashes = readTrustedAssetHashes(trustedRoot)
  const fingerprint = assetHashes
    ? createHash('sha256')
        .update(
          JSON.stringify({
            engine: DIRECT_ENGINE_NAME,
            ...values,
            excluded_pathspecs: REVIEW_EXCLUDE_PATHSPECS,
            extra_headers_sha256: extraHeadersSha256,
            ...assetHashes
          })
        )
        .digest('hex')
        .slice(0, 16)
    : ''
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
 * 空壳结论是否值得自动重跑一次，以及结论评论该显示哪一档恢复状态。
 *
 * 上限有两个维度，都钉在 AUTO_RETRY_LIMIT：
 * - runAttempt 是触发本次写回 workflow 的 CI run 的 attempt（来自 workflow_run payload）；重跑 CI 后的
 *   新事件里它是 2，用来挡住「第二次写回 workflow 的 run」。
 * - reportAttempt 是写回 run 自己的 attempt（github.run_attempt）。人工 re-run 写回 run 时
 *   payload 仍是原始事件（runAttempt 依旧是 1），只有这个量会递增；不判它就会再 POST 一次
 *   rerun-failed-jobs，突破「每个 CI run 只自动重跑一次」。两个量不能互相替代（ADR-0021）。
 *
 * 顺序按「先排除不该恢复的情形 → 再判上限是否已用尽 → 才允许重跑」分层：CI 非 failure 时
 * 不该因 attempt 已用尽就误报「自动重跑 1 次仍不可用」；字段不可读一律优先于「已用尽」，
 * 否则会拿一个坏掉的值宣称 exhausted，也不符合「任一不可读 → none」的口径。
 *
 * @param {object} input
 * @param {object|null} input.meta 本轮下载的 review-meta.json。
 * @param {number|string|undefined} input.runAttempt 触发写回 workflow 的 CI run 的 attempt；拿不到就不重跑。
 * @param {string|undefined} input.runConclusion 触发写回 workflow 的 CI run 的 conclusion。
 * @param {number|string|undefined} input.reportAttempt 写回 run 自己的 attempt；拿不到就不重跑。
 * @returns {{action: 'rerun'|'skip', state: 'triggered'|'exhausted'|'none', reason: string}}
 *   无副作用；真正的 rerun 由调用方按 action 执行。
 */
export function autoRetryDecision({ meta, runAttempt, runConclusion, reportAttempt }) {
  if (meta?.status !== 'unreviewed' || !AUTO_RETRY_ERROR_CODES.includes(meta?.error_code)) {
    return { action: 'skip', state: 'none', reason: 'the conclusion is not a retryable unreviewed output' }
  }
  // 总闸门最先判：CI 没判红就谈不上恢复，即便拿到的 artifact 是上一轮的旧空壳。
  if (runConclusion !== 'failure') {
    return { action: 'skip', state: 'none', reason: `the CI run concluded ${String(runConclusion)}` }
  }
  const attempt = Number(runAttempt)
  if (!Number.isInteger(attempt) || attempt < 1) {
    return { action: 'skip', state: 'none', reason: `run_attempt is unavailable (${String(runAttempt)})` }
  }
  const report = Number(reportAttempt)
  if (!Number.isInteger(report) || report < 1) {
    return { action: 'skip', state: 'none', reason: `report run_attempt is unavailable (${String(reportAttempt)})` }
  }
  // 两个维度都合法、都为 1 才允许重跑；任一大于上限就停在 exhausted。
  // exhausted 而不是 none：none 会让结论评论退回「人工再重跑一次」的旧指引，把已用掉的上限说成还没用。
  if (attempt > AUTO_RETRY_LIMIT) {
    return { action: 'skip', state: 'exhausted', reason: `run_attempt ${attempt} already used the single auto retry` }
  }
  if (report > AUTO_RETRY_LIMIT) {
    return {
      action: 'skip',
      state: 'exhausted',
      reason: `report workflow was re-run (attempt ${report}); the single auto retry is already used`
    }
  }
  return {
    action: 'rerun',
    state: 'triggered',
    reason:
      meta.error_code === 'unusable_output'
        ? 'first attempt produced an unusable review output'
        : 'first attempt produced an empty review conclusion'
  }
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

/** 结论档位。hidden marker、正文标题与状态轨迹共用这一个判据。 */
export function conclusionVerdict(status) {
  return status.status === 'reviewed' && status.blocking ? 'blocked' : status.status
}

function parseTrajectory(body) {
  if (typeof body !== 'string' || body === '') return []
  // 只认 marker 行。可见的 `- 状态轨迹：` 前缀模型能在 `summary` 或一条 `uncovered` 里原样写出来，
  // 而 marker 需要字面量 `<!--`：所有模型可控文本都过 escapeHtml，产不出这个前缀。
  const markerLine = body.split('\n').find(line => line.startsWith(`<!-- ${CONCLUSION_MARKER} `))
  if (!markerLine) return []
  const field = markerLine.match(MARKER_TRAJECTORY_FIELD)
  if (!field) return []
  const entries = field[1]
    .split('|')
    .map(entry => entry.trim())
    .filter(entry => entry !== '')
  // 形状外置过一次（人工编辑评论）或字段被拼接坏时整行作废，不给它续写的资格。
  if (!entries.every(entry => TRAJECTORY_ENTRY_PATTERN.test(entry))) return []
  return entries
}

/**
 * 状态轨迹的下一版内容：读上一版 marker 里的历史、追加本次、连续重复只留一次、尾部保留最近若干条。
 *
 * 条目形如 `11-09 08:49Z error(model_failed)`；同分钟同档位的重复更新会被去重，所以正文不变时
 * commandReport 的「已是最新」短路仍然成立。故障码按正文 `- 故障码：` 的同一形状写入，只有码本身
 * 形状不受控时才省略。
 *
 * @param {object} input
 * @param {string} [input.previousBody] 评论上一版正文，历史从其 marker 行读取；没有则从头开始。
 * @param {string} input.verdict 本次档位，取 conclusionVerdict。
 * @param {string} [input.code] 本次故障码。
 * @param {string} [input.autoRetry] 恢复档位，只在空壳码上附加。
 * @param {string} [input.generatedAt] 结论生成时间；无效则条目不带时间。
 * @returns {string[]} 含本次的轨迹条目
 */
export function trajectoryEntries({ previousBody = '', verdict, code = '', autoRetry = 'none', generatedAt = '' }) {
  const generated = stamp(generatedAt)
  // 分钟级时间戳是「这版结论什么时候生成」的留痕；年月与同一条评论的「结论生成于」重复。
  const time = generated === '' ? '' : `${generated.slice(5)} `
  const error = code === '' || !TRAJECTORY_CODE_PATTERN.test(code) ? '' : `(${code})`
  const retry = AUTO_RETRY_ERROR_CODES.includes(code) ? `/${normalizeAutoRetryState(autoRetry)}` : ''
  const entry = `${time}${verdict}${error}${retry}`
  const previous = parseTrajectory(previousBody)
  if (previous.at(-1) === entry) return previous
  return [...previous, entry].slice(-TRAJECTORY_LIMIT)
}

const RUN_CODEX_START_MARKER = '##[start-action display=Run codex exec;id=review.run_codex]'
const RUN_CODEX_END_MARKER = '##[end-action id=review.run_codex;'
// 纯文本回退只认 codex CLI 自己发出的红色 ANSI `ERROR:` 前缀（如 `ESC[1mESC[31mERROR:ESC[0m`），
// 避免把模型执行的工具输出打印的无色行首 `ERROR:` 误报为模型错误。
const CODEX_PLAIN_ERROR_LINE =
  // eslint-disable-next-line no-control-regex
  /^(?:\d{4}-\d{2}-\d{2}T\S+\s+)?(?:\u001b\[[0-9;]*m)*\u001b\[(?:[0-9;]*;)?31mERROR:\u001b\[0m/u
const PLAIN_MODEL_ERROR_LINE = /^(?:\d{4}-\d{2}-\d{2}T\S+\s+)?ERROR:\s*(.+)$/u
const DIRECT_ENGINE_ERROR_LINE = new RegExp(`^(?:\\d{4}-\\d{2}-\\d{2}T\\S+\\s+)?${DIRECT_ERROR_PREFIX}\\s*(.+)$`, 'u')

function sliceCodexExecLog(log) {
  const start = log.indexOf(RUN_CODEX_START_MARKER)
  if (start === -1) return log
  const afterStart = log.slice(start + RUN_CODEX_START_MARKER.length)
  const end = afterStart.indexOf(RUN_CODEX_END_MARKER)
  return end === -1 ? afterStart : afterStart.slice(0, end)
}

/**
 * 从审查 job 日志里取第一条模型错误。
 * 若日志含 `Run codex exec` 区间，先截取该区间优先取结构化 JSON 的 `error.message`，
 * 无结构化 JSON 时再回退取带 codex CLI 红色 ANSI 标记的行首纯文本 `ERROR:`；
 * 若日志不含 `Run codex exec` 区间（直调引擎路径），同时兼容匹配 `CODEX_DIRECT_ERROR:` 前缀行作为未及落盘时的兜底通道。
 */
export function firstModelErrorLine(log) {
  if (typeof log !== 'string' || log === '') return ''
  const hasCodexExecSection = log.includes(RUN_CODEX_START_MARKER)
  let plainFallback = ''
  let directFallback = ''
  for (const rawLine of sliceCodexExecLog(log).split('\n')) {
    const line = rawLine.replace(ANSI_PATTERN, '')
    if (!hasCodexExecSection && directFallback === '') {
      const directMatch = DIRECT_ENGINE_ERROR_LINE.exec(line.trim())
      if (directMatch?.[1]?.trim()) directFallback = oneLine(directMatch[1].trim())
    }
    const index = line.indexOf('ERROR:')
    if (index === -1) continue
    const payload = line.slice(index + 'ERROR:'.length).trim()
    if (payload === '') continue
    if (payload.startsWith('{')) {
      let message
      try {
        message = JSON.parse(payload)?.error?.message
      } catch {
        continue
      }
      if (typeof message === 'string' && message.trim() !== '') return oneLine(message.replace(ANSI_PATTERN, ''))
      continue
    }
    if (plainFallback === '' && CODEX_PLAIN_ERROR_LINE.test(rawLine.trimStart())) {
      const plain = PLAIN_MODEL_ERROR_LINE.exec(line.trim())?.[1]?.trim() ?? ''
      if (plain !== '') plainFallback = oneLine(plain)
    }
  }
  return plainFallback || directFallback
}

/** 尽力取模型 job 日志里的错误：拿不到 job、日志读失败或没有结构化错误都只降级，不能让诊断辅助判红写回 job。 */
export function readModelLegError(adapter, runId) {
  if (typeof runId !== 'string' || !/^\d+$/u.test(runId)) return ''
  try {
    const jobId = adapter.runJobs(runId).find(job => job?.name === REVIEW_JOB_NAME)?.id
    return jobId === undefined ? '' : firstModelErrorLine(adapter.jobLog(jobId))
  } catch {
    return ''
  }
}

/**
 * 同一个「审查失败」背后是四种不同故障，一刀切文案会把「改后台配置」推给只想重跑的读者。
 * 分流口径与 `docs/agents/review.md` 的 `error` 处置一致。
 */
function errorGuidance(code) {
  if (code === 'model_failed') {
    return '本次审查没有跑成：模型 job 自己没跑完。先看 `Codex review` job 里 `Run codex exec` 的日志——网关 5xx、输出截断或瞬时错误可直接重跑失败 job（`gh run rerun --failed`）或重跑整条 run，只有日志指向配置或模型侧拒绝才改 GitHub 后台。'
  }
  if (code === 'config_missing') {
    return '本次审查没有跑成：检查 GitHub 后台的 secrets/variables 与 CI 日志，配置齐全后重跑。'
  }
  if (code === 'artifact_missing') {
    return '本次审查没有跑成：门禁没拿到审查产物。先核对审查 job 的 `Upload review findings` 与写回 job 的 `Download review findings`，再重跑整条 run。'
  }
  return '本次审查没有跑成：先看 `Codex review` job 的日志定位故障，再重跑整条 run；只有日志指向后台配置才改 secrets/variables。'
}

export function renderConclusion({
  conclusion,
  meta,
  pullNumber,
  autoRetry = 'none',
  modelError = '',
  trajectory = []
}) {
  const retryState = normalizeAutoRetryState(autoRetry)
  const autoRetryExplained = retryState !== 'none'
  const labels = {
    reviewed: '已审查',
    unreviewed: '未审查',
    stale: '已过时',
    error: '审查失败',
    not_applicable: '不适用'
  }
  const verdict = conclusionVerdict(conclusion)
  const countsTotal = SEVERITIES.reduce((total, severity) => total + (conclusion.counts[severity] ?? 0), 0)
  const countsLine = `- 档位统计：Block ${conclusion.counts.Block} · Should fix ${conclusion.counts['Should fix']} · Nit ${conclusion.counts.Nit}`
  const lines = [
    // 轨迹的历史存在 marker 里而不是正文可见行：可见行的前缀模型能在 `uncovered` 里原样写出来，
    // 而 marker 需要字面量 `<!--`，所有模型可控文本都过 escapeHtml，伪造不出这一行。
    `<!-- ${CONCLUSION_MARKER} sha=${meta?.head_sha ?? 'none'} status=${verdict} blocks=${conclusion.counts.Block}${
      trajectory.length > 0 ? ` traj=${trajectory.join('|')}` : ''
    } -->`,
    '',
    '## Codex PR 审查',
    '',
    `- 结论：**${labels[conclusion.status]}**${conclusion.reason ? `（原因：${richText(conclusion.reason)}）` : ''}`,
    `- 审查快照：\`${meta?.head_sha ?? '无'}\``,
    // 全 0 的档位统计出现在故障或未审查结论上，会被读成「审过了、没问题」。只有结论确实覆盖当前 head，
    // 或清单里本来就有非零档位（空壳结论会带着模型看到的 findings）时才列。
    ...(countsTotal > 0 || conclusion.status === 'reviewed' || conclusion.status === 'stale' ? [countsLine] : []),
    '- 合并判据：`Block`、`error` 与「未审查」让 `codex-gate` 变红；已过时与不适用不拦合并，但结论不覆盖当前 head。',
    // ruleset 的 required 状态是仓库设置，会随配置变化：评论只写判据本身，不硬编码远端状态。
    '- 合并前以当前 head 上 `Codex review gate` 的结论为准；本评论是审查轨迹与发现明细，auto-merge 路径上可能落后于最新 head。'
  ]
  if (meta?.review_start_sha && meta.review_start_sha !== meta.merge_base_sha)
    lines.push(`- 增量基线：${codeSpan(meta.review_start_sha)}；累计 ${meta.review_lineage?.length ?? 0} 轮历史记录`)
  if (conclusion.code) {
    lines.push(`- 故障码：\`${plainText(conclusion.code)}\``)
    if (Array.isArray(meta?.missing) && meta.missing.length > 0) {
      lines.push(`- 缺失配置：\`${meta.missing.map(name => plainText(name)).join('`、`')}\``)
    }
    // 模型 job 的真实故障只在 CI run 的 job 日志里；读到了就抄进评论，省掉「自己去翻日志」这一跳。
    if (conclusion.status === 'error' && modelError !== '') {
      lines.push(`- 模型 job 错误：${codeSpan(modelError)}`)
    }
    // 恢复状态统一挂在故障码旁：带 findings 的空壳结论或不可用输出也能看到，不依赖「无 findings」的正文分支。
    if (AUTO_RETRY_ERROR_CODES.includes(conclusion.code) && retryState === 'triggered') {
      lines.push(
        '- 自动恢复：写回 job 已用 `gh run rerun --failed` 重跑审查与门禁 job 一次；等新结论评论，不要手动再重跑。'
      )
    } else if (AUTO_RETRY_ERROR_CODES.includes(conclusion.code) && retryState === 'exhausted') {
      lines.push('- 自动恢复：自动重跑 1 次仍不可用；按 `docs/agents/review.md` 做完整独立审查，或修输出契约。')
    } else if (AUTO_RETRY_ERROR_CODES.includes(conclusion.code) && retryState === 'failed') {
      lines.push(
        '- 自动恢复：自动重跑调用失败；按 `gh run rerun --failed` 手动重跑，并核对写回 job 的 `actions: write` 与运行页错误。'
      )
    } else if (AUTO_RETRY_ERROR_CODES.includes(conclusion.code)) {
      lines.push(
        '- 恢复指引：本次没有触发自动重跑；先看写回 run 运行页 Summary 的「原因」，核对是不是 CI 非 `failure`、产物不是空壳、attempt 字段不可读或注入异常。仅当 CI 确实判 `failure` 且本次产物确属不可用时，才必要时用 `gh run rerun --failed` 重跑一次；CI 已成功时不要重跑，先核对评论头部的 `sha` 是否覆盖当前 head。反复出现就修输出契约或 env 注入，不要连续重跑。'
      )
    }
  }
  if (meta?.model) lines.push(`- 模型：\`${meta.model}\`（effort \`${meta.effort || 'default'}\`）`)
  // 清洗只剥包装层，JSON 本体与结构校验都没变；写出来是为了让「结论来自一份原样不是 JSON 的答复」
  // 留在可见处，读者不必翻 artifact 才知道这一次发生过什么。
  if (Array.isArray(meta?.output_sanitized) && meta.output_sanitized.length > 0) {
    const labels = { 'reasoning-block': '推理标签块', 'code-fence': 'markdown 代码围栏' }
    const steps = meta.output_sanitized.map(step => labels[step] ?? plainText(step))
    lines.push(`- 输出清洗：模型答复外层带 ${steps.join('、')}，已剥离后重新解析；JSON 本体未改动`)
  }
  if (meta?.reused_from) {
    lines.push(
      meta?.reuse_reason === 'zero_incremental_diff'
        ? `- 复用：主干同步后净增量为 0（三方合并无冲突），沿用 run \`${meta.reused_from}\` 的审查结论（含原有 Block 判定），未再调用模型`
        : `- 复用：同一 head 已有结论，来自 run \`${meta.reused_from}\`，未再调用模型`
    )
  }
  const generated = stamp(meta?.generated_at)
  if (generated) lines.push(`- 结论生成于：\`${generated}\`（评论就地更新，创建时间不会变）`)
  // 历史一律写进 marker，所以这条可见行没列出来时下一版仍读得回。可见行的门槛按读感定：
  // 有故障码时即使只有一条也要列（要回答「这是第几次」），其余状态到第二次更新才有信息量，
  // 单条平凡状态只是把上面「结论」那行重说一遍。
  const showTrajectory = trajectory.length > 1 || (trajectory.length === 1 && Boolean(conclusion.code))
  if (showTrajectory) {
    lines.push(`${TRAJECTORY_PREFIX}${plainText(trajectory.join(' → '))}`)
  }
  const coverage = meta?.coverage
    ? { inspected: meta.coverage.inspected ?? [], uncovered: meta.coverage.uncovered ?? [] }
    : null
  // 清单是模型的自我描述，只为「已审查」与「已过时」的结论作证。结论本身被判不可用时它跟着作废：
  // 空清单加上「无未覆盖项」会说成「全都看过了」，与上面那行「未审查」正好相反；「未覆盖」段落
  // 会把这些位置写成待人工复核，作废的清单同样借不起这层含义。
  const auditable = conclusion.status === 'unreviewed' ? null : coverage
  if (conclusion.status === 'unreviewed' && coverage) {
    lines.push('- 覆盖：本次结论作废，覆盖清单不构成审查范围')
  } else if (auditable) {
    const uncovered = auditable.uncovered.length
    lines.push(
      `- 覆盖：检查 ${auditable.inspected.length} 个文件${uncovered > 0 ? `，另有 ${uncovered} 处未覆盖` : '，无未覆盖项'}`
    )
  } else if (conclusion.status === 'reviewed') {
    lines.push('- 覆盖：本次结论没有附覆盖清单，无法核对查过哪些文件')
  }
  lines.push('')

  const findings = [...(meta?.findings ?? [])].sort(
    (left, right) => SEVERITIES.indexOf(left.severity) - SEVERITIES.indexOf(right.severity)
  )
  if (conclusion.status === 'reviewed' && meta?.summary) lines.push(richText(meta.summary), '')
  if (auditable && auditable.uncovered.length > 0) {
    const shown = auditable.uncovered.slice(0, UNCOVERED_LIMIT)
    lines.push('**未覆盖**', '')
    for (const entry of shown) lines.push(`- ${richText(entry)}`)
    if (auditable.uncovered.length > shown.length) {
      lines.push(`- 其余 ${auditable.uncovered.length - shown.length} 处见 \`review-findings.json\``)
    }
    lines.push('')
  }
  if (findings.length === 0) {
    if (conclusion.status === 'reviewed') lines.push('没有需要改动的发现。')
    else if (conclusion.status === 'error') lines.push(errorGuidance(conclusion.code))
    else if (conclusion.status === 'unreviewed')
      lines.push(
        conclusion.code === 'missing_coverage'
          ? autoRetryExplained
            ? '本次没有可用结论：模型没交出覆盖证据，审查 job 一并判红；恢复状态见上方「自动恢复」行。'
            : '本次没有可用结论：模型没交出覆盖证据，审查 job 一并判红；恢复指引见上方故障码。'
          : autoRetryExplained
            ? '本次没有可用结论：模型输出不可用，审查 job 一并判红；恢复状态见上方「自动恢复」行。'
            : '本次没有可用结论：模型输出不可用，审查 job 一并判红；恢复指引见上方故障码。'
      )
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
    // rerun-failed-jobs 返回 201 且响应体可能为空，不能走 JSON.parse。
    rerunFailed: runId => gh(['api', '-X', 'POST', `repos/${repository}/actions/runs/${runId}/rerun-failed-jobs`]),
    artifacts: runId => get(`repos/${repository}/actions/runs/${runId}/artifacts`).artifacts ?? [],
    // jobs 只返回最新 attempt 的那一套；结论评论要的模型 job 错误就在这一套里。
    runJobs: runId => get(`repos/${repository}/actions/runs/${runId}/jobs?per_page=100`).jobs ?? [],
    // job 日志含 ANSI 转义序列，不加 --allow-escape-sequences 会被 gh 拒绝（与 codex-autofix.mjs 同一读法）。
    jobLog: jobId => gh(['api', '--allow-escape-sequences', `repos/${repository}/actions/jobs/${jobId}/logs`])
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

/** 从本 PR 的结论评论定位旧 head，并以运行记录验证所属 PR。 */
export function findPriorReviewRun({ adapter, pullNumber, headSha, currentRunId }) {
  if (!pullNumber) return null
  const comments = adapter.listComments(pullNumber) ?? []
  for (const comment of [...comments].reverse()) {
    if (comment?.user?.login !== 'github-actions[bot]') continue
    const marker = String(comment.body ?? '').match(
      /<!-- codex-review-conclusion sha=([0-9a-f]{40,64}) status=(?:reviewed|blocked|stale)\b/iu
    )
    const priorHead = marker?.[1]
    if (!priorHead || priorHead === headSha) continue
    if (!(adapter.pulls(priorHead) ?? []).some(pull => String(pull.number) === String(pullNumber))) continue
    const runs = adapter
      .runs(priorHead)
      .filter(
        entry => entry?.name === 'CI' && entry?.head_sha === priorHead && String(entry?.id) !== String(currentRunId)
      )
      .sort((a, b) => Number(b.id) - Number(a.id))
    for (const entry of runs) {
      const jobs = adapter.runJobs(entry.id)
      if (
        !['check', REVIEW_JOB_NAME].every(name => jobs.some(job => job.name === name && job.conclusion === 'success'))
      )
        continue
      if (adapter.artifacts(entry.id).some(item => item?.name === FINDINGS_ARTIFACT))
        return { runId: String(entry.id), headSha: priorHead }
    }
  }
  return null
}

/**
 * 同一个 head SHA 可能挂在多个 PR 上（关掉又重开）；取最近更新的那一个，返回完整 PR。
 * open 候选优先：更晚更新的 closed PR 不能遮住仍 open 的 PR，否则它的 autofix 会被静默跳过。
 * 不过滤 state：合并后的写回 run 仍要解析到 closed PR（回退路径），open 与否由 workflow 层按 pull_state 跳过。
 */
export function findPullForHead({ adapter, headSha }) {
  const candidates = (adapter.pulls(headSha) ?? []).filter(
    pull => pull?.head?.sha === headSha && Number.isFinite(pull?.number)
  )
  const open = candidates.filter(pull => pull?.state === 'open')
  const pool = open.length > 0 ? open : candidates
  pool.sort((left, right) => String(right.updated_at ?? '').localeCompare(String(left.updated_at ?? '')))
  return pool[0] ?? null
}

export function conclusionDirectory(env = process.env) {
  return env.CODEX_REVIEW_CONCLUSION_DIR ?? path.join(env.RUNNER_TEMP ?? '.', 'codex-review')
}

/**
 * 提示词要把「模型从哪读改动清单」写成同一个函数的产物，否则这句话就成了第二处手抄的常量：
 * 结论目录一挪，模型会照着旧路径读空文件，然后按「diff 太大」提前收尾。
 */
export function scopePath(env = process.env) {
  return path.join(conclusionDirectory(env), SCOPE_FILE)
}

export function preloadPath(env = process.env) {
  return path.join(conclusionDirectory(env), PRELOAD_FILE)
}

export function trustedPromptPath(env = process.env) {
  return env.CODEX_REVIEW_PROMPT_PATH ?? path.join(env.RUNNER_TEMP ?? '.', 'trusted/codex/prompts/review.md')
}

export function trustedDirectPromptPath(env = process.env) {
  return (
    env.CODEX_REVIEW_DIRECT_PROMPT_PATH ?? path.join(env.RUNNER_TEMP ?? '.', 'trusted/codex/prompts/review-direct.md')
  )
}

export function trustedTurn1SchemaPath(env = process.env) {
  return (
    env.CODEX_REVIEW_TURN1_SCHEMA_PATH ??
    path.join(env.RUNNER_TEMP ?? '.', 'trusted/codex/schemas/review-turn1.schema.json')
  )
}

export function trustedFinalSchemaPath(env = process.env) {
  return (
    env.CODEX_REVIEW_FINAL_SCHEMA_PATH ??
    path.join(env.RUNNER_TEMP ?? '.', 'trusted/codex/schemas/review-findings.schema.json')
  )
}

export function directRuntimePath(env = process.env) {
  return path.join(env.RUNNER_TEMP ?? '.', DIRECT_RUNTIME_FILE)
}

export function directErrorPath(env = process.env) {
  return path.join(env.RUNNER_TEMP ?? '.', DIRECT_ERROR_FILE)
}

export function directUnusablePath(env = process.env) {
  return path.join(env.RUNNER_TEMP ?? '.', DIRECT_UNUSABLE_FILE)
}

export function trustedRepoQueryPath(env = process.env) {
  return (
    env.CODEX_REVIEW_REPO_QUERY_PATH ??
    path.join(env.RUNNER_TEMP ?? '.', 'trusted/skills/monorepo-change-impact/repo-query.mjs')
  )
}

export function trustedSkillPath(skillName, env = process.env) {
  return path.join(env.RUNNER_TEMP ?? '.', 'trusted/skills', skillName, 'SKILL.md')
}

/**
 * 按审查风险给改动路径定档，供 prepare 预注入排序：
 * - high (rank 0): CI/工作流、根脚本与配置、权限与代理配置、包 manifest、包公共入口 barrel
 * - high (rank 1): packages/ 与 apps/ 下的非测试运行时源码
 * - medium (rank 2): 测试用例、ADR、agent 指令与规则文档
 * - low (rank 3): 其余文档、样式、changeset 与静态资源
 *
 * @param {string} filePath 仓库相对路径。
 * @returns {{rank: number, tier: 'high'|'medium'|'low', category: string}} 风险分级与类别。
 */
export function classifyPathRisk(filePath) {
  const normalized = String(filePath).trim().replace(/^\.\//u, '')
  const isTest = /(?:\.|\/)(?:test|spec)\.[^/]+$/u.test(normalized) || /(?:^|\/)(?:__tests__|e2e)\//u.test(normalized)
  const isDocOrStyle = /\.(?:md|mdx|css|txt|svg|png|jpg|jpeg|webp|ico)$/iu.test(normalized)
  if (
    !isTest &&
    (/^(?:\.github|scripts|\.claude|\.codex)\//u.test(normalized) ||
      /^(?:\.agents|skills)\/.*\.(?:mjs|cjs|js|ts|sh)$/u.test(normalized) ||
      /(?:^|\/)(?:package\.json|turbo\.json|tsconfig(?:\.[^/]+)?\.json|vite\.config\.[^/]+)$/u.test(normalized) ||
      /^(?:pnpm-(?:lock|workspace)\.yaml|\.mise\.toml)$/u.test(normalized) ||
      /^packages\/[^/]+\/(?:src\/)?index\.[^/]+$/u.test(normalized))
  ) {
    return { rank: 0, tier: 'high', category: 'contract-or-infra' }
  }
  if (!isTest && !isDocOrStyle && /^(?:packages|apps|src)\//u.test(normalized)) {
    return { rank: 1, tier: 'high', category: 'runtime-source' }
  }
  if (
    isTest ||
    /^(?:docs\/(?:adr|agents)|\.agents|skills)\//u.test(normalized) ||
    /(?:^|\/)AGENTS\.md$/u.test(normalized) ||
    /^(?:CONTEXT|ARCHITECTURE)\.md$/u.test(normalized)
  ) {
    return { rank: 2, tier: 'medium', category: isTest ? 'test' : 'policy-or-adr' }
  }
  return { rank: 3, tier: 'low', category: 'other' }
}

/**
 * 按风险升序排列改动路径；同档位保留 git diff 的原始相对顺序。
 *
 * @param {string[]} changedPaths 滤除生成物后的改动路径列表。
 * @returns {Array<{path: string, index: number, rank: number, tier: 'high'|'medium'|'low', category: string}>}
 */
export function rankChangedPaths(changedPaths) {
  return (Array.isArray(changedPaths) ? changedPaths : [])
    .map((filePath, index) => ({ path: filePath, index, ...classifyPathRisk(filePath) }))
    .sort((left, right) => left.rank - right.rank || left.index - right.index)
}

function decodeGitQuoted(inner) {
  const bytes = []
  let result = ''
  const flush = () => {
    if (bytes.length > 0) {
      result += Buffer.from(bytes).toString('utf8')
      bytes.length = 0
    }
  }
  for (let index = 0; index < inner.length; index += 1) {
    if (inner[index] === '\\' && index + 1 < inner.length) {
      const oct = inner.slice(index + 1, index + 4)
      if (/^[0-7]{3}$/u.test(oct)) {
        bytes.push(Number.parseInt(oct, 8))
        index += 3
        continue
      }
      flush()
      const next = inner[index + 1]
      const escapes = { n: '\n', t: '\t', r: '\r', b: '\b', f: '\f', v: '\v', a: '\x07', '\\': '\\', '"': '"' }
      result += escapes[next] ?? next
      index += 1
      continue
    }
    flush()
    result += inner[index]
  }
  flush()
  return result
}

function unquoteGitPath(raw, prefix) {
  let text = String(raw ?? '').trim()
  if (text.startsWith('"') && text.endsWith('"') && text.length >= 2) {
    text = decodeGitQuoted(text.slice(1, -1))
  }
  return prefix && text.startsWith(prefix) ? text.slice(prefix.length) : text
}

/**
 * 从已滤除生成物的完整 unified diff 中按文件切出各自区块，不额外启动 git 子进程。
 *
 * @param {string} diff unified diff 文本。
 * @param {string[]} [changedPaths] 已知改动路径列表，用于消歧含空格路径或无 hunk 的模式变更。
 * @returns {Map<string, string>} 路径到单文件 diff 区块的映射。
 */
export function splitDiffByPath(diff, changedPaths = []) {
  const map = new Map()
  if (typeof diff !== 'string' || diff === '') return map
  const known = new Set(changedPaths)
  const blocks = diff.split(/^(?=diff --git )/mu).filter(block => block.startsWith('diff --git '))
  for (const block of blocks) {
    const headerEnd = block.indexOf('\n@@ ')
    const header = headerEnd === -1 ? block : block.slice(0, headerEnd)
    const lines = header.split('\n')
    let matched = null
    for (const line of lines) {
      if (line.startsWith('+++ ') && line !== '+++ /dev/null') {
        const candidate = unquoteGitPath(line.slice(4), 'b/')
        if (known.size === 0 || known.has(candidate)) {
          matched = candidate
          break
        }
      }
      if (line.startsWith('rename to ')) {
        const candidate = unquoteGitPath(line.slice('rename to '.length), '')
        if (known.size === 0 || known.has(candidate)) {
          matched = candidate
          break
        }
      }
    }
    if (!matched) {
      for (const line of lines) {
        if (line.startsWith('--- ') && line !== '--- /dev/null') {
          const candidate = unquoteGitPath(line.slice(4), 'a/')
          if (known.size === 0 || known.has(candidate)) {
            matched = candidate
            break
          }
        }
        if (line.startsWith('rename from ')) {
          const candidate = unquoteGitPath(line.slice('rename from '.length), '')
          if (known.size === 0 || known.has(candidate)) {
            matched = candidate
            break
          }
        }
      }
    }
    if (!matched) {
      const firstLine = lines[0] ?? ''
      const quotedPair = /^diff --git ("(?:[^"\\]|\\.)+"|\S+)\s+("(?:[^"\\]|\\.)+"|\S+)$/u.exec(firstLine)
      if (quotedPair) {
        const candidate = unquoteGitPath(quotedPair[2], 'b/')
        if (known.size === 0 || known.has(candidate)) matched = candidate
      }
      if (!matched) {
        for (const candidate of known) {
          if (firstLine === `diff --git a/${candidate} b/${candidate}`) {
            matched = candidate
            break
          }
        }
      }
      if (!matched) {
        const pair = /^diff --git a\/(.+) b\/\1$/u.exec(firstLine)
        if (pair && (known.size === 0 || known.has(pair[1]))) matched = pair[1]
      }
    }
    if (matched) map.set(matched, block.trimEnd())
  }
  return map
}

/**
 * 按行与 UTF-8 码点边界截断文本，避免在多字节字符中间切开产生替换符。
 *
 * @param {string} text 待截断文本。
 * @param {number} maxBytes 最大 UTF-8 字节数。
 * @returns {{text: string, truncated: boolean, shownBytes: number, totalBytes: number}}
 */
export function truncateUtf8ByLines(text, maxBytes) {
  const source = String(text ?? '')
  const totalBytes = Buffer.byteLength(source, 'utf8')
  if (totalBytes <= maxBytes) return { text: source, truncated: false, shownBytes: totalBytes, totalBytes }
  if (maxBytes <= 0) return { text: '', truncated: true, shownBytes: 0, totalBytes }
  const lines = source.split('\n')
  const kept = []
  let used = 0
  for (const line of lines) {
    const separator = kept.length === 0 ? 0 : 1
    const lineBytes = Buffer.byteLength(line, 'utf8')
    if (used + separator + lineBytes <= maxBytes) {
      kept.push(line)
      used += separator + lineBytes
      continue
    }
    if (kept.length === 0) {
      let partial = ''
      let partialBytes = 0
      for (const char of line) {
        const charBytes = Buffer.byteLength(char, 'utf8')
        if (partialBytes + charBytes > maxBytes) break
        partial += char
        partialBytes += charBytes
      }
      return { text: partial, truncated: true, shownBytes: partialBytes, totalBytes }
    }
    break
  }
  return { text: kept.join('\n'), truncated: true, shownBytes: used, totalBytes }
}

/**
 * 用比内容中任何反引号串都更长的围栏包裹代码块，防止 Markdown 或测试 diff 里的 ``` 提前闭合提示词。
 *
 * @param {string} content 代码块正文。
 * @param {string} [info] 语言标记。
 * @returns {string}
 */
export function wrapCodeFence(content, info = 'diff') {
  const body = String(content ?? '').replace(/\n+$/u, '')
  let maxRun = 2
  for (const match of body.matchAll(/`+/gu)) {
    if (match[0].length > maxRun) maxRun = match[0].length
  }
  const fence = '`'.repeat(Math.max(3, maxRun + 1))
  return `${fence}${info}\n${body}\n${fence}`
}

const ANIMATION_DIFF_PATTERN =
  /\b(?:(?:on)?(?:transition|animation)(?:end|run|start|cancel|iteration|duration|timingfunction|property|delay|name)?|keyframes|cubic-bezier|prefers-reduced-motion|prefersReducedMotion|transform(?:Origin)?|transform-origin|will-change|willChange|clip-path|clipPath|requestAnimationFrame|useReducedMotion|ease-in|ease-out|easeIn|easeOut)\b|@(?:keyframes|starting-style)|:active\b|\bscale\s*\(\s*0\b|\banimate\s*\(/iu
const GESTURE_SPRING_DIFF_PATTERN =
  /\b(?:onPointer(?:Down|Move|Up|Cancel)|pointer(?:down|move|up|cancel)|setPointerCapture|releasePointerCapture|damping(?:Ratio)?|stiffness|velocity|onDrag(?:Start|Move|End|Over|Enter|Leave)?|useDrag|useGesture|useSpring|drag|swipe|gesture|inertia|momentum|overshoot|rubberband|spring)\b/iu
const DOC_EXTENSION_PATTERN = /\.(?:md|mdx|txt)$/iu
const FRONTEND_SOURCE_PATTERN =
  /^(?:packages\/web-ui|apps\/(?:react-web-ui-demo|vue-web-ui-demo|dev-kit-demo|interweave\/frontend))\/.*\.(?:[cm]?[jt]sx?|vue|css|scss|less|html)$/iu
const TEST_HELPER_PATTERN =
  /(?:^|\/)(?:vitest|playwright)\.config\.[^/]+$|^packages\/test-kit\/|(?:^|\/)(?:test-utils|test-helpers)\//u
const PUBLIC_BOUNDARY_PATTERN =
  /^packages\/[^/]+\/(?:package\.json|vite\.config\.[^/]+|(?:src\/)?index\.[^/]+|src\/(?:components|adapters|types)\/.*)$|^(?:pnpm-workspace\.yaml|turbo\.json|package\.json)$/u

function extractWorkspaceRoot(filePath) {
  if (filePath === 'apps/interweave/frontend' || filePath.startsWith('apps/interweave/frontend/')) {
    return 'apps/interweave/frontend'
  }
  const match = /^(packages|apps)\/([^/]+)(?:\/|$)/u.exec(filePath)
  return match ? `${match[1]}/${match[2]}` : null
}

function extractChangedDiffLines(fileDiff) {
  if (typeof fileDiff !== 'string' || fileDiff === '') return ''
  const hunkStart = fileDiff.indexOf('\n@@ ')
  if (hunkStart === -1) return ''
  return fileDiff
    .slice(hunkStart + 1)
    .split('\n')
    .filter(
      line => (line.startsWith('+') && !line.startsWith('+++')) || (line.startsWith('-') && !line.startsWith('---'))
    )
    .map(line => line.slice(1))
    .filter(line => !/^\s*(?:\/\/|\/\*|\*+\/|\*\s)/u.test(line))
    .join('\n')
}

/**
 * 根据改动路径与源码 diff 确定性路由审校类 skill：
 * - 自撰审校 skill（test-authoring / monorepo-change-impact）只引用并内嵌 `$RUNNER_TEMP/trusted/skills/`
 *   中的 BASE_SHA 可信副本（不输出 `$skill-name`，防止触发 host skill discovery 加载 PR head 的篡改副本）；
 * - 第三方 vendored UI/动效 skill 只注入轻量检查要点与路径指针（绝不写 `$skill-name`，避免输出表格/问候格式冲突与上下文膨胀）；
 * - 严格过滤测试文件与文档 diff，防止测试夹具或文档词汇误触发；empty_diff 时跳过。
 *
 * @param {object} range resolveReviewRange 的输出或同形状对象。
 * @param {object} [options]
 * @param {Map<string, string>} [options.diffByPath] 预先切分好的单文件 diff 映射。
 * @returns {Array<{
 *   name: string,
 *   mode: 'trusted'|'pointer',
 *   trustedRelativePath?: string,
 *   pointerFiles?: string[],
 *   reason: string,
 *   paths: string[],
 *   focus: string
 * }>}
 */
export function selectReviewSkills(range, { diffByPath } = {}) {
  const changedPaths = (Array.isArray(range?.changedPaths) ? range.changedPaths : [])
    .map(item => String(item).trim().replace(/^\.\//u, ''))
    .filter(Boolean)
  const diff = String(range?.diff ?? '')
  if (changedPaths.length === 0 || Buffer.byteLength(diff, 'utf8') === 0) return []

  const splitDiff = diffByPath ?? splitDiffByPath(diff, changedPaths)
  const routed = []

  const testPaths = changedPaths.filter(
    filePath =>
      classifyPathRisk(filePath).category === 'test' ||
      (TEST_HELPER_PATTERN.test(filePath) && !DOC_EXTENSION_PATTERN.test(filePath))
  )
  if (testPaths.length > 0) {
    routed.push({
      name: 'test-authoring',
      mode: 'trusted',
      trustedRelativePath: 'skills/test-authoring/SKILL.md',
      paths: testPaths,
      reason: '改动包含测试文件、测试配置或测试 helper',
      focus: '核对真实回归价值、行为优先于实现、异步完成信号/超时/退出清理、负向断言边界与测试生命周期。'
    })
  }

  const publicBoundaryPaths = changedPaths.filter(
    filePath =>
      PUBLIC_BOUNDARY_PATTERN.test(filePath) &&
      classifyPathRisk(filePath).category !== 'test' &&
      !DOC_EXTENSION_PATTERN.test(filePath)
  )
  const workspaceCodePaths = changedPaths.filter(
    filePath =>
      extractWorkspaceRoot(filePath) &&
      classifyPathRisk(filePath).category !== 'test' &&
      !DOC_EXTENSION_PATTERN.test(filePath)
  )
  const touchedWorkspaces = [...new Set(workspaceCodePaths.map(extractWorkspaceRoot).filter(Boolean))]
  if (publicBoundaryPaths.length > 0 || touchedWorkspaces.length >= 2) {
    const reason =
      publicBoundaryPaths.length > 0 && touchedWorkspaces.length >= 2
        ? '改动涉及公开包边界且跨 ≥ 2 个 workspace'
        : publicBoundaryPaths.length > 0
          ? '改动命中公开包导出、manifest、类型适配或根编排配置'
          : `改动跨 ${touchedWorkspaces.length} 个 workspace（${touchedWorkspaces.join('、')}）`
    routed.push({
      name: 'monorepo-change-impact',
      mode: 'trusted',
      trustedRelativePath: 'skills/monorepo-change-impact/SKILL.md',
      paths: publicBoundaryPaths.length > 0 ? publicBoundaryPaths : workspaceCodePaths,
      reason,
      focus: '核对公共 exports、peerDependencies、sideEffects、类型适配、直接消费者兼容性及 changeset semver 决策。'
    })
  }

  const frontendSourcePaths = changedPaths.filter(
    filePath => FRONTEND_SOURCE_PATTERN.test(filePath) && classifyPathRisk(filePath).category !== 'test'
  )
  const animationPaths = []
  const gesturePaths = []
  for (const filePath of frontendSourcePaths) {
    const changedLines = extractChangedDiffLines(splitDiff.get(filePath))
    if (!changedLines) continue
    if (ANIMATION_DIFF_PATTERN.test(changedLines)) animationPaths.push(filePath)
    if (GESTURE_SPRING_DIFF_PATTERN.test(changedLines)) gesturePaths.push(filePath)
  }

  if (animationPaths.length > 0) {
    routed.push({
      name: 'review-animations',
      mode: 'pointer',
      pointerFiles: [
        '$RUNNER_TEMP/trusted/.agents/skills-vendored/review-animations/SKILL.md',
        '$RUNNER_TEMP/trusted/.agents/skills-vendored/review-animations/STANDARDS.md'
      ],
      paths: animationPaths,
      reason: '前端非测试源码变更行命中动效/CSS 过渡关键词',
      focus:
        '检查是否出现 `transition: all`、`scale(0)`、`ease-in`、UI 时长 > 300ms、布局属性动画、`transform-origin` 错位、缺少 `prefers-reduced-motion` 或未用 `@media (hover: hover) and (pointer: fine)` 门控；按需读 `$RUNNER_TEMP/trusted/.agents/skills-vendored/review-animations/STANDARDS.md` 取精确阈值（禁止读工作区 `.agents/skills`）。'
    })
    routed.push({
      name: 'emil-design-eng',
      mode: 'pointer',
      pointerFiles: ['$RUNNER_TEMP/trusted/.agents/skills-vendored/emil-design-eng/SKILL.md'],
      paths: animationPaths,
      reason: '前端非测试源码变更行命中动效/交互反馈关键词',
      focus:
        '检查交互频率与克制原则（高频/快捷键不加动画）、强自定义 ease-out 曲线、`:active` 按压反馈、可打断性与弹窗/提示过渡一致；仅采纳判据，按需读 `$RUNNER_TEMP/trusted/.agents/skills-vendored/emil-design-eng/SKILL.md`（禁止读工作区 `.agents/skills`）。'
    })
  }

  if (gesturePaths.length > 0) {
    routed.push({
      name: 'apple-design',
      mode: 'pointer',
      pointerFiles: ['$RUNNER_TEMP/trusted/.agents/skills-vendored/apple-design/SKILL.md'],
      paths: gesturePaths,
      reason: '前端非测试源码变更行命中手势/指针/弹簧物理关键词',
      focus:
        '检查 `pointerdown` 即时反馈、`setPointerCapture` 1:1 跟随与抓取偏移、中断时从当前展示值无缝衔接速度、`damping`/`response` 与动量投影及进出路径对称；按需读 `$RUNNER_TEMP/trusted/.agents/skills-vendored/apple-design/SKILL.md`（禁止读工作区 `.agents/skills`）。'
    })
  }

  return routed
}

function execRepoQuery(scriptPath, args, { cwd, env, timeoutMs = REPO_QUERY_TIMEOUT_MS, spawn = spawnSync }) {
  const result = spawn(process.execPath, [scriptPath, ...args], {
    cwd,
    env,
    encoding: 'utf8',
    timeout: timeoutMs,
    maxBuffer: SPAWN_MAX_BUFFER
  })
  if (result.status !== 0) throw commandError(scriptPath, args, result, SPAWN_MAX_BUFFER)
  return JSON.parse(result.stdout ?? '{}')
}

/**
 * 命中 `monorepo-change-impact` 时，在 prepare 阶段只读运行 staged 的 `repo-query.mjs`，
 * 把结构化影响面摘要预注入 prompt；加超时与降级兜底，绝不阻塞审查流程。
 *
 * @param {object} range resolveReviewRange 的输出。
 * @param {object} [options]
 * @returns {{
 *   available: boolean,
 *   reason?: string,
 *   verify?: object,
 *   contracts?: object[],
 *   contractDiff?: object,
 *   warnings: string[],
 *   truncatedPathsCount: number
 * }}
 */
export function runRepoImpactQuery(
  range,
  {
    env = process.env,
    repoRoot = process.cwd(),
    repoQueryPath = trustedRepoQueryPath(env),
    timeoutMs = REPO_QUERY_TIMEOUT_MS,
    spawn = spawnSync
  } = {}
) {
  const changedPaths = Array.isArray(range?.changedPaths) ? range.changedPaths : []
  if (changedPaths.length === 0)
    return { available: false, reason: 'no changed paths', warnings: [], truncatedPathsCount: 0 }
  if (!repoQueryPath || !fs.existsSync(repoQueryPath)) {
    return {
      available: false,
      reason: 'staged repo-query.mjs is unavailable',
      warnings: [],
      truncatedPathsCount: 0
    }
  }

  const warnings = []
  const queryPaths = changedPaths.slice(0, REPO_QUERY_MAX_PATHS)
  const truncatedPathsCount = Math.max(0, changedPaths.length - queryPaths.length)
  try {
    const verify = execRepoQuery(repoQueryPath, ['verify', '--root', repoRoot, '--json', '--', ...queryPaths], {
      cwd: repoRoot,
      env,
      timeoutMs,
      spawn
    })

    const contracts = []
    const contractCandidates = (Array.isArray(verify.directWorkspaces) ? verify.directWorkspaces : []).slice(0, 5)
    for (const workspaceName of contractCandidates) {
      try {
        contracts.push(
          execRepoQuery(repoQueryPath, ['contract', '--root', repoRoot, '--json', workspaceName], {
            cwd: repoRoot,
            env,
            timeoutMs,
            spawn
          })
        )
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        if (!/is not a published package/u.test(message)) {
          warnings.push(`contract(${workspaceName}): ${oneLine(message)}`)
        }
      }
    }

    let contractDiff = null
    const baseRef = range?.diffBaseSha ?? range?.startSha ?? range?.mergeBaseSha ?? ''
    if (baseRef) {
      try {
        contractDiff = execRepoQuery(
          repoQueryPath,
          ['contract-diff', '--root', repoRoot, '--json', '--base', baseRef],
          {
            cwd: repoRoot,
            env,
            timeoutMs,
            spawn
          }
        )
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        warnings.push(`contract-diff(${baseRef}): ${oneLine(message)}`)
      }
    }

    return { available: true, verify, contracts, contractDiff, warnings, truncatedPathsCount }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { available: false, reason: oneLine(message), warnings, truncatedPathsCount }
  }
}

function formatImpactSummary(impactAnalysis) {
  if (!impactAnalysis) return []
  if (!impactAnalysis.available) {
    return impactAnalysis.reason && impactAnalysis.reason !== 'staged repo-query.mjs is unavailable'
      ? ['', `  - 影响面预计算降级：${impactAnalysis.reason}（请按需手动核查）`]
      : []
  }

  const lines = ['', '  - **影响面预计算（来自可信 `repo-query.mjs`）**：']
  const verify = impactAnalysis.verify ?? {}
  const direct =
    Array.isArray(verify.directWorkspaces) && verify.directWorkspaces.length > 0
      ? verify.directWorkspaces
      : ['(root only)']
  const affected =
    Array.isArray(verify.affectedWorkspaces) && verify.affectedWorkspaces.length > 0
      ? verify.affectedWorkspaces
      : ['(none)']
  lines.push(`    - 直接 workspace：${direct.map(item => `\`${item}\``).join('、')}`)
  lines.push(`    - 受影响闭包：${affected.map(item => `\`${item}\``).join('、')}`)
  if (impactAnalysis.truncatedPathsCount > 0) {
    lines.push(`    - 注意：输入路径超过 ${REPO_QUERY_MAX_PATHS} 条上限，仅基于前 ${REPO_QUERY_MAX_PATHS} 条预计算`)
  }
  const risk = verify.risk ?? {}
  const activeRisks = Object.entries(risk)
    .filter(([, value]) => Boolean(value))
    .map(([key]) => `\`${key}\``)
  lines.push(`    - 风险标记：${activeRisks.length > 0 ? activeRisks.join('、') : '无特殊跨包风险'}`)

  for (const contract of impactAnalysis.contracts ?? []) {
    const pkg = contract.package ?? {}
    const consumers =
      Array.isArray(contract.directConsumers) && contract.directConsumers.length > 0
        ? contract.directConsumers.map(item => `\`${item}\``).join('、')
        : '(none)'
    const exportKeys = Object.keys(pkg.exports ?? {})
    const shownExports = exportKeys
      .slice(0, 12)
      .map(item => `\`${item}\``)
      .join('、')
    const moreExports = exportKeys.length > 12 ? ` 等 ${exportKeys.length} 项` : ''
    lines.push(
      `    - 可发布契约 \`${pkg.name}\`（\`sideEffects: ${JSON.stringify(pkg.sideEffects)}\`）：直接消费者 ${consumers}；exports ${shownExports || '(none)'}${moreExports}`
    )
  }

  const diff = impactAnalysis.contractDiff
  if (diff) {
    if (Array.isArray(diff.changes) && diff.changes.length > 0) {
      lines.push(`    - \`contract-diff\`（\`requiresSemverReview=${Boolean(diff.requiresSemverReview)}\`）：`)
      for (const change of diff.changes.slice(0, 8)) {
        const flags = [
          ...(change.semverReview?.breakingCandidates ?? []).map(item => `breaking: ${item}`),
          ...(change.semverReview?.additiveCandidates ?? []).map(item => `additive: ${item}`)
        ]
        lines.push(`      - \`${change.name}\`：${flags.join('；') || 'manifest 字段变更'}`)
      }
    } else {
      lines.push('    - `contract-diff`：无已发布包 manifest 契约变化')
    }
  }

  const requiredChecks = (verify.verification ?? []).filter(item => item.level === 'required').slice(0, 6)
  if (requiredChecks.length > 0) {
    lines.push(`    - 应核对验证面：${requiredChecks.map(item => `\`${item.command}\``).join('、')}`)
  }

  for (const warning of impactAnalysis.warnings ?? []) {
    lines.push(`    - 预计算子查询降级：${warning}`)
  }
  return lines
}

function readTrustedSkillBody(skillName, { env, trustedSkills } = {}) {
  let raw = ''
  if (trustedSkills && typeof trustedSkills === 'object' && typeof trustedSkills[skillName] === 'string') {
    raw = trustedSkills[skillName]
  } else if (env?.RUNNER_TEMP) {
    const filePath = trustedSkillPath(skillName, env)
    if (fs.existsSync(filePath)) raw = fs.readFileSync(filePath, 'utf8')
  }
  if (!raw) return ''
  return raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/u, '').trim()
}

/**
 * 生成预注入到审查 prompt 开头的内容：判据速览 + 按需 Skill 路由 + 按风险排序的 changed_paths + 高风险 diff 片段。
 * 模型启动即看到判据、按需路由的 skill 与高风险源码改动，不再需要先 sed 整篇 docs/agents/review.md 才去找 diff。
 *
 * @param {object} range resolveReviewRange 的输出或同形状对象。
 * @param {object} [limits] 截断阈值覆盖与可选影响面预计算结果（供单测验证边界）。
 * @returns {{
 *   markdown: string,
 *   rankedPaths: Array<{path: string, tier: string, category: string}>,
 *   routedSkills: Array<{name: string, mode: 'trusted'|'pointer', trustedRelativePath?: string, pointerFiles?: string[], reason: string, paths: string[], focus: string}>,
 *   preloadedPaths: string[],
 *   truncatedPaths: string[],
 *   omittedPaths: string[],
 *   preloadBytes: number
 * }}
 */
export function buildReviewPreload(
  range,
  {
    maxPaths = PRELOAD_MAX_PATHS,
    maxFiles = PRELOAD_MAX_FILES,
    perFileBytes = PRELOAD_PER_FILE_BYTES,
    totalDiffBytes = PRELOAD_TOTAL_DIFF_BYTES,
    impactAnalysis = null,
    env = null,
    trustedSkills = null
  } = {}
) {
  const diff = String(range?.diff ?? '')
  const diffBytes = Buffer.byteLength(diff, 'utf8')
  const ranked = rankChangedPaths(range?.changedPaths ?? [])
  const emptyDiff = diffBytes === 0 || ranked.length === 0
  const diffByPath = emptyDiff
    ? new Map()
    : splitDiffByPath(
        diff,
        ranked.map(entry => entry.path)
      )
  const routedSkills = emptyDiff ? [] : selectReviewSkills(range, { diffByPath })
  const preloaded = []
  const preloadedPaths = []
  const truncatedPaths = []
  let remainingBudget = totalDiffBytes

  if (!emptyDiff) {
    for (const entry of ranked) {
      if (preloaded.length >= maxFiles || remainingBudget <= 0) break
      // 测试文件常含构造出来的非法 JSON、空壳样例或提示词片段（如 codex-review.test.mjs），
      // 预注入到提示词开头会诱导模型在结构化输出中直接复读测试夹具；测试改动留在 changed_paths 按需读取。
      if (entry.category === 'test') continue
      const rawBlock = diffByPath.get(entry.path)
      if (!rawBlock) continue
      const budget = Math.min(perFileBytes, remainingBudget)
      const slice = truncateUtf8ByLines(rawBlock, budget)
      if (slice.shownBytes === 0) break
      preloaded.push({ ...entry, ...slice })
      preloadedPaths.push(entry.path)
      if (slice.truncated) truncatedPaths.push(entry.path)
      remainingBudget -= slice.shownBytes
    }
  }

  const preloadedSet = new Set(preloadedPaths)
  const truncatedSet = new Set(truncatedPaths)
  const omittedPaths = ranked.filter(entry => !preloadedSet.has(entry.path)).map(entry => entry.path)

  const lines = [
    '### 判据速览（权威来源：`docs/agents/review.md`）',
    '',
    '- **三档标准**：`Block`（运行失败、回归、公共契约破坏、权限/注入漏洞、竞态/资源泄漏、或让检查/门禁假绿的阻断缺陷）；`Should fix`（需求或规范偏离、失败路径未兜住、测试或文档与实现失步等应修问题）；`Nit`（非阻断改进，不冒充阻断）。',
    '- **审查维度**：需求与验收、行为与失败路径、公共契约与兼容性、测试质量（异步完成信号、失败语义、负向断言边界、退出清理）、权限与用户输入安全、竞态与资源管理、文档与机检一致性；指令/context 改动另核七问（是否稳定不变量而非状态快照、是否唯一权威且指针落到能回答该问题的小节、单块检索是否自包含、是否写入易漂移的命令/路径/版本/实现名/清单、新增或移动的文档是否已被入口路由覆盖、删除的内容是否已有落点、每条指令能否判断做到或没做到）。',
    '- **范围与收口**：入库生成物已由 `excluded_pathspecs` 滤除，不读、不评注、不进 `inspected` 或 `uncovered`；`changed_paths` 每条均按待审源码处理。证据足够定档或高风险面查完即可交卷；未判断处写成 `path:line 原因` 列入 `coverage.uncovered`（合法收口，交人工逐项复核），`coverage.inspected` 只写真实读过的改动文件。'
  ]

  if (!emptyDiff) {
    lines.push('', '### 按需 Skill 路由', '')
    if (routedSkills.length === 0) {
      lines.push('- 本轮改动未命中专项 skill 路由，按上述通用判据审查；禁用实施流程型 skills。')
    } else {
      lines.push('> 仅采纳命中 skill 的缺陷判据与核查要点；最终只输出符合 schema 的 JSON。')
      for (const skill of routedSkills) {
        const hitList = skill.paths
          .slice(0, 6)
          .map(item => `\`${item}\``)
          .join('、')
        const hitMore = skill.paths.length > 6 ? ` 等 ${skill.paths.length} 个文件` : ''
        if (skill.mode === 'trusted') {
          const stagedLocation = `$RUNNER_TEMP/trusted/${skill.trustedRelativePath ?? `skills/${skill.name}/SKILL.md`}`
          lines.push(
            `- **\`${skill.name}\`**（可信副本：\`${stagedLocation}\`；触发依据：${skill.reason}；命中：${hitList}${hitMore}）：${skill.focus}`
          )
          const body = readTrustedSkillBody(skill.name, { env, trustedSkills })
          if (body) {
            lines.push('', wrapCodeFence(body, 'markdown'))
          }
          if (skill.name === 'monorepo-change-impact') {
            lines.push(...formatImpactSummary(impactAnalysis))
          }
        } else {
          const pointers = (skill.pointerFiles ?? []).map(item => `\`${item}\``).join('、')
          lines.push(
            `- **\`${skill.name}\`**（按需指针：${pointers}；触发依据：${skill.reason}；命中：${hitList}${hitMore}）：${skill.focus}`
          )
        }
      }
    }
  }

  lines.push(
    '',
    '### 本次范围与风险排序清单',
    '',
    `- 范围：\`${range?.startSha ?? range?.mergeBaseSha ?? 'unknown'}..${range?.headSha ?? 'unknown'}\`（base \`${range?.baseSha ?? 'unknown'}\`${range?.diffBaseSha ? ` · diff base \`${range.diffBaseSha}\`` : ''}）`,
    `- 源码 diff：\`${diffBytes}\` bytes · \`changed_paths\`：\`${ranked.length}\` 个文件 · \`empty_diff\`：\`${emptyDiff}\``,
    `- 预注入 diff：\`${preloadedPaths.length}/${ranked.length}\` 个文件（完整 \`${preloadedPaths.length - truncatedPaths.length}\`，截断 \`${truncatedPaths.length}\`，未预注入 \`${omittedPaths.length}\`）`
  )

  if (emptyDiff) {
    lines.push(
      '',
      '本次无待审源码改动（`empty_diff: true`）：无需运行 `git diff` 或读取文件，直接按输出契约返回空 `findings` 与空 `coverage.inspected`。'
    )
  } else {
    lines.push('', '**按风险排序的 `changed_paths`**：')
    const shownPaths = ranked.slice(0, maxPaths)
    for (const entry of shownPaths) {
      const status = !preloadedSet.has(entry.path)
        ? '未预注入，按需 git diff'
        : truncatedSet.has(entry.path)
          ? '已预注入截断 diff'
          : '已预注入完整 diff'
      lines.push(`- \`[${entry.tier}]\` \`${entry.path}\`（${status}）`)
    }
    if (ranked.length > shownPaths.length) {
      lines.push(
        `- … 其余 ${ranked.length - shownPaths.length} 个路径见 \`$RUNNER_TEMP/codex-review/review-scope.json\``
      )
    }

    if (preloaded.length > 0) {
      lines.push('', '### 高风险改动 diff 预注入', '')
      for (const item of preloaded) {
        const tag = item.truncated
          ? `已截断：显示前 ${item.shownBytes}/${item.totalBytes} bytes`
          : `完整 diff：${item.totalBytes} bytes`
        lines.push(`#### \`${item.path}\`（\`${item.tier}\`，${tag}）`, '', wrapCodeFence(item.text, 'diff'))
        if (item.truncated) {
          const diffRef =
            range?.diffBaseSha || range?.startSha ? '$CODEX_REVIEW_START_SHA' : '$CODEX_REVIEW_MERGE_BASE_SHA'
          lines.push('', `其余部分按需读取：\`git diff ${diffRef} $CODEX_REVIEW_HEAD_SHA -- "${item.path}"\``)
        }
        lines.push('')
      }
      if (lines.at(-1) === '') lines.pop()
    }
  }

  const markdown = lines.join('\n')
  return {
    markdown,
    rankedPaths: ranked.map(({ path: filePath, tier, category }) => ({ path: filePath, tier, category })),
    routedSkills,
    preloadedPaths,
    truncatedPaths,
    omittedPaths,
    preloadBytes: Buffer.byteLength(markdown, 'utf8')
  }
}

/**
 * 把预注入区块幂等写进提示词模板：存在起止标记时替换标记内部，重复执行不会叠加第二份预注入。
 *
 * @param {string} promptText 提示词模板原文。
 * @param {string} preloadMarkdown buildReviewPreload 生成的 Markdown。
 * @returns {string}
 */
export function injectPreloadIntoPrompt(promptText, preloadMarkdown) {
  const safeBody = String(preloadMarkdown ?? '')
    .trim()
    .replaceAll(PRELOAD_START_MARKER, '<!-- codex-review-preload:start (escaped) -->')
    .replaceAll(PRELOAD_END_MARKER, '<!-- codex-review-preload:end (escaped) -->')
  const block = `${PRELOAD_START_MARKER}\n${safeBody}\n${PRELOAD_END_MARKER}`
  const start = promptText.indexOf(PRELOAD_START_MARKER)
  const end = promptText.indexOf(PRELOAD_END_MARKER)
  if (start !== -1 && end !== -1 && end > start) {
    return `${promptText.slice(0, start)}${block}${promptText.slice(end + PRELOAD_END_MARKER.length)}`
  }
  return `${promptText.trimEnd()}\n\n${block}\n`
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

function writeOutputs(values, env = process.env) {
  const target = env.GITHUB_OUTPUT
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

function requireEnv(names, env = process.env) {
  return Object.fromEntries(
    names.map(name => {
      const value = env[name]
      if (value === undefined || value === '') throw new Error(`${name} is missing`)
      return [name, value]
    })
  )
}

/**
 * 清洗过包装层就把步骤写进结论 meta：结论本身不变，但「模型答复原样不是 JSON」这件事
 * 必须和原始答复一样留在产物里，供评论与 artifact 审计。
 */
function sanitizedMeta(parsed) {
  return Array.isArray(parsed?.sanitized) && parsed.sanitized.length > 0 ? { output_sanitized: parsed.sanitized } : {}
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

function readScope(env = process.env) {
  const file = scopePath(env)
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {}
}

function identityFromEnv(env = process.env) {
  const scope = readScope(env)
  const config = readConfig(env)
  return {
    head_sha: env.CODEX_REVIEW_HEAD_SHA ?? '',
    base_sha: env.CODEX_REVIEW_BASE_SHA ?? '',
    // 评论是就地更新的，创建时间永远停在第一次写回那一刻；结论自己的生成时间只能记在这里。
    generated_at: new Date().toISOString(),
    merge_base_sha: scope.merge_base_sha ?? '',
    review_start_sha: scope.review_start_sha ?? scope.merge_base_sha ?? '',
    model: config?.model ?? '',
    effort: config?.effort ?? '',
    config_fingerprint: config?.fingerprint ?? ''
  }
}

function writeErrorMeta(directory, identity, errorCode, reason, missing = [], extra = {}) {
  fs.rmSync(path.join(directory, FINDINGS_FILE), { force: true })
  fs.writeFileSync(
    path.join(directory, META_FILE),
    `${JSON.stringify({ ...identity, status: 'error', error_code: errorCode, error: reason, missing, ...extra }, null, 2)}\n`
  )
}

function readDirectRuntimeMetrics(env = process.env) {
  const file = directRuntimePath(env)
  if (!fs.existsSync(file)) return {}
  try {
    return pickDirectRuntimeMetrics(JSON.parse(fs.readFileSync(file, 'utf8')))
  } catch {
    return {}
  }
}

function readDirectEngineError(env = process.env) {
  const file = directErrorPath(env)
  if (!fs.existsSync(file)) return ''
  try {
    const raw = fs.readFileSync(file, 'utf8').trim()
    return raw ? sanitizeDirectError(raw, env.CODEX_REVIEW_API_KEY ?? '') : ''
  } catch {
    return ''
  }
}

function readDirectUnusableOutput(env = process.env) {
  const file = directUnusablePath(env)
  if (!fs.existsSync(file)) return null
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'))
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
    return {
      error_code: parsed.error_code === 'missing_coverage' ? 'missing_coverage' : 'unusable_output',
      error: typeof parsed.error === 'string' ? parsed.error : '',
      raw_output: typeof parsed.raw_output === 'string' ? parsed.raw_output : null
    }
  } catch {
    return null
  }
}

function logDirectRuntimeSummary(metrics, uncoveredCount) {
  if (!metrics || !metrics.engine) return
  const parts = [
    `engine=${metrics.engine}`,
    `calls=${metrics.api_calls ?? 0}`,
    `turns=${metrics.turns ?? 0}`,
    `ctx=${metrics.context_requests ?? 0}`,
    `retries=${metrics.retry_count ?? 0}`,
    `duration_ms=${metrics.duration_ms ?? 0}`,
    `tokens=${metrics.total_tokens ?? 'n/a'}`,
    `direct_preloaded=${metrics.direct_preloaded_files ?? 0}`,
    `direct_truncated=${metrics.direct_truncated_files ?? 0}`
  ]
  if (Number.isInteger(uncoveredCount)) parts.push(`uncovered=${uncoveredCount}`)
  console.error(`codex-review metrics: ${parts.join(' ')}`)
  appendSummary([
    '## Codex direct review runtime',
    '',
    `- Engine: \`${metrics.engine}\``,
    `- API calls: \`${metrics.api_calls ?? 0}\` (turns \`${metrics.turns ?? 0}\`, context lookups \`${metrics.context_requests ?? 0}\`, retries \`${metrics.retry_count ?? 0}\`)`,
    `- Duration: \`${metrics.duration_ms ?? 0} ms\``,
    `- Tokens: input \`${metrics.input_tokens ?? 'n/a'}\` · output \`${metrics.output_tokens ?? 'n/a'}\` · total \`${metrics.total_tokens ?? 'n/a'}\``,
    `- Direct packet: \`${metrics.direct_preloaded_files ?? 0}\` files (\`${metrics.direct_preload_bytes ?? 0}\` bytes, truncated \`${metrics.direct_truncated_files ?? 0}\`)${Number.isInteger(uncoveredCount) ? ` · uncovered \`${uncoveredCount}\`` : ''}`
  ])
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

export function commandPrepare({
  env = process.env,
  command = run,
  priorHeadSha,
  repoRoot = process.cwd(),
  repoQueryPath,
  timeoutMs = REPO_QUERY_TIMEOUT_MS,
  spawn = spawnSync
} = {}) {
  const required = requireEnv(['CODEX_REVIEW_BASE_SHA', 'CODEX_REVIEW_HEAD_SHA', 'RUNNER_TEMP'], env)
  const range = resolveReviewRange({
    baseSha: required.CODEX_REVIEW_BASE_SHA,
    headSha: required.CODEX_REVIEW_HEAD_SHA,
    priorHeadSha,
    command
  })
  const directory = conclusionDirectory(env)
  fs.mkdirSync(directory, { recursive: true })
  fs.writeFileSync(path.join(required.RUNNER_TEMP, 'pr.diff'), range.diff)
  const routed = selectReviewSkills(range)
  const impactAnalysis = routed.some(skill => skill.name === 'monorepo-change-impact')
    ? runRepoImpactQuery(range, {
        env,
        repoRoot,
        repoQueryPath: repoQueryPath ?? trustedRepoQueryPath(env),
        timeoutMs,
        spawn
      })
    : null
  const preload = buildReviewPreload(range, { impactAnalysis, env })
  fs.writeFileSync(preloadPath(env), `${preload.markdown}\n`)
  const promptFile = trustedPromptPath(env)
  if (fs.existsSync(promptFile)) {
    const currentPrompt = fs.readFileSync(promptFile, 'utf8')
    fs.writeFileSync(promptFile, injectPreloadIntoPrompt(currentPrompt, preload.markdown))
  }
  fs.writeFileSync(
    scopePath(env),
    `${JSON.stringify(
      {
        base_sha: range.baseSha,
        head_sha: range.headSha,
        merge_base_sha: range.mergeBaseSha,
        ...(range.startSha
          ? {
              review_start_sha: range.startSha,
              ...(range.diffBaseSha ? { diff_base_sha: range.diffBaseSha } : {}),
              incremental: true
            }
          : {}),
        diff_bytes: Buffer.byteLength(range.diff),
        empty_diff: Buffer.byteLength(range.diff) === 0,
        changed_paths: range.changedPaths,
        preloaded_paths: preload.preloadedPaths,
        preload_bytes: preload.preloadBytes,
        routed_skills: preload.routedSkills.map(item => item.name),
        excluded_pathspecs: REVIEW_EXCLUDE_PATHSPECS
      },
      null,
      2
    )}\n`
  )
  writeOutputs(
    {
      base_sha: range.baseSha,
      head_sha: range.headSha,
      merge_base_sha: range.mergeBaseSha,
      // 注入 CODEX_REVIEW_START_SHA 供模型按文件执行 git diff：分支合入更新后的 base 时使用合成三方合并树
      // diffBaseSha，使单文件 git diff 与 pr.diff / changed_paths 的起点一致；review-scope.json 仍记前次 head。
      review_start_sha: range.diffBaseSha ?? range.startSha ?? range.mergeBaseSha,
      diff_path: path.join(required.RUNNER_TEMP, 'pr.diff'),
      diff_bytes: String(Buffer.byteLength(range.diff)),
      preload_path: preloadPath(env)
    },
    env
  )
  console.log(
    `review range ${range.startSha ?? range.mergeBaseSha}..${range.headSha} (${Buffer.byteLength(range.diff)} bytes, preloaded ${preload.preloadedPaths.length}/${range.changedPaths.length} files, routed ${preload.routedSkills.length} skills)`
  )
  return { range, preload, impactAnalysis }
}

export function validateIncrementalBaseline({ prior, priorScope, expectedHead, expectedBase, config, isBaseAncestor }) {
  const baseMatches =
    prior?.meta?.base_sha === expectedBase ||
    (typeof isBaseAncestor === 'function' &&
      SHA_PATTERN.test(String(prior?.meta?.base_sha ?? '')) &&
      SHA_PATTERN.test(String(expectedBase ?? '')) &&
      isBaseAncestor(prior.meta.base_sha, expectedBase))
  if (
    !prior?.findings?.coverage ||
    prior.meta.status !== 'reviewed' ||
    prior.meta.head_sha !== expectedHead ||
    !baseMatches ||
    !config ||
    !config.fingerprint ||
    prior.meta.config_fingerprint !== config.fingerprint
  )
    throw new Error('prior conclusion is not a compatible baseline')
  if (
    priorScope.head_sha !== prior.meta.head_sha ||
    priorScope.base_sha !== prior.meta.base_sha ||
    JSON.stringify(priorScope.excluded_pathspecs) !== JSON.stringify(REVIEW_EXCLUDE_PATHSPECS) ||
    (priorScope.incremental &&
      (!prior.meta.review_lineage?.length || prior.meta.review_start_sha !== priorScope.review_start_sha))
  )
    throw new Error('prior scope does not match its conclusion')
  if (reuseCoverageGap(prior.findings, priorScope)) throw new Error('prior conclusion lacks coverage evidence')
}

export function commandPrepareIncremental({
  env = process.env,
  command = run,
  repoRoot = process.cwd(),
  repoQueryPath,
  timeoutMs = REPO_QUERY_TIMEOUT_MS,
  spawn = spawnSync
} = {}) {
  const required = requireEnv(['CODEX_REVIEW_HEAD_SHA', 'CODEX_REVIEW_BASE_SHA', 'RUNNER_TEMP'], env)
  const directory = conclusionDirectory(env)
  try {
    const priorHeadSha = env.CODEX_REVIEW_PRIOR_HEAD_SHA
    if (!priorHeadSha) throw new Error('no prior review head')
    const priorDir = priorConclusionDirectory(env)
    const prior = readConclusion(priorDir)
    const config = readConfig(env)
    const priorScope = JSON.parse(fs.readFileSync(path.join(priorDir, SCOPE_FILE), 'utf8'))
    const isBaseAncestor = (priorBase, currentBase) => {
      try {
        for (const sha of [priorBase, currentBase]) {
          try {
            command('git', ['cat-file', '-e', `${sha}^{commit}`])
          } catch {
            command('git', ['fetch', '--no-tags', 'origin', sha])
          }
        }
        command('git', ['merge-base', '--is-ancestor', priorBase, currentBase])
        return true
      } catch {
        return false
      }
    }
    validateIncrementalBaseline({
      prior,
      priorScope,
      expectedHead: priorHeadSha,
      expectedBase: required.CODEX_REVIEW_BASE_SHA,
      config,
      isBaseAncestor
    })
    const range = resolveReviewRange({
      baseSha: required.CODEX_REVIEW_BASE_SHA,
      headSha: required.CODEX_REVIEW_HEAD_SHA,
      priorHeadSha,
      command
    })
    if (range.changedPaths.length === 0 && range.diff.trim() === '') {
      fs.mkdirSync(directory, { recursive: true })
      fs.writeFileSync(path.join(required.RUNNER_TEMP, 'pr.diff'), '')
      const hasLineage = Array.isArray(prior.meta.review_lineage) && prior.meta.review_lineage.length > 0
      fs.writeFileSync(
        scopePath(env),
        `${JSON.stringify(
          {
            base_sha: range.baseSha,
            head_sha: range.headSha,
            merge_base_sha: range.mergeBaseSha,
            ...(range.diffBaseSha ? { diff_base_sha: range.diffBaseSha } : {}),
            review_start_sha: prior.meta.head_sha,
            ...(hasLineage ? { incremental: true } : {}),
            diff_bytes: 0,
            empty_diff: true,
            changed_paths: [],
            preloaded_paths: [],
            preload_bytes: 0,
            routed_skills: [],
            excluded_pathspecs: REVIEW_EXCLUDE_PATHSPECS
          },
          null,
          2
        )}\n`
      )
      const priorRunId = env.CODEX_REVIEW_PRIOR_RUN_ID ?? ''
      const reusedMeta = {
        head_sha: range.headSha,
        base_sha: range.baseSha,
        merge_base_sha: range.mergeBaseSha,
        model: config.model ?? prior.meta.model ?? '',
        effort: config.effort ?? prior.meta.effort ?? '',
        config_fingerprint: config.fingerprint,
        status: 'reviewed',
        reused_from: priorRunId,
        reuse_reason: 'zero_incremental_diff',
        review_start_sha: prior.meta.head_sha,
        ...pickDirectRuntimeMetrics(prior.meta),
        ...(hasLineage ? { review_lineage: prior.meta.review_lineage } : {}),
        ...(Array.isArray(prior.meta.output_sanitized) && prior.meta.output_sanitized.length > 0
          ? { output_sanitized: prior.meta.output_sanitized }
          : {}),
        ...(typeof prior.meta.generated_at === 'string' && prior.meta.generated_at !== ''
          ? { generated_at: prior.meta.generated_at }
          : {})
      }
      writeConclusion(directory, { findings: prior.findings, meta: reusedMeta })
      writeOutputs(
        {
          base_sha: range.baseSha,
          head_sha: range.headSha,
          merge_base_sha: range.mergeBaseSha,
          review_start_sha: prior.meta.head_sha,
          diff_path: path.join(required.RUNNER_TEMP, 'pr.diff'),
          diff_bytes: '0',
          incremental: 'true',
          reused: 'true'
        },
        env
      )
      console.log(
        `reusing prior conclusion (zero incremental diff) from run ${priorRunId || 'unknown'} for ${priorHeadSha}..${range.headSha}`
      )
      return { incremental: true, reused: true, range }
    }
    for (const name of [FINDINGS_FILE, META_FILE]) fs.rmSync(path.join(directory, name), { force: true })
    commandPrepare({ env, command, priorHeadSha, repoRoot, repoQueryPath, timeoutMs, spawn })
    writeOutputs({ incremental: 'true', reused: 'false' }, env)
    console.log(`incremental baseline ${priorHeadSha}`)
    return { incremental: true, reused: false, range }
  } catch (error) {
    // prepare 原先生成的全量范围仍是安全的回退；重新生成也防止部分写入留下混合状态。
    for (const name of [FINDINGS_FILE, META_FILE]) fs.rmSync(path.join(directory, name), { force: true })
    commandPrepare({ env, command, repoRoot, repoQueryPath, timeoutMs, spawn })
    writeOutputs({ incremental: 'false', reused: 'false' }, env)
    console.log(`using full review: ${error.message}`)
    return { incremental: false, reused: false }
  }
}

function commandResolvePull() {
  const env = requireEnv(['GITHUB_REPOSITORY', 'CODEX_REVIEW_HEAD_SHA'])
  const pull = findPullForHead({
    adapter: createGhReviewAdapter({ repository: env.GITHUB_REPOSITORY }),
    headSha: env.CODEX_REVIEW_HEAD_SHA
  })
  // pull_state 给写回 workflow 的 checkout/apply 两步用：closed（含合并）时整体 no-op。
  writeOutputs({ pull_number: String(pull?.number ?? ''), pull_state: String(pull?.state ?? '') })
  console.log(
    pull
      ? `head ${env.CODEX_REVIEW_HEAD_SHA} belongs to pull request #${pull.number} (${pull.state})`
      : 'no pull request owns this head'
  )
}

function commandPriorRun() {
  const env = requireEnv(['GITHUB_REPOSITORY', 'GITHUB_RUN_ID', 'CODEX_REVIEW_HEAD_SHA'])
  const adapter = createGhReviewAdapter({ repository: env.GITHUB_REPOSITORY })
  const reuse = findReusableRun({
    adapter,
    headSha: env.CODEX_REVIEW_HEAD_SHA,
    currentRunId: env.GITHUB_RUN_ID
  })
  const incremental = reuse
    ? null
    : findPriorReviewRun({
        adapter,
        pullNumber: pullNumber(),
        headSha: env.CODEX_REVIEW_HEAD_SHA,
        currentRunId: env.GITHUB_RUN_ID
      })
  writeOutputs({ prior_run_id: reuse?.runId ?? incremental?.runId ?? '', prior_head_sha: incremental?.headSha ?? '' })
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
    else if (process.env.CODEX_REVIEW_BASE_SHA && conclusion.meta.base_sha !== process.env.CODEX_REVIEW_BASE_SHA)
      failure = 'the PR base changed'
    else if (!config) failure = 'the configuration snapshot is missing'
    else if (!config.fingerprint) failure = 'the review contract fingerprint is missing'
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
    meta: {
      ...reusable.meta,
      reused_from: process.env.CODEX_REVIEW_PRIOR_RUN_ID ?? '',
      reuse_reason: 'same_head'
    }
  })
  writeOutputs({ reused: 'true', reason: '' })
  console.log(`reusing conclusion for ${reusable.meta.head_sha}`)
}

export async function commandRun({
  env = process.env,
  repoRoot = process.cwd(),
  fetchImpl = globalThis.fetch,
  spawn = spawnSync,
  sleepImpl,
  nowImpl,
  limits = {}
} = {}) {
  const required = requireEnv(['RUNNER_TEMP'], env)
  const outputPath = env.CODEX_REVIEW_OUTPUT_PATH ?? path.join(required.RUNNER_TEMP, 'codex-final-message.json')
  const runtimeFile = directRuntimePath(env)
  const errorFile = directErrorPath(env)
  const unusableFile = directUnusablePath(env)
  for (const stale of [outputPath, runtimeFile, errorFile, unusableFile]) {
    fs.rmSync(stale, { force: true })
  }

  const scope = readScope(env)
  const diffPath = env.CODEX_REVIEW_DIFF_PATH ?? path.join(required.RUNNER_TEMP, 'pr.diff')
  const diff = fs.existsSync(diffPath) ? fs.readFileSync(diffPath, 'utf8') : ''
  const range = {
    baseSha: scope.base_sha ?? env.CODEX_REVIEW_BASE_SHA ?? '',
    headSha: scope.head_sha ?? env.CODEX_REVIEW_HEAD_SHA ?? '',
    mergeBaseSha: scope.merge_base_sha ?? env.CODEX_REVIEW_MERGE_BASE_SHA ?? '',
    ...(scope.review_start_sha ? { startSha: scope.review_start_sha } : {}),
    ...(scope.diff_base_sha ? { diffBaseSha: scope.diff_base_sha } : {}),
    diff,
    changedPaths: Array.isArray(scope.changed_paths) ? scope.changed_paths : []
  }

  const trustedRoot = path.join(required.RUNNER_TEMP, 'trusted')
  const resolveAsset = (preferred, fallbackRelative) => {
    if (fs.existsSync(preferred)) return preferred
    return path.resolve(import.meta.dirname, fallbackRelative)
  }
  const promptFile = resolveAsset(trustedDirectPromptPath(env), '../codex/prompts/review-direct.md')
  const turn1SchemaFile = resolveAsset(trustedTurn1SchemaPath(env), '../codex/schemas/review-turn1.schema.json')
  const finalSchemaFile = resolveAsset(trustedFinalSchemaPath(env), '../codex/schemas/review-findings.schema.json')
  const promptText = fs.readFileSync(promptFile, 'utf8')
  const turn1Schema = JSON.parse(fs.readFileSync(turn1SchemaFile, 'utf8'))
  const finalSchema = JSON.parse(fs.readFileSync(finalSchemaFile, 'utf8'))

  let priorConclusion = null
  if (scope.incremental) {
    try {
      priorConclusion = readConclusion(priorConclusionDirectory(env))
    } catch {
      priorConclusion = null
    }
  }

  const diffByPath = splitDiffByPath(diff, range.changedPaths)
  const routedSkills = scope.empty_diff ? [] : selectReviewSkills(range, { diffByPath })
  const impactAnalysis = routedSkills.some(skill => skill.name === 'monorepo-change-impact')
    ? runRepoImpactQuery(range, { env, repoRoot, spawn })
    : null

  const result = await runDirectReview({
    env,
    range,
    scope,
    priorConclusion,
    routedSkills,
    impactAnalysis,
    promptText,
    turn1Schema,
    finalSchema,
    repoRoot,
    trustedRoot: fs.existsSync(trustedRoot) ? trustedRoot : '',
    excludePathspecs: REVIEW_EXCLUDE_PATHSPECS,
    helpers: {
      splitDiffByPath,
      truncateUtf8ByLines,
      wrapCodeFence,
      formatImpactSummary,
      readTrustedSkillBody: skillName => readTrustedSkillBody(skillName, { env }),
      normalizeReviewOutput,
      parseReviewFindings,
      coverageGap,
      inheritReviewHistory
    },
    fetchImpl,
    spawn,
    ...(sleepImpl ? { sleepImpl } : {}),
    ...(nowImpl ? { nowImpl } : {}),
    limits
  })

  fs.writeFileSync(runtimeFile, `${JSON.stringify(result.runtime, null, 2)}\n`)
  if (result.kind === 'model_failed') {
    const sanitized = sanitizeDirectError(result.errorMessage, env.CODEX_REVIEW_API_KEY ?? '')
    fs.writeFileSync(errorFile, `${sanitized}\n`)
    console.error(`${DIRECT_ERROR_PREFIX} ${sanitized}`)
    process.exitCode = 1
    return result
  }

  // 仅当引擎确认通过全部契约（reviewed）时才写入正式输出；unusable_or_missing_coverage 写入独立诊断文件，
  // 防止 Turn 1 协议失败但正文恰好包含合法 findings/coverage 字段时被 commandValidate 误判为 reviewed（假绿）。
  if (result.kind === 'reviewed') {
    if (typeof result.rawOutput === 'string') {
      fs.writeFileSync(outputPath, `${result.rawOutput}\n`)
    }
  } else {
    fs.rmSync(outputPath, { force: true })
    fs.writeFileSync(
      unusableFile,
      `${JSON.stringify(
        {
          error_code: result.errorCode === 'missing_coverage' ? 'missing_coverage' : 'unusable_output',
          error: result.errorMessage || 'direct review output failed contract validation',
          raw_output: typeof result.rawOutput === 'string' ? result.rawOutput : null
        },
        null,
        2
      )}\n`
    )
  }
  console.log(
    `direct review finished (${result.kind}, calls=${result.runtime.api_calls}, turns=${result.runtime.turns}, duration_ms=${result.runtime.duration_ms})`
  )
  return result
}

function commandValidate() {
  const env = requireEnv(['CODEX_REVIEW_HEAD_SHA', 'CODEX_REVIEW_BASE_SHA', 'RUNNER_TEMP'])
  const directory = conclusionDirectory()
  fs.mkdirSync(directory, { recursive: true })
  const identity = identityFromEnv()
  const config = readConfig()
  const reusedPath = path.join(directory, FINDINGS_FILE)
  const directMetrics = readDirectRuntimeMetrics()

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
    // 兜底：正常路径上 `reuse` 与 `prepare-incremental` 已经挡掉了没有覆盖清单的旧产物，
    // 这里再判一次，免得任何其它写入口把一次没有证据的空结论洗成绿色。
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
    const reusedFrom =
      typeof prior.reused_from === 'string' && prior.reused_from !== ''
        ? prior.reused_from
        : (process.env.CODEX_REVIEW_PRIOR_RUN_ID ?? '')
    const meta = {
      ...identity,
      status: 'reviewed',
      reused_from: reusedFrom,
      ...pickDirectRuntimeMetrics(prior)
    }
    if (typeof prior.reuse_reason === 'string' && prior.reuse_reason !== '') meta.reuse_reason = prior.reuse_reason
    if (Array.isArray(prior.review_lineage) && prior.review_lineage.length > 0) {
      meta.review_lineage = prior.review_lineage
      if (typeof prior.review_start_sha === 'string') meta.review_start_sha = prior.review_start_sha
    }
    if (Array.isArray(prior.output_sanitized) && prior.output_sanitized.length > 0) {
      meta.output_sanitized = prior.output_sanitized
    }
    // 复用的结论是上一次生成的：它没记时间就不写，绝不拿当前时间冒充它的生成时间。
    if (typeof prior.generated_at === 'string' && prior.generated_at !== '') meta.generated_at = prior.generated_at
    else delete meta.generated_at
    writeConclusion(directory, { findings: parsed, meta })
    writeOutputs({ blocks: String(parsed.counts.Block), reason: 'reused conclusion' })
    console.log(`reused conclusion: Block ${parsed.counts.Block}`)
    return
  }

  const outputPath = path.join(env.RUNNER_TEMP, 'codex-final-message.json')
  const directUnusable = !fs.existsSync(outputPath) ? readDirectUnusableOutput() : null
  if (directUnusable && process.env.CODEX_REVIEW_STEP_OUTCOME !== 'failure') {
    const reason = directUnusable.error || 'direct review output failed contract validation'
    if (directUnusable.error_code === 'missing_coverage' && directUnusable.raw_output) {
      let partial = null
      try {
        partial = parseReviewFindings(directUnusable.raw_output)
      } catch {
        partial = null
      }
      if (partial) {
        const partialUncovered = Array.isArray(partial?.coverage?.uncovered) ? partial.coverage.uncovered.length : 0
        const partialDirectExtra = directMetrics.engine ? { ...directMetrics, uncovered_count: partialUncovered } : {}
        writeConclusion(directory, {
          findings: partial,
          meta: {
            ...identity,
            status: 'unreviewed',
            error_code: 'missing_coverage',
            error: reason,
            ...sanitizedMeta(partial),
            ...partialDirectExtra
          }
        })
        logDirectRuntimeSummary(directMetrics, partialUncovered)
        writeOutputs({ blocks: String(partial.counts.Block), reason })
        console.error(`review is unreviewed: ${reason}`)
        console.error(
          'Rerun the failed jobs with `gh run rerun --failed`; a repeat means the review output contract needs fixing.'
        )
        return
      }
    }
    fs.rmSync(reusedPath, { force: true })
    fs.writeFileSync(
      path.join(directory, META_FILE),
      `${JSON.stringify({ ...identity, status: 'unreviewed', error_code: directUnusable.error_code, error: reason, ...directMetrics }, null, 2)}\n`
    )
    logDirectRuntimeSummary(directMetrics)
    writeOutputs({ blocks: '0', reason })
    console.error(`review is unreviewed: ${reason}`)
    return
  }

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
    // continue-on-error 掩住的是 conclusion，不是 outcome：模型 job 崩了就是故障，不能伪装成「未审查」。
    if (process.env.CODEX_REVIEW_STEP_OUTCOME === 'failure') {
      const modelError = readDirectEngineError()
      writeErrorMeta(directory, identity, 'model_failed', error, [], {
        ...directMetrics,
        ...(modelError ? { model_error: modelError } : {})
      })
      logDirectRuntimeSummary(directMetrics)
      writeOutputs({ blocks: '0', reason: error })
      console.error(`review is error: ${error}`)
      return
    }
    fs.writeFileSync(
      path.join(directory, META_FILE),
      `${JSON.stringify({ ...identity, status: 'unreviewed', error_code: 'unusable_output', error, ...directMetrics }, null, 2)}\n`
    )
    logDirectRuntimeSummary(directMetrics)
    writeOutputs({ blocks: '0', reason: error })
    console.error(`review is unreviewed: ${error}`)
    return
  }

  // 覆盖清单是结论的一部分，也是空 findings 与「没查就收尾」唯一的区分；判据见 `coverageGap`。
  const scope = readScope()
  const gap = coverageGap(parsed, scope)
  const uncoveredCount = Array.isArray(parsed?.coverage?.uncovered) ? parsed.coverage.uncovered.length : 0
  const directRuntimeExtra = directMetrics.engine ? { ...directMetrics, uncovered_count: uncoveredCount } : {}
  if (gap !== '') {
    // findings 留着：结论不可用由 status 表达，把已经看到的 Block 丢掉只会让作者少一条线索。
    writeConclusion(directory, {
      findings: parsed,
      meta: {
        ...identity,
        status: 'unreviewed',
        error_code: 'missing_coverage',
        error: gap,
        ...sanitizedMeta(parsed),
        ...directRuntimeExtra
      }
    })
    logDirectRuntimeSummary(directMetrics, uncoveredCount)
    writeOutputs({ blocks: String(parsed.counts.Block), reason: gap })
    console.error(`review is unreviewed: ${gap}`)
    console.error(
      'Rerun the failed jobs with `gh run rerun --failed`; a repeat means the review output contract needs fixing.'
    )
    return
  }

  let resolutions
  let lineage
  if (scope.incremental) {
    try {
      const prior = readConclusion(priorConclusionDirectory())
      if (!prior?.findings?.coverage || prior.meta.head_sha !== scope.review_start_sha)
        throw new Error('baseline unavailable')
      const raw = fs.readFileSync(outputPath, 'utf8')
      // 与 `parseReviewFindings` / `inheritReviewHistory` 同一条解析路径：带包装层的增量答复
      // 不该在这里被判成不可用的输出。
      resolutions = parseReviewJson(raw).value.prior_resolutions
      parsed = inheritReviewHistory(parsed, raw, prior.findings)
      lineage = [
        ...(Array.isArray(prior.meta.review_lineage) ? prior.meta.review_lineage : []),
        {
          head_sha: prior.meta.head_sha,
          findings: prior.findings.findings,
          resolutions
        }
      ]
    } catch (failure) {
      try {
        const prior = readConclusion(priorConclusionDirectory())
        if (prior?.findings?.coverage) {
          const unresolved = prior.findings.findings.map((_, index) => ({
            index,
            resolved: false,
            evidence: '未能核实'
          }))
          parsed = inheritReviewHistory(parsed, JSON.stringify({ prior_resolutions: unresolved }), prior.findings)
        }
      } catch {
        // 没有可读取的历史结论时仍判未审查，不能把缺失数据视作已解决。
      }
      const mergedUncoveredCount = Array.isArray(parsed?.coverage?.uncovered) ? parsed.coverage.uncovered.length : 0
      const mergedDirectExtra = directMetrics.engine ? { ...directMetrics, uncovered_count: mergedUncoveredCount } : {}
      writeConclusion(directory, {
        findings: parsed,
        meta: {
          ...identity,
          status: 'unreviewed',
          error_code: 'unusable_output',
          error: failure.message,
          ...sanitizedMeta(parsed),
          ...mergedDirectExtra
        }
      })
      logDirectRuntimeSummary(directMetrics, mergedUncoveredCount)
      writeOutputs({ blocks: String(parsed.counts.Block), reason: failure.message })
      console.error(`incremental review is unreviewed: ${failure.message}`)
      return
    }
  }
  const finalUncoveredCount = Array.isArray(parsed?.coverage?.uncovered) ? parsed.coverage.uncovered.length : 0
  const finalDirectExtra = directMetrics.engine ? { ...directMetrics, uncovered_count: finalUncoveredCount } : {}
  writeConclusion(directory, {
    findings: parsed,
    meta: {
      ...identity,
      status: 'reviewed',
      reused_from: '',
      ...sanitizedMeta(parsed),
      ...finalDirectExtra,
      ...(lineage ? { review_lineage: lineage } : {})
    }
  })
  logDirectRuntimeSummary(directMetrics, finalUncoveredCount)
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

function pullNumber({ allowRefFallback = true } = {}) {
  return resolvePullNumber({
    explicit: process.env.CODEX_REVIEW_PULL_NUMBER,
    ref: process.env.GITHUB_REF,
    allowRefFallback
  })
}

function evaluateGate(adapter, pull = null, { pullNumber: resolvedNumber } = {}) {
  const directory = conclusionDirectory()
  let conclusion = null
  let readError = ''
  try {
    conclusion = readConclusion(directory)
  } catch (error) {
    readError = error.message
  }
  const number = resolvedNumber ?? pullNumber()
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
      // missing_coverage 与 unusable_output 都会由 check-review-output.mjs 让审查 job 一并判红，
      // 统一提示用 --failed 重跑审查与门禁 job。
      console.error(
        'Rerun the failed jobs with `gh run rerun --failed`; a repeat means the review output contract needs fixing.'
      )
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

// 写回 workflow 的绿色必须能读懂：同一个 success，既可能是「发了评论」，也可能是「什么都没发」。
// 所以每条返回路径都往运行页写一行结果，把「没发」的原因留在 Summary 里而不是只留在日志。
function appendReportSummary({ number, status, meta, outcome }) {
  const counts = status?.counts
  const autoRetry = resolveAutoRetryState()
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
    ...(autoRetry === 'none' ? [] : [`- 自动恢复：\`${plainText(autoRetry)}\``]),
    '- 本运行只写回既有结论；是否拦合并由 CI run 的 `Codex review gate` 判定。'
  ])
}

/**
 * 写回 job 唯一的动作类写操作：对第一次 attempt 的空壳结论触发一次 --failed 重跑。
 *
 * run_attempt 与 run conclusion 由 workflow_run payload 注入，写回 run 自身的 attempt 由 github.run_attempt
 * 注入；两者共同钉住「只重跑一次」，不再额外发 GET。
 * 所有异常都收敛成 state=failed 并以 0 退出（annotation + Summary 留痕），步骤 output 一定写入，
 * 不依赖「失败步骤的 output 是否被 runner 保留」，结论评论也就不会退回误导性的手动重跑指引。
 */
export function commandAutoRetry({ env = process.env, adapter } = {}) {
  let runId = ''
  let attempt = 'unknown'
  let reportAttempt = 'unknown'
  let decision = { action: 'skip', state: 'none', reason: 'auto retry did not start' }
  try {
    const required = requireEnv(['GITHUB_REPOSITORY', 'WORKFLOW_RUN_ID'], env)
    runId = required.WORKFLOW_RUN_ID
    attempt = String(env.WORKFLOW_RUN_ATTEMPT ?? 'unknown')
    reportAttempt = String(env.WORKFLOW_REPORT_ATTEMPT ?? 'unknown')
    const metaPath = path.join(conclusionDirectory(env), META_FILE)
    const meta = fs.existsSync(metaPath) ? JSON.parse(fs.readFileSync(metaPath, 'utf8')) : null
    decision = autoRetryDecision({
      meta,
      runAttempt: env.WORKFLOW_RUN_ATTEMPT,
      runConclusion: env.CODEX_REVIEW_RUN_CONCLUSION,
      reportAttempt: env.WORKFLOW_REPORT_ATTEMPT
    })
    if (decision.action === 'rerun') {
      const client = adapter ?? createGhReviewAdapter({ repository: required.GITHUB_REPOSITORY })
      client.rerunFailed(runId)
    }
    console.log(`auto retry for run ${runId}: ${decision.action} (${decision.reason})`)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    decision = { action: 'skip', state: 'failed', reason: `auto retry failed: ${oneLine(message)}` }
    console.error(`::error title=Codex auto retry failed::${oneLine(message)}`)
  }
  writeOutputs({ retried: decision.action === 'rerun' ? 'true' : 'false', state: decision.state })
  appendSummary([
    '## Codex 空壳结论自动恢复',
    '',
    `- 触发 run：\`${runId || 'unknown'}\`（CI attempt \`${plainText(attempt)}\` / 写回 run attempt \`${plainText(reportAttempt)}\`）`,
    `- 动作：**${decision.action === 'rerun' ? '已重跑失败 job 一次' : '跳过'}**`,
    `- 原因：${decision.reason}`,
    `- 恢复状态：\`${decision.state}\``,
    '- 上限：CI run 与写回 run 自身的 attempt 都必须为 1；任一已重跑过就转人工完整独立审查。'
  ])
  return decision
}

/**
 * 结论评论的两项附加输入：读回的状态轨迹与按需取的模型 job 错误。
 *
 * 单独成函数是为了让 commandReport 的接线可被断言——env 名、门控故障码、`conclusionVerdict`
 * 与上一版正文这几处任何一笔写错，只会在生产评论上静默消失，YAML 侧的拓扑断言拦不住。
 *
 * @param {object} input
 * @param {object} input.adapter GitHub 只读/写回适配器
 * @param {object} input.status deriveConclusion 的结果
 * @param {object|null} input.meta review-meta.json
 * @param {object|undefined} input.existing 已存在的持久评论
 * @param {string} input.autoRetry 归一化后的自动恢复档位
 * @param {object} [input.env] 注入的环境变量表
 * @returns {{modelError: string, trajectory: string[]}} renderConclusion 的两个可选入参
 */
export function conclusionRenderExtras({ adapter, status, meta, existing, autoRetry, env = process.env }) {
  let modelError = ''
  if (status.status === 'error' && status.code === 'model_failed') {
    const persisted =
      typeof meta?.model_error === 'string' ? oneLine(meta.model_error.replace(ANSI_PATTERN, '')).trim() : ''
    modelError = persisted || readModelLegError(adapter, env.WORKFLOW_RUN_ID ?? '')
  }
  return {
    modelError,
    trajectory: trajectoryEntries({
      previousBody: existing?.body ?? '',
      verdict: conclusionVerdict(status),
      code: status.code ?? '',
      autoRetry,
      generatedAt: meta?.generated_at ?? ''
    })
  }
}

function commandReport() {
  const env = requireEnv(['GITHUB_REPOSITORY'])
  const number = pullNumber({ allowRefFallback: false })
  if (!number) throw new Error('CODEX_REVIEW_PULL_NUMBER is missing')
  const adapter = createGhReviewAdapter({ repository: env.GITHUB_REPOSITORY })
  const call = withPermissionDiagnosis(number)
  const pull = call(() => adapter.pull(number))
  const target = reviewTarget({ pull, repository: env.GITHUB_REPOSITORY, releaseBranch: RELEASE_BRANCH })
  if (!target.ok) {
    console.log(`conclusion report skipped for #${number}: ${target.reason}`)
    appendReportSummary({ number, outcome: `未写回：${target.reason}` })
    return
  }
  const { conclusion, status } = call(() => evaluateGate(adapter, pull, { pullNumber: number }))
  const meta = conclusion?.meta ?? null
  const autoRetry = resolveAutoRetryState()
  const existing = call(() => adapter.listComments(number)).find(comment =>
    (comment.body ?? '').includes(CONCLUSION_MARKER)
  )
  const extras = conclusionRenderExtras({ adapter, status, meta, existing, autoRetry })
  const body = renderConclusion({ conclusion: status, meta, pullNumber: number, autoRetry, ...extras })
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
  run: commandRun,
  'prior-run': commandPriorRun,
  'prepare-incremental': commandPrepareIncremental,
  'resolve-pull': commandResolvePull,
  reuse: commandReuse,
  validate: commandValidate,
  gate: commandGate,
  'auto-retry': commandAutoRetry,
  report: commandReport
}

async function main() {
  const name = process.argv[2]
  const handler = commands[name]
  if (!handler) throw new Error(`usage: node codex-review.mjs <${Object.keys(commands).join('|')}>`)
  await handler()
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    await main()
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
