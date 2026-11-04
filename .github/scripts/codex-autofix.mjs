import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

import { reviewTarget } from './codex-review.mjs'
import { commandError, run } from './lib/github.mjs'
import { RELEASE_BRANCH } from './lib/workflow-topology.mjs'

export const AUTOFIX_TRAILER = 'Autofix-by: codex-autofix'
export const PATCH_ARTIFACT = 'codex-autofix-patch'
export const REQUIRED_JOB = 'check'

const SHA_PATTERN = /^[0-9a-f]{40,64}$/iu
const LOG_LIMIT_BYTES = 200_000
const ANY = '\u0000'
const ACROSS = '\u0001'

const EXTRA_GUARDED = [
  { label: 'CI 与 workflow 定义', matcher: /(^|\/)\.github\//u },
  {
    label: '依赖清单与供应链配置',
    matcher:
      /(^|\/)(package\.json|pnpm-lock\.yaml|pnpm-workspace\.yaml|skills-lock\.json|\.npmrc|\.mise\.toml|go\.mod|go\.sum)$/u
  },
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

/**
 * 只收「修改已入库文件」的 patch。新增/删除/改名/二进制都拒：autofix 的职责是把红的检查修回绿的，
 * 不是替作者决定文件结构；模型顺手写进工作区的草稿文件也因此进不了 patch。
 */
export function inspectPatch(patch) {
  const files = []
  const lines = patch.split(/\r?\n/)
  for (const line of lines) {
    const header = line.match(/^diff --git a\/(.*?) b\/(.*?)$/u)
    if (header) {
      const [, from, to] = header
      if (from !== to) return { reject: `patch renames or moves ${from} to ${to}`, files }
      files.push(from)
      continue
    }
    if (/^Binary files /u.test(line)) return { reject: `patch contains a binary change: ${line}`, files }
    if (/^new file mode /u.test(line)) return { reject: 'patch adds a new file', files }
    if (/^deleted file mode /u.test(line)) return { reject: 'patch deletes a file', files }
  }
  if (/\nGIT binary patch\n/u.test(`\n${patch}`)) return { reject: 'patch contains a binary payload', files }
  if (files.length === 0) return { reject: 'patch changes no tracked file', files }
  return { reject: '', files }
}

function requireSha(value, label) {
  if (typeof value !== 'string' || !SHA_PATTERN.test(value)) throw new Error(`${label} is not a commit SHA: ${value}`)
  return value
}

export function capturePatch({ headSha, patchPath, guarded, command = run }) {
  const sha = requireSha(headSha, 'patch base SHA')
  const patch = command('git', ['diff', '--no-color', sha, '--'])
  const { reject, files } = inspectPatch(patch)
  if (reject) return { reject, files: [], bytes: 0, patchPath }
  for (const file of files) {
    const hit = guarded(file)
    if (hit) return { reject: `${file} is ${hit.label}`, files: [], bytes: 0, patchPath }
  }
  fs.writeFileSync(patchPath, patch)
  return { reject: '', files, bytes: Buffer.byteLength(patch), patchPath }
}

export function validatePatchFile({ patchPath, guarded }) {
  const patch = fs.readFileSync(patchPath, 'utf8')
  const { reject, files } = inspectPatch(patch)
  if (reject) return { reject, files }
  for (const file of files) {
    const hit = guarded(file)
    if (hit) return { reject: `${file} is ${hit.label}`, files: [] }
  }
  return { reject: '', files }
}

export function createGhAutofixAdapter({ repository, spawn = spawnSync, cwd = process.cwd(), env = process.env }) {
  const gh = args => {
    const result = spawn('gh', args, { encoding: 'utf8', cwd, env })
    if (result.status !== 0) throw commandError('gh', args, result)
    return result.stdout ?? ''
  }

  return {
    pull: number => JSON.parse(gh(['api', `repos/${repository}/pulls/${number}`])),
    pullCommits: number => JSON.parse(gh(['api', `repos/${repository}/pulls/${number}/commits?per_page=100`])),
    jobs: runId => JSON.parse(gh(['api', `repos/${repository}/actions/runs/${runId}/jobs?per_page=100`])).jobs ?? [],
    jobLog: jobId => gh(['api', `repos/${repository}/actions/jobs/${jobId}/logs`])
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

export function hasAutofixCommit(commits) {
  return commits.some(entry => String(entry?.commit?.message ?? '').includes(AUTOFIX_TRAILER))
}

/**
 * 直推前的三道判定，顺序不能换：head 移动说明 patch 是对着旧代码生成的；
 * 已含 autofix 提交说明这条 PR 已经吃过一次自动修，不再叠加；
 * 检出 SHA 与 live head 不一致说明 push 会覆盖别人的提交。
 */
export function assertPushAllowed({ liveHeadSha, expectedHeadSha, commits, checkoutSha }) {
  const live = requireSha(liveHeadSha, 'live PR head SHA')
  const expected = requireSha(expectedHeadSha, 'planned head SHA')
  if (live !== expected) throw new Error(`refusing to push: the head moved from ${expected} to ${live}`)
  if (hasAutofixCommit(commits))
    throw new Error(`refusing to push: this PR already contains a ${AUTOFIX_TRAILER} commit`)
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

function pullNumber() {
  const fromRef = (process.env.GITHUB_REF ?? '').match(/^refs\/pull\/(\d+)\/merge$/u)?.[1]
  return fromRef ?? process.env.CODEX_AUTOFIX_PULL_NUMBER ?? ''
}

function commandPrepare() {
  const env = requireEnv(['GITHUB_REPOSITORY', 'GITHUB_RUN_ID', 'RUNNER_TEMP'])
  const adapter = createGhAutofixAdapter({ repository: env.GITHUB_REPOSITORY })
  const number = pullNumber()
  // 已经带过一次 autofix 提交的 head 不再规划第二次：apply 会推新 head，
  // 若不拦住，失败的修复会一路自我重试下去。
  if (number && hasAutofixCommit(adapter.pullCommits(number))) {
    writeOutputs({ has_log: 'false', failed_steps: '', log_path: '' })
    console.log(`pull request #${number} already contains an autofix commit; no second autofix`)
    return
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
  const patchPath = path.join(env.RUNNER_TEMP, 'autofix.patch')
  const result = capturePatch({ headSha: env.CODEX_AUTOFIX_HEAD_SHA, patchPath, guarded: guardedMatcher() })
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
  const number = pullNumber()
  if (!number) throw new Error('CODEX_AUTOFIX_PULL_NUMBER is missing')
  const adapter = createGhAutofixAdapter({ repository: env.GITHUB_REPOSITORY })
  const pull = adapter.pull(number)
  const target = reviewTarget({ pull, repository: env.GITHUB_REPOSITORY, releaseBranch: RELEASE_BRANCH })
  if (!target.ok) throw new Error(`refusing to push: ${target.reason}`)
  assertPushAllowed({
    liveHeadSha: pull.head.sha,
    expectedHeadSha: env.CODEX_AUTOFIX_HEAD_SHA,
    commits: adapter.pullCommits(number),
    checkoutSha: run('git', ['rev-parse', 'HEAD']).trim()
  })

  const { reject, files } = validatePatchFile({ patchPath, guarded: guardedMatcher() })
  if (reject) throw new Error(`patch rejected: ${reject}`)
  run('git', ['apply', '--whitespace=nowarn', patchPath])
  run('git', ['add', '--', ...files])
  const message = [
    'fix(root): apply Codex autofix for the failing CI checks',
    '',
    `Files: ${files.join(', ')}`,
    '',
    AUTOFIX_TRAILER
  ].join('\n')
  run('git', ['-c', 'user.name=codex', '-c', 'user.email=codex@openai.com', 'commit', '-m', message])
  run('git', ['push', 'origin', `HEAD:refs/heads/${env.CODEX_AUTOFIX_HEAD_REF}`])
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
