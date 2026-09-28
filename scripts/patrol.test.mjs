import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

// 这张测试是 `.agents/skills/herdr-agents/patrol.mjs` 那张巡检表的执行端。manifest 的字段形状同时
// 写在 SKILL.md「巡检」一节和代码里，两侧任一处改名都无声失败，所以这里按 fixture 驱动：造出真实的
// reports/ 目录、真实的 Git 工作目录和一份 stub `herdr`，把 patrol.mjs 原样跑起来断言首行与信号块。
// 放置位置沿用 ADR-0014 的 Go 风格对称约定——测试放 scripts/ 下由 `ci:test-scripts` 的 glob 零注册收录；
// 被测脚本不在 scripts/ 已有先例（ci-topology.test.mjs 与 record-test-failures.test.mjs 都测
// ../.github/scripts/ 下的脚本），把测试放进 skill 目录反而要改收集命令。
const repoRoot = path.resolve(import.meta.dirname, '..')
const patrol = path.join(repoRoot, '.agents/skills/herdr-agents/patrol.mjs')

// 与 patrol.mjs 里的常量对齐。改那边就要改这里，否则「等 STALL_AFTER 轮」的用例会悄悄变成别的形状。
const STALL_AFTER = 4
const POLLS_TO_FIRE = STALL_AFTER + 1

// 只登记 mkdtemp 建出来的目录。绝不能把 os.tmpdir() 本身登记进去——结尾会递归删。
const created = []

// 真实的 Git 仓库：churn 指纹跑的是 `git diff HEAD --numstat` 与 `git ls-files`，桩目录给不出可比数字。
function gitWorktree() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'patrol-wt-'))
  created.push(dir)
  const git = args => execFileSync('git', args, { cwd: dir, stdio: ['ignore', 'ignore', 'ignore'] })
  git(['-c', 'init.defaultBranch=main', 'init', '-q'])
  git(['config', 'user.email', 'patrol-test@example.com'])
  git(['config', 'user.name', 'Patrol Test'])
  // 提交签名用仓内 config 关掉：全局开了签名的话，没有私钥的 fixture 仓会直接提交失败。
  git(['config', 'commit.gpgsign', 'false'])
  fs.writeFileSync(path.join(dir, 'seed.txt'), 'seed\n')
  git(['add', '-A'])
  git(['commit', '-q', '-m', 'seed'])
  return dir
}

function sandbox({ agents, manifests = {} }) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'patrol-test-'))
  created.push(root)

  // patrol 的 state 与 reports 都取自 TMPDIR，所以一个隔离的 TMPDIR 就隔离了全部基线。
  const tmpDir = path.join(root, 'tmp')
  const reportDir = path.join(tmpDir, 'herdr-agents', 'reports')
  const binDir = path.join(root, 'bin')
  const monitorDir = path.join(tmpDir, 'herdr-agents-monitor')
  fs.mkdirSync(reportDir, { recursive: true })
  fs.mkdirSync(binDir, { recursive: true })

  const agentJson = path.join(root, 'agents.json')
  const setAgents = next => fs.writeFileSync(agentJson, JSON.stringify({ result: { agents: next } }))
  setAgents(agents)

  const stub = path.join(binDir, 'herdr')
  fs.writeFileSync(stub, `#!/bin/sh\nexec cat '${agentJson}'\n`)
  fs.chmodSync(stub, 0o755)

  for (const [name, manifest] of Object.entries(manifests)) {
    fs.writeFileSync(path.join(reportDir, `${name}.json`), JSON.stringify(manifest, null, 2))
  }

  const env = { ...process.env, TMPDIR: tmpDir, PATH: `${binDir}:${process.env.PATH}` }
  const run = () => {
    const output = execFileSync('node', [patrol], { encoding: 'utf8', env })
    const lines = output.split('\n')
    const unitsAt = lines.indexOf('UNITS')
    return {
      output,
      first: lines[0],
      stalls: lines.filter(line => line.startsWith('STALL?')),
      // 静默态只打印首行，没有 UNITS 段；这里返回空数组而不是把整段输出误当单元行。
      units: unitsAt === -1 ? [] : lines.slice(unitsAt + 1).filter(Boolean),
      has: needle => output.includes(needle)
    }
  }
  return {
    run,
    poll: count => Array.from({ length: count }, () => run()),
    setAgents,
    readMonitor: name => fs.readFileSync(path.join(monitorDir, name), 'utf8'),
    writeMonitor: (name, body) => {
      fs.mkdirSync(monitorDir, { recursive: true })
      fs.writeFileSync(path.join(monitorDir, name), body)
    }
  }
}

const working = [{ name: 'coder-a', agent_status: 'working' }]
const idle = [{ name: 'coder-a', agent_status: 'idle' }]
const unit = extra => ({ coordination: 'herdr-agents/fixture', status: 'active', participants: ['coder-a'], ...extra })
const stallCounts = polls => polls.map(poll => poll.stalls.length)

// --- manifest 解析 ---

{
  const result = sandbox({
    agents: working,
    manifests: { alpha: unit({ roots: [gitWorktree()], taskId: 'no-such-task-fixture' }) }
  }).run()
  assert.deepEqual(
    result.units,
    ['herdr-agents/fixture\tcoder-a\t0+0-u0\tno-such-task-fixture:unreadable'],
    '字段齐全的 manifest 要产出完整的单元行，taskId 只作参考列出现'
  )
}

{
  // 缺 coordination 的 manifest 与一个合法的放同一目录：坏的那条被跳过，好的照常被枚举。
  const tree = gitWorktree()
  const result = sandbox({
    agents: working,
    manifests: { bad: { status: 'active', roots: [tree], participants: ['coder-a'] }, good: unit({ roots: [tree] }) }
  }).run()
  assert.deepEqual(result.units, ['herdr-agents/fixture\tcoder-a\t0+0-u0\t-'], '缺 coordination 的 manifest 必须被跳过')
}

{
  const result = sandbox({ agents: working, manifests: { alpha: unit({ taskId: 'x' }) } }).run()
  assert.deepEqual(
    result.units,
    ['herdr-agents/fixture\tcoder-a\tnone\tx:unreadable'],
    '缺 roots 的 manifest churn 记为 none，而不是被悄悄当成 0+0-u0'
  )
}

{
  const result = sandbox({
    agents: working,
    manifests: { alpha: { coordination: 'herdr-agents/fixture', status: 'active', roots: [gitWorktree()] } }
  }).run()
  assert.deepEqual(result.units, ['herdr-agents/fixture\t\t0+0-u0\t-'], '缺 participants 的 manifest 参与者列为空')
}

// --- 四态判定 ---

{
  // ALL_DONE 不看基线：没有活跃单元且没人 working 就成立，冷启动第一轮就已经是终态。
  const result = sandbox({ agents: idle, manifests: {} })
  assert.equal(result.run().first, 'ALL_DONE', '没有活跃编排单元且无 agent 在跑时才是 ALL_DONE')
  assert.equal(result.run().first, 'ALL_DONE', '有基线后仍是 ALL_DONE')
}

{
  const result = sandbox({ agents: idle, manifests: { alpha: unit({ roots: [gitWorktree()] }) } })
  result.run()
  assert.equal(result.run().first, 'NO_ACTIVE', '有活跃单元但没人 working 且无变化时是 NO_ACTIVE')
}

{
  const result = sandbox({ agents: working, manifests: { alpha: unit({ roots: [gitWorktree()] }) } })
  result.run()
  assert.equal(result.run().first, 'NO_CHANGE', '有 agent 在跑但无信号时是 NO_CHANGE')
}

{
  const tree = gitWorktree()
  const result = sandbox({ agents: working, manifests: { alpha: unit({ roots: [tree] }) } })
  result.run()
  fs.writeFileSync(path.join(tree, 'brand-new.txt'), 'new\n')
  const churned = result.run()
  assert.equal(churned.first, 'AGENTS_SAME', '只有 churn 变时信号组走 AGENTS_SAME 分支')
  assert.ok(churned.has('CHURN_CHANGED=true'), '新增未跟踪文件必须被算成 churn 变化')
  result.setAgents(idle)
  const moved = result.run()
  assert.equal(moved.first, 'AGENTS_CHANGED', 'agent 状态变了走 AGENTS_CHANGED')
  assert.ok(moved.has('coder-a: working -> idle'), 'AGENTS_CHANGED 要逐行给出迁移')
}

{
  const result = sandbox({
    agents: idle,
    manifests: { alpha: { ...unit({ roots: [gitWorktree()] }), status: 'finished' } }
  })
  result.run()
  assert.equal(result.run().first, 'ALL_DONE', '标记 finished 的单元不计入活跃单元')
}

// --- 三个哨兵值各自的 STALL 资格 ---

for (const [label, extra] of [
  ['none（manifest 缺 roots）', {}],
  ['gone（roots 指向不存在的路径）', { roots: ['/nonexistent/patrol-fixture/path'] }],
  ['error（roots 指向非 Git 目录）', { roots: [os.tmpdir()] }]
]) {
  const polls = sandbox({ agents: working, manifests: { alpha: unit(extra) } }).poll(POLLS_TO_FIRE)
  assert.deepEqual(
    stallCounts(polls),
    [0, 0, 0, 0, 0],
    `churn=${label} 必须整轮不武装 STALL：哨兵值表示「没得可比」，恒定不等于「没动」`
  )
}

{
  // 正对照：上面三个哨兵用例不能因为别的原因（比如 participants 没匹配上）而空过。
  const polls = sandbox({ agents: working, manifests: { alpha: unit({ roots: [gitWorktree()] }) } }).poll(POLLS_TO_FIRE)
  assert.deepEqual(
    stallCounts(polls),
    [0, 0, 0, 0, 1],
    `真实 churn 连续 ${STALL_AFTER} 轮不变时，第 ${POLLS_TO_FIRE} 轮恰好报一次 STALL`
  )
  const fired = polls[POLLS_TO_FIRE - 1].stalls[0]
  assert.ok(fired.startsWith('STALL? herdr-agents/fixture:'), 'STALL 行以 coordination id 开头')
  assert.ok(fired.includes('coder-a working'), 'STALL 行要点名正在 working 的 participant')
}

{
  // 参与者没对上 live agent 名就不武装，与哨兵值无关。
  const polls = sandbox({
    agents: working,
    manifests: { alpha: { ...unit({ roots: [gitWorktree()] }), participants: ['not-a-live-agent'] } }
  }).poll(POLLS_TO_FIRE)
  assert.deepEqual(stallCounts(polls), [0, 0, 0, 0, 0], 'participants 与 herdr 的 agent 名对不上时不得武装 STALL')
}

// --- 没有可比基线时不武装 STALL ---

{
  const result = sandbox({ agents: working, manifests: { alpha: unit({ roots: [gitWorktree()] }) } })
  const cold = result.run()
  assert.deepEqual(cold.stalls, [], '没有基线的首轮没有「连续没动」可言，不得武装 STALL')
  assert.ok(cold.has('baseline: no matching state version'), '无基线要在输出里说清楚')
  assert.deepEqual(
    JSON.parse(result.readMonitor('stall')),
    { 'herdr-agents/fixture': 0 },
    '计数从 0 起，不从上一轮继承'
  )
}

{
  // 老格式 state（TASKS 段、键是 task）与按 task 键的旧 stall 计数都解不开，整体丢弃。
  const result = sandbox({ agents: working, manifests: { alpha: unit({ roots: [gitWorktree()] }) } })
  result.writeMonitor('state', 'AGENTS\ncoder-a=working\nTASKS\nsome-task\tcoder-a\t0+0-u0\tactive\n')
  result.writeMonitor('stall', JSON.stringify({ 'some-task': 3 }))

  const first = result.run()
  assert.deepEqual(first.stalls, [], '老格式基线不得被当作可比基线来武装 STALL')
  assert.ok(first.has('baseline: no matching state version'), '老格式 state 要落到无基线分支')
  assert.deepEqual(
    JSON.parse(result.readMonitor('stall')),
    { 'herdr-agents/fixture': 0 },
    '旧 stall 计数按 task 键，与单元键不同，必须一起丢弃而不是当成 3 继续数'
  )
  result.run()
  result.run()
  assert.deepEqual(result.run().stalls, [], '丢弃后重新计数，第 4 轮还没到阈值')
  assert.equal(result.run().stalls.length, 1, '丢弃后第 5 轮照常武装')
}

for (const dir of created) fs.rmSync(dir, { recursive: true, force: true })

console.log('scripts/patrol.test.mjs: all assertions passed')
