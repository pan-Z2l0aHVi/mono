import assert from 'node:assert/strict'

import { format, parseArgs, repositoryFromUrl, splitJsonDocuments, summarize, wallMinutes } from './ci-measure.mjs'

assert.equal(repositoryFromUrl('git@github.com:greypan/mono.git'), 'greypan/mono')
assert.equal(repositoryFromUrl('https://github.com/greypan/mono'), 'greypan/mono')
assert.throws(() => repositoryFromUrl('https://example.com/'), /cannot derive the GitHub repository/)

// `--paginate --jq '.workflow_runs[]'` 输出的是首尾相接的多个 JSON 文档：嵌套对象里的 `{`、字符串里的
// `}` 和转义引号都会骗过按行或按正则的切法，所以这三种形状必须各有断言。emoji 是代理对，用来钉住
// 「按码点迭代 + 按码单元 slice」的偏移错位。
const docs = splitJsonDocuments(
  ['{"id":1,"a":{"b":[1,2]},"title":"🎉 has } brace and \\" escaped quote","tail":true}', '{"id":2}\n{"id":3}\n'].join(
    '\n'
  )
)
assert.deepEqual(
  docs.map(doc => doc.id),
  [1, 2, 3]
)
assert.equal(docs[0].title, '🎉 has } brace and " escaped quote')
assert.equal(docs[0].tail, true)
assert.deepEqual(splitJsonDocuments(''), [])

const base = Date.UTC(2026, 8, 20)
const iso = offsetSeconds => new Date(base + offsetSeconds * 1000).toISOString()

function run(
  id,
  {
    name = 'CI',
    sha = 'a'.repeat(40),
    minutes = 5,
    status = 'completed',
    event = 'pull_request',
    title = `run ${id}`
  } = {}
) {
  return {
    id,
    name,
    head_sha: sha,
    event,
    display_title: title,
    status,
    // 在途 run 的 `updated_at` 是「上次被刷新」的时刻，比 `run_started_at` 晚很多也不代表跑了那么久。
    run_started_at: iso(id * 1000),
    updated_at: iso(id * 1000 + (status === 'completed' ? minutes * 60 : 6000))
  }
}

assert.equal(wallMinutes(run(1, { minutes: 3.5 })), 3.5)
assert.equal(wallMinutes(run(2, { status: 'in_progress' })), null)
assert.equal(wallMinutes(run(3, { status: 'queued', minutes: 1 })), null)
assert.equal(wallMinutes({ ...run(4), run_started_at: null }), null)
assert.equal(wallMinutes({ ...run(5), updated_at: undefined }), null)

const shaA = 'a'.repeat(40)
const shaB = 'b'.repeat(40)
const reports = summarize(
  [
    // 同一份 commit 被验证两遍，而且来源不同：trunk 上 push 先跑过一次，事后又被手动 dispatch 过一次。
    // 这就是 `events` 必须进报表的原因 —— 只有前者能靠删触发面省掉。
    run(11, { sha: shaA, minutes: 5, event: 'push' }),
    run(12, { sha: shaA, minutes: 2, event: 'workflow_dispatch' }),
    run(13, { sha: shaA, status: 'in_progress' }),
    run(14, { sha: shaB, minutes: 1 }),
    // 翻页期间有新 run 插进页首，同一条会在相邻两页各出现一次。
    run(11, { sha: shaA, minutes: 5, event: 'push' }),
    run(21, { name: 'Docs', sha: shaB, minutes: 3 })
  ],
  { workflow: 'CI' }
)

assert.equal(reports.length, 1, '--workflow must filter on the client: the API ignores the name= parameter')
const ci = reports[0]
// 去重后 4 条 CI run，其中 3 条已完成；shaA 上 5+2=7 分钟里只有最长那次算必要成本。
assert.deepEqual(
  {
    name: ci.name,
    runs: ci.runs,
    completed: ci.completed,
    commits: ci.commits,
    meanMinutes: ci.meanMinutes,
    totalMinutes: ci.totalMinutes,
    redundantRuns: ci.redundantRuns,
    redundantMinutes: ci.redundantMinutes
  },
  {
    name: 'CI',
    runs: 4,
    completed: 3,
    commits: 2,
    meanMinutes: 2.7,
    totalMinutes: 8,
    redundantRuns: 1,
    redundantMinutes: 2
  }
)
assert.deepEqual(ci.repeated, [
  { sha: shaA, count: 2, events: ['push', 'workflow_dispatch'], titles: ['run 11', 'run 12'] }
])
// 在途那条只进 runs 不进 minutes，所以 `pull_request` 是 2 run / 1 min。
assert.deepEqual(ci.events, [
  { event: 'pull_request', runs: 2, minutes: 1 },
  { event: 'push', runs: 1, minutes: 5 },
  { event: 'workflow_dispatch', runs: 1, minutes: 2 }
])

const all = summarize(
  [
    run(11, { sha: shaA }),
    run(21, { name: 'Docs', sha: shaB, minutes: 9 }),
    run(31, { name: 'Audit', sha: shaB, minutes: 0 })
  ],
  {}
)
assert.deepEqual(
  all.map(report => report.name),
  ['Docs', 'CI', 'Audit'],
  'report order is by total minutes, descending'
)
assert.deepEqual(
  all.find(report => report.name === 'Audit'),
  {
    name: 'Audit',
    runs: 1,
    completed: 1,
    meanMinutes: 0,
    totalMinutes: 0,
    commits: 1,
    events: [{ event: 'pull_request', runs: 1, minutes: 0 }],
    redundantRuns: 0,
    redundantMinutes: 0,
    repeated: []
  }
)

// 窗口里一条都没跑完时，mean 是 n/a 而不是 0 或 NaN —— 0 会被读成「秒退」。
const onlyQueued = summarize([run(41, { status: 'queued' })])[0]
assert.deepEqual(
  { mean: onlyQueued.meanMinutes, total: onlyQueued.totalMinutes, runs: onlyQueued.runs },
  { mean: null, total: 0, runs: 1 }
)

const printed = format(all)
assert.match(
  printed,
  /^Docs: 1 run\(s\) \(1 completed\) over 1 commit\(s\), mean 9 min, total 9 min, redundant 0 run\(s\) ~ 0 min$/m
)
assert.match(printed, /^ {2}events: pull_request 1 \(9 min\)$/m)
assert.match(format([onlyQueued]), /mean n\/a min/)
assert.match(
  format(
    summarize([
      run(11, { sha: shaA, minutes: 5, event: 'push' }),
      run(12, { sha: shaA, minutes: 2, event: 'workflow_dispatch' })
    ])
  ),
  /  2x a{8} \[push\+workflow_dispatch\] run 11 \| run 12\n/
)
assert.equal(format([]), '\n')

assert.deepEqual(parseArgs([]), { days: 14, workflow: undefined, json: false })
assert.deepEqual(parseArgs(['--days=3', '--workflow=CI', '--json']), { days: 3, workflow: 'CI', json: true })
assert.deepEqual(parseArgs(['--json=yes']), { days: 14, workflow: undefined, json: true })
// `--workflow` 不给值不是「不过滤」，而是把 undefined 当成过滤条件；漏掉这个判据会静默返回空表。
assert.deepEqual(parseArgs(['--workflow']).workflow, undefined)
assert.throws(() => parseArgs(['--days=abc']), /positive number of days/)
assert.throws(() => parseArgs(['--days=0']), /positive number of days/)
assert.throws(() => parseArgs(['--repo=x']), /unsupported argument: --repo=x/)

console.log('scripts/ci-measure.test.mjs: all assertions passed')
