import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import {
  FAILED_CHECK_CONCLUSIONS,
  RUNNING_CHECK_STATUSES,
  isEligibleQueuePr,
  isHttp422,
  runAutoUpdateQueue,
  selectNextPrToUpdate
} from './pr-auto-update-queue.mjs'

const scriptPath = path.join(import.meta.dirname, 'pr-auto-update-queue.mjs')

const REPO = 'owner/mono'

function makePr(number, overrides = {}) {
  return {
    number,
    state: 'open',
    draft: false,
    auto_merge: { enabled_by: { login: 'author' }, merge_method: 'squash' },
    mergeable_state: 'behind',
    base: { ref: 'main', repo: { full_name: REPO } },
    head: {
      ref: `feat/pr-${number}`,
      sha: `${String(number).padStart(4, '0')}${'a'.repeat(36)}`,
      repo: { full_name: REPO }
    },
    ...overrides
  }
}

{
  // 空队列直接返回 noop。
  assert.deepEqual(selectNextPrToUpdate([], {}), {
    action: 'noop',
    reason: 'empty_queue',
    eligibleCount: 0,
    skipped: []
  })
}

{
  // 同仓安全围栏：拒绝 fork、未开启 auto_merge、draft、已关闭、非 main base、已删 fork 仓库。
  const forkPr = makePr(10, {
    head: { ref: 'feat/fork', sha: 'b'.repeat(40), repo: { full_name: 'stranger/mono' } }
  })
  const deletedForkPr = makePr(11, {
    head: { ref: 'feat/deleted-fork', sha: 'c'.repeat(40), repo: null }
  })
  const manualPr = makePr(12, { auto_merge: null })
  const draftPr = makePr(13, { draft: true })
  const closedPr = makePr(14, { state: 'closed' })
  const nonMainPr = makePr(15, { base: { ref: 'develop', repo: { full_name: REPO } } })
  const eligiblePr = makePr(20)

  for (const rejected of [forkPr, deletedForkPr, manualPr, draftPr, closedPr, nonMainPr]) {
    assert.equal(isEligibleQueuePr(rejected, { repository: REPO }), false, `PR #${rejected.number} must be excluded`)
  }
  assert.equal(isEligibleQueuePr(eligiblePr, { repository: REPO }), true)

  const selected = selectNextPrToUpdate([forkPr, deletedForkPr, manualPr, draftPr, closedPr, nonMainPr, eligiblePr], {})
  assert.equal(selected.action, 'update')
  assert.equal(selected.prNumber, 20)
  assert.equal(selected.eligibleCount, 1)
}

{
  // FIFO 与单头推进：有多个 behind PR 时只挑 number 最小的第 1 个；其余不推进。
  const pr30 = makePr(30)
  const pr10 = makePr(10)
  const pr20 = makePr(20)
  const decision = selectNextPrToUpdate([pr30, pr10, pr20], {
    [pr10.head.sha]: [{ name: 'check', status: 'completed', conclusion: 'success' }]
  })
  assert.equal(decision.action, 'update')
  assert.equal(decision.prNumber, 10)
  assert.equal(decision.expectedHeadSha, pr10.head.sha)
  assert.equal(decision.eligibleCount, 3)
}

{
  // 在跑中不抢跑：只要队列中已有非 behind、非 dirty 的 PR 在跑 required `check`（queued 或 in_progress），
  // 即使前面或后面有 behind PR 也立即 noop，绝不更新第二个 PR。
  for (const status of RUNNING_CHECK_STATUSES) {
    const runningHead = makePr(11, { mergeable_state: 'blocked' })
    const behindBefore = makePr(10, { mergeable_state: 'behind' })
    const behindAfter = makePr(12, { mergeable_state: 'behind' })
    const decision = selectNextPrToUpdate([behindAfter, runningHead, behindBefore], {
      [runningHead.head.sha]: {
        check_runs: [
          { name: 'Prepare Wails apt cache', status: 'completed', conclusion: 'success' },
          { name: 'check', status, conclusion: null }
        ]
      }
    })
    assert.deepEqual(decision, {
      action: 'noop',
      reason: 'head_pr_running',
      prNumber: 11,
      eligibleCount: 3,
      skipped: []
    })
  }
}

{
  // gate 升 required 后，审查链的 Codex review / Codex review gate 在途同样不抢跑：
  // check 已绿但 gate 还在跑时 update-branch 会取消在途审查并反复全量重跑。gate 缺席（旧 CI 定义）不视为忙碌。
  for (const runningName of ['Codex review', 'Codex review gate']) {
    const reviewingHead = makePr(11, { mergeable_state: 'blocked' })
    const behindPr = makePr(10, { mergeable_state: 'behind' })
    const decision = selectNextPrToUpdate([reviewingHead, behindPr], {
      [reviewingHead.head.sha]: {
        check_runs: [
          { name: 'check', status: 'completed', conclusion: 'success' },
          { name: runningName, status: 'in_progress', conclusion: null }
        ]
      }
    })
    assert.deepEqual(decision, {
      action: 'noop',
      reason: 'head_pr_running',
      prNumber: 11,
      eligibleCount: 2,
      skipped: []
    })
  }

  // 审查链全部完成（无 gate run 的旧定义形态）时照常推进队头 behind PR。
  const behindPr = makePr(10, { mergeable_state: 'behind' })
  const decision = selectNextPrToUpdate([behindPr], {
    [behindPr.head.sha]: {
      check_runs: [
        { name: 'check', status: 'completed', conclusion: 'success' },
        { name: 'Codex review', status: 'completed', conclusion: 'success' },
        { name: 'Codex review gate', status: 'completed', conclusion: 'success' }
      ]
    }
  })
  assert.equal(decision.action, 'update')
  assert.equal(decision.prNumber, 10)
}

{
  // 冲突与失败不死循环：跳过 dirty、check 失败/取消/超时、unknown 与非 behind 的 PR，选中后续第一个可用 behind PR。
  const dirtyPr = makePr(10, { mergeable_state: 'dirty' })
  const failedPrs = FAILED_CHECK_CONCLUSIONS.map((conclusion, index) =>
    makePr(11 + index, { mergeable_state: 'behind' })
  )
  const unknownPr = makePr(15, { mergeable_state: 'unknown' })
  const cleanWaitPr = makePr(16, { mergeable_state: 'clean' })
  const actionablePr = makePr(20, { mergeable_state: 'behind' })
  const laterPr = makePr(21, { mergeable_state: 'behind' })

  const checkStatusBySha = {
    [dirtyPr.head.sha]: [{ name: 'check', status: 'completed', conclusion: 'success' }],
    [failedPrs[0].head.sha]: [{ name: 'check', status: 'completed', conclusion: 'failure' }],
    [failedPrs[1].head.sha]: [{ name: 'check', status: 'completed', conclusion: 'cancelled' }],
    [failedPrs[2].head.sha]: [{ name: 'check', status: 'completed', conclusion: 'timed_out' }],
    [cleanWaitPr.head.sha]: [{ name: 'check', status: 'completed', conclusion: 'success' }]
  }

  const decision = selectNextPrToUpdate(
    [laterPr, actionablePr, cleanWaitPr, unknownPr, ...failedPrs, dirtyPr],
    checkStatusBySha
  )
  assert.equal(decision.action, 'update')
  assert.equal(decision.prNumber, 20)
  assert.deepEqual(
    decision.skipped.map(item => [item.prNumber, item.reason]),
    [
      [10, 'merge_conflict'],
      [11, 'check_failure'],
      [12, 'check_cancelled'],
      [13, 'check_timed_out'],
      [15, 'mergeable_unknown'],
      [16, 'not_behind_clean']
    ]
  )

  // 当队列里全是冲突或失败 PR 时，返回 no_behind_pr 且绝不触发更新。
  const allBlocked = selectNextPrToUpdate([dirtyPr, ...failedPrs, unknownPr, cleanWaitPr], checkStatusBySha)
  assert.equal(allBlocked.action, 'noop')
  assert.equal(allBlocked.reason, 'no_behind_pr')
  assert.equal(allBlocked.skipped.length, 6)
}

{
  // runAutoUpdateQueue 集成行为：验证只取过滤后 PR 详情、正确调用 updateBranch、422 优雅退出、写 Summary。
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pr-queue-summary-'))
  try {
    const summaryPath = path.join(tempDir, 'summary.md')
    const pr10 = makePr(10, { mergeable_state: 'dirty' })
    const pr20 = makePr(20, { mergeable_state: 'behind' })
    const forkPr = makePr(5, { head: { ref: 'fork', sha: 'f'.repeat(40), repo: { full_name: 'other/mono' } } })

    const updatedCalls = []
    const fetchedPulls = []
    const adapter = {
      listOpenPulls: () => [
        { ...forkPr, mergeable_state: undefined },
        { ...pr20, mergeable_state: undefined },
        { ...pr10, mergeable_state: undefined }
      ],
      pull: number => {
        fetchedPulls.push(number)
        if (number === 10) return pr10
        if (number === 20) return pr20
        throw new Error(`unexpected pull lookup ${number}`)
      },
      checkRuns: () => [{ name: 'check', status: 'completed', conclusion: 'success' }],
      updateBranch: (number, expectedHeadSha) => {
        updatedCalls.push([number, expectedHeadSha])
        return { message: 'Updating pull request branch.' }
      }
    }

    const updated = runAutoUpdateQueue({ repository: REPO, adapter, summaryPath })
    assert.equal(updated.action, 'update')
    assert.equal(updated.prNumber, 20)
    assert.deepEqual(
      fetchedPulls.sort((a, b) => a - b),
      [10, 20],
      'fork PRs must not even trigger detail lookups'
    )
    assert.deepEqual(updatedCalls, [[20, pr20.head.sha]])
    const summaryText = fs.readFileSync(summaryPath, 'utf8')
    assert.match(summaryText, /已推进队头 PR #20/)
    assert.match(summaryText, /PR #10：`merge_conflict`/)

    // 422（head 已变或冲突）时优雅记录并正常返回（exit 0 语义）。
    assert.equal(isHttp422(new Error('gh api failed: HTTP 422: Unprocessable Entity')), true)
    const summary422Path = path.join(tempDir, 'summary-422.md')
    const conflict422 = runAutoUpdateQueue({
      repository: REPO,
      summaryPath: summary422Path,
      adapter: {
        ...adapter,
        updateBranch: () => {
          throw new Error(
            'gh api -X PUT repos/owner/mono/pulls/20/update-branch failed (exit 1): HTTP 422 Unprocessable Entity'
          )
        }
      }
    })
    assert.equal(conflict422.action, 'noop')
    assert.equal(conflict422.reason, 'update_branch_422')
    assert.equal(conflict422.prNumber, 20)
    assert.match(fs.readFileSync(summary422Path, 'utf8'), /API 返回 422/)

    // 非 422 的 API 错误仍须抛出，避免吞掉权限或网络故障。
    assert.throws(
      () =>
        runAutoUpdateQueue({
          repository: REPO,
          summaryPath: '',
          adapter: {
            ...adapter,
            updateBranch: () => {
              throw new Error('gh api failed (exit 1): HTTP 403 Forbidden')
            }
          }
        }),
      /HTTP 403/
    )
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
}

{
  // CLI 端到端测试：通过受控 fake gh 验证 PUT update-branch 参数、422 优雅退出 0 以及 Step Summary 写入。
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pr-queue-cli-'))
  try {
    const binDir = path.join(tempDir, 'bin')
    fs.mkdirSync(binDir)
    const callsLog = path.join(tempDir, 'gh-calls.log')
    const summaryPath = path.join(tempDir, 'summary.md')
    const pr40 = makePr(40, { mergeable_state: 'behind' })
    fs.writeFileSync(
      path.join(binDir, 'gh'),
      `#!/bin/sh
printf '%s\\n' "$*" >> "$FAKE_GH_CALLS"
case "$*" in
  *"/pulls?state=open"*)
    printf '%s\\n' '[${JSON.stringify({ ...pr40, mergeable_state: undefined })}]'
    ;;
  *"/pulls/40/update-branch")
    if [ "$FAKE_GH_422" = "true" ]; then
      echo "gh: Expected branch SHA does not match (HTTP 422)" >&2
      exit 1
    fi
    printf '%s\\n' '{"message":"Updating pull request branch."}'
    ;;
  *"/pulls/40")
    printf '%s\\n' '${JSON.stringify(pr40)}'
    ;;
  *"/check-runs"*)
    printf '%s\\n' '{"check_runs":[{"name":"check","status":"completed","conclusion":"success"}]}'
    ;;
  *)
    echo "unexpected gh args: $*" >&2
    exit 2
    ;;
esac
`,
      { mode: 0o755 }
    )

    const env = {
      ...process.env,
      PATH: `${binDir}${path.delimiter}${process.env.PATH ?? '/usr/bin:/bin'}`,
      GITHUB_REPOSITORY: REPO,
      GITHUB_STEP_SUMMARY: summaryPath,
      FAKE_GH_CALLS: callsLog,
      FAKE_GH_422: 'false'
    }

    fs.writeFileSync(callsLog, '')
    fs.writeFileSync(summaryPath, '')
    const ok = spawnSync(process.execPath, [scriptPath], { encoding: 'utf8', env })
    assert.equal(ok.status, 0, ok.stderr)
    assert.match(ok.stdout, /updated PR #40/)
    const recorded = fs.readFileSync(callsLog, 'utf8')
    assert.match(recorded, /-X PUT -f expected_head_sha=0040a+ repos\/owner\/mono\/pulls\/40\/update-branch/)
    assert.match(fs.readFileSync(summaryPath, 'utf8'), /已推进队头 PR #40/)

    // 422 冲突或 head 漂移时进程必须优雅退出 0。
    fs.writeFileSync(callsLog, '')
    fs.writeFileSync(summaryPath, '')
    const graceful422 = spawnSync(process.execPath, [scriptPath], {
      encoding: 'utf8',
      env: { ...env, FAKE_GH_422: 'true' }
    })
    assert.equal(graceful422.status, 0, graceful422.stderr)
    assert.match(graceful422.stdout, /skipped PR #40 after 422/)
    assert.match(fs.readFileSync(summaryPath, 'utf8'), /API 返回 422/)
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
}

console.log('.github/scripts/pr-auto-update-queue.test.mjs: all assertions passed')
