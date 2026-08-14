import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const run = (...args) => execFileSync(process.execPath, ['scripts/repo-context.mjs', ...args], { encoding: 'utf8' })
const runFailure = (...args) =>
  execFileSync(process.execPath, ['scripts/repo-context.mjs', ...args], { encoding: 'utf8', stdio: 'pipe' })
const runContractCheck = root =>
  execFileSync(process.execPath, ['scripts/package-contract-check.mjs', ...(root ? ['--root', root] : [])], {
    encoding: 'utf8'
  })
const checkContractFailure = root =>
  execFileSync(process.execPath, ['scripts/package-contract-check.mjs', '--quiet', '--root', root], {
    encoding: 'utf8',
    stdio: 'pipe'
  })

const webUiContract = JSON.parse(run('contract', '--json', '@greypan/web-ui'))
assert.equal(webUiContract.package.root, 'packages/web-ui')
assert.ok(webUiContract.directConsumers.includes('@greypan/react-web-ui-demo'))
assert.ok(webUiContract.directConsumers.includes('@greypan/vue-web-ui-demo'))
assert.ok(Object.hasOwn(webUiContract.package.exports, './components/*'))
assert.ok(webUiContract.readFirst.includes('packages/web-ui/README.md'))
assert.ok(webUiContract.verification.includes('pnpm run check:contracts'))
assert.throws(() => runFailure('contract', '--json', '@greypan/react-web-ui-demo'))

const noContractDiff = JSON.parse(run('contract-diff', '--json', '--base', 'HEAD'))
assert.deepEqual(noContractDiff.changes, [])
assert.equal(noContractDiff.requiresSemverReview, false)

const webUiImpact = JSON.parse(run('impact', '--json', 'packages/web-ui/src/components/select/index.ts'))
assert.deepEqual(webUiImpact.directWorkspaces, ['@greypan/web-ui'])
assert.ok(webUiImpact.affectedWorkspaces.includes('@greypan/web-ui'))
assert.ok(webUiImpact.affectedWorkspaces.includes('@greypan/react-web-ui-demo'))
assert.ok(webUiImpact.affectedWorkspaces.includes('@greypan/vue-web-ui-demo'))
assert.equal(webUiImpact.risk.publicPackageContract, true)
assert.equal(webUiImpact.risk.buildArtifact, true)
assert.equal(webUiImpact.risk.browserRuntime, true)
assert.ok(webUiImpact.context.includes('AGENTS.md'))
assert.ok(webUiImpact.context.includes('packages/web-ui/AGENTS.md'))
assert.ok(webUiImpact.context.includes('docs/agents/web-ui.md'))
assert.deepEqual(webUiImpact.focusedTests['@greypan/web-ui'], ['src/components/select/__tests__'])
assert.ok(
  webUiImpact.verification.some(
    item => item.command === 'pnpm --filter @greypan/web-ui test src/components/select/__tests__'
  )
)
assert.ok(webUiImpact.verification.some(item => item.command === 'pnpm run check:contracts'))
assert.ok(webUiImpact.verification.some(item => item.command === 'React/Vue demo 真实浏览器验证'))

const contextImpact = JSON.parse(run('verify', '--json', 'docs/agents/context.md'))
assert.equal(contextImpact.risk.context, true)
assert.ok(contextImpact.context.includes('docs/adr/0012-progressive-agent-context-architecture.md'))
assert.ok(contextImpact.verification.some(item => item.command === 'pnpm run check:context'))

const routeImpact = JSON.parse(run('route', '--json', 'packages/web-ui/src/types/react.ts'))
assert.equal(routeImpact.command, 'route')
assert.ok(routeImpact.requiredEvidence.some(item => item.kind === 'consumer'))
assert.ok(routeImpact.requiredEvidence.some(item => item.kind === 'runtime'))

const toolImpact = JSON.parse(run('verify', '--json', 'scripts/repo-context.mjs'))
assert.ok(toolImpact.verification.some(item => item.command === 'pnpm run test:repo-tools'))

const workspaceConfigImpact = JSON.parse(run('verify', '--json', 'pnpm-workspace.yaml'))
assert.ok(workspaceConfigImpact.verification.some(item => item.command === 'pnpm run test:repo-tools'))

const workspaceManifestToolImpact = JSON.parse(run('verify', '--json', 'scripts/workspace-manifests.mjs'))
assert.ok(workspaceManifestToolImpact.verification.some(item => item.command === 'pnpm run test:repo-tools'))

const tsconfigImpact = JSON.parse(run('impact', '--json', 'packages/tsconfig/base.json'))
assert.equal(tsconfigImpact.directWorkspaces[0], '@greypan/tsconfig')
assert.equal(
  tsconfigImpact.verification.some(item => item.command === 'pnpm --filter @greypan/tsconfig test'),
  false
)

const reactDemoImpact = JSON.parse(run('verify', '--json', 'apps/react-web-ui-demo/src/main.tsx'))
assert.ok(reactDemoImpact.context.includes('.agents/rules/react.md'))
assert.ok(reactDemoImpact.verification.some(item => item.command === 'pnpm --filter @greypan/react-web-ui-demo build'))
assert.ok(reactDemoImpact.verification.some(item => item.command === 'React/Vue demo 真实浏览器验证'))

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
const nestedAppImpact = JSON.parse(run('impact', '--json', nestedAppManifest))
assert.deepEqual(nestedAppImpact.directWorkspaces, [nestedApp.name])
assert.ok(nestedAppImpact.affectedWorkspaces.includes(nestedApp.name))

const gitImpact = JSON.parse(run('impact', '--json', '--base', 'HEAD'))
assert.deepEqual(gitImpact.changedPaths, [])

const worktreeImpact = JSON.parse(run('impact', '--json', '--worktree'))
assert.ok(worktreeImpact.changedPaths.includes('scripts/repo-context.mjs'))
assert.ok(worktreeImpact.verification.some(item => item.command === 'pnpm run test:repo-tools'))

assert.match(runContractCheck(), /package-contract-check passed/)

const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'greypan-contract-'))
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
assert.match(runContractCheck(fixtureRoot), /package-contract-check passed/)
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

console.log('repo-tools tests passed')
