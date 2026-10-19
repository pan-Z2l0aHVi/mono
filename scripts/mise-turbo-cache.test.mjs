import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const helper = path.join(root, 'scripts', 'turbo-cache-dir.sh')

function run(command, args, env) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    env: { ...env, MISE_TRUSTED_CONFIG_PATHS: root }
  })
  assert.notEqual(result.status, null, `${command} did not run: ${result.error?.message ?? ''}`)
  assert.equal(result.status, 0, `${command} failed (${result.status}): ${result.stderr}`)
  return result.stdout.trim()
}

function canonicalCache(env) {
  return run('/bin/sh', [helper], env)
}

function miseCache(env) {
  return run('mise', ['exec', '--', 'printenv', 'TURBO_CACHE_DIR'], env)
}

const localEnv = { ...process.env }
delete localEnv.GITHUB_ACTIONS
delete localEnv.TURBO_CACHE_DIR
assert.equal(miseCache(localEnv), canonicalCache(localEnv), 'local mise must use the helper-derived cache')

const localOverride = {
  ...localEnv,
  GITHUB_ACTIONS: '',
  TURBO_CACHE_DIR: path.join(os.tmpdir(), 'untrusted turbo cache override')
}
assert.equal(miseCache(localOverride), canonicalCache(localOverride), 'local mise must ignore an inherited override')

const workspaceWithQuotes = fs.mkdtempSync(path.join(os.tmpdir(), "greypan GHA workspace 'quoted'-"))
try {
  const ghaOverride = path.join(workspaceWithQuotes, "artifact cache 'space'")
  assert.equal(
    miseCache({ ...localEnv, GITHUB_ACTIONS: 'true', TURBO_CACHE_DIR: ghaOverride }),
    ghaOverride,
    'GitHub Actions mise must preserve the explicit workspace override verbatim'
  )
  const ghaWorkspace = 'D:\\a\\mono\\mono'
  assert.equal(
    miseCache({
      ...localEnv,
      GITHUB_ACTIONS: 'true',
      GITHUB_WORKSPACE: ghaWorkspace,
      TURBO_CACHE_DIR: '',
      TMPDIR: '/__mise_probe_missing_unix_temp__'
    }),
    `${ghaWorkspace}/.turbo`,
    'an empty GitHub Actions override must use its workspace without calling the POSIX helper'
  )

  const ghaWithoutWorkspace = { ...localEnv, GITHUB_ACTIONS: 'true', TURBO_CACHE_DIR: '' }
  delete ghaWithoutWorkspace.GITHUB_WORKSPACE
  assert.equal(
    miseCache(ghaWithoutWorkspace),
    canonicalCache(localEnv),
    'an incomplete GitHub Actions environment must fall back to the local helper'
  )
} finally {
  fs.rmSync(workspaceWithQuotes, { recursive: true, force: true })
}

console.log('scripts/mise-turbo-cache.test.mjs: all assertions passed')
