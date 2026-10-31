/**
 * 仓库身份解析。
 *
 * 这是「编排层是机器级的」的地基：同一仓库的所有 worktree 必须解析出同一个 key，否则在
 * `mono-worktrees/pi-shepherd` 里被拒绝的 slice，回到 `mono` 就看不见了。
 *
 * 做法与 `pi-hermes-memory`（issue #120）和 `pi-project-memory`（注释写明 "matches Claude's
 * linked-worktree key"）一致：走 Git 的 common directory，取拥有它的那个 checkout 的目录名。
 *
 * 用真实的 `git init` / `git worktree add` 而不是伪造 `.git` 文件：linked worktree 的
 * `gitdir:` 指针与 `commondir` 内容由 git 生成，手写的 fixture 会掩盖布局差异。
 */

import { execFileSync } from 'node:child_process'
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vite-plus/test'

import { findRepoRoot, resolveRepoIdentity, worktreeCommonDir } from '../repo-identity'

const git = (cwd: string, ...args: string[]): string =>
  execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()

/** 造一个主 checkout + 一个 linked worktree。 */
const makeRepoWithWorktree = async (): Promise<{ main: string; worktree: string }> => {
  const root = await mkdtemp(join(tmpdir(), 'identity-spec-'))
  const main = join(root, 'demo-repo')
  await mkdir(main, { recursive: true })
  git(main, 'init', '-q')
  git(main, 'config', 'user.email', 'spec@example.com')
  git(main, 'config', 'user.name', 'spec')
  await writeFile(join(main, 'README.md'), '# demo\n', 'utf8')
  git(main, 'add', '.')
  git(main, 'commit', '-q', '-m', 'init')

  const worktree = join(root, 'wt-branch')
  git(main, 'worktree', 'add', '-q', '-b', 'branch', worktree)
  return { main, worktree }
}

describe('同一仓库的所有 worktree 共享身份', () => {
  it('主 checkout 与 linked worktree 得到同一个 key', async () => {
    const { main, worktree } = await makeRepoWithWorktree()

    const mainId = resolveRepoIdentity(main)
    const wtId = resolveRepoIdentity(worktree)

    expect(wtId.key).toBe(mainId.key)
    expect(mainId.key).toMatch(/^demo-repo-[0-9a-f]{6}$/)
  })

  it('两者的 root 都指向主 checkout', async () => {
    const { main, worktree } = await makeRepoWithWorktree()

    expect(resolveRepoIdentity(worktree).root).toBe(resolveRepoIdentity(main).root)
  })

  it('在 worktree 的子目录里解析也一样', async () => {
    const { main, worktree } = await makeRepoWithWorktree()
    const nested = join(worktree, 'a', 'b')
    await mkdir(nested, { recursive: true })

    expect(resolveRepoIdentity(nested).key).toBe(resolveRepoIdentity(main).key)
  })

  it('不同仓库得到不同 key，即使目录名相同', async () => {
    const root = await mkdtemp(join(tmpdir(), 'identity-dup-'))
    const first = join(root, 'one', 'same-name')
    const second = join(root, 'two', 'same-name')
    for (const dir of [first, second]) {
      await mkdir(dir, { recursive: true })
      git(dir, 'init', '-q')
    }

    expect(resolveRepoIdentity(first).key).not.toBe(resolveRepoIdentity(second).key)
  })
})

describe('身份键的形状', () => {
  it('Git 仓库带 `<name>-<hash6>`，可读且唯一', async () => {
    const { main } = await makeRepoWithWorktree()
    const id = resolveRepoIdentity(main)

    expect(id.isGit).toBe(true)
    expect(id.name).toBe('demo-repo')
    expect(id.key).toBe(`${id.name}-${id.key.split('-').at(-1)}`)
    expect(id.key.split('-').at(-1)).toMatch(/^[0-9a-f]{6}$/)
  })

  it('目录名统一小写', async () => {
    const root = await mkdtemp(join(tmpdir(), 'identity-case-'))
    const dir = join(root, 'MixedCase')
    await mkdir(dir, { recursive: true })
    git(dir, 'init', '-q')

    expect(resolveRepoIdentity(dir).key.startsWith('mixedcase-')).toBe(true)
  })

  it('非 Git 目录只用目录名，不加哈希', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'plain-'))
    const id = resolveRepoIdentity(dir)

    expect(id.isGit).toBe(false)
    expect(id.key).toBe(id.name)
    expect(id.key).not.toMatch(/-[0-9a-f]{6}$/)
  })
})

describe('worktreeCommonDir', () => {
  it('从 linked worktree 的 .git 文件解出共享的 common dir', async () => {
    const { main, worktree } = await makeRepoWithWorktree()
    const common = worktreeCommonDir(worktree, join(worktree, '.git'))

    expect(common).toBeDefined()
    expect(common?.endsWith(join('demo-repo', '.git'))).toBe(true)
    void main
  })

  it('不是 gitdir 指针时返回 undefined', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'notgit-'))
    const bogus = join(dir, 'fake-git-file')
    await writeFile(bogus, 'this is not a gitdir pointer\n', 'utf8')

    expect(worktreeCommonDir(dir, bogus)).toBeUndefined()
  })

  it('指向不存在的 gitdir 时返回 undefined 而不是抛错', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'dangling-'))
    const bogus = join(dir, 'dangling-git-file')
    await writeFile(bogus, 'gitdir: /nonexistent/path/to/gitdir\n', 'utf8')

    expect(() => worktreeCommonDir(dir, bogus)).not.toThrow()
    expect(worktreeCommonDir(dir, bogus)).toBeUndefined()
  })
})

describe('findRepoRoot', () => {
  it('在主 checkout 里返回自身', async () => {
    const { main } = await makeRepoWithWorktree()

    expect(findRepoRoot(main)).toEqual({ root: main, isGit: true })
  })

  it('在 linked worktree 里返回主 checkout', async () => {
    const { main, worktree } = await makeRepoWithWorktree()

    const found = findRepoRoot(worktree)
    expect(found.isGit).toBe(true)
    expect(found.root).toBe(resolveRepoIdentity(main).root)
  })

  it('非 Git 目录返回 cwd 且 isGit=false', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'no-git-'))

    const found = findRepoRoot(dir)
    expect(found.isGit).toBe(false)
  })
})
