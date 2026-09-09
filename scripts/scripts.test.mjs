import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const run = (...args) => execFileSync(process.execPath, ['scripts/repo-query.mjs', ...args], { encoding: 'utf8' })
const runFailure = (...args) =>
  execFileSync(process.execPath, ['scripts/repo-query.mjs', ...args], { encoding: 'utf8', stdio: 'pipe' })
const runContractCheck = root =>
  execFileSync(process.execPath, ['scripts/check-pack.mjs', ...(root ? ['--root', root] : [])], {
    encoding: 'utf8'
  })
const checkContractFailure = root =>
  execFileSync(process.execPath, ['scripts/check-pack.mjs', '--quiet', '--root', root], {
    encoding: 'utf8',
    stdio: 'pipe'
  })
const runContextCheck = () => execFileSync(process.execPath, ['scripts/validate-context.mjs'], { encoding: 'utf8' })

const webUiContract = JSON.parse(run('contract', '--json', '@greypan/web-ui'))
assert.equal(webUiContract.package.root, 'packages/web-ui')
assert.ok(webUiContract.directConsumers.includes('@greypan/react-web-ui-demo'))
assert.ok(webUiContract.directConsumers.includes('@greypan/vue-web-ui-demo'))
assert.ok(Object.hasOwn(webUiContract.package.exports, './components/*'))
assert.ok(webUiContract.readFirst.includes('packages/web-ui/README.md'))
assert.ok(webUiContract.verification.includes('pnpm run check:pack'))
assert.throws(() => runFailure('contract', '--json', '@greypan/react-web-ui-demo'))

const noContractDiff = JSON.parse(run('contract-diff', '--json', '--base', 'HEAD'))
// contract-diff 只暴露 manifest 级候选；semver 决策记录在 .changeset/。
// 待定契约变更必须携带 changeset 决策（含 breaking 候选时 bump 须为 major/minor，正文须写明理由）；
// 变更提交后 diff 归零，本段自然跳过，因此不做「diff 必为空」的临时断言。
const readChangesetDecisions = () => {
  const decisions = new Map()
  const bumpRank = { patch: 1, minor: 2, major: 3 }
  const dir = path.join(process.cwd(), '.changeset')
  if (!fs.existsSync(dir)) return decisions
  for (const file of fs.readdirSync(dir).filter(name => name.endsWith('.md'))) {
    const match = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(fs.readFileSync(path.join(dir, file), 'utf8'))
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
  return decisions
}
const changesetDecisions = readChangesetDecisions()
for (const change of noContractDiff.changes) {
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
assert.throws(() => runFailure('impact', '--json', 'packages/web-ui/src/components/select/index.ts'))
assert.throws(() => runFailure('route', '--json', 'packages/web-ui/src/components/select/index.ts'))

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
assert.ok(webUiPlan.verification.some(item => item.command === 'pnpm run check:pack'))
assert.ok(webUiPlan.verification.some(item => item.command === 'chrome-devtools MCP 真实浏览器验证'))
assert.match(run('verify', 'packages/web-ui/src/components/select/index.ts'), /evidence:/)

const contextPlan = JSON.parse(run('verify', '--json', 'docs/agents/context.md'))
assert.equal(contextPlan.risk.context, true)
assert.ok(contextPlan.context.includes('docs/adr/0012-progressive-agent-context-architecture.md'))
assert.ok(contextPlan.verification.some(item => item.command === 'pnpm run validate:context'))

const geminiContextPlan = JSON.parse(run('verify', '--json', 'GEMINI.md'))
assert.equal(geminiContextPlan.risk.context, true)
assert.ok(geminiContextPlan.verification.some(item => item.command === 'pnpm run validate:context'))

const typePlan = JSON.parse(run('verify', '--json', 'packages/web-ui/src/types/react.ts'))
assert.equal(typePlan.command, 'verify')
assert.ok(typePlan.requiredEvidence.some(item => item.kind === 'consumer'))
assert.equal(
  typePlan.requiredEvidence.some(item => item.kind === 'runtime'),
  false
)

const toolPlan = JSON.parse(run('verify', '--json', 'scripts/repo-query.mjs'))
assert.ok(toolPlan.verification.some(item => item.command === 'pnpm run test:scripts'))

const workspaceConfigPlan = JSON.parse(run('verify', '--json', 'pnpm-workspace.yaml'))
assert.ok(workspaceConfigPlan.verification.some(item => item.command === 'pnpm run test:scripts'))

const workspaceManifestToolPlan = JSON.parse(run('verify', '--json', 'scripts/workspace-manifests.mjs'))
assert.ok(workspaceManifestToolPlan.verification.some(item => item.command === 'pnpm run test:scripts'))

const tsconfigPlan = JSON.parse(run('verify', '--json', 'packages/tsconfig/base.json'))
assert.equal(tsconfigPlan.directWorkspaces[0], '@greypan/tsconfig')
assert.equal(
  tsconfigPlan.verification.some(item => item.command === 'pnpm --filter @greypan/tsconfig test'),
  false
)

const reactDemoPlan = JSON.parse(run('verify', '--json', 'apps/react-web-ui-demo/src/main.tsx'))
assert.ok(reactDemoPlan.context.includes('.agents/rules/react.md'))
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

const interweaveApiPlan = JSON.parse(run('verify', '--json', 'apps/interweave/index.go'))
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

assert.match(runContextCheck(), /validate-context passed/)

assert.match(runContractCheck(), /check-pack passed/)

const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'greypan-contract-'))
fs.writeFileSync(path.join(fixtureRoot, 'pnpm-workspace.yaml'), "packages:\n  - 'packages/*'\n")
const fixturePackageRoot = path.join(fixtureRoot, 'packages', 'fixture')
fs.mkdirSync(path.join(fixturePackageRoot, 'dist'), { recursive: true })
fs.writeFileSync(path.join(fixturePackageRoot, 'README.md'), '# fixture\n')
fs.writeFileSync(path.join(fixturePackageRoot, 'dist', 'index.js'), 'export {}\n')
fs.writeFileSync(path.join(fixturePackageRoot, 'dist', 'index.d.ts'), 'export {}\n')
fs.writeFileSync(
  path.join(fixturePackageRoot, 'package.json'),
  JSON.stringify({
    name: '@greypan/fixture',
    version: '0.0.0',
    files: ['dist'],
    exports: { '.': { import: './dist/index.js', types: './dist/index.d.ts' } }
  })
)
assert.match(runContractCheck(fixtureRoot), /check-pack passed/)
fs.writeFileSync(
  path.join(fixturePackageRoot, 'package.json'),
  JSON.stringify({
    name: '@greypan/fixture',
    version: '0.0.0',
    files: ['README.md'],
    exports: { '.': { import: './dist/index.js', types: './dist/index.d.ts' } }
  })
)
assert.throws(() => checkContractFailure(fixtureRoot))
fs.writeFileSync(
  path.join(fixturePackageRoot, 'package.json'),
  JSON.stringify({
    name: '@greypan/fixture',
    version: '0.0.0',
    files: ['dist'],
    sideEffects: ['./dist/missing.js'],
    exports: { '.': { import: './dist/index.js', types: './dist/index.d.ts' } }
  })
)
assert.throws(() => checkContractFailure(fixtureRoot))
fs.writeFileSync(
  path.join(fixturePackageRoot, 'package.json'),
  JSON.stringify({
    name: '@greypan/fixture',
    version: '0.0.0',
    files: ['dist'],
    exports: { '.': { import: './dist/index.js', types: './dist/index.d.ts' } }
  })
)
fs.rmSync(path.join(fixturePackageRoot, 'dist', 'index.js'))
assert.throws(() => checkContractFailure(fixtureRoot))
fs.writeFileSync(
  path.join(fixturePackageRoot, 'package.json'),
  JSON.stringify({
    name: '@greypan/fixture',
    exports: { '.': { import: './dist/index.js', types: './dist/index.d.ts' } }
  })
)
assert.throws(() => checkContractFailure(fixtureRoot))
fs.rmSync(fixtureRoot, { recursive: true, force: true })

console.log('scripts tests passed')
