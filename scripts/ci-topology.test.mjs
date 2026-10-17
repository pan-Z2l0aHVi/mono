import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  RELEASE_BRANCH,
  REQUIRED_CONTEXT,
  desktopMatrix,
  parseWorkflow,
  workflows
} from '../.github/scripts/ci-topology.mjs'

// 这张测试是 .github/scripts/ci-topology.mjs 那张表的执行端：YAML 不能被 import，所以「拓扑只有一处
// 定义」只能靠把真实 workflow 逐字段读回来比。它同时钉计划里的不变量 2/3/4/5 与安装面收窄那条，
// 因为那四条都是「改了没人报错、要到发版当天才炸」的形状。
const repoRoot = path.resolve(import.meta.dirname, '..')
const workflowDir = path.join(repoRoot, '.github/workflows')

const onDisk = fs
  .readdirSync(workflowDir)
  .filter(entry => entry.endsWith('.yml'))
  .sort()
const parsed = Object.fromEntries(
  onDisk.map(file => [file, parseWorkflow(fs.readFileSync(path.join(workflowDir, file), 'utf8'))])
)

// 表必须覆盖磁盘上的每一个 workflow：新增一个 workflow 而不声明它的触发面/安装面，正是这次要根治的
// 「没人知道它会跑」的形态。
assert.deepEqual(onDisk, Object.keys(workflows).sort(), 'every workflow file must be declared in the topology table')

for (const [file, expected] of Object.entries(workflows)) {
  const actual = parsed[file]
  assert.ok(actual, `${file} is declared but not present on disk`)

  assert.equal(actual.name, expected.name, `${file}: workflow name must match`)
  assert.deepEqual(actual.triggers, expected.triggers, `${file}: triggers must match`)
  assert.deepEqual(actual.permissions, expected.permissions, `${file}: permissions must match`)

  assert.deepEqual(Object.keys(actual.jobs), Object.keys(expected.jobs), `${file}: job ids must match`)

  for (const [id, job] of Object.entries(expected.jobs)) {
    const act = actual.jobs[id]
    assert.equal(act.name, job.name, `${file}: job ${id} display name must match`)
    assert.deepEqual(act.needs, job.needs, `${file}: job ${id} needs must match`)
    assert.deepEqual(act.toolchain, job.toolchain, `${file}: job ${id} declared toolchain must match`)
    assert.deepEqual(act.permissions, job.permissions ?? {}, `${file}: job ${id} permission escalation must match`)

    if (job.if === undefined) {
      assert.equal(act.if, undefined, `${file}: job ${id} must not grow an if`)
    } else {
      assert.equal(act.if, job.if, `${file}: job ${id} if must match the table`)
    }
  }

  assert.deepEqual(actual.stepIds, expected.stepIds, `${file}: step ids must match`)

  for (const [step, expression] of Object.entries(expected.steps)) {
    assert.equal(actual.steps[step], expression, `${file}: step ${step} if must match the table`)
  }
}

// 守卫里的 `steps.<id>.` 引用的是 step 的 id 而不是它的名字，而引用不存在的 id 不会报错：表达式恒假，
// 那一步从此静默跳过、job 依旧全绿。所以每个引用都必须在同一文件里真的声明了这个 id。
for (const [file, wf] of Object.entries(parsed)) {
  const text = fs.readFileSync(path.join(workflowDir, file), 'utf8')
  const declared = new Set(wf.stepIds)

  for (const reference of text.matchAll(/\bsteps\.([a-zA-Z0-9_-]+)\./g)) {
    assert.ok(declared.has(reference[1]), `${file}: steps.${reference[1]} is referenced but no step declares that id`)
  }
}

// 恒假守卫的第二种成因：GitHub 对不含 status check 函数的 `if` 仍然套默认 `success()`，所以只写
// `steps.<id>.outcome == 'failure'` 的那一步，会在它的条件唯一可能成立的时刻（前一步刚失败）被跳过。
// 这类守卫不会报错、也不会让 job 变红，只能靠形状判出来：读 step 结果的条件必须同时调 status 函数。
const statusFunction = /\b(?:always|failure|cancelled|success)\(\)/
for (const [file, wf] of Object.entries(parsed)) {
  for (const [step, expression] of Object.entries(wf.steps)) {
    if (/steps\.[a-zA-Z0-9_-]+\.(?:outcome|conclusion)\b/.test(expression)) {
      assert.ok(
        statusFunction.test(expression),
        `${file}: step ${step} reads a step outcome but calls no status function, so the implicit success() skips it whenever the condition could hold`
      )
    }
  }
}

// 不变量 2：只有 changeset-version.yml 监听 push。ci.yml 的 push 触发是纯重复 —— squash-only 加
// strict required status 已经让 PR head 的树等于合并后 main 的树；trunk 复检走 workflow_dispatch。
assert.deepEqual(
  Object.entries(parsed)
    .filter(([, wf]) => wf.triggers.some(trigger => trigger.on === 'push'))
    .map(([file]) => file),
  ['changeset-version.yml'],
  'exactly one workflow may trigger on push'
)

// 每个 push/pull_request 触发面都锚在 main：放开分支范围等于让同一套发布链在非 main 分支上也能跑，
// 而 ruleset 只保护 main。
for (const [file, wf] of Object.entries(parsed)) {
  for (const trigger of wf.triggers) {
    if (trigger.on === 'push' || trigger.on === 'pull_request') {
      assert.deepEqual(trigger.branches, ['main'], `${file}: ${trigger.on} must stay pinned to main`)
    }
  }
}

// 不变量 3：每个 workflow 都要显式 permissions，最小权限才不会随 runner 默认值漂移。
for (const [file, wf] of Object.entries(parsed)) {
  assert.ok(Object.keys(wf.permissions).length > 0, `${file}: permissions must be declared explicitly`)
}

// 必需 context 只有一个，且名字与 ruleset 里登记的 required check 一致。
const requiredContexts = Object.entries(workflows).flatMap(([file, wf]) =>
  Object.entries(wf.jobs)
    .filter(([, job]) => job.requiredContext === true)
    .map(([id]) => `${file}:${id}`)
)
assert.deepEqual(requiredContexts, ['ci.yml:check'], 'exactly one required status context')
assert.equal(requiredContexts[0].split(':')[1], REQUIRED_CONTEXT)

// 不变量 4：分支常量只有表里一个定义点，YAML 里的每处出现都必须等于它。
const releaseBranchUses = Object.entries(parsed).flatMap(([file, wf]) => [
  ...Object.values(wf.jobs)
    .filter(job => job.if?.includes(RELEASE_BRANCH))
    .map(job => `${file}:job:${job.name}`),
  ...Object.entries(wf.steps)
    .filter(([, expression]) => expression.includes(RELEASE_BRANCH))
    .map(([step]) => `${file}:step:${step}`)
])
// 一处 CI 守卫 step + 两个发布 job 的 if。多出来的消费者意味着有人手写了一个字面量而不是改这张表。
assert.deepEqual(
  releaseBranchUses.sort(),
  [
    'ci.yml:step:Check changesets',
    'npm-publish.yml:job:Detect public package release',
    'wails-release.yml:job:Detect desktop application release'
  ],
  'the release branch literal may only appear where the table declares it'
)
const rawOccurrences = onDisk.reduce(
  (total, file) => total + fs.readFileSync(path.join(workflowDir, file), 'utf8').split(RELEASE_BRANCH).length - 1,
  0
)
assert.equal(rawOccurrences, releaseBranchUses.length, 'no workflow may hard-code the release branch unlisted')

// 不变量 5：两个桌面 workflow 的构建矩阵必须与表一致，否则「验证过的产物」与「发出去的产物」不同源。
for (const file of ['wails-verify.yml', 'wails-release.yml']) {
  const text = fs.readFileSync(path.join(workflowDir, file), 'utf8')
  const block = text.match(/^ {6}matrix:\n {8}include:\n((?: {10}- .*\n| {12}.*\n)+)/m)
  assert.ok(block, `${file}: build job must carry a matrix.include block`)

  const entries = []
  for (const line of block[1].split('\n')) {
    const start = line.match(/^ {10}- (.*?): (.*)$/)

    if (start) {
      entries.push({ [start[1]]: unquoteValue(start[2]) })
      continue
    }
    const cont = line.match(/^ {12}(.*?): (.*)$/)
    if (cont) {
      entries.at(-1)[cont[1]] = unquoteValue(cont[2])
    }
  }

  assert.deepEqual(entries, desktopMatrix, `${file}: desktop matrix must match the single definition`)
}

function unquoteValue(value) {
  return value.startsWith("'") && value.endsWith("'") ? value.slice(1, -1) : value
}

// 一个 workflow 里全部 run 步骤的文本：单行 `run: cmd` 与 `run: |` 块体都要收，否则多行脚本
// 会从缝里漏过去。块体内以 `\` 结尾的行先接成一条——同一句调用拆成两行时，正则必须看得到
// 接起来之后的样子。
function runTexts(text) {
  const lines = []
  let inScalar = false

  for (const line of text.split('\n')) {
    // `scalar` 必须先判：`run: |` 同样匹配下面那条 inline 正则（`\S.*` 会把 `|` 当成命令正文），
    // 先判 inline 会把块体整个跳过，`inScalar` 永远起不来。
    const scalar = line.match(/^ {8}run:\s*[|>][-+]?\s*$/)
    const inline = line.match(/^ {8}run:\s*(\S.*)$/)

    if (scalar) {
      inScalar = true
      continue
    }
    if (inline) {
      inScalar = false
      lines.push(inline[1])
      continue
    }
    if (inScalar && line.trim() !== '') {
      inScalar = /^ {10,}\S/.test(line)
      if (inScalar) {
        lines.push(line.trim())
      }
    }
  }

  return lines
    .join('\n')
    .replace(/\\\n\s*/g, ' ')
    .split('\n')
    .filter(Boolean)
}

// 桌面产物的验证面是 `build:macos` / `build:windows` 两个子脚本，不是聚合的 `build`。这条不变量是
// `apps/interweave/scripts/build.mjs` 把 darwin 默认路径裁成「只做宿主平台、不打 DMG」的承重前提：
// 聚合脚本是宿主相关的（darwin 上不再交叉编译 Windows、不再打 `.dmg`），矩阵一旦改调它，
// `macos-14` 那一格就不再产出 `.dmg`，只会红在 `if-no-files-found: error` 上；`windows-latest`
// 那一格不受影响（win32 分支仍然打 `.exe`）。所以矩阵改调聚合脚本不会静默通过——这两条断言不是
// 兜底那道网，它们把「桌面验证面由矩阵的子脚本构成」这个前提写成可执行的形式，让下一次再有人
// 收窄聚合脚本时，改动能立刻看见自己动了哪条前提。
// 两条断言分开写，因为它们要挡的两种改法形状不同：矩阵里改的是**表**（表与 YAML 一起漂移，
// 不变量 5 的 deepEqual 看不见），workflow 里改的是**字面量**。
// 覆盖面到此为止，不再往「穷举所有拼法」的方向长。(b) 是对裸 YAML 的正则启发式，不是解析器；
// 它的作用是让下一次再收窄聚合脚本的人**看见自己动了哪条前提**，真正的闸门是矩阵里
// `if-no-files-found: error`：矩阵那一格少产出 `.dmg` 会当场红，不会静默通过。
// 已知的、故意不覆盖的形状：跑在 macOS runner 上的根 `pnpm run build`（turbo 扇出到聚合脚本）。
// 拦它要往 parseWorkflow 里加 `runs-on`，那是另一件事。
const interweaveScripts = JSON.parse(
  fs.readFileSync(path.join(repoRoot, 'apps/interweave/package.json'), 'utf8')
).scripts

// (a) 矩阵声明的每个 command 必须是本包真实存在的脚本，且不是聚合 `build`。
// 注意断言的是「不是 build」而不是「等于 build:macos/build:windows」：把某一格改成别的已声明脚本
// （例如 `build:macos:app`）今天会放行，那是有意的——它由上面那句 `if-no-files-found: error` 兜底，
// 而且会响。
for (const entry of desktopMatrix) {
  assert.ok(
    Object.hasOwn(interweaveScripts, entry.command),
    `desktop matrix entry ${entry.name} runs ${entry.command}, which apps/interweave declares no script for`
  )
  assert.notEqual(
    entry.command,
    'build',
    'a desktop matrix entry must not run the aggregate `build` script of @greypan/interweave; the matrices invoke a per-platform sub-script (build:macos / build:windows)'
  )
}

// (b) workflow 不得直接点名执行聚合脚本。`run:` 单行与 `|` 块体都要扫，行尾 `\` 续行先接成一条
// ——只扫单行会让「拆成两行的同一句调用」从缝里漏过去。包名两侧的引号也要吃掉：`--filter "…"`
// 是 pnpm 文档里的写法。`turbo … --filter=@greypan/interweave` 也在列：turbo 扇出是本仓自己的写法，
// 同样会执行聚合脚本（`@greypan/interweave#build` 的 command 就是它）。
const aggregateBuildInvocations = [
  /@greypan\/interweave["']?\s+run\s+["']?build["']?(?![:\w-])/,
  /@greypan\/interweave["']?\s+build(?![:\w-])/,
  /(?:--dir|-C)\s+\S*apps\/interweave["']?\s+run\s+["']?build["']?(?![:\w-])/,
  /(?:--dir|-C)\s+\S*apps\/interweave["']?\s+build(?![:\w-])/,
  /turbo\s+[^\n]*--filter[=\s]+["']?[^\s"']*@greypan\/interweave(?![-\w])/
]

for (const file of onDisk) {
  for (const run of runTexts(fs.readFileSync(path.join(workflowDir, file), 'utf8'))) {
    if (!/@greypan\/interweave|apps\/interweave/.test(run)) continue
    for (const pattern of aggregateBuildInvocations) {
      assert.ok(
        !pattern.test(run),
        `${file}: a run step invokes the aggregate \`build\` script of @greypan/interweave (${run.trim()}); the desktop matrices invoke build:macos / build:windows directly`
      )
    }
  }
}

// 不变量 1 的可静态判定部分：job 声明的安装面必须覆盖它自己调用的 mise 管理命令。P0 的事故就是这个
// job 只装 node+pnpm 却要跑链接桌面库的 wails3 —— 那是运行期 spawn，这里查不到，由
// scripts/version-sync.test.mjs 用「PATH 里没有 wails3」的实跑钉住。
const miseManagedCommands = new Set(['node', 'pnpm', 'wails3', 'go', 'playwright'])

// 命令名取每条 run 的第一个非赋值 token：`FOO=bar pnpm …` 的命令名在赋值之后；`if [[ … ]]`、
// `for X in …` 这类 shell 关键字不在白名单里，自然被忽略。与 runTexts 共用解析器——两份解析器
// 早晚会各自漂移，那正是它要防的形状。
function invokedCommands(block) {
  return runTexts(block).map(entry => entry.split(' ').filter(token => !/^[A-Za-z_][A-Za-z0-9_]*=/.test(token))[0])
}

for (const [file, wf] of Object.entries(parsed)) {
  const text = fs.readFileSync(path.join(workflowDir, file), 'utf8')

  for (const [id, job] of Object.entries(wf.jobs)) {
    if (!job.toolchain['mise-install']) {
      continue
    }

    const declared = new Set(job.toolchain['mise-install'].split(' '))
    const blockStart = text.indexOf(`\n  ${id}:\n`)
    assert.notEqual(blockStart, -1, `${file}: job ${id} block not found`)
    const rest = text.slice(blockStart)
    // 结束位置必须**跳过 job 自己的头部行**再找：`rest` 就是以 `\n  ${id}:\n` 开头的，
    // 直接 search 会命中位置 0，block 变成空串，下面那个循环一次都不执行——这条断言会静默
    // 变成永不触发的样子（它本来就这样，已经放行过一个在块体里调 `go` 的 job）。
    const afterHeader = rest.indexOf('\n') + 1
    const nextJob = /\n {2}[a-z0-9-]+:\n/.exec(rest.slice(afterHeader))
    const block = nextJob ? rest.slice(0, afterHeader + nextJob.index) : rest

    for (const command of invokedCommands(block)) {
      if (miseManagedCommands.has(command)) {
        assert.ok(
          declared.has(command),
          `${file}: job ${id} runs ${command} but only installs ${[...declared].join(' ')}`
        )
      }
    }
  }
}

console.log('scripts/ci-topology.test.mjs: all assertions passed')
