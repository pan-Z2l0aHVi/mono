import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterAll, it } from 'vite-plus/test'

import { defineDocsInputs } from '../docs-inputs'

const docsInputs = defineDocsInputs({
  packageDir: 'packages/web-ui',
  corpusDir: 'docs',
  proseNames: ['README.md', 'README.CN.md', 'AGENTS.md', 'CHANGELOG.md']
})

const sparseTolerant = defineDocsInputs({
  packageDir: 'packages/web-ui',
  corpusDir: 'docs',
  proseNames: ['README.md', 'README.CN.md', 'AGENTS.md', 'CHANGELOG.md'],
  allowSparsePackages: true
})

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'greypan-web-ui-docs-'))
let fixture = 0

const prose = () => {
  return ['README.md', 'README.CN.md', 'AGENTS.md', 'CHANGELOG.md']
}

function makeFixture({
  buildInputs = ['$TURBO_DEFAULT$', '!README.md', '!README.CN.md', '!AGENTS.md', '!CHANGELOG.md'],
  testInputs = ['$TURBO_DEFAULT$', '!README.md', '!README.CN.md', '!AGENTS.md', '!CHANGELOG.md'],
  extendsValue = ['//'],
  docs = true
} = {}) {
  const root = path.join(tempRoot, `fixture-${fixture++}`)
  const packageRoot = path.join(root, 'packages', 'web-ui')
  fs.mkdirSync(packageRoot, { recursive: true })
  if (docs) {
    fs.mkdirSync(path.join(packageRoot, 'docs'), { recursive: true })
    fs.writeFileSync(path.join(packageRoot, 'docs', 'example.md'), '# example\n')
  }
  for (const file of prose()) fs.writeFileSync(path.join(packageRoot, file), `# ${file}\n`)
  fs.writeFileSync(
    path.join(packageRoot, 'turbo.json'),
    JSON.stringify(
      { extends: extendsValue, tasks: { build: { inputs: buildInputs }, test: { inputs: testInputs } } },
      null,
      2
    ) + '\n'
  )
  return { root, packageRoot }
}

function run(root: string) {
  return docsInputs.make({ root, env: { ...process.env } }).run()
}

async function failure(root: string): Promise<string> {
  const result = await run(root)
  if (result.ok) assert.fail('expected web-ui-docs-inputs to fail')
  return result.error
}

it('web-ui-docs-inputs', async () => {
  const valid = makeFixture()
  assert.ok((await run(valid.root)).ok)

  fs.mkdirSync(path.join(valid.packageRoot, '__tests__'), { recursive: true })
  fs.writeFileSync(path.join(valid.packageRoot, '__tests__', 'fixture.md'), '# fixture\n')
  assert.ok((await run(valid.root)).ok)

  fs.writeFileSync(path.join(valid.packageRoot, 'notes.md'), '# stray\n')
  assert.match(await failure(valid.root), /^turbo: packages\/web-ui: these Markdown files are not in the allowlist/)
  fs.rmSync(path.join(valid.packageRoot, 'notes.md'))

  const missingDocs = makeFixture({ docs: false })
  assert.match(await failure(missingDocs.root), /^turbo: packages\/web-ui: docs\/ does not exist/)

  const wrongExtends = makeFixture({ extendsValue: ['//', 'packages/web-ui'] })
  assert.match(await failure(wrongExtends.root), /^turbo: packages\/web-ui: turbo\.json extends must be \["\/\/"\]/)

  const missingDefault = makeFixture({ buildInputs: ['!README.md', '!README.CN.md', '!AGENTS.md', '!CHANGELOG.md'] })
  assert.match(
    await failure(missingDefault.root),
    /^turbo: packages\/web-ui: tasks\.build\.inputs is missing \$TURBO_DEFAULT\$/
  )

  const coversDocs = makeFixture({
    buildInputs: ['$TURBO_DEFAULT$', '!README.md', '!README.CN.md', '!AGENTS.md', '!CHANGELOG.md', '!**/docs/**']
  })
  assert.match(await failure(coversDocs.root), /^turbo: packages\/web-ui: .*covers the docs\/ corpus/)

  const missesProse = makeFixture({
    testInputs: ['$TURBO_DEFAULT$', '!README.CN.md', '!AGENTS.md', '!CHANGELOG.md']
  })
  assert.match(await failure(missesProse.root), /^turbo: packages\/web-ui: tasks\.test\.inputs is missing !README\.md/)

  const unsupported = makeFixture({
    buildInputs: ['$TURBO_DEFAULT$', '!README.md', '!README.CN.md', '!AGENTS.md', '!CHANGELOG.md', '!{docs,x}/**']
  })
  assert.match(await failure(unsupported.root), /^turbo: packages\/web-ui: .*covers the docs\/ corpus/)
})

afterAll(() => {
  fs.rmSync(tempRoot, { recursive: true, force: true })
})

// 稀疏容忍的判定走 Git 索引，fixture 必须是真仓库；`git add` 不需要提交身份。
function git(root: string, ...args: string[]): void {
  execFileSync('git', args, { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] })
}

async function sparseFailure(root: string): Promise<string> {
  const result = await sparseTolerant.make({ root, env: { ...process.env } }).run()
  if (result.ok) assert.fail('expected the sparse-tolerant web-ui-docs-inputs to fail')
  return result.error
}

it('web-ui-docs-inputs sparse tolerance', async () => {
  // 包目录缺失但 tracked + skip-worktree（稀疏 cone 外）：容忍版通过，严格版仍失败。
  // makeFixture 不写 manifest，稀疏信号判的就是它，这里补上再进 index。
  const hidden = makeFixture()
  fs.writeFileSync(path.join(hidden.packageRoot, 'package.json'), '{ "name": "web-ui" }\n')
  git(hidden.root, 'init', '--quiet')
  git(hidden.root, 'add', '--all')
  git(hidden.root, 'update-index', '--skip-worktree', 'packages/web-ui/package.json')
  fs.rmSync(hidden.packageRoot, { recursive: true })
  assert.ok((await sparseTolerant.make({ root: hidden.root, env: { ...process.env } }).run()).ok)
  assert.match(await failure(hidden.root), /^turbo: packages\/web-ui: does not exist/)

  // 包目录缺失、tracked、没有 skip-worktree 位：本地误删不能被当成稀疏。
  const removed = makeFixture()
  git(removed.root, 'init', '--quiet')
  git(removed.root, 'add', '--all')
  fs.rmSync(removed.packageRoot, { recursive: true })
  assert.match(await sparseFailure(removed.root), /^turbo: packages\/web-ui: does not exist/)

  // 包目录缺失且 untracked：从来没有过这个包。
  const unknown = makeFixture()
  git(unknown.root, 'init', '--quiet')
  fs.rmSync(unknown.packageRoot, { recursive: true })
  assert.match(await sparseFailure(unknown.root), /^turbo: packages\/web-ui: does not exist/)

  // 目录存在时容忍版照常判定：语料缺失仍失败。
  const present = makeFixture({ docs: false })
  git(present.root, 'init', '--quiet')
  git(present.root, 'add', '--all')
  assert.match(await sparseFailure(present.root), /^turbo: packages\/web-ui: docs\/ does not exist/)
})
