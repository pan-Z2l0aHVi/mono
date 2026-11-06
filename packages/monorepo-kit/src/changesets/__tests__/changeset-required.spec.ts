import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterAll, it } from 'vite-plus/test'

import { defineCatch } from '../../runner/catch'
import { defineRunner } from '../../runner/runner'
import { defineChangesetRequired } from '../changeset-required'

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'greypan-changeset-'))
const gitEnv = {
  ...process.env,
  GIT_AUTHOR_NAME: 'Codex',
  GIT_AUTHOR_EMAIL: 'noreply@openai.com',
  GIT_COMMITTER_NAME: 'Codex',
  GIT_COMMITTER_EMAIL: 'noreply@openai.com'
}

interface Fixture {
  root: string
  base: string
}

function git(root: string, ...args: string[]): string {
  return execFileSync('git', ['-C', root, ...args], { env: gitEnv, encoding: 'utf8' }).trim()
}

function commit(root: string, message: string): string {
  git(root, 'add', '-A')
  git(root, 'commit', '-m', message)
  return git(root, 'rev-parse', 'HEAD')
}

function makeRepo(
  name: string,
  config: { ignore: string[] } = { ignore: ['@scope/ignored'] },
  initialChangeset: { path: string; body: string } | null = null
): Fixture {
  const root = path.join(tempRoot, name)
  fs.mkdirSync(root, { recursive: true })
  git(root, 'init', '-b', 'main')
  fs.mkdirSync(path.join(root, '.changeset'), { recursive: true })
  fs.writeFileSync(path.join(root, '.changeset', 'config.json'), JSON.stringify(config, null, 2) + '\n')
  fs.writeFileSync(path.join(root, 'README.md'), '# fixture\n')
  if (initialChangeset) fs.writeFileSync(path.join(root, '.changeset', initialChangeset.path), initialChangeset.body)
  return { root, base: commit(root, 'base fixture') }
}

// 区间是装配期参数：每次判定都按用例给的 base/head 现造一条链。
// 链尾带 defineCatch：坏 config 由 parseConfig 抛出，属于装配故障，走 `throw: ` 而不是 `changeset: `。
function kit(repo: Fixture, base: string, head: string) {
  return defineRunner()
    .use(defineChangesetRequired({ base, head }))
    .use(defineCatch())
    .make({ root: repo.root, env: gitEnv })
    .run()
}

async function failure(repo: Fixture, base: string = repo.base, head = 'HEAD'): Promise<string> {
  const result = await kit(repo, base, head)
  if (result.ok) assert.fail('expected changeset-required to fail')
  return result.error
}

// 每个用例只建自己需要的夹具：一份 `git init` 加若干 commit 是一两百次子进程，
// 全部塞进一个用例就会共用同一个逐用例超时预算。
it('changeset-required rejects a PR without its own changeset', async () => {
  const missing = makeRepo('missing')
  fs.writeFileSync(path.join(missing.root, 'README.md'), '# feature\n')
  assert.match(
    await failure(missing, missing.base, commit(missing.root, 'source change')),
    /^changeset: no added, modified or renamed effective \.changeset\/\*\.md in merge-base\.\.head/
  )

  const mainChangeset = makeRepo('main-changeset', undefined, {
    path: 'main-only.md',
    body: '---\n"@scope/package": patch\n---\nMain branch declaration.\n'
  })
  fs.writeFileSync(path.join(mainChangeset.root, 'README.md'), '# PR change\n')
  assert.match(
    await failure(mainChangeset, mainChangeset.base, commit(mainChangeset.root, 'feature change')),
    /^changeset: no added, modified or renamed effective \.changeset\/\*\.md in merge-base\.\.head/
  )

  const deleted = makeRepo('deleted-main-changeset', undefined, {
    path: 'removed.md',
    body: '---\n"@scope/package": patch\n---\nMain declaration removed by PR.\n'
  })
  fs.rmSync(path.join(deleted.root, '.changeset', 'removed.md'))
  fs.writeFileSync(path.join(deleted.root, 'README.md'), '# deletion\n')
  assert.match(
    await failure(deleted, deleted.base, commit(deleted.root, 'delete inherited changeset')),
    /^changeset: no added, modified or renamed effective \.changeset\/\*\.md in merge-base\.\.head/
  )
})

it('changeset-required sees committed content only', async () => {
  const stagedOnly = makeRepo('staged-only')
  fs.writeFileSync(path.join(stagedOnly.root, 'README.md'), '# committed source\n')
  const stagedHead = commit(stagedOnly.root, 'source change')
  fs.writeFileSync(
    path.join(stagedOnly.root, '.changeset', 'staged.md'),
    '---\n"@scope/package": patch\n---\nStaged but not committed.\n'
  )
  git(stagedOnly.root, 'add', '.changeset/staged.md')
  assert.match(
    await failure(stagedOnly, stagedOnly.base, stagedHead),
    /^changeset: no added, modified or renamed effective \.changeset\/\*\.md in merge-base\.\.head/
  )

  const unstagedOnly = makeRepo('unstaged-only')
  fs.writeFileSync(path.join(unstagedOnly.root, 'README.md'), '# committed source\n')
  const unstagedHead = commit(unstagedOnly.root, 'source change')
  fs.writeFileSync(
    path.join(unstagedOnly.root, '.changeset', 'unstaged.md'),
    '---\n"@scope/package": patch\n---\nUnstaged and uncommitted.\n'
  )
  assert.match(
    await failure(unstagedOnly, unstagedOnly.base, unstagedHead),
    /^changeset: no added, modified or renamed effective \.changeset\/\*\.md in merge-base\.\.head/
  )
})

it('changeset-required accepts declarations in any shape or commit', async () => {
  const single = makeRepo('single')
  fs.writeFileSync(path.join(single.root, 'README.md'), '# feature\n')
  fs.writeFileSync(
    path.join(single.root, '.changeset', 'valid.md'),
    '---\n"@scope/package": patch\n---\nDescribe the change.\n'
  )
  assert.ok((await kit(single, single.base, commit(single.root, 'source and changeset'))).ok)

  const multipleCommits = makeRepo('multiple-commits')
  fs.writeFileSync(path.join(multipleCommits.root, 'README.md'), '# first change\n')
  commit(multipleCommits.root, 'first source change')
  fs.writeFileSync(path.join(multipleCommits.root, 'README.md'), '# second change\n')
  commit(multipleCommits.root, 'second source change')
  fs.writeFileSync(
    path.join(multipleCommits.root, '.changeset', 'later.md'),
    '---\n"@scope/package": minor\n---\nSummary from a later commit.\n'
  )
  assert.ok((await kit(multipleCommits, multipleCommits.base, commit(multipleCommits.root, 'add changeset'))).ok)

  const emptyShell = makeRepo('empty-shell')
  fs.writeFileSync(path.join(emptyShell.root, 'README.md'), '# source change\n')
  fs.writeFileSync(path.join(emptyShell.root, '.changeset', 'empty.md'), '---\n---\n')
  assert.ok((await kit(emptyShell, emptyShell.base, commit(emptyShell.root, 'source with empty changeset'))).ok)

  const spacedPath = makeRepo('unicode-and-space')
  fs.writeFileSync(path.join(spacedPath.root, 'README.md'), '# unicode\n')
  const unicodeFile = '.changeset/变更 with space.md'
  fs.writeFileSync(path.join(spacedPath.root, unicodeFile), '---\n"@scope/package": patch\n---\nUnicode path.\n')
  assert.ok((await kit(spacedPath, spacedPath.base, commit(spacedPath.root, 'unicode changeset'))).ok)

  const renamed = makeRepo('renamed', undefined, {
    path: 'before.md',
    body: '---\n"@scope/package": patch\n---\nRenamed declaration.\n'
  })
  git(renamed.root, 'mv', '.changeset/before.md', '.changeset/after.md')
  assert.ok((await kit(renamed, renamed.base, commit(renamed.root, 'rename changeset'))).ok)
})

it('changeset-required rejects malformed declarations', async () => {
  const noFrontmatter = makeRepo('no-frontmatter')
  fs.writeFileSync(path.join(noFrontmatter.root, '.changeset', 'bad.md'), 'plain text\n')
  assert.match(
    await failure(noFrontmatter, noFrontmatter.base, commit(noFrontmatter.root, 'malformed changeset')),
    /^changeset:[\s\S]*no paired ---/
  )

  const preamble = makeRepo('preamble')
  fs.writeFileSync(path.join(preamble.root, '.changeset', 'bad.md'), 'stray line\n---\n---\n')
  assert.match(
    await failure(preamble, preamble.base, commit(preamble.root, 'preamble changeset')),
    /^changeset:[\s\S]*content before its first ---/
  )

  const noSummary = makeRepo('no-summary')
  fs.writeFileSync(path.join(noSummary.root, '.changeset', 'bad.md'), '---\n"@scope/package": patch\n---\n\n')
  assert.match(
    await failure(noSummary, noSummary.base, commit(noSummary.root, 'empty summary')),
    /^changeset:[\s\S]*has no summary/
  )

  const fenceOnlySummary = makeRepo('fence-only-summary')
  fs.writeFileSync(path.join(fenceOnlySummary.root, '.changeset', 'bad.md'), '---\n"@scope/package": patch\n---\n---\n')
  assert.match(
    await failure(fenceOnlySummary, fenceOnlySummary.base, commit(fenceOnlySummary.root, 'fence is not a summary')),
    /^changeset:[\s\S]*has no summary/
  )
})

it('changeset-required rejects declarations for ignored packages and unreadable config', async () => {
  const ignored = makeRepo('ignored-package')
  fs.writeFileSync(path.join(ignored.root, 'README.md'), '# ignored bump\n')
  fs.writeFileSync(
    path.join(ignored.root, '.changeset', 'ignored.md'),
    '---\n"@scope/ignored": patch\n---\nIgnored package.\n'
  )
  assert.match(
    await failure(ignored, ignored.base, commit(ignored.root, 'ignored changeset')),
    /^changeset:[\s\S]*declares ignored package/
  )

  const invalidConfig = makeRepo('invalid-head-config')
  fs.writeFileSync(path.join(invalidConfig.root, 'README.md'), '# config change\n')
  fs.writeFileSync(
    path.join(invalidConfig.root, '.changeset', 'config.json'),
    JSON.stringify({ ignore: 'invalid' }) + '\n'
  )
  fs.writeFileSync(
    path.join(invalidConfig.root, '.changeset', 'valid.md'),
    '---\n"@scope/package": patch\n---\nA valid change.\n'
  )
  assert.match(
    await failure(invalidConfig, invalidConfig.base, commit(invalidConfig.root, 'invalid head config')),
    /^throw:[\s\S]*must contain an ignore array/
  )
})

it('changeset-required validates the base and head commits', async () => {
  const repo = makeRepo('option-validation')
  const notACommit = 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeef'
  assert.match(await failure(repo, notACommit, repo.base), /^changeset: base .* is not a commit/)
  assert.match(await failure(repo, repo.base, notACommit), /^changeset: head .* is not a commit/)
})

afterAll(() => {
  fs.rmSync(tempRoot, { recursive: true, force: true })
})
