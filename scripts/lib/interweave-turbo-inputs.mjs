import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

// The frontend build restores generated bindings from the Go toolchain, so its
// cache key must include Go sources, the bindings generator and the mise pin,
// while staying independent of Markdown and Go test files. This check runs Turbo
// against an isolated workspace copy, so it neither reads nor writes the real
// app cache and only observes task hashes.
export const name = 'interweave-turbo-inputs'

const frontendDirectory = 'apps/interweave/frontend'
const goDirectory = 'apps/interweave'

function fail(message) {
  throw new Error(message)
}

function writeFixture(root, relativePath, contents) {
  const absolutePath = path.join(root, relativePath)
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true })
  fs.writeFileSync(absolutePath, contents)
}

export async function run({ root }) {
  const turboCli = path.join(root, 'node_modules/turbo/bin/turbo')
  if (!fs.existsSync(turboCli)) fail(`Turbo executable not found at ${turboCli}; install workspace dependencies first`)

  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'interweave-turbo-inputs-'))

  try {
    writeFixture(
      fixtureRoot,
      'package.json',
      JSON.stringify({ name: 'turbo-fixture', private: true, packageManager: 'pnpm@12.4.0' })
    )
    writeFixture(fixtureRoot, 'pnpm-workspace.yaml', `packages:\n  - ${frontendDirectory}\n`)
    writeFixture(
      fixtureRoot,
      'pnpm-lock.yaml',
      `lockfileVersion: '9.0'\nsettings:\n  autoInstallPeers: true\n  excludeLinksFromLockfile: false\nimporters:\n  .: {}\n  ${frontendDirectory}: {}\n`
    )
    fs.copyFileSync(path.join(root, 'turbo.json'), path.join(fixtureRoot, 'turbo.json'))
    fs.copyFileSync(path.join(root, '.mise.toml'), path.join(fixtureRoot, '.mise.toml'))
    writeFixture(
      fixtureRoot,
      `${frontendDirectory}/package.json`,
      JSON.stringify({
        name: '@greypan/interweave-frontend',
        private: true,
        scripts: { build: 'echo build', test: 'echo test' }
      })
    )
    fs.copyFileSync(
      path.join(root, `${frontendDirectory}/turbo.json`),
      path.join(fixtureRoot, `${frontendDirectory}/turbo.json`)
    )
    writeFixture(fixtureRoot, `${frontendDirectory}/src/main.ts`, 'export const view = 1\n')
    writeFixture(fixtureRoot, `${frontendDirectory}/README.md`, 'frontend documentation\n')
    writeFixture(fixtureRoot, `${goDirectory}/backend/model.go`, 'package backend\n\ntype Model struct{}\n')
    writeFixture(fixtureRoot, `${goDirectory}/backend/model_test.go`, 'package backend\n\n// test input\n')
    writeFixture(fixtureRoot, `${goDirectory}/go.mod`, 'module fixture\n\ngo 1.24\n')
    writeFixture(fixtureRoot, `${goDirectory}/go.sum`, '')
    writeFixture(fixtureRoot, `${goDirectory}/scripts/generate-bindings.mjs`, 'export const bindings = 1\n')

    function taskHash(task) {
      const result = spawnSync(
        process.execPath,
        [turboCli, 'run', task, '--filter=@greypan/interweave-frontend', '--dry=json'],
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
      if (result.status !== 0) fail(`turbo ${task} dry-run failed: ${result.stderr}`)
      const output = JSON.parse(result.stdout)
      const target = output.tasks.find(item => item.taskId === `@greypan/interweave-frontend#${task}`)
      if (!target) fail(`turbo dry-run must contain frontend ${task}`)
      return target.hash
    }

    function assertChangesBuildAndTest(relativePath, contents, label) {
      const original = fs.readFileSync(path.join(fixtureRoot, relativePath), 'utf8')
      const buildBefore = taskHash('build')
      const testBefore = taskHash('test')
      writeFixture(fixtureRoot, relativePath, contents)
      if (taskHash('build') === buildBefore) fail(`${label} must invalidate frontend build`)
      if (taskHash('test') === testBefore) fail(`${label} must invalidate frontend test`)
      writeFixture(fixtureRoot, relativePath, original)
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
    writeFixture(fixtureRoot, `${frontendDirectory}/README.md`, 'documentation-only edit\n')
    if (taskHash('build') !== buildBeforeMarkdownChange) fail('Markdown must not invalidate frontend build')
    if (taskHash('test') !== testBeforeMarkdownChange) fail('Markdown must not invalidate frontend test')

    const buildBeforeGoTestChange = taskHash('build')
    const testBeforeGoTestChange = taskHash('test')
    writeFixture(fixtureRoot, `${goDirectory}/backend/model_test.go`, 'package backend\n\n// test-only change\n')
    if (taskHash('build') !== buildBeforeGoTestChange) fail('Go *_test.go files must not invalidate frontend build')
    if (taskHash('test') !== testBeforeGoTestChange) fail('Go *_test.go files must not invalidate frontend test')

    return 'Go sources, bindings generator and mise pin invalidate the frontend hash; Markdown and Go tests do not'
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true })
  }
}
