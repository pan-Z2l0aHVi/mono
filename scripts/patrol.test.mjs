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
  // state 是三段（AGENTS / UNITS / REPORTS），按段名切而不是按固定下标：新增一段时
  // 「切到下一个段名为止」自动跟上，而按 slice 到数组末尾会把后面所有段都算进当前段。
  const SECTIONS = ['AGENTS', 'UNITS', 'REPORTS']
  const sectionRows = (lines, name) => {
    const at = lines.indexOf(name)
    if (at === -1) return []
    const rest = lines.slice(at + 1)
    const end = rest.findIndex(line => SECTIONS.includes(line))
    return (end === -1 ? rest : rest.slice(0, end)).filter(Boolean)
  }
  const run = () => {
    const output = execFileSync('node', [patrol], { encoding: 'utf8', env })
    const lines = output.split('\n')
    return {
      output,
      first: lines[0],
      stalls: lines.filter(line => line.startsWith('STALL?')),
      // 静默态只打印首行，没有 UNITS 段；这里返回空数组而不是把整段输出误当单元行。
      units: sectionRows(lines, 'UNITS'),
      reports: sectionRows(lines, 'REPORTS'),
      has: needle => output.includes(needle)
    }
  }
  return {
    run,
    poll: count => Array.from({ length: count }, () => run()),
    setAgents,
    reportDir,
    writeReport: (name, body = 'report\n') => fs.writeFileSync(path.join(reportDir, name), body),
    readMonitor: name => fs.readFileSync(path.join(monitorDir, name), 'utf8'),
    writeMonitor: (name, body) => {
      fs.mkdirSync(monitorDir, { recursive: true })
      fs.writeFileSync(path.join(monitorDir, name), body)
    }
  }
}

const working = [{ name: 'coder-a', agent_status: 'working' }]
const idle = [{ name: 'coder-a', agent_status: 'idle' }]
// Manager 不是被观察对象：巡检由它在自己的 turn 里执行，算进 running 会让 NO_ACTIVE 永不触发。
const managerWorking = [{ name: 'manager', agent_status: 'working' }]
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

// --- 五态判定 ---

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
  // 汇报通道要求 Manager 绑固定名 manager，于是它在 agent 列表里有名字了。它仍不是被观察对象：
  // 只有 Manager 在跑、且没人 working 时，NO_ACTIVE 必须照常触发，否则「静默是硬要求」失效。
  const result = sandbox({
    agents: [...managerWorking, ...idle],
    manifests: { alpha: unit({ roots: [gitWorktree()] }) }
  })
  result.run()
  assert.equal(result.run().first, 'NO_ACTIVE', 'Manager 自己处于 working 不得被算成 running，否则 NO_ACTIVE 永不触发')
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

// --- 报告信号 ---

{
  // 报告写在 $TMPDIR，worktree 一个字节没变：churn 恒定，单元段看不见它，只有 REPORTS 能报。
  const result = sandbox({ agents: idle, manifests: { alpha: unit({ roots: [gitWorktree()] }) } })
  result.run()
  result.writeReport('report-fixture-review.md')
  const added = result.run()
  assert.equal(added.first, 'REPORTS_CHANGED', '报告新增而 agent 与 churn 都没变时独占首行')
  assert.ok(
    added.has('report-fixture-review.md herdr-agents/fixture new'),
    '文件名含 coordination slug 时归属反查到该单元'
  )
}

{
  const result = sandbox({ agents: idle, manifests: { alpha: unit({ roots: [gitWorktree()] }) } })
  result.run()
  result.writeReport('scratch-notes.md')
  const added = result.run()
  assert.equal(added.first, 'REPORTS_CHANGED', '认不出归属的报告也要报出来')
  assert.ok(added.has('scratch-notes.md unmatched new'), '反查不出的报告如实标 unmatched，不猜也不丢')
}

{
  // 只比文件名集合会漏掉就地改写，而返工报告就地更新是最该被看到的那种变化。
  const result = sandbox({ agents: idle, manifests: { alpha: unit({ roots: [gitWorktree()] }) } })
  result.writeReport('report-fixture-review.md')
  result.run()
  result.writeReport('report-fixture-review.md', 'rewritten\n')
  // 显式推到未来，让「改过」与写入耗时无关地可判定。取整到毫秒理论上存在同毫秒漏报，
  // 但两次 writeFileSync 的间隔远大于 1ms，构造不出来——这里是让断言不依赖真实耗时。
  const future = new Date(Date.now() + 60_000)
  fs.utimesSync(path.join(result.reportDir, 'report-fixture-review.md'), future, future)
  const updated = result.run()
  assert.equal(updated.first, 'REPORTS_CHANGED', '已存在的报告被改写同样是变化')
  assert.ok(updated.has('report-fixture-review.md herdr-agents/fixture updated'), '改写要标 updated 而不是 new')
}

{
  const result = sandbox({ agents: idle, manifests: { alpha: unit({ roots: [gitWorktree()] }) } })
  result.writeReport('report-fixture-review.md')
  result.run()
  fs.rmSync(path.join(result.reportDir, 'report-fixture-review.md'))
  const removed = result.run()
  assert.ok(removed.has('report-fixture-review.md herdr-agents/fixture removed'), '报告被删掉也要报，只遍历 cur 会静默')
}

{
  // 与别的事件同轮发生时走信号组，但报告信号不能因此丢失。
  const result = sandbox({ agents: working, manifests: { alpha: unit({ roots: [gitWorktree()] }) } })
  result.run()
  result.setAgents(idle)
  result.writeReport('report-fixture-review.md')
  const both = result.run()
  assert.equal(both.first, 'AGENTS_CHANGED', 'agent 状态与报告同轮变化时由信号组承载')
  assert.ok(both.has('REPORTS_CHANGED=true'), '信号组里要显式带出报告变化')
  assert.ok(both.has('report-fixture-review.md herdr-agents/fixture new'), '信号组里要逐条给出变化项，不能只给一个布尔')
}

{
  // manifest 是 .json、浏览器留档是 .png，两者各有各的通道，不重复计入报告信号。
  const result = sandbox({ agents: idle, manifests: { alpha: unit({ roots: [gitWorktree()] }) } })
  result.run()
  result.writeReport('shot-fixture.png', 'not really a png')
  fs.writeFileSync(path.join(result.reportDir, 'loose.json'), '{"note":"not a manifest"}')
  const quiet = result.run()
  assert.equal(quiet.first, 'NO_ACTIVE', '.png 与非 manifest 的 .json 不算报告变化')
}

{
  // 收尾轮的报告不能被 ALL_DONE 吞掉：ALL_DONE 一打印，调用方就停 loop，而 state 仍会推进，
  // 漏在这里不是「晚一轮」而是永久丢失。首行保持 ALL_DONE（终态语义不变），明细跟在后面。
  const result = sandbox({ agents: idle, manifests: { alpha: unit({ roots: [gitWorktree()] }) } })
  result.run()
  fs.writeFileSync(
    path.join(result.reportDir, 'alpha.json'),
    JSON.stringify({ ...unit({ roots: [] }), status: 'finished' })
  )
  result.writeReport('report-fixture-final.md')
  const final = result.run()
  assert.equal(final.first, 'ALL_DONE', '收尾轮的首行仍是终态，不因有报告而改成别的')
  assert.ok(final.has('REPORTS_CHANGED=true'), '终态也要带出报告变化')
  assert.ok(final.has('report-fixture-final.md herdr-agents/fixture new'), '收尾轮落地的最终报告必须出现在明细里')
}

{
  // 不带斜杠的 coordination id（手写 manifest 漏了 herdr-agents/ 前缀）是可达路径：
  // 修「取最长命中」时若用 slug 回头 find 一次，这一步会落空，归属字段变成空串——
  // 既不是归属也不是 unmatched，比什么都难读。
  const result = sandbox({
    agents: idle,
    manifests: { bare: { coordination: 'focus-ring', status: 'active', roots: [], participants: [] } }
  })
  result.writeReport('review-focus-ring.md')
  const attributed = result.run()
  assert.ok(
    attributed.has('review-focus-ring.md focus-ring new'),
    '不带斜杠的 coordination id 也要能反查到归属本身，而不是空串'
  )
}

{
  // 归属用 slug 最长命中：slug 互为前缀时（focus-ring / focus-ring-tabs），只按目录顺序取
  // 第一个命中等于让归属随 readdir 漂移，而且错的值会写进基线一直错下去。
  const result = sandbox({
    agents: idle,
    manifests: {
      'aaa-short': { coordination: 'herdr-agents/focus-ring', status: 'active', roots: [], participants: [] },
      'zzz-long': {
        coordination: 'herdr-agents/focus-ring-tabs',
        status: 'active',
        roots: [],
        participants: []
      }
    }
  })
  result.writeReport('report-focus-ring-tabs-r1.md')
  const attributed = result.run()
  assert.ok(
    attributed.has('report-focus-ring-tabs-r1.md herdr-agents/focus-ring-tabs new'),
    '前缀包含时归属给 slug 更长的那个单元'
  )
}

{
  // manifest 判定只有一条，两侧共用：带 coordination 的 .json 既是 manifest 也是归属依据，
  // 两边必须一起认或一起不认。要断言的是一致性本身，不是「该不该收」——收的宽窄是既有口径。
  const result = sandbox({ agents: idle, manifests: { alpha: unit({ roots: [gitWorktree()] }) } })
  result.run()
  fs.writeFileSync(path.join(result.reportDir, 'loose.json'), '{"coordination":"herdr-agents/ghost"}')
  result.writeReport('report-ghost.md')
  const seen = result.run()
  assert.ok(
    seen.units.some(line => line.startsWith('herdr-agents/ghost')),
    '带 coordination 的 .json 被当作 manifest 枚举'
  )
  assert.ok(seen.has('report-ghost.md herdr-agents/ghost new'), '同一份文件在归属侧也被采信，两侧判定一致')
}

{
  // 归属与 mtime 同时变时两个事实都报：只报一个，被压下去的那个会随基线推进一起消失。
  const result = sandbox({ agents: idle, manifests: { alpha: unit({ roots: [gitWorktree()] }) } })
  result.writeReport('report-focus-ring-review.md')
  result.run()
  fs.writeFileSync(
    path.join(result.reportDir, 'alpha.json'),
    JSON.stringify({ ...unit({ roots: [gitWorktree()] }), coordination: 'herdr-agents/focus-ring' })
  )
  result.writeReport('report-focus-ring-review.md', 'rewritten\n')
  const future = new Date(Date.now() + 60_000)
  fs.utimesSync(path.join(result.reportDir, 'report-focus-ring-review.md'), future, future)
  const both = result.run()
  assert.ok(both.has('report-focus-ring-review.md herdr-agents/focus-ring updated'), '改写仍要报')
  assert.ok(both.has('unmatched -> herdr-agents/focus-ring reattributed'), '归属变化不能被 updated 吞掉')
}

{
  // 收尾单元的报告也要能归属：只用活跃单元反查会把它们一律判成 unmatched。
  // 断言落在 state 上而不是首行上——单元标 finished 且无人跑时首行是 ALL_DONE，
  // 但归属仍然被记进基线，下一轮有别的事件时才会显形。
  const result = sandbox({ agents: idle, manifests: { alpha: unit({ roots: [gitWorktree()] }) } })
  result.run()
  fs.writeFileSync(
    path.join(result.reportDir, 'alpha.json'),
    JSON.stringify({ ...unit({ roots: [] }), status: 'finished' })
  )
  result.writeReport('report-fixture-late.md')
  result.run()
  const state = result.readMonitor('state')
  assert.ok(
    state.includes('report-fixture-late.md\therdr-agents/fixture\t'),
    '单元标记 finished 之后落下的报告仍归属该单元，而不是 unmatched'
  )
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
