import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const repoRoot = path.resolve(import.meta.dirname, '..')
const cleanScript = path.join(repoRoot, 'scripts', 'clean.sh')
const cacheHelper = path.join(repoRoot, 'scripts', 'turbo-cache-dir.sh')
const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "greypan clean fixture 'quoted'-"))

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: 'utf8', ...options })
  assert.notEqual(result.status, null, `${command} did not run: ${result.error?.message ?? ''}`)
  return result
}

function assertSuccess(result, label) {
  assert.equal(result.status, 0, `${label} failed (${result.status}): ${result.stderr}`)
}

function initRepo(root) {
  fs.mkdirSync(root, { recursive: true })
  assertSuccess(run('git', ['-C', root, 'init', '-b', 'main']), 'fixture git init')
  fs.writeFileSync(path.join(root, 'pnpm-workspace.yaml'), "packages:\n  - 'packages/*'\n")
  fs.writeFileSync(path.join(root, 'package.json'), '{"private":true}\n')
}

function cachePath(root, tempRoot) {
  const result = run('/bin/sh', [cacheHelper, '--root', root], {
    cwd: repoRoot,
    env: { ...process.env, TMPDIR: tempRoot }
  })
  assertSuccess(result, 'fixture cache path resolution')
  return result.stdout.trim()
}

try {
  const repo = path.join(fixtureRoot, "target repo 'with spaces'")
  const otherRepo = path.join(fixtureRoot, 'other repo')
  initRepo(repo)
  initRepo(otherRepo)

  const currentCache = cachePath(repo, fixtureRoot)
  const otherCache = cachePath(otherRepo, fixtureRoot)
  const maliciousCache = path.join(fixtureRoot, 'untrusted override')
  for (const [directory, sentinel] of [
    [currentCache, 'current cache'],
    [otherCache, 'other cache'],
    [maliciousCache, 'external override']
  ]) {
    fs.mkdirSync(directory, { recursive: true })
    fs.writeFileSync(path.join(directory, 'sentinel.txt'), sentinel)
  }

  fs.mkdirSync(path.join(repo, 'packages', 'fixture', 'dist'), { recursive: true })
  fs.writeFileSync(path.join(repo, 'packages', 'fixture', 'dist', 'bundle.js'), 'fixture output\n')
  fs.mkdirSync(path.join(repo, 'packages', 'fixture', 'node_modules', 'dep'), { recursive: true })
  fs.writeFileSync(path.join(repo, 'packages', 'fixture', 'node_modules', 'dep', 'index.js'), 'fixture dependency\n')
  fs.mkdirSync(path.join(repo, '.turbo'), { recursive: true })
  fs.writeFileSync(path.join(repo, '.turbo', 'run.log'), 'local metadata\n')

  const fakeBin = path.join(fixtureRoot, 'fake-bin')
  fs.mkdirSync(fakeBin)
  const pkillStub = path.join(fakeBin, 'pkill')
  fs.writeFileSync(pkillStub, '#!/bin/sh\nexit 0\n')
  fs.chmodSync(pkillStub, 0o755)

  const result = run('/bin/bash', [cleanScript], {
    cwd: repo,
    env: {
      ...process.env,
      TMPDIR: fixtureRoot,
      TURBO_CACHE_DIR: maliciousCache,
      PATH: `${fakeBin}:/usr/bin:/bin:/usr/sbin:/sbin`
    }
  })
  assertSuccess(result, 'fixture clean')
  assert.match(result.stdout, /Turbo artifact cache/)

  assert.equal(fs.existsSync(currentCache), false, 'clean must remove the current repository cache')
  assert.equal(fs.readFileSync(path.join(otherCache, 'sentinel.txt'), 'utf8'), 'other cache')
  assert.equal(fs.readFileSync(path.join(maliciousCache, 'sentinel.txt'), 'utf8'), 'external override')
  assert.equal(fs.existsSync(path.join(repo, 'packages', 'fixture', 'dist')), false)
  assert.equal(fs.existsSync(path.join(repo, 'packages', 'fixture', 'node_modules')), false)
  assert.equal(fs.existsSync(path.join(repo, '.turbo')), false)
} finally {
  fs.rmSync(fixtureRoot, { recursive: true, force: true })
}

console.log('scripts/clean.test.mjs: all assertions passed')
