import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

import { readConfig, reviewTarget } from './codex-review.mjs'
import { SPAWN_MAX_BUFFER, commandError, resolvePullNumber, run } from './lib/github.mjs'
import { RELEASE_BRANCH } from './lib/workflow-topology.mjs'

export const MAX_AUTOFIX_COMMITS = 3
export const PULL_COMMITS_API_CAP = 250
export const AUTOFIX_TRAILER_KEY = 'Autofix-by'
export const AUTOFIX_TRAILER_VALUE = 'codex-autofix'
export const AUTOFIX_TRAILER = `${AUTOFIX_TRAILER_KEY}: ${AUTOFIX_TRAILER_VALUE}`
export const PATCH_ARTIFACT = 'codex-autofix-patch'
export const REQUIRED_JOB = 'check'

const PULL_COMMITS_PER_PAGE = 100
const SHA_PATTERN = /^[0-9a-f]{40,64}$/iu
const LOG_LIMIT_BYTES = 200_000
const ANY = '\u0000'
const ACROSS = '\u0001'

const EXTRA_GUARDED = [
  { label: 'CI 与 workflow 定义', matcher: /(^|\/)\.github\//u },
  {
    label: '依赖清单与供应链配置',
    matcher:
      /(^|\/)(package\.json|pnpm-lock\.yaml|pnpm-workspace\.yaml|skills-lock\.json|\.npmrc|\.mise\.toml|go\.mod|go\.sum|go\.work|go\.work\.sum)$/u
  },
  { label: '依赖清单与供应链配置', matcher: /(^|\/)vendor\//u },
  {
    label: 'agent 指令体系与 ADR',
    matcher: /(^|\/)(AGENTS\.md|CLAUDE\.md|CONTEXT\.md|ARCHITECTURE\.md|docs\/agents\/|docs\/adr\/|\.agents\/)/u
  },
  { label: 'Codex 自身配置', matcher: /(^|\/)\.codex\//u },
  { label: '客户端权限配置', matcher: /(^|\/)\.claude\//u },
  { label: '凭证与环境文件', matcher: /(^|\/)\.env[^/]*$/u },
  { label: '测试证据', matcher: /(^|\/)(__screenshots__|\.vitest-attachments)\//u }
]

export function globToRegExp(glob) {
  const translated = glob
    .replace(/[.+^${}()|[\]\\]/gu, '\\$&')
    .replace(/\*\*\//gu, ANY)
    .replace(/\*\*/gu, ACROSS)
    .replace(/\*/gu, '[^/]*')
    .replace(/\?/gu, '[^/]')
    .split(ANY)
    .join('(?:[^/]+/)*')
    .split(ACROSS)
    .join('.*')
  return new RegExp(`^${translated}$`, 'u')
}

/**
 * 入库生成物的权威名单是 `.claude/settings.json` 的 `permissions.deny`，见
 * docs/agents/generated-artifacts.md「机器拦截的覆盖面」。这里读同一份名单而不是抄第二份：
 * 新增 generator 时 patch 判定跟着变，两边不会各自漂移。
 */
export function generatedGuarded({ repositoryFile, parse = JSON.parse }) {
  const settings = parse(repositoryFile)
  const patterns = (settings?.permissions?.deny ?? [])
    .map(entry => String(entry).match(/^Edit\((.+)\)$/u)?.[1])
    .filter(Boolean)
    .map(pattern => ({ label: '生成物', matcher: globToRegExp(pattern.replace(/^\.\/?/u, '')) }))
  if (patterns.length === 0) throw new Error('.claude/settings.json declares no Edit deny patterns')
  return patterns
}

export function createGuardedMatcher({ repositoryFile, parse = JSON.parse }) {
  const guarded = [...generatedGuarded({ repositoryFile, parse }), ...EXTRA_GUARDED]
  return filePath => guarded.find(({ matcher }) => matcher.test(filePath)) ?? null
}

const CHANGESET_FILE = /^\.changeset\/[A-Za-z0-9][A-Za-z0-9._-]*\.md$/u
const CHANGESET_RESERVED = /^\.changeset\/(?:README|AGENTS|CLAUDE|GEMINI)\.md$/iu

/**
 * changeset 门要求本 PR 自己的 `.changeset/*.md`，而 changeset 天然是新增文件。
 * 允许的唯一新增路径因此收窄到顶层 changeset 声明，且必须是普通文件。
 */
export function isChangesetAddition(filePath) {
  return CHANGESET_FILE.test(filePath) && !CHANGESET_RESERVED.test(filePath)
}

/**
 * 只收「修改已入库文件」的 patch；唯一例外是 `Check changesets` 失败时新增的 changeset。
 * 其余新增/删除/改名/二进制都拒：autofix 的职责是把红的检查修回绿的，不是替作者决定文件结构；
 * 模型顺手写进工作区的草稿文件也因此进不了 patch。
 */
export function inspectPatch(patch, { allowNewChangeset = false } = {}) {
  const files = []
  const added = []
  let current = ''
  const lines = patch.split(/\r?\n/)
  for (const line of lines) {
    const header = line.match(/^diff --git a\/(.*?) b\/(.*?)$/u)
    if (header) {
      const [, from, to] = header
      current = from
      if (from !== to) return { reject: `patch renames or moves ${from} to ${to}`, files, added }
      files.push(from)
      continue
    }
    if (line.startsWith('Binary files ')) return { reject: `patch contains a binary change: ${line}`, files, added }
    if (line.startsWith('new file mode ')) {
      if (!allowNewChangeset || !isChangesetAddition(current))
        return { reject: `patch adds a new file: ${current}`, files, added }
      if (line !== 'new file mode 100644') return { reject: `patch adds a non-regular file: ${current}`, files, added }
      added.push(current)
      continue
    }
    if (line.startsWith('deleted file mode ')) return { reject: 'patch deletes a file', files, added }
  }
  if (/\nGIT binary patch\n/u.test(`\n${patch}`)) return { reject: 'patch contains a binary payload', files, added }
  if (files.length === 0) return { reject: 'patch changes no tracked file', files, added }
  return { reject: '', files, added }
}

/** `Check changesets` 是唯一需要新增文件的失败步骤；其它步骤仍只许改已入库文件。 */
export function failedStepAllowsChangeset(failedSteps) {
  return String(failedSteps ?? '')
    .split(',')
    .map(step => step.trim())
    .includes('Check changesets')
}

function requireSha(value, label) {
  if (typeof value !== 'string' || !SHA_PATTERN.test(value)) throw new Error(`${label} is not a commit SHA: ${value}`)
  return value
}

export function capturePatch({ headSha, patchPath, guarded, allowNewChangeset = false, command = run }) {
  const sha = requireSha(headSha, 'patch base SHA')
  // `git diff` 默认看不到未跟踪文件；changeset 是新增文件，先记 intent-to-add 才能进 patch。
  if (allowNewChangeset) command('git', ['add', '--intent-to-add', '--', '.changeset'])
  const patch = command('git', ['diff', '--no-color', sha, '--'])
  const { reject, files } = inspectPatch(patch, { allowNewChangeset })
  if (reject) return { reject, files: [], bytes: 0, patchPath }
  for (const file of files) {
    const hit = guarded(file)
    if (hit) return { reject: `${file} is ${hit.label}`, files: [], bytes: 0, patchPath }
  }
  fs.writeFileSync(patchPath, patch)
  return { reject: '', files, bytes: Buffer.byteLength(patch), patchPath }
}

export function validatePatchFile({ patchPath, guarded, allowNewChangeset = false }) {
  const patch = fs.readFileSync(patchPath, 'utf8')
  const { reject, files } = inspectPatch(patch, { allowNewChangeset })
  if (reject) return { reject, files }
  for (const file of files) {
    const hit = guarded(file)
    if (hit) return { reject: `${file} is ${hit.label}`, files: [] }
  }
  return { reject: '', files }
}

export function createGhAutofixAdapter({ repository, spawn = spawnSync, cwd = process.cwd(), env = process.env }) {
  const gh = args => {
    const result = spawn('gh', args, { encoding: 'utf8', cwd, env, maxBuffer: SPAWN_MAX_BUFFER })
    if (result.status !== 0) throw commandError('gh', args, result)
    return result.stdout ?? ''
  }

  return {
    pull: number => JSON.parse(gh(['api', `repos/${repository}/pulls/${number}`])),
    pullCommits: number => {
      const commits = []
      const maxPages = Math.ceil(PULL_COMMITS_API_CAP / PULL_COMMITS_PER_PAGE)
      for (let page = 1; page <= maxPages; page += 1) {
        const chunk = JSON.parse(
          gh(['api', `repos/${repository}/pulls/${number}/commits?per_page=${PULL_COMMITS_PER_PAGE}&page=${page}`])
        )
        if (!Array.isArray(chunk)) throw new Error(`gh api returned a non-array commit page for PR #${number}`)
        commits.push(...chunk)
        if (chunk.length < PULL_COMMITS_PER_PAGE) break
      }
      return { commits }
    },
    jobs: runId => JSON.parse(gh(['api', `repos/${repository}/actions/runs/${runId}/jobs?per_page=100`])).jobs ?? [],
    jobLog: jobId => gh(['api', '--allow-escape-sequences', `repos/${repository}/actions/jobs/${jobId}/logs`])
  }
}

export function failedJobSteps(jobs, jobName) {
  const job = jobs.find(entry => entry?.name === jobName)
  if (!job) return null
  return {
    jobId: job.id,
    steps: (job.steps ?? []).filter(step => step?.conclusion === 'failure').map(step => step.name ?? step.id)
  }
}

export function tailLog(log, limit = LOG_LIMIT_BYTES) {
  if (Buffer.byteLength(log) <= limit) return log
  const buffer = Buffer.from(log)
  return `… truncated: showing the last ${limit} of ${buffer.length} bytes …\n${buffer.subarray(buffer.length - limit).toString()}`
}

function isAutofixTrailerLine(line) {
  if (/^[ \t]/u.test(line)) return false
  const [key, ...rest] = line.split(':')
  return key === AUTOFIX_TRAILER_KEY && rest.join(':').replace(/^[ \t]+|[ \t]+$/gu, '') === AUTOFIX_TRAILER_VALUE
}

export function hasAutofixTrailer(message) {
  if (typeof message !== 'string') return false
  const lines = message.split('\n').map(line => line.replace(/\r$/u, ''))
  while (lines.length > 0 && lines.at(-1).trim() === '') lines.pop()
  let start = lines.length
  while (start > 0 && lines[start - 1].trim() !== '') start -= 1
  return lines.slice(start).some(isAutofixTrailerLine)
}

export function countAutofixCommits(commits) {
  if (!Array.isArray(commits)) return 0
  return commits.filter(entry => hasAutofixTrailer(String(entry?.commit?.message ?? ''))).length
}

export function autofixCommitMessage(files) {
  return [
    'fix(root): apply Codex autofix for the failing CI checks',
    '',
    `Files: ${files.join(', ')}`,
    '',
    AUTOFIX_TRAILER
  ].join('\n')
}

function autofixCommitState(commits, pull) {
  const count = countAutofixCommits(commits)
  const total = pull?.commits
  const totalIsValid = Number.isInteger(total) && total >= 0
  return {
    count,
    limitReached: count >= MAX_AUTOFIX_COMMITS,
    unverified: !totalIsValid || commits.length < total,
    unverifiedDetail: totalIsValid
      ? `read ${commits.length} of ${total} commits`
      : `read ${commits.length} commits; PR total is missing or invalid`
  }
}

/**
 * 直推前的三道判定，顺序不能换：head 移动说明 patch 是对着旧代码生成的；
 * autofix 计数无法验证或达到上限时停止自动修，避免在不可信历史上继续叠加；
 * 检出 SHA 与 live head 不一致说明 push 会覆盖别人的提交。
 */
export function assertPushAllowed({
  liveHeadSha,
  expectedHeadSha,
  commits,
  autofixUnverified,
  autofixCountDetail,
  checkoutSha
}) {
  const live = requireSha(liveHeadSha, 'live PR head SHA')
  const expected = requireSha(expectedHeadSha, 'planned head SHA')
  if (live !== expected) throw new Error(`refusing to push: the head moved from ${expected} to ${live}`)
  if (autofixUnverified) {
    const detail = autofixCountDetail ? ` (${autofixCountDetail})` : ''
    throw new Error(`refusing to push: cannot verify the autofix count${detail}`)
  }
  if (countAutofixCommits(commits) >= MAX_AUTOFIX_COMMITS) {
    throw new Error(`refusing to push: this PR already has ${MAX_AUTOFIX_COMMITS} ${AUTOFIX_TRAILER} commits`)
  }
  const checkout = requireSha(checkoutSha, 'checked out SHA')
  if (checkout !== live) throw new Error(`refusing to push: checked out ${checkout} instead of ${live}`)
  return live
}

function writeOutputs(values) {
  const target = process.env.GITHUB_OUTPUT
  if (!target) return
  const body = Object.entries(values)
    .map(([key, value]) => `${key}=${String(value).replace(/\s+/gu, ' ')}`)
    .join('\n')
  fs.appendFileSync(target, `${body}\n`)
}

function appendSummary(lines) {
  const target = process.env.GITHUB_STEP_SUMMARY
  if (target) fs.appendFileSync(target, `${lines.join('\n')}\n`)
}

/**
 * reviewTarget 的拒绝是「无对象可修」的预期出口，不是 apply 自己的故障：
 * 写回 run 由 CI completed 触发，可能晚于合并完成。绿色收尾并把原因写进 step summary，
 * 与 report 路径的 commandReport（拒绝时绿色退出）保持同一语义。
 */
function skipApply(reason) {
  appendSummary([
    '## Codex autofix 未应用',
    '',
    `apply 不推送：${reason}。`,
    '',
    '- 写回 run 由「CI completed」触发，可能晚于合并完成；autofix 只服务仍 open 的 PR，本次无事可做。'
  ])
  console.log(`skipping autofix apply: ${reason}`)
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

function guardedMatcher() {
  const root = process.env.GITHUB_WORKSPACE ?? process.cwd()
  return createGuardedMatcher({
    repositoryFile: fs.readFileSync(
      process.env.CODEX_TRUSTED_SETTINGS ?? path.join(root, '.claude', 'settings.json'),
      'utf8'
    )
  })
}

function pullNumber({ allowRefFallback = true } = {}) {
  return resolvePullNumber({
    explicit: process.env.CODEX_AUTOFIX_PULL_NUMBER,
    ref: process.env.GITHUB_REF,
    allowRefFallback
  })
}

function commandPrepare() {
  console.log(
    `codex-autofix: prepare (limit=${MAX_AUTOFIX_COMMITS}, cap=${PULL_COMMITS_API_CAP}, trailer=${AUTOFIX_TRAILER})`
  )
  const env = requireEnv(['GITHUB_REPOSITORY', 'GITHUB_RUN_ID', 'RUNNER_TEMP'])
  const adapter = createGhAutofixAdapter({ repository: env.GITHUB_REPOSITORY })
  const number = pullNumber({ allowRefFallback: true })
  if (number) {
    // 先读 commits，再取新的 PR 对象。total 与 live head 来自同一个分页之后时点，
    // 分页期间漏读的新提交会表现为 commits.length < total，按无法验证处理。
    const { commits } = adapter.pullCommits(number)
    const pull = adapter.pull(number)
    const { limitReached, unverified, unverifiedDetail } = autofixCommitState(commits, pull)
    if (limitReached)
      console.log(`pull request #${number} already has ${MAX_AUTOFIX_COMMITS} autofix commits; limit reached`)
    if (unverified)
      console.log(`pull request #${number} cannot verify autofix count (${unverifiedDetail}); skipping autofix`)
    if (limitReached || unverified) {
      writeOutputs({ has_log: 'false', failed_steps: '', log_path: '' })
      return
    }
  }
  const failure = failedJobSteps(adapter.jobs(env.GITHUB_RUN_ID), REQUIRED_JOB)
  if (!failure || failure.steps.length === 0) {
    writeOutputs({ has_log: 'false', failed_steps: '', log_path: '' })
    console.log(`no failed step in the ${REQUIRED_JOB} job`)
    return
  }
  const log = tailLog(adapter.jobLog(failure.jobId))
  const logPath = path.join(env.RUNNER_TEMP, 'ci-failure.log')
  fs.writeFileSync(logPath, `Failed steps: ${failure.steps.join(', ')}\n\n${log}`)
  writeOutputs({ has_log: 'true', failed_steps: failure.steps.join(', '), log_path: logPath })
  console.log(`captured ${Buffer.byteLength(log)} bytes of CI log for: ${failure.steps.join(', ')}`)
}

function commandCapture() {
  const env = requireEnv(['CODEX_AUTOFIX_HEAD_SHA', 'RUNNER_TEMP'])
  // 模型 job 没跑成时工作区仍可能有零散改动；没有预检快照就不产出 patch，避免特权 job 推一份来路不明的 diff。
  if (!readConfig()) {
    writeOutputs({
      has_patch: 'false',
      reject_reason: 'the Codex configuration preflight did not run',
      changed_files: '',
      patch_path: ''
    })
    console.log('no configuration snapshot; no autofix patch is published')
    return
  }
  const patchPath = path.join(env.RUNNER_TEMP, 'autofix.patch')
  const result = capturePatch({
    headSha: env.CODEX_AUTOFIX_HEAD_SHA,
    patchPath,
    guarded: guardedMatcher(),
    allowNewChangeset: failedStepAllowsChangeset(process.env.CODEX_AUTOFIX_FAILED_STEPS)
  })
  writeOutputs({
    has_patch: result.reject ? 'false' : 'true',
    reject_reason: result.reject,
    changed_files: result.files.join(','),
    patch_path: result.reject ? '' : result.patchPath
  })
  if (result.reject) {
    console.log(`autofix patch discarded: ${result.reject}`)
    return
  }
  console.log(`autofix patch covers ${result.files.length} files (${result.bytes} bytes)`)
}

function commandApply() {
  const env = requireEnv(['GITHUB_REPOSITORY', 'CODEX_AUTOFIX_HEAD_SHA', 'CODEX_AUTOFIX_HEAD_REF', 'RUNNER_TEMP'])
  const patchPath = path.join(env.RUNNER_TEMP, 'autofix.patch')
  // 没有 patch 就无事可做：这比「PR 资格不足」更常见，先判它，别让 job 红在一条无关的拒绝上。
  if (!fs.existsSync(patchPath)) {
    console.log('no autofix patch artifact; nothing to apply')
    return
  }
  const number = pullNumber({ allowRefFallback: false })
  if (!number) throw new Error('CODEX_AUTOFIX_PULL_NUMBER is missing')
  const adapter = createGhAutofixAdapter({ repository: env.GITHUB_REPOSITORY })
  const { commits } = adapter.pullCommits(number)
  const pull = adapter.pull(number)
  const target = reviewTarget({ pull, repository: env.GITHUB_REPOSITORY, releaseBranch: RELEASE_BRANCH })
  if (!target.ok) {
    skipApply(target.reason)
    return
  }
  const { unverified, unverifiedDetail } = autofixCommitState(commits, pull)
  assertPushAllowed({
    liveHeadSha: pull.head.sha,
    expectedHeadSha: env.CODEX_AUTOFIX_HEAD_SHA,
    commits,
    autofixUnverified: unverified,
    autofixCountDetail: unverifiedDetail,
    checkoutSha: run('git', ['rev-parse', 'HEAD']).trim()
  })

  // capture 只在 `Check changesets` 失败时放行新增 changeset；apply 只认这个已收窄的例外，
  // 其它新增文件仍由 inspectPatch 拒绝。
  const { reject, files } = validatePatchFile({ patchPath, guarded: guardedMatcher(), allowNewChangeset: true })
  if (reject) throw new Error(`patch rejected: ${reject}`)
  run('git', ['apply', '--whitespace=nowarn', patchPath])
  run('git', ['add', '--', ...files])
  const message = autofixCommitMessage(files)
  run('git', ['-c', 'user.name=codex', '-c', 'user.email=codex@openai.com', 'commit', '-m', message])
  try {
    run('git', ['push', 'origin', `HEAD:refs/heads/${env.CODEX_AUTOFIX_HEAD_REF}`])
  } catch (error) {
    // reviewTarget 通过后、push 落地前的秒级窗口里 PR 可能刚被合并删分支：复查一次状态再定颜色，
    // PR 已拒绝即绿色收尾；仍 open 的 push 故障原样抛出，保持红色可见。
    const latest = adapter.pull(number)
    const latestTarget = reviewTarget({
      pull: latest,
      repository: env.GITHUB_REPOSITORY,
      releaseBranch: RELEASE_BRANCH
    })
    if (!latestTarget.ok) {
      skipApply(`the pull request closed before the push landed: ${latestTarget.reason}`)
      return
    }
    throw error
  }
  console.log(`pushed autofix for ${files.length} files to ${env.CODEX_AUTOFIX_HEAD_REF}`)
}

const commands = { prepare: commandPrepare, capture: commandCapture, apply: commandApply }

if (import.meta.url === `file://${process.argv[1]}`) {
  const name = process.argv[2]
  const handler = commands[name]
  if (!handler) {
    console.error(`usage: node codex-autofix.mjs <${Object.keys(commands).join('|')}>`)
    process.exit(2)
  }
  try {
    handler()
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
