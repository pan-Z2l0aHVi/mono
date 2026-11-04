import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterAll, it } from 'vite-plus/test'

import { defineFullCheckout } from '../full-checkout'

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'greypan-full-checkout-'))
const remedy = 'run the restore command from the consuming repository'
const fullCheckout = defineFullCheckout({ remedy })

function git(args: readonly string[]): void {
  execFileSync('git', args, { cwd: root, stdio: 'pipe' })
}

it('full-checkout', async () => {
  git(['init', '-b', 'main'])
  fs.mkdirSync(path.join(root, 'keep'), { recursive: true })
  fs.mkdirSync(path.join(root, 'hide'), { recursive: true })
  fs.writeFileSync(path.join(root, 'keep', 'one.md'), 'one\n')
  fs.writeFileSync(path.join(root, 'hide', 'two.md'), 'two\n')
  fs.writeFileSync(path.join(root, 'root.md'), 'root\n')
  git(['add', '-A'])
  git(['-c', 'user.name=test', '-c', 'user.email=test@example.com', 'commit', '-m', 'init'])

  // 全树：cone 不生效，门禁照常通过。
  assert.equal(await fullCheckout.run({ root }), 'no skip-worktree entries')

  // cone 收缩后 hide/two.md 只是没检出，index 里还在——这正是扫描面静默变窄的那一步。
  git(['sparse-checkout', 'set', '--cone', 'keep'])
  assert.equal(fs.existsSync(path.join(root, 'hide', 'two.md')), false)
  assert.equal(fs.existsSync(path.join(root, 'root.md')), true)
  await assert.rejects(
    fullCheckout.run({ root }),
    /worktree is sparse: 1 tracked file\(s\) are hidden by the cone \(first: hide\/two\.md\)\nrepo-wide checks would only scan the cone — .*restore command/
  )

  git(['sparse-checkout', 'disable'])
  assert.equal(await fullCheckout.run({ root }), 'no skip-worktree entries')
})

afterAll(() => {
  fs.rmSync(root, { recursive: true, force: true })
})
