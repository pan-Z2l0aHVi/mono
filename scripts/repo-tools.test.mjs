import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const run = (...args) => execFileSync(process.execPath, ['scripts/repo-context.mjs', ...args], { encoding: 'utf8' })
const runContractCheck = root =>
  execFileSync(process.execPath, ['scripts/package-contract-check.mjs', ...(root ? ['--root', root] : [])], {
    encoding: 'utf8'
  })
const checkContractFailure = root =>
  execFileSync(process.execPath, ['scripts/package-contract-check.mjs', '--quiet', '--root', root], {
    encoding: 'utf8',
    stdio: 'pipe'
  })

const webUiImpact = JSON.parse(run('impact', '--json', 'packages/web-ui/src/components/select/index.ts'))
assert.deepEqual(webUiImpact.directWorkspaces, ['@greypan/web-ui'])
assert.deepEqual(webUiImpact.affectedWorkspaces, [
  '@greypan/react-web-ui-demo',
  '@greypan/vue-web-ui-demo',
  '@greypan/web-ui'
])
assert.equal(webUiImpact.risk.publicPackageContract, true)
assert.equal(webUiImpact.risk.buildArtifact, true)
assert.equal(webUiImpact.risk.browserRuntime, true)
assert.equal(webUiImpact.affectedWorkspaces.includes('@greypan/weave'), false)
assert.ok(webUiImpact.verification.some(item => item.command === 'pnpm run check:contracts'))
assert.ok(webUiImpact.verification.some(item => item.command === 'React/Vue demo 真实浏览器验证'))

const contextImpact = JSON.parse(run('verify', '--json', 'docs/agents/context.md'))
assert.equal(contextImpact.risk.context, true)
assert.equal(contextImpact.affectedWorkspaces.includes('@greypan/weave'), false)
assert.ok(contextImpact.verification.some(item => item.command === 'pnpm run check:context'))

const tsconfigImpact = JSON.parse(run('impact', '--json', 'packages/tsconfig/base.json'))
assert.equal(tsconfigImpact.directWorkspaces[0], '@greypan/tsconfig')
assert.equal(
  tsconfigImpact.verification.some(item => item.command === 'pnpm --filter @greypan/tsconfig test'),
  false
)

const reactDemoImpact = JSON.parse(run('verify', '--json', 'apps/react-web-ui-demo/src/main.tsx'))
assert.ok(reactDemoImpact.verification.some(item => item.command === 'pnpm --filter @greypan/react-web-ui-demo build'))
assert.ok(reactDemoImpact.verification.some(item => item.command === 'React/Vue demo 真实浏览器验证'))

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
    files: ['dist'],
    exports: { '.': { import: './dist/index.js', types: './dist/index.d.ts' } }
  })
)
assert.match(runContractCheck(fixtureRoot), /package-contract-check passed/)
fs.writeFileSync(
  path.join(fixturePackageRoot, 'package.json'),
  JSON.stringify({
    name: '@greypan/fixture',
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
    files: ['dist'],
    exports: { '.': { import: './dist/index.js', types: './dist/index.d.ts' } }
  })
)
fs.rmSync(path.join(fixturePackageRoot, 'dist', 'index.js'))
assert.throws(() => checkContractFailure(fixtureRoot))
fs.rmSync(fixtureRoot, { recursive: true, force: true })

console.log('repo-tools tests passed')
