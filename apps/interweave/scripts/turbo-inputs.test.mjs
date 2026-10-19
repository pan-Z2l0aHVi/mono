import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

// Run Turbo against an isolated workspace copy so input-hash behavior is tested without editing the real app
// or consulting its local/remote cache. The fixture includes the real task configuration and only the files
// needed to prove the Go/generator/toolchain inputs.
const repoRoot = path.resolve(import.meta.dirname, '../../..')
const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'interweave-turbo-inputs-'))
const turboCli = path.join(repoRoot, 'node_modules/turbo/bin/turbo')
const frontendDirectory = 'apps/interweave/frontend'
const goDirectory = 'apps/interweave'
const write = (relativePath, contents) => {
  const absolutePath = path.join(fixtureRoot, relativePath)
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true })
  fs.writeFileSync(absolutePath, contents)
}

try {
  write('package.json', JSON.stringify({ name: 'turbo-fixture', private: true, packageManager: 'pnpm@12.4.0' }))
  write('pnpm-workspace.yaml', `packages:\n  - ${frontendDirectory}\n`)
  write(
    'pnpm-lock.yaml',
    `lockfileVersion: '9.0'\nsettings:\n  autoInstallPeers: true\n  excludeLinksFromLockfile: false\nimporters:\n  .: {}\n  ${frontendDirectory}: {}\n`
  )
  fs.copyFileSync(path.join(repoRoot, 'turbo.json'), path.join(fixtureRoot, 'turbo.json'))
  fs.copyFileSync(path.join(repoRoot, '.mise.toml'), path.join(fixtureRoot, '.mise.toml'))
  write(
    `${frontendDirectory}/package.json`,
    JSON.stringify({
      name: '@greypan/interweave-frontend',
      private: true,
      scripts: { build: 'echo build', test: 'echo test' }
    })
  )
  fs.copyFileSync(
    path.join(repoRoot, `${frontendDirectory}/turbo.json`),
    path.join(fixtureRoot, `${frontendDirectory}/turbo.json`)
  )
  write(`${frontendDirectory}/src/main.ts`, 'export const view = 1\n')
  write(`${frontendDirectory}/README.md`, 'frontend documentation\n')
  write(`${goDirectory}/backend/model.go`, 'package backend\n\ntype Model struct{}\n')
  write(`${goDirectory}/backend/model_test.go`, 'package backend\n\n// test input\n')
  write(`${goDirectory}/go.mod`, 'module fixture\n\ngo 1.24\n')
  write(`${goDirectory}/go.sum`, '')
  write(`${goDirectory}/scripts/generate-bindings.mjs`, 'export const bindings = 1\n')

  function taskHash(task) {
    const result = spawnSync(
      process.execPath,
      [turboCli, 'run', task, `--filter=@greypan/interweave-frontend`, '--dry=json'],
      {
        cwd: fixtureRoot,
        encoding: 'utf8',
        env: {
          ...process.env,
          TURBO_CACHE_DIR: path.join(fixtureRoot, '.turbo'),
          TURBO_TELEMETRY_DISABLED: '1'
        }
      }
    )
    assert.equal(result.status, 0, `turbo ${task} dry-run failed: ${result.stderr}`)
    const output = JSON.parse(result.stdout)
    const target = output.tasks.find(item => item.taskId === `@greypan/interweave-frontend#${task}`)
    assert.ok(target, `turbo dry-run must contain frontend ${task}`)
    return target.hash
  }

  function assertChangesBuildAndTest(relativePath, contents, label) {
    const original = fs.readFileSync(path.join(fixtureRoot, relativePath), 'utf8')
    const buildBefore = taskHash('build')
    const testBefore = taskHash('test')
    write(relativePath, contents)
    assert.notEqual(taskHash('build'), buildBefore, `${label} must invalidate frontend build`)
    assert.notEqual(taskHash('test'), testBefore, `${label} must invalidate frontend test`)
    write(relativePath, original)
  }

  assertChangesBuildAndTest(
    `${goDirectory}/backend/model.go`,
    'package backend\n\n// production change\ntype Model struct{}\n',
    'Go production source'
  )
  assertChangesBuildAndTest(
    `${goDirectory}/scripts/generate-bindings.mjs`,
    'export const bindings = 2\n',
    'bindings generator'
  )
  assertChangesBuildAndTest(
    '.mise.toml',
    `${fs.readFileSync(path.join(fixtureRoot, '.mise.toml'), 'utf8')}\n# toolchain fixture change\n`,
    'mise toolchain pin'
  )

  const buildBeforeMarkdownChange = taskHash('build')
  const testBeforeMarkdownChange = taskHash('test')
  write(`${frontendDirectory}/README.md`, 'documentation-only edit\n')
  assert.equal(taskHash('build'), buildBeforeMarkdownChange, 'Markdown must not invalidate frontend build')
  assert.equal(taskHash('test'), testBeforeMarkdownChange, 'Markdown must not invalidate frontend test')

  const buildBeforeGoTestChange = taskHash('build')
  const testBeforeGoTestChange = taskHash('test')
  write(`${goDirectory}/backend/model_test.go`, 'package backend\n\n// test-only change\n')
  assert.equal(taskHash('build'), buildBeforeGoTestChange, 'Go *_test.go files must not invalidate frontend build')
  assert.equal(taskHash('test'), testBeforeGoTestChange, 'Go *_test.go files must not invalidate frontend test')
} finally {
  fs.rmSync(fixtureRoot, { recursive: true, force: true })
}

console.log('apps/interweave/scripts/turbo-inputs.test.mjs: all assertions passed')
