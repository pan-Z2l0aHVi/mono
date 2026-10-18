import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const repoRoot = path.resolve(import.meta.dirname, '..')
const checker = path.join(repoRoot, '.agents', 'checks', 'format-clean')
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'greypan-format-clean-'))
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

function git(...args) {
  return execFileSync('git', ['-C', root, ...args], { env, encoding: 'utf8' }).trim()
}

function runCheck(extraEnv = {}) {
  return spawnSync('/bin/sh', [checker], {
    cwd: root,
    env: {
      ...env,
      AGENT_VP_CMD: 'sh ' + toolStub + ' vp',
      AGENT_STYLELINT_CMD: 'sh ' + toolStub + ' stylelint',
      AGENT_GOFMT_CMD: 'sh ' + toolStub + ' gofmt',
      FORMAT_STUB_LOG: log,
      FORMAT_STUB_FAIL: failMarker,
      FORMAT_STUB_DIRTY_GO: dirtyGoMarker,
      ...extraEnv
    },
    encoding: 'utf8'
  })
}

try {
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
      'for arg in "$@"; do [ "$arg" = --help ] && exit 0; done',
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

  const clean = runCheck()
  assert.equal(clean.status, 0, clean.stderr || clean.stdout)
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
  const vpFailure = runCheck()
  assert.notEqual(vpFailure.status, 0)
  assert.match(vpFailure.stdout, /stub: vp found issues/)
  assert.match(vpFailure.stderr, /formatting, lint or types/)
  assert.match(vpFailure.stderr, /never a type error/)
  fs.rmSync(failMarker)
  fs.rmSync(log, { force: true })

  // A staged path beginning with a dash must fail before it reaches any tool argument.
  fs.writeFileSync(path.join(root, '--fix'), 'export const fix = 1\n')
  git('add', '--', '--fix')
  const optionPath = runCheck()
  assert.notEqual(optionPath.status, 0)
  assert.match(optionPath.stderr, /staged path '--fix' starts with '-' and would be parsed/)
  assert.equal(fs.existsSync(log), false)
  git('rm', '--cached', '--quiet', '--', '--fix')
  fs.rmSync(path.join(root, '--fix'))

  // Git C-quotes names containing a double quote; the quoted spelling is not a path a formatter can inspect.
  fs.writeFileSync(path.join(root, 'probe".mjs'), 'export const quote = 1\n')
  git('add', '--', 'probe".mjs')
  const quotedPath = runCheck()
  assert.notEqual(quotedPath.status, 0)
  assert.match(quotedPath.stderr, /git C-quoted a staged path/)
  assert.equal(fs.existsSync(log), false)
  git('rm', '--cached', '--quiet', '--', 'probe".mjs')
  fs.rmSync(path.join(root, 'probe".mjs'))

  // gofmt -l signals dirty files with stdout and exit 0, so stdout itself must make the check fail.
  fs.writeFileSync(dirtyGoMarker, 'gofmt reports output\n')
  fs.writeFileSync(path.join(root, 'probe-two.go'), 'package main\n')
  git('add', 'probe-two.go')
  const goFailure = runCheck()
  assert.notEqual(goFailure.status, 0)
  assert.match(goFailure.stderr, /probe-two\.go/)
  assert.match(goFailure.stderr, /formatting, lint or types/)
  assert.match(goFailure.stderr, /gofmt -w <files>/)

  process.stdout.write('scripts/format-clean.test.mjs: all assertions passed\n')
} finally {
  fs.rmSync(root, { recursive: true, force: true })
}
