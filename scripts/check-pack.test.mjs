import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const runContractCheck = root =>
  execFileSync(process.execPath, ['scripts/check-pack.mjs', ...(root ? ['--root', root] : [])], {
    encoding: 'utf8'
  })
const checkContractFailure = root =>
  execFileSync(process.execPath, ['scripts/check-pack.mjs', '--quiet', '--root', root], {
    encoding: 'utf8',
    stdio: 'pipe'
  })
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

console.log('check-pack tests passed')
