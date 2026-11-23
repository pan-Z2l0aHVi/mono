import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { it } from 'vite-plus/test'

import { getWorkspaceRoot } from '../../shared/workspace-root'
import { readPnpmWorkspaceDirectories } from '../workspace'

function workspaceFixture(packages: readonly string[]): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'greypan-workspace-'))
  const entries = packages.map(value => `  - "${value}"`).join('\n')
  fs.writeFileSync(path.join(root, 'pnpm-workspace.yaml'), `packages:\n${entries}\n`)
  return root
}

it('workspace directories follow the package patterns', () => {
  const root = workspaceFixture([
    'apps/**',
    'packages/*',
    'services/api/**',
    '!apps/legacy',
    'tools/cli',
    './tools/gen',
    'tools/{a,b}'
  ])
  try {
    // glob 模式取其容器目录前缀（嵌套容器保留整段）；字面量模式声明的就是 workspace 目录本身。
    // `./` 段被归一化掉（否则 `tools/` 前缀的方向判定匹配不到），`{}`、`?`、`[]` 与 `*` 一样按 glob 处理。
    // 首段即 glob 的模式没有可判定的容器前缀，本组用例不断言它们：本文件下方的 rejects 用例覆盖了
    // 「显式报错而不是静默丢弃」的两种情形（字面量 `.` 与根级 glob）。
    assert.deepEqual(readPnpmWorkspaceDirectories(root), [
      'apps',
      'packages',
      'services/api',
      'tools',
      'tools/cli',
      'tools/gen'
    ])
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

it('rejects a literal root workspace pattern instead of silently widening the scan face', () => {
  const root = workspaceFixture(['.'])
  try {
    // 字面量 `.` 会把扫描面抬到仓库根：边界与语料的消费面都以 workspace 目录为单位，根级不被支持。
    assert.throws(() => readPnpmWorkspaceDirectories(root), /root workspace/)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

it('rejects root-level glob patterns instead of silently dropping the workspaces', () => {
  // 静默当成「无容器前缀」会让这些 workspace 逃过边界与语料检查，而 globSync 的 manifest 视图仍能匹配：
  // 四类根级 glob 元字符都必须显式失败，而不是只挡其中一类。
  for (const pattern of ['{apps,packages}/*', '[ap]ps/*', '?pps/*', '**/pkgs']) {
    const root = workspaceFixture([pattern])
    try {
      assert.throws(() => readPnpmWorkspaceDirectories(root), /glob at the pattern root/, pattern)
    } finally {
      fs.rmSync(root, { recursive: true, force: true })
    }
  }
})

it('repo-root', () => {
  const root = getWorkspaceRoot(process.cwd())
  // 根不能在断言里写死成 `mono`：worktree 的目录名是分支派生的，同一个仓库会有多个根路径。
  assert.equal(JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).name, 'mono')
  assert.ok(fs.existsSync(path.join(root, 'pnpm-workspace.yaml')))
  assert.ok(fs.existsSync(path.join(root, 'turbo.json')))

  // 从任意深度都得到同一个根：这正是 `../..` 做不到的部分。
  assert.equal(getWorkspaceRoot(path.join(root, 'packages', 'monorepo-kit', 'src', 'shared')), root)
  assert.equal(getWorkspaceRoot(path.join(root, 'apps', 'interweave', 'frontend', 'src')), root)

  // 找不到时必须抛错。静默返回一个猜测的路径会让门禁读到别人的仓库。
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'greypan-repo-root-'))
  try {
    assert.throws(() => getWorkspaceRoot(outside), /cannot find pnpm-workspace\.yaml/)
  } finally {
    fs.rmSync(outside, { recursive: true, force: true })
  }
})
