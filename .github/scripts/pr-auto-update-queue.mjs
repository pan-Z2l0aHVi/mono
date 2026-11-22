import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

import { SPAWN_MAX_BUFFER, commandError } from './lib/github.mjs'
import { REQUIRED_CONTEXT } from './lib/workflow-topology.mjs'

export const DEFAULT_BASE_BRANCH = 'main'
export const RUNNING_CHECK_STATUSES = Object.freeze(['queued', 'in_progress'])
export const FAILED_CHECK_CONCLUSIONS = Object.freeze(['failure', 'cancelled', 'timed_out'])

const PULLS_PER_PAGE = 100
const MAX_PULL_PAGES = 10

export function isHttp422(error) {
  return /\bHTTP\s+422\b|\b422\s+Unprocessable\b/iu.test(error?.message ?? '')
}

/**
 * 同仓安全围栏：只允许未关闭、目标为 main、非 draft、已开启 auto-merge 且 head 与 base 同属当前仓库的 PR。
 *
 * @param {object} pr Pull Request 对象。
 * @param {object} [options]
 * @param {string} [options.baseBranch='main'] 目标基分支名。
 * @param {string} [options.repository=''] 期望的 `owner/repo`；为空时不额外限定。
 * @returns {boolean}
 */
export function isEligibleQueuePr(pr, { baseBranch = DEFAULT_BASE_BRANCH, repository = '' } = {}) {
  if (!pr || pr.state !== 'open') return false
  if (pr.base?.ref !== baseBranch) return false
  if (pr.draft) return false
  if (pr.auto_merge == null) return false
  const headRepo = pr.head?.repo?.full_name
  const baseRepo = pr.base?.repo?.full_name
  if (typeof headRepo !== 'string' || headRepo === '' || headRepo !== baseRepo) return false
  if (repository && baseRepo !== repository) return false
  if (typeof pr.head?.sha !== 'string' || pr.head.sha === '') return false
  if (!Number.isInteger(pr.number) || pr.number <= 0) return false
  return true
}

/**
 * 从单次提交的 check-runs 集合（或测试传入的映射条目）提取 required check 状态。
 *
 * @param {Map<string, unknown>|Record<string, unknown>|undefined} checkStatusBySha 按 head SHA 索引的检查状态。
 * @param {string} headSha PR 当前 head SHA。
 * @param {string} [checkName=REQUIRED_CONTEXT] required check 名称。
 * @returns {{status?: string, conclusion?: string|null}|null}
 */
export function resolveRequiredCheck(checkStatusBySha, headSha, checkName = REQUIRED_CONTEXT) {
  if (!checkStatusBySha || typeof headSha !== 'string' || headSha === '') return null
  const entry = checkStatusBySha instanceof Map ? checkStatusBySha.get(headSha) : checkStatusBySha[headSha]
  if (!entry) return null
  const runs = Array.isArray(entry) ? entry : Array.isArray(entry.check_runs) ? entry.check_runs : null
  if (runs) {
    const matching = runs.filter(run => run?.name === checkName)
    if (matching.length === 0) return null
    const running = matching.find(run => RUNNING_CHECK_STATUSES.includes(run?.status))
    return running ?? matching.at(-1)
  }
  if (typeof entry === 'object' && (!entry.name || entry.name === checkName)) return entry
  return null
}

function classifySkippedPr(pr, checkRun) {
  if (pr.mergeable_state === 'dirty') {
    return { prNumber: pr.number, headSha: pr.head.sha, reason: 'merge_conflict', mergeableState: pr.mergeable_state }
  }
  if (FAILED_CHECK_CONCLUSIONS.includes(checkRun?.conclusion)) {
    return {
      prNumber: pr.number,
      headSha: pr.head.sha,
      reason: `check_${checkRun.conclusion}`,
      conclusion: checkRun.conclusion
    }
  }
  if (!pr.mergeable_state || pr.mergeable_state === 'unknown') {
    return {
      prNumber: pr.number,
      headSha: pr.head.sha,
      reason: 'mergeable_unknown',
      mergeableState: pr.mergeable_state ?? 'unknown'
    }
  }
  if (pr.mergeable_state !== 'behind') {
    return {
      prNumber: pr.number,
      headSha: pr.head.sha,
      reason: `not_behind_${pr.mergeable_state}`,
      mergeableState: pr.mergeable_state
    }
  }
  return null
}

/**
 * 按 FIFO 队列与单头防雪崩状态机决定本次是否推进队头 PR。
 *
 * @param {object[]} prs 候选 PR 列表。
 * @param {Map<string, unknown>|Record<string, unknown>} [checkStatusBySha={}] 按 head SHA 索引的 check 状态。
 * @param {object} [options]
 * @param {string} [options.baseBranch='main'] 目标基分支。
 * @param {string} [options.repository=''] 期望仓库 `owner/repo`。
 * @param {string} [options.checkName=REQUIRED_CONTEXT] required check 名称。
 * @returns {{
 *   action: 'update'|'noop',
 *   reason: string,
 *   prNumber?: number,
 *   expectedHeadSha?: string,
 *   pr?: object,
 *   eligibleCount: number,
 *   skipped: Array<{prNumber: number, headSha: string, reason: string, mergeableState?: string, conclusion?: string}>
 * }}
 */
export function selectNextPrToUpdate(
  prs,
  checkStatusBySha = {},
  { baseBranch = DEFAULT_BASE_BRANCH, repository = '', checkName = REQUIRED_CONTEXT } = {}
) {
  const eligible = (Array.isArray(prs) ? prs : [])
    .filter(pr => isEligibleQueuePr(pr, { baseBranch, repository }))
    .sort((left, right) => left.number - right.number)

  if (eligible.length === 0) {
    return { action: 'noop', reason: 'empty_queue', eligibleCount: 0, skipped: [] }
  }

  const entries = eligible.map(pr => ({
    pr,
    checkRun: resolveRequiredCheck(checkStatusBySha, pr.head.sha, checkName)
  }))

  // 只要队列中已有非 behind、非 dirty 的 PR 正在跑 required check，立即停在 noop，绝不抢跑更新第二个 PR。
  for (const { pr, checkRun } of entries) {
    if (
      pr.mergeable_state !== 'behind' &&
      pr.mergeable_state !== 'dirty' &&
      RUNNING_CHECK_STATUSES.includes(checkRun?.status)
    ) {
      const skipped = entries
        .filter(item => item.pr.number !== pr.number)
        .map(item => classifySkippedPr(item.pr, item.checkRun))
        .filter(Boolean)
      return {
        action: 'noop',
        reason: 'head_pr_running',
        prNumber: pr.number,
        eligibleCount: eligible.length,
        skipped
      }
    }
  }

  const skipped = []
  for (const { pr, checkRun } of entries) {
    const skip = classifySkippedPr(pr, checkRun)
    if (skip) {
      skipped.push(skip)
      continue
    }
    return {
      action: 'update',
      reason: 'update_head_behind_pr',
      prNumber: pr.number,
      expectedHeadSha: pr.head.sha,
      pr,
      eligibleCount: eligible.length,
      skipped
    }
  }

  return { action: 'noop', reason: 'no_behind_pr', eligibleCount: eligible.length, skipped }
}

export function formatQueueSummary(decision) {
  const lines = ['## PR 自动推进队列', '']
  lines.push(`- 符合条件队列（open / main / 非 draft / 已开 auto-merge / 同仓）：\`${decision.eligibleCount}\` 个`)
  if (decision.action === 'update') {
    lines.push(`- 动作：**已推进队头 PR #${decision.prNumber}**（\`expected_head_sha: ${decision.expectedHeadSha}\`）`)
  } else if (decision.reason === 'update_branch_422') {
    lines.push(`- 动作：**跳过推进 PR #${decision.prNumber}**（API 返回 422：head 已变化或存在冲突，已安全忽略）`)
  } else {
    const blocker = decision.prNumber ? `（运行中 PR：#${decision.prNumber}）` : ''
    lines.push(`- 动作：**无须更新（noop）** — \`${decision.reason}\`${blocker}`)
  }
  if (Array.isArray(decision.skipped) && decision.skipped.length > 0) {
    lines.push('', '### 已跳过 PR', '')
    for (const item of decision.skipped) {
      lines.push(`- PR #${item.prNumber}：\`${item.reason}\``)
    }
  }
  return `${lines.join('\n')}\n`
}

export function createGhQueueAdapter({ repository, spawn = spawnSync, cwd = process.cwd(), env = process.env }) {
  const gh = args => {
    const result = spawn('gh', args, { encoding: 'utf8', cwd, env, maxBuffer: SPAWN_MAX_BUFFER })
    if (result.status !== 0) throw commandError('gh', args, result)
    return result.stdout ?? ''
  }

  return {
    listOpenPulls: (baseBranch = DEFAULT_BASE_BRANCH) => {
      const pulls = []
      for (let page = 1; page <= MAX_PULL_PAGES; page += 1) {
        const chunk = JSON.parse(
          gh([
            'api',
            `repos/${repository}/pulls?state=open&base=${encodeURIComponent(baseBranch)}&sort=created&direction=asc&per_page=${PULLS_PER_PAGE}&page=${page}`
          ])
        )
        if (!Array.isArray(chunk)) throw new Error('gh api returned a non-array pulls list')
        pulls.push(...chunk)
        if (chunk.length < PULLS_PER_PAGE) break
      }
      return pulls
    },
    pull: number => JSON.parse(gh(['api', `repos/${repository}/pulls/${number}`])),
    checkRuns: sha =>
      JSON.parse(gh(['api', `repos/${repository}/commits/${sha}/check-runs?per_page=100`])).check_runs ?? [],
    updateBranch: (number, expectedHeadSha) => {
      const stdout = gh([
        'api',
        '-X',
        'PUT',
        '-f',
        `expected_head_sha=${expectedHeadSha}`,
        `repos/${repository}/pulls/${number}/update-branch`
      ]).trim()
      return stdout ? JSON.parse(stdout) : {}
    }
  }
}

export function runAutoUpdateQueue({
  repository = process.env.GITHUB_REPOSITORY ?? '',
  baseBranch = DEFAULT_BASE_BRANCH,
  adapter,
  summaryPath = process.env.GITHUB_STEP_SUMMARY ?? ''
} = {}) {
  if (!repository) throw new Error('GITHUB_REPOSITORY is missing')
  const client = adapter ?? createGhQueueAdapter({ repository })
  const listed = client.listOpenPulls(baseBranch)
  const candidates = (Array.isArray(listed) ? listed : []).filter(pr =>
    isEligibleQueuePr(pr, { baseBranch, repository })
  )

  // pulls list 不带 mergeable_state，只对通过围栏的候选 PR 逐个读详情与当前 head 的 check-runs。
  const fullPulls = candidates.map(candidate => client.pull(candidate.number))
  const checkStatusBySha = new Map()
  for (const pr of fullPulls) {
    if (typeof pr?.head?.sha === 'string' && pr.head.sha !== '' && !checkStatusBySha.has(pr.head.sha)) {
      checkStatusBySha.set(pr.head.sha, client.checkRuns(pr.head.sha))
    }
  }

  const decision = selectNextPrToUpdate(fullPulls, checkStatusBySha, { baseBranch, repository })
  let finalDecision = decision
  if (decision.action === 'update') {
    try {
      client.updateBranch(decision.prNumber, decision.expectedHeadSha)
      console.log(`updated PR #${decision.prNumber} (expected_head_sha=${decision.expectedHeadSha})`)
    } catch (error) {
      if (!isHttp422(error)) throw error
      finalDecision = {
        action: 'noop',
        reason: 'update_branch_422',
        prNumber: decision.prNumber,
        expectedHeadSha: decision.expectedHeadSha,
        eligibleCount: decision.eligibleCount,
        skipped: decision.skipped
      }
      console.log(`skipped PR #${decision.prNumber} after 422 response: ${error.message}`)
    }
  } else {
    console.log(
      `queue noop (${decision.reason}${decision.prNumber ? `, PR #${decision.prNumber}` : ''}, eligible=${decision.eligibleCount})`
    )
  }

  if (summaryPath) {
    fs.mkdirSync(path.dirname(summaryPath), { recursive: true })
    fs.appendFileSync(summaryPath, formatQueueSummary(finalDecision))
  }
  return finalDecision
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    runAutoUpdateQueue()
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}
