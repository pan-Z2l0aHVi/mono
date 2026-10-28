import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { run } from '../go-check.mjs'

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'greypan-go-check-'))
const log = path.join(root, 'tool-calls.log')
const gofmtFail = path.join(root, 'gofmt-fail')
const gofmtDirty = path.join(root, 'gofmt-dirty')
const vetFail = path.join(root, 'vet-fail')
const gofmtStub = path.join(root, 'gofmt-stub.sh')
const goStub = path.join(root, 'go-stub.sh')

function writeStub(file, body) {
  fs.writeFileSync(file, `#!/bin/sh\n${body}\n`)
  fs.chmodSync(file, 0o755)
}

function check(extraEnv = {}) {
  return run({
    root,
    env: {
      ...process.env,
      AGENT_GOFMT_ARGV: JSON.stringify(['sh', gofmtStub]),
      AGENT_GO_VET_ARGV: JSON.stringify(['sh', goStub]),
      GO_CHECK_LOG: log,
      GOFMT_FAIL: gofmtFail,
      GOFMT_DIRTY: gofmtDirty,
      GO_VET_FAIL: vetFail,
      ...extraEnv
    }
  })
}

async function failure(promise) {
  try {
    await promise
  } catch (error) {
    return error.message
  }
  assert.fail('expected check-go to fail')
}

try {
  writeStub(
    gofmtStub,
    [
      'echo "gofmt|$*" >> "$GO_CHECK_LOG"',
      'if [ -f "$GOFMT_FAIL" ]; then',
      '  echo "gofmt exploded" >&2',
      '  exit 2',
      'fi',
      'if [ -f "$GOFMT_DIRTY" ]; then',
      '  shift',
      '  for arg in "$@"; do [ -f "$arg" ] && echo "$arg"; done',
      'fi',
      'exit 0'
    ].join('\n')
  )
  writeStub(
    goStub,
    [
      'echo "go|$PWD|$*" >> "$GO_CHECK_LOG"',
      'if [ -f "$GO_VET_FAIL" ]; then',
      '  echo "vet exploded" >&2',
      '  exit 1',
      'fi',
      'exit 0'
    ].join('\n')
  )

  fs.mkdirSync(path.join(root, 'modA'), { recursive: true })
  fs.mkdirSync(path.join(root, 'modB', 'sub'), { recursive: true })
  fs.mkdirSync(path.join(root, 'node_modules', 'ghost'), { recursive: true })
  fs.writeFileSync(path.join(root, 'modA', 'go.mod'), 'module example.com/a\n')
  fs.writeFileSync(path.join(root, 'modA', 'main.go'), 'package main\n')
  fs.writeFileSync(path.join(root, 'modB', 'go.mod'), 'module example.com/b\n')
  fs.writeFileSync(path.join(root, 'modB', 'sub', 'x.go'), 'package sub\n')
  fs.writeFileSync(path.join(root, 'untracked.go'), 'package root\n')
  fs.writeFileSync(path.join(root, 'node_modules', 'ghost', 'go.mod'), 'module ghost\n')
  fs.writeFileSync(path.join(root, 'node_modules', 'ghost', 'ghost.go'), 'package ghost\n')

  assert.match(await check(), /3 Go file\(s\) checked; 2 module\(s\) vetted/)
  const calls = fs.readFileSync(log, 'utf8').trim().split('\n')
  assert.ok(calls.includes('gofmt|-l modA/main.go modB/sub/x.go untracked.go'))
  // sh 会报告解析过符号链接的物理路径（macOS 的 /var -> /private/var）。
  assert.ok(calls.some(line => line === `go|${fs.realpathSync(path.join(root, 'modA'))}|vet ./...`))
  assert.ok(calls.some(line => line === `go|${fs.realpathSync(path.join(root, 'modB'))}|vet ./...`))
  assert.doesNotMatch(calls.join('\n'), /ghost/)

  fs.writeFileSync(gofmtDirty, 'dirty\n')
  assert.match(await failure(check()), /not formatted[\s\S]*modA\/main\.go/)
  fs.rmSync(gofmtDirty)
  fs.rmSync(log, { force: true })

  // gofmt 解析失败时 stdout 可能为空；必须按退出码失败，而不是看有没有列出文件。
  fs.writeFileSync(gofmtFail, 'fail\n')
  assert.match(await failure(check()), /gofmt exploded/)
  fs.rmSync(gofmtFail)
  fs.rmSync(log, { force: true })

  fs.writeFileSync(vetFail, 'fail\n')
  assert.match(await failure(check()), /go vet failed in modA[\s\S]*vet exploded/)
  fs.rmSync(vetFail)
  fs.rmSync(log, { force: true })

  assert.match(await failure(check({ AGENT_GOFMT_ARGV: 'gofmt' })), /AGENT_GOFMT_ARGV must be a JSON array/)

  process.stdout.write('packages/monorepo-kit/src/policy/__tests__/go-check.test.mjs: all assertions passed\n')
} finally {
  fs.rmSync(root, { recursive: true, force: true })
}
