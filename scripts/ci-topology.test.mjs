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

// 引用解析查不出「id 挂到了错误的 step」，而 flake 台账的守卫恰恰依赖 `id: test` 落在真的跑
// `pnpm run test` 的那一步上 —— 挂错只会让台账静默变空，所以这一对邻接行单独钉住。
assert.match(
  fs.readFileSync(path.join(workflowDir, 'ci.yml'), 'utf8'),
  /^ {6}- name: Test\n {8}id: test$/m,
  'ci.yml: the id `test` must belong to the step named Test'
)

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

// 不变量 1 的可静态判定部分：job 声明的安装面必须覆盖它自己调用的 mise 管理命令。P0 的事故就是这个
// job 只装 node+pnpm 却要跑链接桌面库的 wails3 —— 那是运行期 spawn，这里查不到，由
// scripts/version-sync.test.mjs 用「PATH 里没有 wails3」的实跑钉住。
const miseManagedCommands = new Set(['node', 'pnpm', 'wails3', 'go', 'playwright'])

// 单行 `run: cmd` 与 `run: |` 块体都要看：只扫单行会漏掉多行脚本，而重工具链调用恰恰最容易藏在那里。
function invokedCommands(block) {
  const commands = []
  let inScalar = false

  for (const line of block.split('\n')) {
    const inline = line.match(/^ {8}run:\s*(\S.*)$/)
    const scalar = line.match(/^ {8}run:\s*[|>][-+]?\s*$/)

    if (inline) {
      inScalar = false
      commands.push(inline[1])
      continue
    }
    if (scalar) {
      inScalar = true
      continue
    }
    if (inScalar && line.trim() !== '') {
      inScalar = /^ {10,}\S/.test(line)
      if (inScalar) {
        commands.push(line.trim())
      }
    }
  }

  // `FOO=bar pnpm …` 的命令名在赋值之后；`if [[ … ]]`、`for X in …` 这类 shell 关键字不在白名单里，
  // 自然被忽略。
  return commands.map(entry => entry.split(' ').filter(token => !/^[A-Za-z_][A-Za-z0-9_]*=/.test(token))[0])
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
    const blockEnd = rest.search(/\n {2}[a-z0-9-]+:\n/)
    const block = blockEnd === -1 ? rest : rest.slice(0, blockEnd)

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
