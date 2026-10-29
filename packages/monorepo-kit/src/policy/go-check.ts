import fs from 'node:fs'
import path from 'node:path'

import { commandOutput, exec, type ExecResult } from '../shared/exec'
import { byCodeUnit } from '../shared/order'

// 仓库级 Go 静态检查：格式与 vet。工具失败必须非零退出——gofmt 在解析错误时
// 可能 stdout 为空，不能只用 `gofmt -l | grep` 判断。
export const name = 'check-go'

function argvFromEnv(value: string | undefined, fallback: string[], name: string): string[] {
  if (value === undefined) return fallback
  let parsed: unknown
  try {
    parsed = JSON.parse(value)
  } catch {
    throw new Error(`${name} must be a JSON array of non-empty strings`)
  }
  if (!Array.isArray(parsed) || parsed.length === 0 || parsed.some(item => typeof item !== 'string' || item === '')) {
    throw new Error(`${name} must be a JSON array of non-empty strings`)
  }
  return parsed as string[]
}

function collectGoSources(root: string): { goFiles: string[]; moduleDirs: string[] } {
  const goFiles: string[] = []
  const moduleDirs: string[] = []
  const visit = (directory: string): void => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue
      const absolute = path.join(directory, entry.name)
      if (entry.isDirectory()) visit(absolute)
      else if (entry.name === 'go.mod') moduleDirs.push(directory)
      else if (entry.name.endsWith('.go')) goFiles.push(path.relative(root, absolute).split(path.sep).join('/'))
    }
  }
  visit(root)
  return { goFiles: goFiles.sort(byCodeUnit), moduleDirs: moduleDirs.sort(byCodeUnit) }
}

function failureDetail(result: ExecResult): string {
  return commandOutput(result) ? `:\n${commandOutput(result)}` : ''
}

export async function run({ root, env = process.env }: { root: string; env?: NodeJS.ProcessEnv }): Promise<string> {
  const gofmtCommand = argvFromEnv(env.AGENT_GOFMT_ARGV, ['gofmt'], 'AGENT_GOFMT_ARGV')
  const goCommand = argvFromEnv(env.AGENT_GO_VET_ARGV, ['go'], 'AGENT_GO_VET_ARGV')
  const { goFiles, moduleDirs } = collectGoSources(root)

  if (goFiles.length === 0 && moduleDirs.length === 0) return 'no Go files or modules'

  if (goFiles.length > 0) {
    const result = exec(gofmtCommand[0], [...gofmtCommand.slice(1), '-l', ...goFiles], {
      cwd: root,
      env,
      stdio: 'pipe'
    })
    if (!result.ok) throw new Error(`gofmt failed${failureDetail(result)}`)
    const dirty = result.stdout.trim()
    if (dirty) throw new Error(`Go files are not formatted:\n${dirty}\nrun: gofmt -w <files> (or pnpm run fix-go)`)
  }

  for (const moduleDir of moduleDirs) {
    const relative = path.relative(root, moduleDir) || '.'
    const result = exec(goCommand[0], [...goCommand.slice(1), 'vet', './...'], {
      cwd: moduleDir,
      env,
      stdio: 'pipe'
    })
    if (!result.ok) throw new Error(`go vet failed in ${relative}${failureDetail(result)}`)
  }

  return `${goFiles.length} Go file(s) checked; ${moduleDirs.length} module(s) vetted`
}
