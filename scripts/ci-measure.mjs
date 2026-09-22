// 用法: pnpm measure:ci [--days=14] [--workflow=CI] [--json]
//
// 只读的 CI 成本台账：算出窗口内每个 workflow 跑了多少次、墙钟多少分钟、按触发事件怎么分、同一份
// commit 被重复验证几遍。「重复验证」是这轮拓扑改动的成本口径，不是错误率。
//
// 两个口径要分开读：`events` 才是「删一条触发能省下什么」，`redundant` 只回答「同一份树被验了几遍」。
//
// 未完成（排队中、挂起等审批）的 run 没有墙钟，只计进 runs 总数，不进时长、commit 数或冗余口径。
//
// 查询这个端点踩过的坑写在这里，免得下次重新踩：
//   - `name=` 查询参数会被这个端点静默忽略，必须按列表项的 `.name` 在客户端过滤；
//   - `total_count` 会在两次同样成功的请求之间抖动，不能当分母，条目要自己数；
//   - 分页时新 run 从页首插入，所以只会多算不会漏算，按 `.id` 去重即可；
//   - 列表项没有时长字段，墙钟只能按 `run_started_at → updated_at` 算；
//   - 冗余按 `head_sha` 归并，看不见 squash-only 合并造成的重复：main 上的 push run 落在一个新的 sha
//     上，树却和已经验过的 PR head 完全相同。所以删 `push: branches:[main]` 省下的量读 `events` 的
//     push 栏，不读 `redundant` —— 按树归并要额外一次 commit 查询，不值得。
//
// 两件事刻意不在这里做：挂起 run 的判据（`jobs.total_count==0` 且 `run_started_at==created_at`）与
// 「step 整条缺席才算定义生效」的取证，都需要逐 run 二次请求并人工判读，命令写在 docs/agents/build.md。
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const PAGE_SIZE = 100

export function repositoryFromUrl(url) {
  const match = url.trim().match(/[:/]([^/]+\/[^/]+?)(?:\.git)?$/)

  if (!match) {
    throw new Error(`cannot derive the GitHub repository from remote url: ${url}`)
  }

  return match[1]
}

function repository() {
  return repositoryFromUrl(execFileSync('git', ['remote', 'get-url', 'origin'], { encoding: 'utf8' }))
}

// `--paginate` 让 gh 顺着 Link 头翻页，`--jq '.workflow_runs[]'` 把每页的数组摊平成逐个 JSON 文档；
// 这些文档是多行的，所以不能按行 split，要靠花括号配平切。
export function splitJsonDocuments(text) {
  const documents = []
  let depth = 0
  let start = -1
  let inString = false
  let escaped = false

  // 按 UTF-16 码单元走，不能按码点：`display_title` 里的 emoji 是代理对，用 `[...text]` 迭代会让下标
  // 比 `text.slice()` 的口径每次都少 1，切出来的片段偏到字符串中间。
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]

    if (inString) {
      if (escaped) {
        escaped = false
      } else if (char === '\\') {
        escaped = true
      } else if (char === '"') {
        inString = false
      }
      continue
    }

    if (char === '"') {
      inString = true
    } else if (char === '{') {
      if (depth === 0) {
        start = index
      }
      depth += 1
    } else if (char === '}') {
      depth -= 1
      if (depth === 0) {
        documents.push(JSON.parse(text.slice(start, index + 1)))
      }
    }
  }

  return documents
}

function fetchRuns(repo, sinceIso) {
  // `>` 必须自己编码成 `%3E`：走 `gh api --field 'created=>…'` 时这个端点直接回 404，而 404 读起来
  // 像「仓库不存在」，会把人引去查权限。
  const query = `created=%3E${encodeURIComponent(sinceIso)}&per_page=${PAGE_SIZE}`

  const raw = execFileSync(
    'gh',
    ['api', `repos/${repo}/actions/runs?${query}`, '--paginate', '--jq', '.workflow_runs[]'],
    {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024
    }
  )

  return splitJsonDocuments(raw)
}

export function wallMinutes(run) {
  if (run.status !== 'completed' || !run.run_started_at || !run.updated_at) {
    return null
  }

  return (Date.parse(run.updated_at) - Date.parse(run.run_started_at)) / 60_000
}

export function summarize(runs, { workflow } = {}) {
  // 按 .id 去重是硬要求：翻页期间有新 run 插进页首，同一条会在相邻两页各出现一次。
  const unique = new Map(runs.map(run => [run.id, run]))

  const groups = new Map()
  for (const run of unique.values()) {
    if (workflow && run.name !== workflow) {
      continue
    }

    if (!groups.has(run.name)) {
      groups.set(run.name, [])
    }
    groups.get(run.name).push(run)
  }

  return [...groups.entries()]
    .map(([name, items]) => {
      const completed = items.filter(run => wallMinutes(run) !== null)
      const byCommit = new Map()

      for (const run of completed) {
        if (!byCommit.has(run.head_sha)) {
          byCommit.set(run.head_sha, [])
        }
        byCommit.get(run.head_sha).push(run)
      }

      let redundantRuns = 0
      let redundantMinutes = 0
      const repeated = []

      for (const [sha, runs] of byCommit) {
        if (runs.length < 2) {
          continue
        }

        const values = runs.map(wallMinutes)
        redundantRuns += runs.length - 1
        // 保留最长的那次作为「必要成本」，其余才是重复验证浪费掉的。
        redundantMinutes += sum(values) - Math.max(...values)
        repeated.push({
          sha,
          count: runs.length,
          // 事件名必须一起报出来：`redundant` 只说「同一份树验了几遍」，不说被谁触发。实测 14 天窗口里
          // 5 对重复全是 pull_request + workflow_dispatch（人手复检），删触发面对它们无效。
          events: [...new Set(runs.map(run => run.event))].sort(),
          titles: [...new Set(runs.map(run => run.display_title))]
        })
      }

      const byEvent = new Map()
      for (const run of items) {
        const bucket = byEvent.get(run.event) ?? { runs: 0, minutes: 0 }
        bucket.runs += 1
        bucket.minutes += wallMinutes(run) ?? 0
        byEvent.set(run.event, bucket)
      }

      return {
        name,
        runs: items.length,
        completed: completed.length,
        meanMinutes: completed.length === 0 ? null : round(sum(completed.map(wallMinutes)) / completed.length),
        totalMinutes: round(sum(completed.map(wallMinutes))),
        commits: byCommit.size,
        // 触发来源单独列出来：不变量 2 要的是「一份 commit 验证几遍」，而删触发面只能吃掉 `push`
        // 那一栏，`workflow_dispatch` 是人手复检，两者混在一个冗余数里就没法验收。
        events: [...byEvent.entries()]
          .map(([event, bucket]) => ({ event, runs: bucket.runs, minutes: round(bucket.minutes) }))
          .sort((a, b) => b.runs - a.runs),
        redundantRuns,
        redundantMinutes: round(redundantMinutes),
        repeated: repeated.sort((a, b) => b.count - a.count).slice(0, 5)
      }
    })
    .sort((a, b) => b.totalMinutes - a.totalMinutes)
}

function sum(values) {
  return values.reduce((total, value) => total + value, 0)
}

function round(value) {
  return Math.round(value * 10) / 10
}

export function format(reports) {
  const lines = []

  for (const report of reports) {
    lines.push(
      `${report.name}: ${report.runs} run(s) (${report.completed} completed) over ${report.commits} commit(s), ` +
        `mean ${report.meanMinutes ?? 'n/a'} min, total ${report.totalMinutes} min, ` +
        `redundant ${report.redundantRuns} run(s) ~ ${report.redundantMinutes} min`
    )
    lines.push(
      `  events: ${report.events.map(entry => `${entry.event} ${entry.runs} (${entry.minutes} min)`).join(', ')}`
    )

    for (const entry of report.repeated) {
      lines.push(`  ${entry.count}x ${entry.sha.slice(0, 8)} [${entry.events.join('+')}] ${entry.titles.join(' | ')}`)
    }
  }

  return `${lines.join('\n')}\n`
}

export function parseArgs(argv) {
  const parsed = {}

  for (const entry of argv) {
    const match = entry.match(/^--(days|workflow|json)(?:=(.*))?$/)

    if (!match) {
      throw new Error(`unsupported argument: ${entry} (supported: --days, --workflow, --json)`)
    }

    parsed[match[1]] = match[2] ?? true
  }

  const days = Number(parsed.days ?? 14)

  if (!Number.isFinite(days) || days <= 0) {
    throw new Error('--days must be a positive number of days')
  }

  return {
    days,
    workflow: typeof parsed.workflow === 'string' ? parsed.workflow : undefined,
    json: Boolean(parsed.json)
  }
}

function main() {
  const { days, workflow, json } = parseArgs(process.argv.slice(2))
  const since = new Date(Date.now() - days * 86_400_000).toISOString()
  const reports = summarize(fetchRuns(repository(), since), { workflow })

  console.log(json ? JSON.stringify({ since, days, workflow: workflow ?? null, reports }, null, 2) : format(reports))
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    main()
  } catch (error) {
    // gh 的非 2xx 与「未登录」都把原因写在 stderr 上，只打 message 会退化成一句 Command failed。
    console.error(String(error.stderr || error.message))
    process.exitCode = 1
  }
}
