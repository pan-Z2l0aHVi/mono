#!/usr/bin/env node
// 仓库级只读政策检查入口。导入本模块只暴露检查集合，不访问 Git、文件系统或环境变量。
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

export const POLICY_CHECKS = Object.freeze([
  'command-conventions',
  'format-clean',
  'no-mutual-links',
  'turbo-cache-invariant',
  'web-ui-docs-inputs'
])

function gitRoot(cwd) {
  const result = spawnSync('git', ['-C', cwd, 'rev-parse', '--show-toplevel'], { encoding: 'utf8' })
  if (result.status !== 0) {
    const detail = [
      result.error?.message,
      result.signal ? 'terminated by ' + result.signal : '',
      (result.stderr || result.stdout || '').trim(),
      result.status !== null ? 'exited with ' + result.status : ''
    ]
      .filter(Boolean)
      .join('; ')
    throw new Error('current directory is not inside a Git worktree' + (detail ? ': ' + detail : ''))
  }
  return fs.realpathSync(result.stdout.trim())
}

export function runPolicies(cwd = process.cwd()) {
  const errors = []
  let root
  try {
    root = gitRoot(cwd)
  } catch (error) {
    return { ok: false, checks: [...POLICY_CHECKS], errors: [error.message] }
  }

  const directory = path.join(root, '.agents', 'checks')
  let entries
  try {
    const stat = fs.statSync(directory)
    if (!stat.isDirectory()) throw new Error('.agents/checks is not a directory')
    entries = POLICY_CHECKS.map(name => {
      const file = path.join(directory, name)
      let fileStat
      try {
        fileStat = fs.statSync(file)
      } catch (error) {
        if (error?.code === 'ENOENT') errors.push('missing or non-executable: ' + name)
        else
          errors.push(
            'cannot inspect policy check ' + name + ': ' + (error instanceof Error ? error.message : String(error))
          )
        return null
      }
      if (!fileStat.isFile() || (fileStat.mode & 0o111) === 0) {
        errors.push('missing or non-executable: ' + name)
        return null
      }
      return { name, file }
    })
  } catch (error) {
    return {
      ok: false,
      checks: [...POLICY_CHECKS],
      errors: ['required policy directory is unavailable: ' + directory + ': ' + error.message]
    }
  }

  const childEnv = { ...process.env }
  for (const name of Object.keys(childEnv)) {
    if (name.startsWith('AGENT_TASK_')) delete childEnv[name]
  }

  for (const entry of entries) {
    if (!entry) continue
    const result = spawnSync(entry.file, [], { cwd: root, env: childEnv, encoding: 'utf8' })
    const output = (result.stdout || '') + (result.stderr || '')
    if (result.status === 0) {
      if (output) process.stderr.write(output)
      continue
    }
    if (result.stdout) process.stderr.write(entry.name + ' stdout:\n' + result.stdout)
    if (result.stderr) process.stderr.write(entry.name + ' stderr:\n' + result.stderr)
    const reason = result.error
      ? result.error.message
      : result.signal
        ? 'terminated by ' + result.signal
        : 'exited with ' + result.status
    errors.push(entry.name + ': ' + reason)
  }

  return { ok: errors.length === 0, checks: [...POLICY_CHECKS], errors }
}

function main() {
  const result = runPolicies()
  if (!result.ok) {
    for (const error of result.errors) process.stderr.write('policy check failed: ' + error + '\n')
    process.exitCode = 1
    return
  }
  process.stdout.write(JSON.stringify({ ok: true, command: 'check-policies', checks: result.checks }) + '\n')
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main()
