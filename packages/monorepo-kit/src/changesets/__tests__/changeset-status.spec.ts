import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it } from 'vite-plus/test'

import { defineChangesetStatus } from '../changeset-status'

/*
 * G7 包级测试：changeset-status 的整条链在真实子进程上走通（chain → `pnpm exec changeset
 * status --since=<base>` → 退出码转 ok/Err）。`changeset` CLI 用一份 stub 顶上：真实的
 * changesets 归匹配置不归本链管（本判定只转写退出码），stub 按「区间内有没有 changeset 文件」
 * 给出与真实 CLI 同向的退出码，并把收到的 argv 落盘供 --since 透传断言。
 */

const CHANGESET_STUB = `#!/usr/bin/env node
const fs = require('node:fs')
const path = require('node:path')
const args = process.argv.slice(2)
fs.writeFileSync(process.env.CHANGESET_STUB_ARGS || 'changeset-stub-args.json', JSON.stringify(args))
const since = args.find(arg => arg.startsWith('--since='))
if (!since) {
  console.error('stub: --since is required')
  process.exit(2)
}
const directory = path.join(process.cwd(), '.changeset')
const files = fs.existsSync(directory)
  ? fs.readdirSync(directory).filter(name => name.endsWith('.md'))
  : []
if (files.length === 0) {
  console.error('No changesets found. If this is unexpected...\\n\\n  (stub mirror of the real CLI message)')
  process.exit(1)
}
console.log('All changesets are merged.')
`

const gitEnv = {
  ...process.env,
  GIT_AUTHOR_NAME: 'Codex',
  GIT_AUTHOR_EMAIL: 'noreply@openai.com',
  GIT_COMMITTER_NAME: 'Codex',
  GIT_COMMITTER_EMAIL: 'noreply@openai.com',
  PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN: 'false'
}

const fixtureRoots: string[] = []

afterEach(() => {
  for (const root of fixtureRoots.splice(0)) fs.rmSync(root, { recursive: true, force: true })
})

function git(root: string, ...args: string[]): string {
  return execFileSync('git', ['-C', root, ...args], { env: gitEnv, encoding: 'utf8' }).trim()
}

function makeRepo(withChangeset: boolean): { root: string; base: string; argsFile: string } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'changeset-status-spec-'))
  fixtureRoots.push(root)
  git(root, 'init', '-b', 'main')
  fs.mkdirSync(path.join(root, '.changeset'), { recursive: true })
  fs.writeFileSync(path.join(root, '.changeset', 'config.json'), JSON.stringify({ ignore: [] }, null, 2) + '\n')
  fs.writeFileSync(path.join(root, 'README.md'), '# fixture\n')
  fs.writeFileSync(
    path.join(root, 'package.json'),
    JSON.stringify({ name: 'changeset-status-fixture', private: true }, null, 2) + '\n'
  )
  git(root, 'add', '-A')
  git(root, 'commit', '-m', 'base')
  const base = git(root, 'rev-parse', 'HEAD')
  if (withChangeset) {
    fs.writeFileSync(
      path.join(root, '.changeset', 'feature.md'),
      '---\n"@scope/demo": patch\n---\nFeature declaration.\n'
    )
    git(root, 'add', '-A')
    git(root, 'commit', '-m', 'feature')
  }
  fs.mkdirSync(path.join(root, 'node_modules/.bin'), { recursive: true })
  const argsFile = path.join(root, 'changeset-stub-args.json')
  fs.writeFileSync(path.join(root, 'node_modules/.bin/changeset'), CHANGESET_STUB, { mode: 0o755 })
  fs.chmodSync(path.join(root, 'node_modules/.bin/changeset'), 0o755)
  return { root, base, argsFile }
}

function run(root: string, base: string) {
  return defineChangesetStatus({ base }).make({ root, env: gitEnv }).run()
}

function expectNoInstallArtifacts(root: string): void {
  expect(fs.existsSync(path.join(root, 'pnpm-lock.yaml'))).toBe(false)
  expect(fs.existsSync(path.join(root, 'node_modules/.modules.yaml'))).toBe(false)
}

describe('defineChangesetStatus（真实子进程）', () => {
  it('区间内有 changeset：status 退出 0，链返回 ok', async () => {
    const { root, base, argsFile } = makeRepo(true)

    const result = await run(root, base)

    expectNoInstallArtifacts(root)
    expect(result).toEqual({ ok: true, value: undefined })
    const stubArgs = JSON.parse(fs.readFileSync(argsFile, 'utf8')) as string[]
    // pnpm exec 以 changeset 二进制身份调起 stub：argv 里只剩 status 与 --since。
    assert.deepEqual(stubArgs, ['status', `--since=${base}`])
  })

  it('区间内没有 changeset：status 的非零退出转成带归因前缀的 Err', async () => {
    const { root, base } = makeRepo(false)

    const result = await run(root, base)

    expectNoInstallArtifacts(root)
    expect(result.ok).toBe(false)
    assert.match(!result.ok ? result.error : '', /^changeset: status --since=/)
    assert.match(!result.ok ? result.error : '', /No changesets found/)
  })
})
