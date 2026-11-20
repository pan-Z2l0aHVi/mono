import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const repoRoot = path.resolve(import.meta.dirname, '../../..')
const appRoot = path.join(repoRoot, 'apps', 'interweave')
const script = path.join(appRoot, 'scripts', 'set-dev-bundle-id.mjs')
const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'interweave-dev-bundle-id-'))
const plistPath = path.join(fixture, 'Info.plist')

function run(...args) {
  return execFileSync(process.execPath, [script, ...args], { encoding: 'utf8', stdio: 'pipe' })
}

try {
  const original = fs.readFileSync(path.join(appRoot, 'build', 'darwin', 'Info.dev.plist'), 'utf8')
  fs.writeFileSync(plistPath, original)
  run(plistPath)

  const rewritten = fs.readFileSync(plistPath, 'utf8')
  assert.match(rewritten, /<key>CFBundleIdentifier<\/key>\s*<string>com\.greypan\.interweave\.dev<\/string>/)
  assert.doesNotMatch(rewritten, /<key>CFBundleIdentifier<\/key>\s*<string>com\.greypan\.interweave<\/string>/)

  const restored = rewritten.replace(
    /(<key>CFBundleIdentifier<\/key>\s*<string>)com\.greypan\.interweave\.dev(<\/string>)/,
    '$1com.greypan.interweave$2'
  )
  assert.equal(restored, original, 'the rewrite must not change any plist field other than CFBundleIdentifier')

  run(plistPath)
  assert.equal(fs.readFileSync(plistPath, 'utf8'), rewritten, 'repeated runs must be idempotent')

  const missingArg = spawnSync(process.execPath, [script], { encoding: 'utf8' })
  assert.equal(missingArg.status, 1)
  assert.match(missingArg.stderr, /usage:/)

  const taskfile = fs.readFileSync(path.join(appRoot, 'build', 'darwin', 'Taskfile.yml'), 'utf8')
  const copyIndex = taskfile.indexOf('cp "build/darwin/Info.dev.plist"')
  const rewriteIndex = taskfile.indexOf('node scripts/set-dev-bundle-id.mjs')
  const codesignIndex = taskfile.indexOf('codesign --force --deep --sign - "{{.BIN_DIR}}/{{.APP_NAME}}.dev.app"')
  assert.ok(copyIndex >= 0, 'the dev bundle task must copy Info.dev.plist')
  assert.ok(rewriteIndex > copyIndex, 'the dev bundle id rewrite must follow the plist copy')
  assert.ok(codesignIndex > rewriteIndex, 'the dev bundle id rewrite must precede codesign')
} finally {
  fs.rmSync(fixture, { recursive: true, force: true })
}

console.log('apps/interweave/scripts/set-dev-bundle-id.test.mjs: all assertions passed')
