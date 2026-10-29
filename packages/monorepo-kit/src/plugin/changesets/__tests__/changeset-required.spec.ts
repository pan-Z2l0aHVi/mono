import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterAll, it } from 'vite-plus/test'

import { defineChangesetRequired } from '../changeset-required'

const required = defineChangesetRequired()

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

function check(repo: Fixture, base: string = repo.base, head = 'HEAD'): Promise<string | void> {
  return required.run({ root: repo.root, base, head })
}

async function pass(repo: Fixture, base: string = repo.base, head = 'HEAD'): Promise<string> {
  const detail = await check(repo, base, head)
  assert.ok(detail, 'changeset-required returned no detail')
  return detail
}

// 每个用例只建自己需要的夹具：一份 `git init` 加若干 commit 是一两百次子进程，
// 全部塞进一个用例就会共用同一个逐用例超时预算。
it('changeset-required rejects a PR without its own changeset', async () => {
  const missing = makeRepo('missing')
  fs.writeFileSync(path.join(missing.root, 'README.md'), '# feature\n')
  await assert.rejects(check(missing, missing.base, commit(missing.root, 'source change')), /changeset missing/)

  const mainChangeset = makeRepo('main-changeset', undefined, {
    path: 'main-only.md',
    body: '---\n"@scope/package": patch\n---\nMain branch declaration.\n'
  })
  fs.writeFileSync(path.join(mainChangeset.root, 'README.md'), '# PR change\n')
  await assert.rejects(
    check(mainChangeset, mainChangeset.base, commit(mainChangeset.root, 'feature change')),
    /changeset missing/
  )

  const deleted = makeRepo('deleted-main-changeset', undefined, {
    path: 'removed.md',
    body: '---\n"@scope/package": patch\n---\nMain declaration removed by PR.\n'
  })
  fs.rmSync(path.join(deleted.root, '.changeset', 'removed.md'))
  fs.writeFileSync(path.join(deleted.root, 'README.md'), '# deletion\n')
  await assert.rejects(
    check(deleted, deleted.base, commit(deleted.root, 'delete inherited changeset')),
    /changeset missing/
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
  await assert.rejects(check(stagedOnly, stagedOnly.base, stagedHead), /changeset missing/)

  const unstagedOnly = makeRepo('unstaged-only')
  fs.writeFileSync(path.join(unstagedOnly.root, 'README.md'), '# committed source\n')
  const unstagedHead = commit(unstagedOnly.root, 'source change')
  fs.writeFileSync(
    path.join(unstagedOnly.root, '.changeset', 'unstaged.md'),
    '---\n"@scope/package": patch\n---\nUnstaged and uncommitted.\n'
  )
  await assert.rejects(check(unstagedOnly, unstagedOnly.base, unstagedHead), /changeset missing/)
})

it('changeset-required accepts declarations in any shape or commit', async () => {
  const single = makeRepo('single')
  fs.writeFileSync(path.join(single.root, 'README.md'), '# feature\n')
  fs.writeFileSync(
    path.join(single.root, '.changeset', 'valid.md'),
    '---\n"@scope/package": patch\n---\nDescribe the change.\n'
  )
  assert.match(await pass(single, single.base, commit(single.root, 'source and changeset')), /\.changeset\/valid\.md/)

  const multipleCommits = makeRepo('multiple-commits')
  fs.writeFileSync(path.join(multipleCommits.root, 'README.md'), '# first change\n')
  commit(multipleCommits.root, 'first source change')
  fs.writeFileSync(path.join(multipleCommits.root, 'README.md'), '# second change\n')
  commit(multipleCommits.root, 'second source change')
  fs.writeFileSync(
    path.join(multipleCommits.root, '.changeset', 'later.md'),
    '---\n"@scope/package": minor\n---\nSummary from a later commit.\n'
  )
  await pass(multipleCommits, multipleCommits.base, commit(multipleCommits.root, 'add changeset'))

  const emptyShell = makeRepo('empty-shell')
  fs.writeFileSync(path.join(emptyShell.root, 'README.md'), '# source change\n')
  fs.writeFileSync(path.join(emptyShell.root, '.changeset', 'empty.md'), '---\n---\n')
  await pass(emptyShell, emptyShell.base, commit(emptyShell.root, 'source with empty changeset'))

  const spacedPath = makeRepo('unicode-and-space')
  fs.writeFileSync(path.join(spacedPath.root, 'README.md'), '# unicode\n')
  const unicodeFile = '.changeset/变更 with space.md'
  fs.writeFileSync(path.join(spacedPath.root, unicodeFile), '---\n"@scope/package": patch\n---\nUnicode path.\n')
  assert.match(
    await pass(spacedPath, spacedPath.base, commit(spacedPath.root, 'unicode changeset')),
    /变更 with space\.md/
  )

  const renamed = makeRepo('renamed', undefined, {
    path: 'before.md',
    body: '---\n"@scope/package": patch\n---\nRenamed declaration.\n'
  })
  git(renamed.root, 'mv', '.changeset/before.md', '.changeset/after.md')
  assert.match(await pass(renamed, renamed.base, commit(renamed.root, 'rename changeset')), /\.changeset\/after\.md/)
})

it('changeset-required rejects malformed declarations', async () => {
  const noFrontmatter = makeRepo('no-frontmatter')
  fs.writeFileSync(path.join(noFrontmatter.root, '.changeset', 'bad.md'), 'plain text\n')
  await assert.rejects(
    check(noFrontmatter, noFrontmatter.base, commit(noFrontmatter.root, 'malformed changeset')),
    /no paired ---/
  )

  const preamble = makeRepo('preamble')
  fs.writeFileSync(path.join(preamble.root, '.changeset', 'bad.md'), 'stray line\n---\n---\n')
  await assert.rejects(
    check(preamble, preamble.base, commit(preamble.root, 'preamble changeset')),
    /content before its first ---/
  )

  const noSummary = makeRepo('no-summary')
  fs.writeFileSync(path.join(noSummary.root, '.changeset', 'bad.md'), '---\n"@scope/package": patch\n---\n\n')
  await assert.rejects(check(noSummary, noSummary.base, commit(noSummary.root, 'empty summary')), /has no summary/)

  const fenceOnlySummary = makeRepo('fence-only-summary')
  fs.writeFileSync(path.join(fenceOnlySummary.root, '.changeset', 'bad.md'), '---\n"@scope/package": patch\n---\n---\n')
  await assert.rejects(
    check(fenceOnlySummary, fenceOnlySummary.base, commit(fenceOnlySummary.root, 'fence is not a summary')),
    /has no summary/
  )
})

it('changeset-required rejects declarations for ignored packages and unreadable config', async () => {
  const ignored = makeRepo('ignored-package')
  fs.writeFileSync(path.join(ignored.root, 'README.md'), '# ignored bump\n')
  fs.writeFileSync(
    path.join(ignored.root, '.changeset', 'ignored.md'),
    '---\n"@scope/ignored": patch\n---\nIgnored package.\n'
  )
  await assert.rejects(
    check(ignored, ignored.base, commit(ignored.root, 'ignored changeset')),
    /declares ignored package/
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
  await assert.rejects(
    check(invalidConfig, invalidConfig.base, commit(invalidConfig.root, 'invalid head config')),
    /must contain an ignore array/
  )
})

it('changeset-required validates the base and head options', async () => {
  const repo = makeRepo('option-validation')
  await assert.rejects(check(repo, 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeef', repo.base), /base .* is not a commit/)
  await assert.rejects(required.run({ root: repo.root, head: repo.base }), /missing required option --base/)
})

afterAll(() => {
  fs.rmSync(tempRoot, { recursive: true, force: true })
})
