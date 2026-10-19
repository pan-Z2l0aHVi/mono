import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const repoRoot = path.resolve(import.meta.dirname, '..')
const checker = path.join(repoRoot, '.agents', 'checks', 'changeset-required')
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'greypan-changeset-'))
const gitEnv = {
  ...process.env,
  GIT_AUTHOR_NAME: 'Codex',
  GIT_AUTHOR_EMAIL: 'noreply@openai.com',
  GIT_COMMITTER_NAME: 'Codex',
  GIT_COMMITTER_EMAIL: 'noreply@openai.com'
}

function git(root, ...args) {
  return execFileSync('git', ['-C', root, ...args], { env: gitEnv, encoding: 'utf8' }).trim()
}

function commit(root, message) {
  git(root, 'add', '-A')
  git(root, 'commit', '-m', message)
  return git(root, 'rev-parse', 'HEAD')
}

function makeRepo(name, config = { ignore: ['@scope/ignored'] }, initialChangeset = null) {
  const root = path.join(tempRoot, name)
  fs.mkdirSync(root, { recursive: true })
  git(root, 'init', '-b', 'main')
  fs.mkdirSync(path.join(root, '.changeset'), { recursive: true })
  fs.writeFileSync(path.join(root, '.changeset', 'config.json'), JSON.stringify(config, null, 2) + '\n')
  fs.writeFileSync(path.join(root, 'README.md'), '# fixture\n')
  if (initialChangeset) {
    fs.writeFileSync(path.join(root, '.changeset', initialChangeset.path), initialChangeset.body)
  }
  const base = commit(root, 'base fixture')
  return { root, base }
}

function check(repo, base = repo.base, head = 'HEAD', extraEnv = {}) {
  return spawnSync(checker, ['--base', base, '--head', head], {
    cwd: repo.root,
    env: { ...gitEnv, ...extraEnv },
    encoding: 'utf8'
  })
}

function pass(repo, base = repo.base, head = 'HEAD') {
  const result = check(repo, base, head)
  assert.equal(result.status, 0, result.stderr || result.stdout)
  return JSON.parse(result.stdout)
}

function fails(repo, pattern, base = repo.base, head = 'HEAD') {
  const result = check(repo, base, head)
  assert.notEqual(result.status, 0, 'expected changeset check to fail')
  assert.match(result.stderr, pattern)
  return result.stderr
}

try {
  const missing = makeRepo('missing')
  fs.writeFileSync(path.join(missing.root, 'README.md'), '# feature\n')
  const missingHead = commit(missing.root, 'source change')
  fails(missing, /changeset missing/, missing.base, missingHead)

  const single = makeRepo('single')
  fs.writeFileSync(path.join(single.root, 'README.md'), '# feature\n')
  fs.writeFileSync(
    path.join(single.root, '.changeset', 'valid.md'),
    '---\n"@scope/package": patch\n---\nDescribe the change.\n'
  )
  const singleHead = commit(single.root, 'source and changeset')
  const singleResult = pass(single, single.base, singleHead)
  assert.deepEqual(singleResult.changesets, ['.changeset/valid.md'])

  const multipleCommits = makeRepo('multiple-commits')
  fs.writeFileSync(path.join(multipleCommits.root, 'README.md'), '# first change\n')
  commit(multipleCommits.root, 'first source change')
  fs.writeFileSync(path.join(multipleCommits.root, 'README.md'), '# second change\n')
  commit(multipleCommits.root, 'second source change')
  fs.writeFileSync(
    path.join(multipleCommits.root, '.changeset', 'later.md'),
    '---\n"@scope/package": minor\n---\nSummary from a later commit.\n'
  )
  const multipleHead = commit(multipleCommits.root, 'add changeset')
  pass(multipleCommits, multipleCommits.base, multipleHead)

  const mainChangeset = makeRepo('main-changeset', undefined, {
    path: 'main-only.md',
    body: '---\n"@scope/package": patch\n---\nMain branch declaration.\n'
  })
  fs.writeFileSync(path.join(mainChangeset.root, 'README.md'), '# PR change\n')
  const prWithoutOwnChangeset = commit(mainChangeset.root, 'feature change')
  fails(mainChangeset, /changeset missing/, mainChangeset.base, prWithoutOwnChangeset)

  const deleted = makeRepo('deleted-main-changeset', undefined, {
    path: 'removed.md',
    body: '---\n"@scope/package": patch\n---\nMain declaration removed by PR.\n'
  })
  fs.rmSync(path.join(deleted.root, '.changeset', 'removed.md'))
  fs.writeFileSync(path.join(deleted.root, 'README.md'), '# deletion\n')
  const deletionHead = commit(deleted.root, 'delete inherited changeset')
  fails(deleted, /changeset missing/, deleted.base, deletionHead)

  const stagedOnly = makeRepo('staged-only')
  fs.writeFileSync(path.join(stagedOnly.root, 'README.md'), '# committed source\n')
  const stagedHead = commit(stagedOnly.root, 'source change')
  fs.writeFileSync(
    path.join(stagedOnly.root, '.changeset', 'staged.md'),
    '---\n"@scope/package": patch\n---\nStaged but not committed.\n'
  )
  git(stagedOnly.root, 'add', '.changeset/staged.md')
  fails(stagedOnly, /changeset missing/, stagedOnly.base, stagedHead)

  const unstagedOnly = makeRepo('unstaged-only')
  fs.writeFileSync(path.join(unstagedOnly.root, 'README.md'), '# committed source\n')
  const unstagedHead = commit(unstagedOnly.root, 'source change')
  fs.writeFileSync(
    path.join(unstagedOnly.root, '.changeset', 'unstaged.md'),
    '---\n"@scope/package": patch\n---\nUnstaged and uncommitted.\n'
  )
  fails(unstagedOnly, /changeset missing/, unstagedOnly.base, unstagedHead)

  const emptyShell = makeRepo('empty-shell')
  fs.writeFileSync(path.join(emptyShell.root, 'README.md'), '# source change\n')
  fs.writeFileSync(path.join(emptyShell.root, '.changeset', 'empty.md'), '---\n---\n')
  const emptyHead = commit(emptyShell.root, 'source with empty changeset')
  pass(emptyShell, emptyShell.base, emptyHead)

  const ignored = makeRepo('ignored-package')
  fs.writeFileSync(path.join(ignored.root, 'README.md'), '# ignored bump\n')
  fs.writeFileSync(
    path.join(ignored.root, '.changeset', 'ignored.md'),
    '---\n"@scope/ignored": patch\n---\nIgnored package.\n'
  )
  const ignoredHead = commit(ignored.root, 'ignored changeset')
  fails(ignored, /declares ignored package/, ignored.base, ignoredHead)

  const noFrontmatter = makeRepo('no-frontmatter')
  fs.writeFileSync(path.join(noFrontmatter.root, '.changeset', 'bad.md'), 'plain text\n')
  const noFrontmatterHead = commit(noFrontmatter.root, 'malformed changeset')
  fails(noFrontmatter, /no paired ---/, noFrontmatter.base, noFrontmatterHead)

  const preamble = makeRepo('preamble')
  fs.writeFileSync(path.join(preamble.root, '.changeset', 'bad.md'), 'stray line\n---\n---\n')
  const preambleHead = commit(preamble.root, 'preamble changeset')
  fails(preamble, /content before its first ---/, preamble.base, preambleHead)

  const noSummary = makeRepo('no-summary')
  fs.writeFileSync(path.join(noSummary.root, '.changeset', 'bad.md'), '---\n"@scope/package": patch\n---\n\n')
  const noSummaryHead = commit(noSummary.root, 'empty summary')
  fails(noSummary, /has no summary/, noSummary.base, noSummaryHead)

  const fenceOnlySummary = makeRepo('fence-only-summary')
  fs.writeFileSync(path.join(fenceOnlySummary.root, '.changeset', 'bad.md'), '---\n"@scope/package": patch\n---\n---\n')
  const fenceOnlyHead = commit(fenceOnlySummary.root, 'fence is not a summary')
  fails(fenceOnlySummary, /has no summary/, fenceOnlySummary.base, fenceOnlyHead)

  const spacedPath = makeRepo('unicode-and-space')
  fs.writeFileSync(path.join(spacedPath.root, 'README.md'), '# unicode\n')
  const unicodeFile = '.changeset/变更 with space.md'
  fs.writeFileSync(path.join(spacedPath.root, unicodeFile), '---\n"@scope/package": patch\n---\nUnicode path.\n')
  const unicodeHead = commit(spacedPath.root, 'unicode changeset')
  assert.deepEqual(pass(spacedPath, spacedPath.base, unicodeHead).changesets, [unicodeFile])

  const renamed = makeRepo('renamed', undefined, {
    path: 'before.md',
    body: '---\n"@scope/package": patch\n---\nRenamed declaration.\n'
  })
  git(renamed.root, 'mv', '.changeset/before.md', '.changeset/after.md')
  const renamedHead = commit(renamed.root, 'rename changeset')
  assert.ok(pass(renamed, renamed.base, renamedHead).changesets.includes('.changeset/after.md'))

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
  const invalidConfigHead = commit(invalidConfig.root, 'invalid head config')
  fails(invalidConfig, /must contain an ignore array/, invalidConfig.base, invalidConfigHead)

  const badBase = check(single, 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeef', singleHead)
  assert.notEqual(badBase.status, 0)
  assert.match(badBase.stderr, /base .* is not a commit/)

  const badArgs = spawnSync(checker, ['--head', singleHead], {
    cwd: single.root,
    env: gitEnv,
    encoding: 'utf8'
  })
  assert.notEqual(badArgs.status, 0)
  assert.match(badArgs.stderr, /missing required option --base/)

  assert.equal(fs.statSync(checker).mode & 0o111 ? true : false, true)
  assert.equal(fs.statSync(path.join(repoRoot, 'scripts', 'changeset-required.mjs')).mode & 0o111 ? true : false, true)
  process.stdout.write('scripts/changeset-required.test.mjs: all assertions passed\n')
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true })
}
