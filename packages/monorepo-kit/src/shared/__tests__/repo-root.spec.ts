import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { it } from 'vite-plus/test'

import { findRepoRoot } from '../repo-root'

it('repo-root', () => {
  const root = findRepoRoot()
  // 根不能在断言里写死成 `mono`：worktree 的目录名是分支派生的，同一个仓库会有多个根路径。
  assert.equal(JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).name, 'mono')
  assert.ok(fs.existsSync(path.join(root, 'pnpm-workspace.yaml')))
  assert.ok(fs.existsSync(path.join(root, 'turbo.json')))

  // 从任意深度都得到同一个根：这正是 `../..` 做不到的部分。
  assert.equal(findRepoRoot(path.join(root, 'packages', 'monorepo-kit', 'src', 'shared')), root)
  assert.equal(findRepoRoot(path.join(root, 'apps', 'interweave', 'frontend', 'src')), root)

  // 找不到时必须抛错。静默返回一个猜测的路径会让门禁读到别人的仓库。
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'greypan-repo-root-'))
  try {
    assert.throws(() => findRepoRoot(outside), /cannot find pnpm-workspace\.yaml/)
  } finally {
    fs.rmSync(outside, { recursive: true, force: true })
  }
})
