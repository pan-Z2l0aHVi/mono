import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterAll, it } from 'vite-plus/test'

import { defineCatch } from '../../runner/catch'
import { defineRunner } from '../../runner/runner'
import type { ToolchainStep } from '../../toolchain/toolchain'
import { defineStagedClean } from '../staged-clean'

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'greypan-staged-clean-'))
const env = {
  ...process.env,
  GIT_AUTHOR_NAME: 'Codex',
  GIT_AUTHOR_EMAIL: 'noreply@openai.com',
  GIT_COMMITTER_NAME: 'Codex',
  GIT_COMMITTER_EMAIL: 'noreply@openai.com'
}
const toolStub = path.join(root, 'format-tool-stub.sh')
const log = path.join(root, 'format-tool-calls.log')
const failMarker = path.join(root, 'format-stub-fail')
const dirtyGoMarker = path.join(root, 'format-stub-dirty-go')

// 步骤表是消费仓库的事实，测试自带一份：这里钉的是 check 的匹配、判据与信息组装，
// 真实工具表由 `scripts/policies/staged-clean.mjs` 决定，并由门禁本身的运行来兑现。
const steps: ToolchainStep[] = [
  {
    name: 'vp check',
    match: /./,
    seam: 'AGENT_VP_ARGV',
    command: ['sh', toolStub, 'vp'],
    args: ['check', '--no-error-on-unmatched-pattern'],
    failOn: 'exit',
    hint: 'vp hint line'
  },
  {
    name: 'stylelint',
    match: /\.(?:css|scss|less|html|vue)$/,
    seam: 'AGENT_STYLELINT_ARGV',
    command: ['sh', toolStub, 'stylelint'],
    args: ['--allow-empty-input'],
    failOn: 'exit',
    hint: 'stylelint hint line'
  },
  {
    name: 'gofmt',
    match: /\.go$/,
    seam: 'AGENT_GOFMT_ARGV',
    command: ['sh', toolStub, 'gofmt'],
    args: ['-l'],
    failOn: 'stdout',
    hint: 'gofmt hint line'
  }
]
const stagedClean = defineStagedClean({ steps })

function git(...args: string[]): string {
  return execFileSync('git', ['-C', root, ...args], { env, encoding: 'utf8' }).trim()
}

// 链尾带 defineCatch：测试 seam 写坏属于装配故障，走 `throw: ` 而不是某个域名前缀。
function kit(extraEnv: NodeJS.ProcessEnv = {}) {
  return defineRunner()
    .use(stagedClean)
    .use(defineCatch())
    .make({
      root,
      env: {
        ...env,
        AGENT_VP_ARGV: JSON.stringify(['sh', toolStub, 'vp']),
        AGENT_STYLELINT_ARGV: JSON.stringify(['sh', toolStub, 'stylelint']),
        AGENT_GOFMT_ARGV: JSON.stringify(['sh', toolStub, 'gofmt']),
        FORMAT_STUB_LOG: log,
        FORMAT_STUB_FAIL: failMarker,
        FORMAT_STUB_DIRTY_GO: dirtyGoMarker,
        ...extraEnv
      }
    })
}

async function failure(extraEnv: NodeJS.ProcessEnv = {}): Promise<string> {
  const result = await kit(extraEnv).run()
  if (result.ok) assert.fail('expected staged-clean to fail')
  return result.error
}

it('staged-clean', async () => {
  fs.mkdirSync(root, { recursive: true })
  git('init', '-b', 'main')
  fs.writeFileSync(path.join(root, 'README.md'), '# fixture\n')
  git('add', 'README.md')
  git('commit', '-m', 'initial fixture')

  const stub =
    [
      '#!/bin/sh',
      'tool=$1',
      'shift',
      'for arg in "$@"; do',
      '  [ -f "$arg" ] || continue',
      '  [ "${arg#-}" = "$arg" ] && echo "$tool|$arg" >> "$FORMAT_STUB_LOG"',
      'done',
      'if [ "$tool" = gofmt ]; then',
      '  [ -f "$FORMAT_STUB_DIRTY_GO" ] || exit 0',
      '  for arg in "$@"; do [ -f "$arg" ] && echo "$arg"; done',
      '  exit 0',
      'fi',
      'if [ -f "$FORMAT_STUB_FAIL" ] && [ "$tool" = vp ]; then',
      '  echo "stub: vp found issues"',
      '  exit 1',
      'fi',
      'exit 0'
    ].join('\n') + '\n'
  fs.writeFileSync(toolStub, stub)
  fs.chmodSync(toolStub, 0o755)

  fs.mkdirSync(path.join(root, 'demo 目录'), { recursive: true })
  fs.writeFileSync(path.join(root, 'demo 目录', 'a b.mjs'), 'export const a = 1\n')
  fs.writeFileSync(path.join(root, 'probe.css'), 'a { color: red; }\n')
  fs.writeFileSync(path.join(root, 'probe.go'), 'package main\n')
  fs.writeFileSync(path.join(root, 'ghost.mjs'), 'untracked, so never checked\n')
  git('add', 'demo 目录/a b.mjs', 'probe.css', 'probe.go')

  assert.ok((await kit().run()).ok)
  const callLines = fs.readFileSync(log, 'utf8').trim().split('\n')
  assert.ok(callLines.includes('vp|demo 目录/a b.mjs'))
  assert.equal(callLines.filter(line => line.startsWith('vp|')).length, 3)
  assert.ok(callLines.includes('stylelint|probe.css'))
  assert.equal(callLines.filter(line => line.startsWith('stylelint|')).length, 1)
  assert.ok(callLines.includes('gofmt|probe.go'))
  assert.equal(callLines.filter(line => line.startsWith('gofmt|')).length, 1)
  assert.doesNotMatch(callLines.join('\n'), /ghost\.mjs/)
  assert.doesNotMatch(callLines.join('\n'), /stylelint\|probe\.go/)
  assert.doesNotMatch(callLines.join('\n'), /gofmt\|probe\.css/)

  fs.rmSync(log)
  fs.writeFileSync(failMarker, 'stub fails\n')
  const vpMessage = await failure()
  assert.match(vpMessage, /stub: vp found issues/)
  assert.match(vpMessage, /formatting, lint or types \(vp check\)/)
  assert.match(vpMessage, /vp hint line/)
  fs.rmSync(failMarker)
  fs.rmSync(log, { force: true })

  // A staged path beginning with a dash must fail before it reaches any tool argument.
  fs.writeFileSync(path.join(root, '--fix'), 'export const fix = 1\n')
  git('add', '--', '--fix')
  assert.match(await failure(), /^git: cannot run: staged path '--fix' starts with '-'/)
  assert.equal(fs.existsSync(log), false)
  git('rm', '--cached', '--quiet', '--', '--fix')
  fs.rmSync(path.join(root, '--fix'))

  // Git C-quotes names containing a double quote; the quoted spelling is not a path a formatter can inspect.
  fs.writeFileSync(path.join(root, 'probe".mjs'), 'export const quote = 1\n')
  git('add', '--', 'probe".mjs')
  assert.match(await failure(), /^git: cannot run: git C-quoted a staged path/)
  assert.equal(fs.existsSync(log), false)
  git('rm', '--cached', '--quiet', '--', 'probe".mjs')
  fs.rmSync(path.join(root, 'probe".mjs'))

  // gofmt -l signals dirty files with stdout and exit 0, so stdout itself must make the check fail.
  fs.writeFileSync(dirtyGoMarker, 'gofmt reports output\n')
  fs.writeFileSync(path.join(root, 'probe-two.go'), 'package main\n')
  git('add', 'probe-two.go')
  const goMessage = await failure()
  assert.match(goMessage, /^git: staged files are not clean/)
  assert.match(goMessage, /probe-two\.go/)
  assert.match(goMessage, /formatting, lint or types \(gofmt\)/)
  assert.match(goMessage, /gofmt hint line/)

  // 自指符号链接让 statSync 抛 ELOOP：这一个文件只记自己那行，其余暂存文件与工具链的
  // 失败证据仍要一起回来。异常若冲出回调，门禁只剩一句 `throw:`，整批证据都丢。
  const loop = path.join(root, 'loop.mjs')
  fs.symlinkSync('loop.mjs', loop)
  git('add', 'loop.mjs')
  fs.writeFileSync(failMarker, 'stub fails\n')
  const statMessage = await failure()
  assert.match(statMessage, /cannot stat staged path 'loop\.mjs' \(ELOOP\)/)
  assert.match(statMessage, /stub: vp found issues/, '其余暂存文件的工具失败证据不能被一个 stat 异常吞掉')
  git('rm', '--cached', '--quiet', '--', 'loop.mjs')
  fs.rmSync(loop)
  fs.rmSync(failMarker)

  // The test seam is a JSON argv array; a command string must fail instead of reaching a shell.
  assert.match(await failure({ AGENT_VP_ARGV: 'pnpm exec vp' }), /^throw: AGENT_VP_ARGV must be a JSON array/)
})

afterAll(() => {
  fs.rmSync(root, { recursive: true, force: true })
})
