import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterAll, it } from 'vite-plus/test'

import { definePackageContract } from '../package-contract'

const packageContract = definePackageContract()

const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'greypan-contract-'))

// 链里会 spawn `pnpm pack`，env 显式给出一份不依赖开发者 shell 的副本。
function run(root: string) {
  return packageContract.make({ root, env: { ...process.env } }).run()
}

async function failure(root: string): Promise<string> {
  const result = await run(root)
  if (result.ok) assert.fail('expected package-contract to fail')
  return result.error
}

it('package-contract', async () => {
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
  assert.ok((await run(fixtureRoot)).ok)

  const privatePackageRoot = path.join(fixtureRoot, 'packages', 'private-fixture')
  fs.mkdirSync(privatePackageRoot, { recursive: true })
  fs.writeFileSync(
    path.join(privatePackageRoot, 'package.json'),
    JSON.stringify({ name: '@greypan/private-fixture', version: '9.9.9', private: true })
  )
  assert.ok((await run(fixtureRoot)).ok)

  fs.writeFileSync(
    path.join(fixturePackageRoot, 'package.json'),
    JSON.stringify({
      name: '@greypan/fixture',
      version: '0.0.0',
      files: ['README.md'],
      exports: { '.': { import: './dist/index.js', types: './dist/index.d.ts' } }
    })
  )
  assert.match(await failure(fixtureRoot), /^pack:[\s\S]*packed artifact/)

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
  assert.match(await failure(fixtureRoot), /^pack:[\s\S]*sideEffects pattern has no matching/)

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
  assert.match(await failure(fixtureRoot), /^pack:[\s\S]*missing from the packed artifact/)

  fs.writeFileSync(
    path.join(fixturePackageRoot, 'package.json'),
    JSON.stringify({ name: '@greypan/fixture', exports: { '.': { import: './dist/index.js' } } })
  )
  assert.match(await failure(fixtureRoot), /^pack:[\s\S]*non-empty files allowlist/)

  // A package that was public can become private while its version changes. Private metadata must remove it from pack validation.
  fs.writeFileSync(
    path.join(fixturePackageRoot, 'package.json'),
    JSON.stringify({
      name: '@greypan/fixture',
      version: '0.1.0',
      private: true,
      files: ['missing'],
      exports: { '.': { import: './missing.js' } }
    })
  )
  assert.ok((await run(fixtureRoot)).ok)
})

afterAll(() => {
  fs.rmSync(fixtureRoot, { recursive: true, force: true })
})
