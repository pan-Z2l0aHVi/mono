import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

// 被测脚本是 monorepo-change-impact skill 的内置查询脚本（self-contained）；测试与它同住 skill
// 目录，skill 因此连测试一起自包含。执行端是根 `test-scripts` 的全仓 glob（`*.test.mjs`，
// tracked-only）：`.test.mjs` 的契约是「测脚本本身」，与所在目录无关。两条命令都从仓库根跑。
const script = 'skills/monorepo-change-impact/repo-query.mjs'
const run = (...args) => execFileSync(process.execPath, [script, ...args], { encoding: 'utf8' })
const runFailure = (...args) => execFileSync(process.execPath, [script, ...args], { encoding: 'utf8', stdio: 'pipe' })

// --- contract：当前 manifest 契约 ---

const webUiContract = JSON.parse(run('contract', '--json', '@greypan/web-ui'))
assert.equal(webUiContract.package.root, 'packages/web-ui')
assert.ok(webUiContract.directConsumers.includes('@greypan/react-web-ui-demo'))
assert.ok(webUiContract.directConsumers.includes('@greypan/vue-web-ui-demo'))
assert.ok(Object.hasOwn(webUiContract.package.exports, './components/*'))
assert.ok(webUiContract.readFirst.includes('packages/web-ui/README.md'))
assert.ok(webUiContract.verification.includes('pnpm run check-pack'))
assert.throws(() => runFailure('contract', '--json', '@greypan/react-web-ui-demo'))
assert.throws(() => runFailure('contract', '--json', '@greypan/unknown-workspace'))

// --- contract-diff：manifest-level semver 候选 ---

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
// 前置 tree；新建的 blob/tree 写进临时 object 目录，真实 .git 不新增悬空对象。
const tempIndex = path.join(os.tmpdir(), `greypan-contract-diff-${process.pid}`)
const objectsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'greypan-contract-diff-objects-'))
const repoObjects = execFileSync('git', ['rev-parse', '--path-format=absolute', '--git-path', 'objects'], {
  encoding: 'utf8'
}).trim()
const previousObjectDirectory = process.env.GIT_OBJECT_DIRECTORY
const previousAlternateObjects = process.env.GIT_ALTERNATE_OBJECT_DIRECTORIES
process.env.GIT_OBJECT_DIRECTORY = objectsDir
process.env.GIT_ALTERNATE_OBJECT_DIRECTORIES = [repoObjects, previousAlternateObjects].filter(Boolean).join(':')
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
  if (previousObjectDirectory === undefined) delete process.env.GIT_OBJECT_DIRECTORY
  else process.env.GIT_OBJECT_DIRECTORY = previousObjectDirectory
  if (previousAlternateObjects === undefined) delete process.env.GIT_ALTERNATE_OBJECT_DIRECTORIES
  else process.env.GIT_ALTERNATE_OBJECT_DIRECTORIES = previousAlternateObjects
  fs.rmSync(tempIndex, { force: true })
  fs.rmSync(objectsDir, { recursive: true, force: true })
}

// 参数校验：未知子命令、缺少 --base、互斥 flag、contract 多余路径与多余 flag。
assert.throws(() => runFailure('impact', '--json', 'packages/web-ui/src/components/select/index.ts'))
assert.throws(() => runFailure('route', '--json', 'packages/web-ui/src/components/select/index.ts'))
assert.throws(() => runFailure('contract-diff', '--json'))
assert.throws(() => runFailure('contract-diff', '--base', 'HEAD', '--staged'))
assert.throws(() => runFailure('contract', '--json', '--base', 'HEAD', '@greypan/web-ui'))
assert.throws(() => runFailure('contract', '@greypan/web-ui', 'extra-path'))

// 默认文本报告与 --json 暴露同一份契约：SKILL.md 要求用 contract 报告确认 exports、
// peerDependencies、sideEffects、直接消费者与最小验证，缺字段就等于报告口径不完整。
const webUiContractText = run('contract', '@greypan/web-ui')
const peerDependenciesBlock = webUiContractText.split('peerDependencies:\n')[1]?.split('sideEffects: ')[0]
assert.ok(peerDependenciesBlock, 'text contract report must print peerDependencies')
assert.deepEqual(JSON.parse(peerDependenciesBlock), webUiContract.package.peerDependencies)
const sideEffectsLine = webUiContractText.match(/^sideEffects: (.+)$/m)
assert.ok(sideEffectsLine, 'text contract report must print sideEffects')
assert.deepEqual(JSON.parse(sideEffectsLine[1]), webUiContract.package.sideEffects)

// --- verify：影响面与最小充分验证 ---

const webUiPlan = JSON.parse(run('verify', '--json', 'packages/web-ui/src/components/select/index.ts'))
assert.deepEqual(webUiPlan.directWorkspaces, ['@greypan/web-ui'])
assert.ok(webUiPlan.affectedWorkspaces.includes('@greypan/web-ui'))
assert.ok(webUiPlan.affectedWorkspaces.includes('@greypan/react-web-ui-demo'))
assert.ok(webUiPlan.affectedWorkspaces.includes('@greypan/vue-web-ui-demo'))
assert.equal(webUiPlan.risk.publicPackageContract, true)
assert.equal(webUiPlan.risk.buildArtifact, true)
assert.equal(webUiPlan.risk.browserRuntime, true)
assert.ok(
  webUiPlan.dependencyEdges.some(
    edge => edge.from === '@greypan/react-web-ui-demo' && edge.to === '@greypan/web-ui' && edge.type === 'runtime'
  )
)
assert.ok(
  webUiPlan.dependencyEdges.some(
    edge => edge.from === '@greypan/web-ui' && edge.to === '@greypan/tsconfig' && edge.type === 'development'
  )
)
assert.ok(webUiPlan.context.includes('AGENTS.md'))
assert.ok(webUiPlan.context.includes('packages/web-ui/AGENTS.md'))
assert.ok(webUiPlan.context.includes('docs/agents/web-ui.md'))
assert.deepEqual(webUiPlan.focusedTests['@greypan/web-ui'], ['src/components/select/__tests__'])
assert.ok(
  webUiPlan.verification.some(
    item => item.command === 'pnpm --filter @greypan/web-ui test src/components/select/__tests__'
  )
)
assert.ok(webUiPlan.verification.some(item => item.command === 'pnpm run check-pack'))
assert.ok(webUiPlan.verification.some(item => item.command === 'chrome-devtools MCP 真实浏览器验证'))
assert.match(run('verify', 'packages/web-ui/src/components/select/index.ts'), /evidence:/)

const contextPlan = JSON.parse(run('verify', '--json', 'docs/agents/agent-context.md'))
assert.equal(contextPlan.risk.context, true)
assert.ok(contextPlan.context.includes('docs/adr/0004-progressive-agent-context-architecture.md'))
assert.ok(contextPlan.verification.some(item => item.command === 'pnpm run check-context'))

const typePlan = JSON.parse(run('verify', '--json', 'packages/web-ui/src/types/react.ts'))
assert.equal(typePlan.command, 'verify')
assert.ok(typePlan.requiredEvidence.some(item => item.kind === 'consumer'))
assert.equal(
  typePlan.requiredEvidence.some(item => item.kind === 'runtime'),
  false
)

const toolPlan = JSON.parse(run('verify', '--json', script))
assert.ok(toolPlan.verification.some(item => item.command === 'pnpm run test-scripts'))

const taskLedgerPlan = JSON.parse(run('verify', '--json', 'skills/task-ledger/ledger.mjs'))
assert.ok(taskLedgerPlan.context.includes('docs/agents/agent-context.md'))
assert.ok(taskLedgerPlan.verification.some(item => item.command === 'pnpm run test-scripts'))

// 仓自撰 skill 的 context 风险判定必须覆盖全部 skill 目录；test-authoring 曾因漏登记而只得到
// check-code 建议，context 与配套工具测试都不跑。
const testAuthoringPlan = JSON.parse(run('verify', '--json', 'skills/test-authoring/SKILL.md'))
assert.equal(testAuthoringPlan.risk.context, true)
assert.ok(testAuthoringPlan.context.includes('docs/agents/agent-context.md'))
assert.ok(testAuthoringPlan.verification.some(item => item.command === 'pnpm run check-context'))
assert.ok(testAuthoringPlan.verification.some(item => item.command === 'pnpm run test-scripts'))

// 修改测试运行器本身必须触发 test-scripts；否则改坏「哪些测试会被跑」不会有任何自检。
for (const runnerPath of ['scripts/checks/test-scripts.mjs', 'packages/monorepo-kit/src/checks/script-tests.ts']) {
  const runnerPlan = JSON.parse(run('verify', '--json', runnerPath))
  assert.ok(
    runnerPlan.verification.some(item => item.command === 'pnpm run test-scripts'),
    `${runnerPath} must require pnpm run test-scripts`
  )
}

const workspaceConfigPlan = JSON.parse(run('verify', '--json', 'pnpm-workspace.yaml'))
assert.ok(workspaceConfigPlan.verification.some(item => item.command === 'pnpm run test-scripts'))

const workspaceManifestToolPlan = JSON.parse(run('verify', '--json', 'packages/monorepo-kit/src/plugins/workspace.ts'))
assert.ok(workspaceManifestToolPlan.verification.some(item => item.command === 'pnpm run test-scripts'))

const tsconfigPlan = JSON.parse(run('verify', '--json', 'packages/tsconfig/base.json'))
assert.equal(tsconfigPlan.directWorkspaces[0], '@greypan/tsconfig')
assert.equal(
  tsconfigPlan.verification.some(item => item.command === 'pnpm --filter @greypan/tsconfig test'),
  false
)

const reactDemoPlan = JSON.parse(run('verify', '--json', 'apps/react-web-ui-demo/src/main.tsx'))
assert.ok(reactDemoPlan.context.includes('apps/react-web-ui-demo/AGENTS.md'))
assert.ok(reactDemoPlan.verification.some(item => item.command === 'pnpm --filter @greypan/react-web-ui-demo build'))
assert.ok(reactDemoPlan.verification.some(item => item.command === 'pnpm run test'))
assert.ok(reactDemoPlan.verification.some(item => item.command === 'chrome-devtools MCP 真实浏览器验证'))

const reactRoutePlan = JSON.parse(run('verify', '--json', 'apps/react-web-ui-demo/src/routes/about.tsx'))
assert.ok(reactRoutePlan.context.includes('docs/agents/build.md'))
assert.ok(
  reactRoutePlan.requiredEvidence.some(item => item.kind === 'generator' && item.location.includes('routeTree.gen.ts'))
)
assert.ok(
  reactRoutePlan.verification.some(
    item =>
      item.level === 'required' &&
      item.command === 'pnpm --filter @greypan/react-web-ui-demo build' &&
      item.reason.includes('禁止手动编辑')
  )
)

const interweaveApiPlan = JSON.parse(run('verify', '--json', 'apps/interweave/main.go'))
assert.ok(interweaveApiPlan.context.includes('docs/agents/build.md'))
assert.ok(
  interweaveApiPlan.requiredEvidence.some(
    item => item.kind === 'generator' && item.location.includes('frontend/bindings')
  )
)
assert.ok(
  interweaveApiPlan.verification.some(
    item => item.level === 'required' && item.command === 'pnpm --filter @greypan/interweave-frontend build'
  )
)

const interweaveServicePlan = JSON.parse(
  run('verify', '--json', 'apps/interweave/backend/library/service/resource_service.go')
)
assert.ok(
  interweaveServicePlan.verification.some(
    item => item.level === 'required' && item.command === 'pnpm --filter @greypan/interweave-frontend build'
  )
)

const interweaveTestPlan = JSON.parse(
  run('verify', '--json', 'apps/interweave/backend/library/service/services_test.go')
)
assert.equal(
  interweaveTestPlan.requiredEvidence.some(item => item.kind === 'generator'),
  false,
  'Go test files do not change the public API surface'
)

// --- verify：删除与重命名的旧路径必须进入影响面 ---
const verifyTempIndex = path.join(os.tmpdir(), `greypan-verify-diff-${process.pid}`)
const previousGitIndex = process.env.GIT_INDEX_FILE
try {
  execFileSync('git', ['read-tree', 'HEAD'], {
    env: { ...process.env, GIT_INDEX_FILE: verifyTempIndex }
  })
  execFileSync('git', ['update-index', '--force-remove', 'docs/agents/verification.md'], {
    env: { ...process.env, GIT_INDEX_FILE: verifyTempIndex }
  })
  process.env.GIT_INDEX_FILE = verifyTempIndex
  const deletionPlan = JSON.parse(run('verify', '--json', '--staged'))
  assert.ok(
    deletionPlan.changedPaths.includes('docs/agents/verification.md'),
    'deleted paths must be part of the changed set'
  )
  assert.equal(deletionPlan.risk.context, true)

  // 重命名以 D + A 两条路径呈现，旧 import/export 路径也要进入影响面。
  execFileSync('git', ['read-tree', 'HEAD'], {
    env: { ...process.env, GIT_INDEX_FILE: verifyTempIndex }
  })
  // 直接复用 HEAD 中已有的 blob，避免测试向真实仓库写入悬空对象。
  const blobHash = execFileSync('git', ['rev-parse', 'HEAD:packages/js-kit/src/index.ts'], {
    encoding: 'utf8'
  }).trim()
  execFileSync('git', ['update-index', '--force-remove', 'packages/js-kit/src/index.ts'], {
    env: { ...process.env, GIT_INDEX_FILE: verifyTempIndex }
  })
  execFileSync(
    'git',
    ['update-index', '--add', '--cacheinfo', `100644,${blobHash},packages/js-kit/src/renamed.ts`],
    { env: { ...process.env, GIT_INDEX_FILE: verifyTempIndex } }
  )
  const renamePlan = JSON.parse(run('verify', '--json', '--staged'))
  assert.ok(renamePlan.changedPaths.includes('packages/js-kit/src/index.ts'))
  assert.ok(renamePlan.changedPaths.includes('packages/js-kit/src/renamed.ts'))
} finally {
  if (previousGitIndex === undefined) delete process.env.GIT_INDEX_FILE
  else process.env.GIT_INDEX_FILE = previousGitIndex
  fs.rmSync(verifyTempIndex, { force: true })
}

function findNestedManifest(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name === 'node_modules') continue
    const child = path.join(directory, entry.name)
    const manifest = path.join(child, 'package.json')
    if (fs.existsSync(manifest) && child.split(path.sep).length > 2) return manifest
    const nested = findNestedManifest(child)
    if (nested) return nested
  }
}

const nestedAppManifest = findNestedManifest('apps')
assert.ok(nestedAppManifest)
const nestedApp = JSON.parse(fs.readFileSync(nestedAppManifest, 'utf8'))
const nestedAppPlan = JSON.parse(run('verify', '--json', nestedAppManifest))
assert.deepEqual(nestedAppPlan.directWorkspaces, [nestedApp.name])
assert.ok(nestedAppPlan.affectedWorkspaces.includes(nestedApp.name))

const gitPlan = JSON.parse(run('verify', '--json', '--base', 'HEAD'))
assert.deepEqual(gitPlan.changedPaths, [])

const worktreePlan = JSON.parse(run('verify', '--json', '--worktree'))
assert.ok(Array.isArray(worktreePlan.changedPaths))
assert.ok(Array.isArray(worktreePlan.verification))

console.log('repo-query tests passed')
