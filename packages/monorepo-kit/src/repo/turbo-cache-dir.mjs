// `turbo-cache-dir.sh` 的 Node 同构实现。
//
// `.mise.toml` 在 Node 启动之前求值，无法复用本模块，所以 POSIX helper 仍是 bootstrap 的
// 唯一来源；本模块只供 Node 消费者使用。`turbo-cache-dir.test.mjs` 断言两者对同一仓库、
// 同一临时目录给出逐字相同的路径。
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

import { findRepoRoot } from '../shared/repo-root.mjs'

/**
 * @param {string} message
 * @returns {never}
 */
function fail(message) {
  throw new Error(`turbo-cache-dir: ${message}`)
}

function canonicalDirectory(candidate, label) {
  try {
    return fs.realpathSync(candidate)
  } catch {
    fail(`${label} is missing or inaccessible: ${candidate}`)
  }
}

function resolveTempDirectory(env) {
  for (const name of ['TMPDIR', 'TMP', 'TEMP']) {
    const value = env[name]
    if (value === undefined || value === '') continue
    if (!path.isAbsolute(value)) fail(`${name} must be an absolute existing directory: ${value}`)
    try {
      return fs.realpathSync(value)
    } catch {
      fail(`${name} is not an existing directory: ${value}`)
    }
  }
  // POSIX 的默认临时目录；realpath 让 /tmp 与 /private/tmp 这类别名归一。
  try {
    return fs.realpathSync('/tmp')
  } catch {
    fail('/tmp is not an existing directory')
  }
}

/**
 * @param {string} [repositoryRoot] defaults to the repository containing this module
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {string} canonical shared Turbo artifact cache directory
 */
export function resolveTurboCacheDir(repositoryRoot = findRepoRoot(), env = process.env) {
  const requestedRoot = path.isAbsolute(repositoryRoot) ? repositoryRoot : path.resolve(process.cwd(), repositoryRoot)
  const repoRoot = canonicalDirectory(requestedRoot, 'repository root')

  let commonDirOutput
  try {
    commonDirOutput = execFileSync('git', ['-C', repoRoot, 'rev-parse', '--path-format=absolute', '--git-common-dir'], {
      encoding: 'utf8',
      stdio: 'pipe'
    }).trim()
  } catch {
    fail(`cannot resolve the Git common directory for ${repoRoot}; see git diagnostics above`)
  }
  const commonDir = canonicalDirectory(commonDirOutput, 'Git common directory')
  const temp = resolveTempDirectory(env)

  let repoId
  try {
    repoId = execFileSync('git', ['-C', repoRoot, 'hash-object', '--stdin'], {
      input: commonDir,
      encoding: 'utf8',
      stdio: 'pipe'
    }).trim()
  } catch {
    fail('cannot derive a stable repository id from the Git common directory; see git diagnostics above')
  }
  if (!/^[0-9a-f]+$/.test(repoId)) fail(`Git returned an invalid repository id: ${repoId}`)

  const base = temp === '/' ? '' : temp.replace(/\/+$/, '')
  return `${base}/greypan/turbo-cache/${repoId}`
}
