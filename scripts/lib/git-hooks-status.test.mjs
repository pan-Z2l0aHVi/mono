import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { inspectGitHooks } from './git-hooks-status.mjs'

const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'git-hooks-status-'))

function git(repo, args) {
  const result = spawnSync('git', args, { cwd: repo, encoding: 'utf8' })
  assert.equal(result.status, 0, `git ${args.join(' ')} failed: ${result.stderr}`)
  return result.stdout.trim()
}

function initRepo(name) {
  const repo = path.join(fixtureRoot, name)
  fs.mkdirSync(repo)
  git(repo, ['init', '--quiet'])
  return repo
}

function installHooks(hooksDir, names, mode = 0o755) {
  fs.mkdirSync(hooksDir, { recursive: true })
  for (const name of names) {
    fs.writeFileSync(path.join(hooksDir, name), '#!/bin/sh\nexit 0\n')
    fs.chmodSync(path.join(hooksDir, name), mode)
  }
}

try {
  // 目录本身不存在：两条都 missing，并且修复命令要先给直接安装器，因为普通 pnpm install 在
  // 依赖已就绪时不会重跑 prepare。
  const missingRepo = initRepo('missing')
  const missingHooks = path.join(fixtureRoot, 'missing-hooks')
  git(missingRepo, ['config', 'core.hooksPath', missingHooks])
  const missing = inspectGitHooks(missingRepo, {})
  assert.equal(missing.level, 'fail')
  assert.match(missing.detail, /commit-msg \(missing\)/)
  assert.match(missing.detail, /pre-commit \(missing\)/)
  assert.match(missing.detail, /hooks directory itself does not exist/)
  assert.match(missing.detail, /node scripts\/maintenance\/install-git-hooks\.mjs/)
  assert.match(missing.detail, /pnpm install --force/)

  // 只缺一个 hook：fail 必须点名缺的那个，而不是笼统报两项。
  const partialRepo = initRepo('partial')
  const partialHooks = path.join(fixtureRoot, 'partial-hooks')
  installHooks(partialHooks, ['commit-msg'])
  git(partialRepo, ['config', 'core.hooksPath', partialHooks])
  const partial = inspectGitHooks(partialRepo, {})
  assert.equal(partial.level, 'fail')
  assert.match(partial.detail, /pre-commit \(missing\)/)
  assert.doesNotMatch(partial.detail, /commit-msg \(missing\)/)

  // 内容在但丢失执行位；Windows 上 X_OK 等价于 F_OK，跳过该分支。
  if (process.platform !== 'win32') {
    const notExecutableRepo = initRepo('notExecutable')
    const notExecutableHooks = path.join(fixtureRoot, 'notExecutable-hooks')
    installHooks(notExecutableHooks, ['commit-msg', 'pre-commit'], 0o644)
    git(notExecutableRepo, ['config', 'core.hooksPath', notExecutableHooks])
    const notExecutableResult = inspectGitHooks(notExecutableRepo, {})
    assert.equal(notExecutableResult.level, 'fail')
    assert.match(notExecutableResult.detail, /commit-msg \(not executable\)/)
    assert.match(notExecutableResult.detail, /pre-commit \(not executable\)/)
  }

  // 相对 core.hooksPath 按仓库根解析。
  const relativeRepo = initRepo('relative')
  const relativeHooks = path.join(relativeRepo, 'hook-dir')
  installHooks(relativeHooks, ['commit-msg', 'pre-commit'])
  git(relativeRepo, ['config', 'core.hooksPath', 'hook-dir'])
  const relative = inspectGitHooks(relativeRepo, {})
  assert.equal(relative.level, 'ok')
  assert.match(relative.detail, /installed and executable at .*hook-dir/)

  // 三种显式关闭方式都应报告为 ok（intentional），而不是 fail 并建议运行同样会跳过的安装器。
  const devNullRepo = initRepo('dev-null')
  git(devNullRepo, ['config', 'core.hooksPath', '/dev/null'])
  assert.equal(inspectGitHooks(devNullRepo, {}).level, 'ok')
  assert.match(inspectGitHooks(devNullRepo, {}).detail, /core\.hooksPath=\/dev\/null/)

  const preferenceRepo = initRepo('preference')
  git(preferenceRepo, ['config', 'core.hooksPath', path.join(fixtureRoot, 'preference-hooks')])
  git(preferenceRepo, ['config', 'vp.hooks.disabled', 'true'])
  const preference = inspectGitHooks(preferenceRepo, {})
  assert.equal(preference.level, 'ok')
  assert.match(preference.detail, /disabled by the local Vite\+ preference/)

  const environmentRepo = initRepo('environment')
  git(environmentRepo, ['config', 'core.hooksPath', path.join(fixtureRoot, 'environment-hooks')])
  const environment = inspectGitHooks(environmentRepo, { HUSKY: '0' })
  assert.equal(environment.level, 'ok')
  assert.match(environment.detail, /disabled by the environment/)

  console.log('git-hooks-status tests passed')
} finally {
  fs.rmSync(fixtureRoot, { recursive: true, force: true })
}
