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
  const root = workspaceFixture(['apps/**', 'packages/*', 'services/api/**', '!apps/legacy', 'tools/cli', '**/pkgs'])
  try {
    // glob 模式取其容器目录前缀（嵌套容器保留整段）；字面量模式声明的就是 workspace 目录本身，
    // 必须保留，否则它逃过以容器目录为扫描面的边界与语料检查。glob 开头的模式无容器前缀，不产生目录。
    assert.deepEqual(readPnpmWorkspaceDirectories(root), ['apps', 'packages', 'services/api', 'tools/cli'])
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
