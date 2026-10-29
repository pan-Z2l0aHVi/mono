import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterAll, it } from 'vite-plus/test'

import { inspectGitHooks } from '../git-hooks-status'

const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'git-hooks-status-'))

const required = ['commit-msg', 'pre-commit']
// env 只用于关闭开关的探测，默认给空对象：测试不能受开发者 shell 里的 HUSKY 等变量影响。
const inspect = (repo: string, env: NodeJS.ProcessEnv = {}) => inspectGitHooks(repo, { env, required })

// 隔离 global/system Git 配置：开发者可能把 vp.hooks.disabled 写进全局配置，测试不能受它影响。
const globalConfig = path.join(fixtureRoot, 'gitconfig')
fs.writeFileSync(globalConfig, '')
process.env.GIT_CONFIG_GLOBAL = globalConfig
process.env.GIT_CONFIG_NOSYSTEM = '1'
process.env.HOME = path.join(fixtureRoot, 'home')
process.env.XDG_CONFIG_HOME = path.join(fixtureRoot, 'xdg')
for (const name of Object.keys(process.env)) {
  if (name.startsWith('GIT_CONFIG_') && !['GIT_CONFIG_GLOBAL', 'GIT_CONFIG_NOSYSTEM'].includes(name)) {
    delete process.env[name]
  }
}

function git(repo: string, args: readonly string[]): string {
  const result = spawnSync('git', args, { cwd: repo, encoding: 'utf8' })
  assert.equal(result.status, 0, `git ${args.join(' ')} failed: ${result.stderr}`)
  return result.stdout.trim()
}

function initRepo(name: string): string {
  const repo = path.join(fixtureRoot, name)
  fs.mkdirSync(repo)
  git(repo, ['init', '--quiet'])
  return repo
}

function installHooks(hooksDir: string, names: readonly string[], mode = 0o755): void {
  fs.mkdirSync(hooksDir, { recursive: true })
  for (const name of names) {
    fs.writeFileSync(path.join(hooksDir, name), '#!/bin/sh\nexit 0\n')
    fs.chmodSync(path.join(hooksDir, name), mode)
  }
}

it('git-hooks-status', async () => {
  // 目录本身不存在：两条都 missing，并且修复命令要先给直接安装器，因为普通 pnpm install 在
  // 依赖已就绪时不会重跑 prepare。
  const missingRepo = initRepo('missing')
  const missingHooks = path.join(fixtureRoot, 'missing-hooks')
  git(missingRepo, ['config', 'core.hooksPath', missingHooks])
  const missing = inspect(missingRepo)
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
  const partial = inspect(partialRepo)
  assert.equal(partial.level, 'fail')
  assert.match(partial.detail, /pre-commit \(missing\)/)
  assert.doesNotMatch(partial.detail, /commit-msg \(missing\)/)

  // 内容在但丢失执行位；Windows 上 X_OK 等价于 F_OK，跳过该分支。
  if (process.platform !== 'win32') {
    const notExecutableRepo = initRepo('notExecutable')
    const notExecutableHooks = path.join(fixtureRoot, 'notExecutable-hooks')
    installHooks(notExecutableHooks, ['commit-msg', 'pre-commit'], 0o644)
    git(notExecutableRepo, ['config', 'core.hooksPath', notExecutableHooks])
    const notExecutableResult = inspect(notExecutableRepo)
    assert.equal(notExecutableResult.level, 'fail')
    assert.match(notExecutableResult.detail, /commit-msg \(not executable\)/)
    assert.match(notExecutableResult.detail, /pre-commit \(not executable\)/)
  }

  // 相对 core.hooksPath 按仓库根解析。
  const relativeRepo = initRepo('relative')
  const relativeHooks = path.join(relativeRepo, 'hook-dir')
  installHooks(relativeHooks, ['commit-msg', 'pre-commit'])
  git(relativeRepo, ['config', 'core.hooksPath', 'hook-dir'])
  const relative = inspect(relativeRepo)
  assert.equal(relative.level, 'ok')
  assert.match(relative.detail, /installed and executable at .*hook-dir/)

  // 三种显式关闭方式都应报告为 ok（intentional），而不是 fail 并建议运行同样会跳过的安装器。
  const devNullRepo = initRepo('dev-null')
  git(devNullRepo, ['config', 'core.hooksPath', '/dev/null'])
  assert.equal(inspect(devNullRepo).level, 'ok')
  assert.match(inspect(devNullRepo).detail, /core\.hooksPath=\/dev\/null/)

  const preferenceRepo = initRepo('preference')
  git(preferenceRepo, ['config', 'core.hooksPath', path.join(fixtureRoot, 'preference-hooks')])
  git(preferenceRepo, ['config', 'vp.hooks.disabled', 'true'])
  const preference = inspect(preferenceRepo)
  assert.equal(preference.level, 'ok')
  assert.match(preference.detail, /disabled by the local Vite\+ preference/)

  const environmentRepo = initRepo('environment')
  git(environmentRepo, ['config', 'core.hooksPath', path.join(fixtureRoot, 'environment-hooks')])
  for (const name of ['HUSKY', 'VP_GIT_HOOKS', 'VITE_GIT_HOOKS']) {
    const environment = inspect(environmentRepo, { [name]: '0' })
    assert.equal(environment.level, 'ok', `${name}=0 must disable the check`)
    assert.match(environment.detail, /disabled by the environment/)
  }

  // hook 路径被目录占用：必须是 fail，而不是被当成文件通过。
  const directoryRepo = initRepo('directory')
  const directoryHooks = path.join(fixtureRoot, 'directory-hooks')
  installHooks(directoryHooks, ['pre-commit'])
  fs.mkdirSync(path.join(directoryHooks, 'commit-msg'))
  git(directoryRepo, ['config', 'core.hooksPath', directoryHooks])
  const directory = inspect(directoryRepo)
  assert.equal(directory.level, 'fail')
  assert.match(directory.detail, /commit-msg \(not a file\)/)

  // 非法布尔值：安装脚本会直接报错，体检至少给 warn，不能静默当作未禁用。
  const invalidRepo = initRepo('invalid')
  git(invalidRepo, ['config', 'core.hooksPath', path.join(fixtureRoot, 'invalid-hooks')])
  git(invalidRepo, ['config', 'vp.hooks.disabled', 'maybe'])
  const invalid = inspect(invalidRepo)
  assert.equal(invalid.level, 'warn')
  assert.match(invalid.detail, /cannot read vp\.hooks\.disabled/)
})

afterAll(() => {
  fs.rmSync(fixtureRoot, { recursive: true, force: true })
})
