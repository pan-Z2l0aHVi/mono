import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const script = 'skills/contract-change-review/contract-query.mjs'
const run = (...args) => execFileSync(process.execPath, [script, ...args], { encoding: 'utf8' })
const runFailure = (...args) => execFileSync(process.execPath, [script, ...args], { encoding: 'utf8', stdio: 'pipe' })

const webUiContract = JSON.parse(run('contract', '--json', '@greypan/web-ui'))
assert.equal(webUiContract.package.root, 'packages/web-ui')
assert.ok(webUiContract.directConsumers.includes('@greypan/react-web-ui-demo'))
assert.ok(webUiContract.directConsumers.includes('@greypan/vue-web-ui-demo'))
assert.ok(Object.hasOwn(webUiContract.package.exports, './components/*'))
assert.ok(webUiContract.readFirst.includes('packages/web-ui/README.md'))
assert.ok(webUiContract.verification.includes('pnpm run check-pack'))
assert.throws(() => runFailure('contract', '--json', '@greypan/react-web-ui-demo'))
assert.throws(() => runFailure('contract', '--json', '@greypan/unknown-workspace'))

const noContractDiff = JSON.parse(run('contract-diff', '--json', '--base', 'HEAD'))
// contract-diff 只暴露 manifest 级候选；semver 决策记录在 .changeset/。
// 待定契约变更必须携带 changeset 决策（含 breaking 候选时 bump 须为 major/minor，正文须写明理由）；
// 变更提交后 diff 归零，本段自然跳过，因此不做「diff 必为空」的临时断言。
const readChangesetDecisions = () => {
  const decisions = new Map()
  const raws = []
  const bumpRank = { patch: 1, minor: 2, major: 3 }
  const dir = path.join(process.cwd(), '.changeset')
  if (!fs.existsSync(dir)) return { decisions, raws }
  for (const file of fs.readdirSync(dir).filter(name => name.endsWith('.md'))) {
    const raw = fs.readFileSync(path.join(dir, file), 'utf8')
    raws.push(raw)
    const match = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(raw)
    if (!match) continue
    for (const line of match[1].split('\n')) {
      const entry = /^'([^']+)':\s*(major|minor|patch)\s*$/.exec(line.trim())
      if (!entry) continue
      const [, name, bump] = entry
      const documented = match[2].trim().length > 0
      const existing = decisions.get(name)
      // 同一 package 被多个 changeset 声明时按真实发布语义聚合：
      // 发布 bump 取最高档（major > minor > patch），不得依赖 readdirSync
      // 字母序 + Map last-wins 的巧合；documented 要求每个贡献文件都带正文。
      decisions.set(name, {
        bump: existing && bumpRank[existing.bump] >= bumpRank[bump] ? existing.bump : bump,
        documented: existing ? existing.documented && documented : documented,
        sources: existing ? [...existing.sources, file] : [file]
      })
    }
  }
  return { decisions, raws }
}
const { decisions: changesetDecisions, raws: changesetRaws } = readChangesetDecisions()
for (const change of noContractDiff.changes) {
  if (change.removed) {
    // 包整体移除无法用 changeset 命名单元格表达：包离开 workspace 后
    // changesets CLI 解析该单元格会直接崩溃，所以发布记录的替代物是
    // 任一 changeset 正文明确提及该包名。
    const referenced = changesetRaws.some(raw => raw.includes(change.name))
    assert.ok(
      referenced,
      `pending package removal for ${change.name} requires a changeset summary mentioning it (retirement record)`
    )
    continue
  }
  const decision = changesetDecisions.get(change.name)
  assert.ok(decision, `pending contract change for ${change.name} requires a changeset recording its semver decision`)
  if (change.semverReview.breakingCandidates.length > 0) {
    assert.ok(
      ['major', 'minor'].includes(decision.bump),
      `${change.name} has breaking candidates (${change.semverReview.breakingCandidates.join('; ')}); aggregated changeset bump must be major or minor, got ${decision.bump} (sources: ${decision.sources.join(', ')})`
    )
  }
  assert.ok(
    decision.documented,
    `${change.name} changesets (${decision.sources.join(', ')}) must document the semver rationale (release note)`
  )
}
assert.equal(
  noContractDiff.requiresSemverReview,
  noContractDiff.changes.some(change => change.semverReview.breakingCandidates.length > 0)
)

// 锁定 removedExports 报告：仅删除 export 的包不能被 contract-diff 的变更过滤吞掉。
// 用临时 index 在 HEAD 树上给 js-kit 注入一个后续被删除的 export，write-tree 得到
// 前置 tree；临时 blob 是悬空对象，不产生 commit、ref 或工作区变更。
const tempIndex = path.join(os.tmpdir(), `greypan-contract-diff-${process.pid}`)
const gitEnv = { ...process.env, GIT_INDEX_FILE: tempIndex }
try {
  execFileSync('git', ['read-tree', 'HEAD'], { env: gitEnv })
  const manifestPath = 'packages/js-kit/package.json'
  const manifest = JSON.parse(execFileSync('git', ['show', `HEAD:${manifestPath}`], { encoding: 'utf8' }))
  manifest.exports['./removed-lock-fixture'] = { types: './dist/legacy.d.ts', import: './dist/legacy.js' }
  const blob = execFileSync('git', ['hash-object', '-w', '--stdin'], {
    input: JSON.stringify(manifest, null, 2),
    env: gitEnv,
    encoding: 'utf8'
  }).trim()
  execFileSync('git', ['update-index', '--cacheinfo', `100644,${blob},${manifestPath}`], { env: gitEnv })
  const previousTree = execFileSync('git', ['write-tree'], { env: gitEnv, encoding: 'utf8' }).trim()

  const removalDiff = JSON.parse(run('contract-diff', '--json', '--base', previousTree))
  const jsKitChange = removalDiff.changes.find(change => change.name === '@greypan/js-kit')
  assert.ok(jsKitChange, 'a package whose only manifest change is export removal must appear in contract-diff changes')
  assert.ok(
    jsKitChange.removedExports.includes('./removed-lock-fixture'),
    'removed export must be listed in removedExports'
  )
  assert.ok(
    jsKitChange.semverReview.breakingCandidates.includes('export removed: ./removed-lock-fixture'),
    'removed export must be reported as a breaking candidate'
  )
  assert.equal(removalDiff.requiresSemverReview, true)
} finally {
  fs.rmSync(tempIndex, { force: true })
}

// 参数校验：未知子命令、缺少 --base、互斥 flag、contract 多余路径。
assert.throws(() => runFailure('verify', 'packages/web-ui/src/components/select/index.ts'))
assert.throws(() => runFailure('contract-diff', '--json'))
assert.throws(() => runFailure('contract-diff', '--base', 'HEAD', '--staged'))
assert.throws(() => runFailure('contract', '--json', '--base', 'HEAD', '@greypan/web-ui'))
assert.throws(() => runFailure('contract', '@greypan/web-ui', 'extra-path'))

console.log('contract-query tests passed')
