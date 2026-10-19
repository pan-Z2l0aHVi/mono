import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  RELEASE_BRANCH,
  REQUIRED_CONTEXT,
  desktopMatrix,
  parseWorkflow,
  requiredPolicyStep,
  workflows
} from './ci-topology.mjs'

// 这张测试是 .github/scripts/ci-topology.mjs 那张表的执行端：YAML 不能被 import，所以「拓扑只有一处
// 定义」只能靠把真实 workflow 逐字段读回来比。它同时钉计划里的不变量 2/3/4/5 与安装面收窄那条，
// 因为那四条都是「改了没人报错、要到发版当天才炸」的形状。
// 测试与被测表同址；执行端是根 `ci:test-scripts` 的全仓 glob（`*.test.mjs`）。
const repoRoot = path.resolve(import.meta.dirname, '../..')
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
  assert.deepEqual(actual.concurrency, expected.concurrency ?? {}, `${file}: workflow concurrency must match`)

  assert.deepEqual(Object.keys(actual.jobs), Object.keys(expected.jobs), `${file}: job ids must match`)

  for (const [id, job] of Object.entries(expected.jobs)) {
    const act = actual.jobs[id]
    assert.equal(act.name, job.name, `${file}: job ${id} display name must match`)
    assert.deepEqual(act.needs, job.needs, `${file}: job ${id} needs must match`)
    assert.deepEqual(act.toolchain, job.toolchain, `${file}: job ${id} declared toolchain must match`)
    assert.deepEqual(act.permissions, job.permissions ?? {}, `${file}: job ${id} permission escalation must match`)
    assert.deepEqual(act.concurrency, job.concurrency ?? {}, `${file}: job ${id} concurrency must match`)
    assert.equal(act.continueOnError, job.continueOnError, `${file}: job ${id} continue-on-error must match`)

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

  for (const [step, jobId] of Object.entries(expected.stepJobs ?? {})) {
    assert.equal(actual.stepJobs[step], jobId, `${file}: step ${step} must belong to job ${jobId}`)
  }

  for (const [step, shell] of Object.entries(expected.stepShells ?? {})) {
    assert.equal(actual.stepShells[step], shell, `${file}: step ${step} shell must match`)
  }

  for (const step of Object.keys(expected.stepJobs ?? {})) {
    assert.equal(actual.stepContinueOnError[step], undefined, `${file}: step ${step} must propagate failures`)
  }

  if (expected.policyStep) {
    const policy = expected.policyStep
    assert.equal(actual.stepJobs[policy.name], policy.job, `${file}: ${policy.name} must belong to job ${policy.job}`)
    assert.equal(actual.stepShells[policy.name], policy.shell, `${file}: ${policy.name} shell must match`)
    assert.equal(actual.steps[policy.name], undefined, `${file}: ${policy.name} must not be conditionally skipped`)
    assert.equal(
      actual.stepContinueOnError[policy.name],
      undefined,
      `${file}: ${policy.name} must fail the job on error`
    )
    assert.equal(actual.jobs[policy.job].if, undefined, `${file}: job ${policy.job} must not be conditionally skipped`)
    assert.equal(
      actual.jobs[policy.job].continueOnError,
      undefined,
      `${file}: job ${policy.job} must propagate failures`
    )
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

// 不变量 2：只有 changeset-version.yml 监听 push。ci.yml 默认在 pull_request 的合并对象上运行，
// strict 要求 PR 跟上 base；squash 会创建新 commit，不能据此假设合并提交与已测对象恒等。trunk 复检走 workflow_dispatch。
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
    'npm-publish.yml:job:Create npm package releases',
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

for (const [file, wf] of Object.entries(workflows)) {
  if (!wf.stepRuns) continue
  const text = fs.readFileSync(path.join(workflowDir, file), 'utf8')
  for (const [step, expectedRuns] of Object.entries(wf.stepRuns)) {
    const block = namedStepBlock(text, step)
    assert.deepEqual(runTexts(block), expectedRuns, file + ': step ' + step + ' commands must match the topology table')
  }
}

function namedStepBlock(text, name) {
  const start = text.indexOf(`      - name: ${name}\n`)
  assert.notEqual(start, -1, `step ${name} block not found`)
  const rest = text.slice(start)
  const nextStep = /\n      - /.exec(rest.slice(1))
  return nextStep ? rest.slice(0, nextStep.index + 1) : rest
}

for (const [file, workflow] of Object.entries(workflows)) {
  const text = fs.readFileSync(path.join(workflowDir, file), 'utf8')
  for (const [step, expectedInputs] of Object.entries(workflow.stepInputs ?? {})) {
    const block = namedStepBlock(text, step)
    for (const input of expectedInputs) {
      assert.ok(block.includes(input), `${file}: step ${step} must retain input ${input}`)
    }
  }
}

// Policy checks belong to the required job and must always run with Bash failure propagation. Exact command
// comparison prevents removal, replacement, or shell-level masking of any hard constraint.
function assertPolicyStepContract(text) {
  const parsedWorkflow = parseWorkflow(text)
  const policy = requiredPolicyStep
  assert.equal(parsedWorkflow.stepJobs[policy.name], policy.job, 'policy step must belong to required job check')
  assert.equal(parsedWorkflow.stepShells[policy.name], policy.shell, 'policy step must use fail-fast Bash')
  assert.equal(parsedWorkflow.steps[policy.name], undefined, 'policy step must not have an if condition')
  assert.equal(parsedWorkflow.stepContinueOnError[policy.name], undefined, 'policy step must not ignore errors')
  assert.equal(parsedWorkflow.jobs[policy.job]?.if, undefined, 'required job must not have an if condition')
  assert.equal(parsedWorkflow.jobs[policy.job]?.continueOnError, undefined, 'required job must propagate failures')
  assert.deepEqual(
    runTexts(namedStepBlock(text, policy.name)),
    policy.runs,
    'policy step must execute every required command unchanged'
  )
}

const ciWorkflow = fs.readFileSync(path.join(workflowDir, 'ci.yml'), 'utf8')
assertPolicyStepContract(ciWorkflow)
for (const command of requiredPolicyStep.runs) {
  const commandPath = path.join(repoRoot, command)
  assert.ok(fs.existsSync(commandPath), `required policy command ${command} must exist`)
  assert.notEqual(fs.statSync(commandPath).mode & 0o111, 0, `required policy command ${command} must be executable`)
}

function mutateOnce(text, from, to, label) {
  assert.equal(text.split(from).length - 1, 1, `${label}: mutation anchor must occur once`)
  return text.replace(from, to)
}

const policyStepMarker = `      - name: ${requiredPolicyStep.name}\n`
assert.throws(
  () =>
    assertPolicyStepContract(
      mutateOnce(ciWorkflow, '          .agents/checks/no-mutual-links\n', '', 'removed command')
    ),
  /policy step must execute every required command unchanged/
)
assert.throws(() =>
  assertPolicyStepContract(
    mutateOnce(ciWorkflow, policyStepMarker, `${policyStepMarker}        if: false\n`, 'step if')
  )
)
assert.throws(() =>
  assertPolicyStepContract(
    mutateOnce(
      ciWorkflow,
      policyStepMarker,
      `${policyStepMarker}        continue-on-error: true\n`,
      'step continue-on-error'
    )
  )
)
assert.throws(() =>
  assertPolicyStepContract(mutateOnce(ciWorkflow, '  check:\n', '  check:\n    if: false\n', 'job if'))
)
assert.throws(() =>
  assertPolicyStepContract(
    mutateOnce(ciWorkflow, '  check:\n', '  check:\n    continue-on-error: true\n', 'job continue-on-error')
  )
)

// GitHub's explicit Bash shell uses -e -o pipefail. Keep a failure propagation fixture so a future wrapper
// change cannot leave later policy commands running while the required job reports success.
const propagationDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-policy-fail-fast-'))
try {
  const marker = path.join(propagationDir, 'later-command-ran')
  const result = spawnSync(
    'bash',
    ['--noprofile', '--norc', '-e', '-o', 'pipefail', '-c', 'false\nprintf reached > "$1"', 'policy-step', marker],
    { encoding: 'utf8' }
  )
  assert.equal(result.status, 1, `Bash should fail immediately on a policy error: ${result.stderr}`)
  assert.equal(fs.existsSync(marker), false, 'a later policy command must not run after a failure')
} finally {
  fs.rmSync(propagationDir, { recursive: true, force: true })
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
  // 负 filter 是 CI 保留 workspace 包构建、跳过 app wrapper 的合法写法；只拦会选中 app 的正 filter。
  /turbo\s+[^\n]*--filter[=\s]+["']?@greypan\/interweave(?![-\w])/
]

const negativeAppFilter = 'pnpm exec turbo run build --filter=!@greypan/interweave'
const positiveAppFilter = 'pnpm exec turbo run build --filter=@greypan/interweave'
assert.equal(
  aggregateBuildInvocations.some(pattern => pattern.test(negativeAppFilter)),
  false,
  'a negative app filter must remain legal for package-only CI builds'
)
assert.equal(
  aggregateBuildInvocations.some(pattern => pattern.test(positiveAppFilter)),
  true,
  'a positive app filter must remain forbidden in aggregate workflows'
)

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
// apps/interweave/scripts/version-sync.test.mjs 用「PATH 里没有 wails3」的实跑钉住。
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

// Wails 的 path filter 必须覆盖 frontend manifest 中每个传递 workspace 依赖，而不是维护第二份手写清单。
function collectWorkspacePackages(root) {
  const packages = new Map()
  for (const area of ['apps', 'packages']) {
    const areaRoot = path.join(root, area)
    if (!fs.existsSync(areaRoot)) continue
    const visit = directory => {
      for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        if (entry.name === 'node_modules' || entry.name === '.git') continue
        const absolute = path.join(directory, entry.name)
        if (entry.isDirectory()) {
          visit(absolute)
        } else if (entry.isFile() && entry.name === 'package.json') {
          const manifest = JSON.parse(fs.readFileSync(absolute, 'utf8'))
          if (manifest.name)
            packages.set(manifest.name, {
              name: manifest.name,
              directory: path.relative(root, path.dirname(absolute)).split(path.sep).join('/'),
              manifest
            })
        }
      }
    }
    visit(areaRoot)
  }
  return packages
}

function workspaceDependencyNames(manifest) {
  return [manifest.dependencies, manifest.devDependencies, manifest.optionalDependencies, manifest.peerDependencies]
    .filter(Boolean)
    .flatMap(dependencies =>
      Object.entries(dependencies)
        .filter(([, version]) => typeof version === 'string' && version.startsWith('workspace:'))
        .map(([name]) => name)
    )
}

const workspacePackages = collectWorkspacePackages(repoRoot)
const frontend = workspacePackages.get('@greypan/interweave-frontend')
assert.ok(frontend, 'the Wails frontend package manifest must be present')
const frontendClosure = new Set()
const visitFrontendDependency = name => {
  if (frontendClosure.has(name)) return
  const workspacePackage = workspacePackages.get(name)
  assert.ok(workspacePackage, `frontend dependency ${name} must resolve to a workspace package`)
  frontendClosure.add(name)
  for (const dependency of workspaceDependencyNames(workspacePackage.manifest)) visitFrontendDependency(dependency)
}
for (const dependency of workspaceDependencyNames(frontend.manifest)) visitFrontendDependency(dependency)
const verifyPaths = parsed['wails-verify.yml'].triggers.find(trigger => trigger.on === 'pull_request')?.paths ?? []
for (const name of frontendClosure) {
  const packagePath = workspacePackages.get(name).directory
  assert.ok(
    verifyPaths.includes(`${packagePath}/**`),
    `wails-verify.yml must trigger when transitive frontend workspace dependency ${name} (${packagePath}) changes`
  )
}

// Shared Go caching is opt-in, starts only after mise installed Go, and uses one strict per-SHA key with a
// same-platform/toolchain/module restore prefix. This avoids caching a Go version selected before mise.
const setupDeps = fs.readFileSync(path.join(repoRoot, '.github/actions/setup-deps/action.yml'), 'utf8')
assert.match(setupDeps, /  go-cache:\n[\s\S]*?    required: false\n    default: 'false'/)
const goResolveStart = setupDeps.indexOf('    - name: Resolve Go cache paths\n')
const goCacheStart = setupDeps.indexOf('    - name: Cache Go modules and build artifacts\n')
const miseActionStart = setupDeps.indexOf('    - uses: jdx/mise-action@v4\n')
const miseActionInputEnd = setupDeps.indexOf('\n\n    - name: Resolve Go cache paths', miseActionStart)
assert.ok(
  miseActionStart >= 0 && miseActionInputEnd > miseActionStart && goResolveStart > miseActionInputEnd,
  'Go cache paths must resolve after mise-action installs the selected tools'
)
assert.match(setupDeps.slice(miseActionStart, miseActionInputEnd), /install: 'true'[\s\S]*install_args:/)
assert.ok(setupDeps.slice(miseActionStart, miseActionInputEnd).includes('install_args: ${{ inputs.mise-install }}'))
assert.doesNotMatch(setupDeps, /run: mise install/)
assert.ok(goCacheStart > goResolveStart, 'Go cache restore must follow Go cache path resolution')
const goResolveBlock = setupDeps.slice(goResolveStart, setupDeps.indexOf('\n    - ', goResolveStart + 1))
const goCacheBlock = setupDeps.slice(goCacheStart, setupDeps.indexOf('\n    - ', goCacheStart + 1))
assert.match(goResolveBlock, /if: inputs\.go-cache == 'true'/)
assert.match(goResolveBlock, /go env GOMODCACHE/)
assert.match(goResolveBlock, /go env GOCACHE/)
assert.match(goResolveBlock, /go env GOVERSION/)
assert.match(goResolveBlock, /ImageOS/)
assert.match(goResolveBlock, /ImageVersion/)
assert.match(goCacheBlock, /if: inputs\.go-cache == 'true'/)
assert.match(goCacheBlock, /uses: actions\/cache@v5/)
assert.match(goCacheBlock, /steps\.go-cache-paths\.outputs\.gomodcache/)
assert.match(goCacheBlock, /steps\.go-cache-paths\.outputs\.gocache/)
for (const keyPart of [
  'runner.os',
  'runner.arch',
  'steps.go-cache-paths.outputs.imageos',
  'steps.go-cache-paths.outputs.imageversion',
  'steps.go-cache-paths.outputs.goversion',
  "hashFiles('apps/interweave/go.sum')",
  'github.sha'
]) {
  assert.ok(goCacheBlock.includes(keyPart), `Go cache primary key must include ${keyPart}`)
}
const restoreKey = goCacheBlock.split('restore-keys: |')[1]?.split('\n')[1]?.trim() ?? ''
assert.ok(
  restoreKey.includes('runner.os') && restoreKey.includes('runner.arch'),
  'Go restore key must stay platform-specific'
)
assert.ok(restoreKey.includes('steps.go-cache-paths.outputs.imageos'), 'Go restore key must stay runner-image-specific')
assert.ok(
  restoreKey.includes('steps.go-cache-paths.outputs.imageversion'),
  'Go restore key must stay runner-image-version-specific'
)
assert.ok(restoreKey.includes('steps.go-cache-paths.outputs.goversion'), 'Go restore key must stay Go-version-specific')
assert.ok(restoreKey.includes("hashFiles('apps/interweave/go.sum')"), 'Go restore key must stay module-specific')
assert.equal(restoreKey.includes('github.sha'), false, 'Go restore prefix must omit the exact commit SHA')

// Main-only cache seeding uses the same pinned-tool, platform-specific SHA key as CI. The version job
// serializes against current main; the cache seed stays fixed to its push SHA so the key describes its tree.
const ciText = fs.readFileSync(path.join(workflowDir, 'ci.yml'), 'utf8')
const versionText = fs.readFileSync(path.join(workflowDir, 'changeset-version.yml'), 'utf8')
const sharedTurboKey = "${{ runner.os }}-${{ runner.arch }}-turbo-${{ hashFiles('.mise.toml') }}-${{ github.sha }}"
const sharedTurboRestore = "${{ runner.os }}-${{ runner.arch }}-turbo-${{ hashFiles('.mise.toml') }}-"
assert.ok(
  ciText.includes('key: ' + sharedTurboKey),
  'CI must key Turbo artifacts by platform, mise pins, and exact SHA'
)
assert.ok(versionText.includes('key: ' + sharedTurboKey), 'main cache seed must use the same exact Turbo cache key')
assert.ok(ciText.includes(sharedTurboRestore), 'CI restore prefix must stay scoped to platform and mise pins')
assert.ok(
  versionText.includes(sharedTurboRestore),
  'main seed restore prefix must stay scoped to platform and mise pins'
)
const versionJobStart = versionText.indexOf('\n  version:\n')
const cacheSeedStart = versionText.indexOf('\n  cache-seed:\n')
const versionJobText = versionText.slice(versionJobStart, cacheSeedStart)
const cacheSeedText = versionText.slice(cacheSeedStart)
assert.ok(
  versionJobText.includes('ref: main'),
  'serialized version job must checkout current main after acquiring its job concurrency slot'
)
assert.ok(
  cacheSeedText.includes('ref: ${{ github.sha }}'),
  'cache seed must checkout the exact push SHA represented by its key'
)
assert.ok(
  cacheSeedText.indexOf('uses: actions/cache@v5') <
    cacheSeedText.indexOf("pnpm exec turbo run build --filter='./packages/*'")
)
assert.ok(cacheSeedText.includes('TURBO_CACHE_DIR: ${{ github.workspace }}/.turbo'))
assert.equal(parsed['changeset-version.yml'].jobs['cache-seed'].toolchain['go-cache'], undefined)
assert.equal(parsed['changeset-version.yml'].jobs['cache-seed'].toolchain.wails, undefined)
assert.ok(!cacheSeedText.includes('go-cache:') && !cacheSeedText.includes('wails:'))
assert.ok(
  !cacheSeedText.includes('turbo build --filter=./apps/'),
  'cache seed must build packages rather than desktop apps'
)

const npmWorkflowText = fs.readFileSync(path.join(workflowDir, 'npm-publish.yml'), 'utf8')
assert.ok(npmWorkflowText.includes('queue: max'), 'npm publishing must serialize pending release runs')
assert.ok(npmWorkflowText.includes('retention-days: 30'), 'receipt must remain available for the rerun window')
assert.ok(npmWorkflowText.includes('actions/upload-artifact@v6'))
assert.ok(npmWorkflowText.includes('actions/download-artifact@v7'))
assert.ok(!npmWorkflowText.includes('overwrite: true'), 'the first attempt must not replace an existing receipt')
assert.ok(!npmWorkflowText.includes('actions: read'), 'receipt reuse must not require actions:read')
const notesStart = npmWorkflowText.indexOf('\n  release-notes:\n')
const notesText = npmWorkflowText.slice(notesStart)
assert.ok(notesText.includes("needs.publish.result == 'success' || needs.publish.result == 'failure'"))
assert.ok(!notesText.includes('needs.prepare.outputs') && !notesText.includes('needs.publish.outputs'))
assert.ok(notesText.includes('github.event.pull_request.merge_commit_sha'))
assert.ok(notesText.includes('GITHUB_RUN_ID: ${{ github.run_id }}'))

const wailsReleaseText = fs.readFileSync(path.join(workflowDir, 'wails-release.yml'), 'utf8')
assert.ok(
  wailsReleaseText.includes(
    "should-release: ${{ steps.release.outputs.should-release == 'true' && steps.existing.outputs.skip-build != 'true' }}"
  ),
  'a verified existing published Wails release must skip native builds'
)
assert.ok(
  wailsReleaseText.includes('retention-days: 30') && wailsReleaseText.includes('overwrite: true'),
  'Wails build artifacts must remain available across the supported rerun window'
)
assert.ok(
  !wailsReleaseText.includes('artifact-attempt'),
  'Wails artifact names must not depend on a run-attempt output'
)

console.log('.github/scripts/ci-topology.test.mjs: all assertions passed')
