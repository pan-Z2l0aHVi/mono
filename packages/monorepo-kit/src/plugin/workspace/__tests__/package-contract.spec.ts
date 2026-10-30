import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterAll, it } from 'vite-plus/test'

import { definePackageContract } from '../package-contract'

const packageContract = definePackageContract()

const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'greypan-contract-'))

async function detail(result: Promise<string | void>): Promise<string> {
  const value = await result
  assert.ok(value, 'package-contract returned no detail')
  return value
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
  assert.match(await detail(packageContract.run({ root: fixtureRoot })), /published package exports/)

  const privatePackageRoot = path.join(fixtureRoot, 'packages', 'private-fixture')
  fs.mkdirSync(privatePackageRoot, { recursive: true })
  fs.writeFileSync(
    path.join(privatePackageRoot, 'package.json'),
    JSON.stringify({ name: '@greypan/private-fixture', version: '9.9.9', private: true })
  )
  await packageContract.run({ root: fixtureRoot })

  fs.writeFileSync(
    path.join(fixturePackageRoot, 'package.json'),
    JSON.stringify({
      name: '@greypan/fixture',
      version: '0.0.0',
      files: ['README.md'],
      exports: { '.': { import: './dist/index.js', types: './dist/index.d.ts' } }
    })
  )
  await assert.rejects(packageContract.run({ root: fixtureRoot }), /packed artifact/)

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
  await assert.rejects(packageContract.run({ root: fixtureRoot }), /sideEffects pattern has no matching/)

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
  await assert.rejects(packageContract.run({ root: fixtureRoot }), /missing from the packed artifact/)

  fs.writeFileSync(
    path.join(fixturePackageRoot, 'package.json'),
    JSON.stringify({ name: '@greypan/fixture', exports: { '.': { import: './dist/index.js' } } })
  )
  await assert.rejects(packageContract.run({ root: fixtureRoot }), /non-empty files allowlist/)

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
  await packageContract.run({ root: fixtureRoot })
})

afterAll(() => {
  fs.rmSync(fixtureRoot, { recursive: true, force: true })
})
