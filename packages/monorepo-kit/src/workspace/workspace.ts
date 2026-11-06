import fs from 'node:fs'
import path from 'node:path'

import { definePlugin } from '@greypan/js-kit'
import { globSync } from 'glob'

import type { KitCtx } from '../runner/runner'
import { readJsonFile } from '../shared/config'
import { byCodeUnit } from '../shared/order'
import { WORKSPACE_FILE } from '../shared/workspace-root'

function parseWorkspacePattern(value: string, lineNumber: number): string {
  const trimmed = value.trim()
  const quoted = trimmed.match(/^(?:"(?<double>.*)"|'(?<single>.*)')\s*(?:#.*)?$/)
  const unquoted = trimmed.match(/^(?<value>[^#\s][^#]*?)\s*(?:#.*)?$/)
  const pattern = (quoted?.groups?.double ?? quoted?.groups?.single ?? unquoted?.groups?.value ?? '').trim()

  if (!pattern) throw new Error(`pnpm-workspace.yaml:${lineNumber} contains an invalid packages pattern`)
  return pattern
}

export function readPnpmWorkspacePatterns(root: string): string[] {
  const workspaceFile = path.join(root, WORKSPACE_FILE)
  if (!fs.existsSync(workspaceFile)) throw new Error(`missing ${WORKSPACE_FILE}`)

  const lines = fs.readFileSync(workspaceFile, 'utf8').split(/\r?\n/)
  const start = lines.findIndex(line => /^packages:\s*(?:#.*)?$/.test(line))
  if (start < 0) throw new Error(`${WORKSPACE_FILE} is missing a top-level packages list`)

  const patterns: string[] = []
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index]
    if (!line.trim() || /^\s*#/.test(line)) continue
    if (!/^\s/.test(line)) break

    const match = line.match(/^\s+-\s+(?<value>.+)$/)
    if (!match?.groups?.value) throw new Error(`${WORKSPACE_FILE}:${index + 1} must be a packages list entry`)
    patterns.push(parseWorkspacePattern(match.groups.value, index + 1))
  }

  if (patterns.length === 0) throw new Error(`${WORKSPACE_FILE} packages list must not be empty`)
  if (!patterns.some(pattern => !pattern.startsWith('!')))
    throw new Error(`${WORKSPACE_FILE} packages list must include a positive pattern`)

  return patterns
}

/**
 * `pnpm-workspace.yaml` 里 `dir/**` 或 `dir/*` 形态的模式所指向的容器目录，按码位排序。
 * 只读配置、不扫盘：逐包列举的模式（如 `tools/cli`）不以某个目录为容器，不产生结果。
 */
export function readPnpmWorkspaceDirectories(root: string): string[] {
  const directories = readPnpmWorkspacePatterns(root)
    .filter(pattern => !pattern.startsWith('!'))
    .flatMap(pattern => {
      const segments = pattern.replace(/\/+$/, '').split('/')
      const glob = segments.findIndex(segment => segment.includes('*'))
      return glob > 0 ? [segments.slice(0, glob).join('/')] : []
    })
  return [...new Set(directories)].sort(byCodeUnit)
}

/** 返回每个 workspace `package.json` 的绝对路径。 */
export function listPnpmWorkspaceManifests(root: string): string[] {
  const patterns = readPnpmWorkspacePatterns(root)
  const ignoredPatterns = [
    '**/node_modules/**',
    ...patterns.filter(pattern => pattern.startsWith('!')).map(pattern => pattern.slice(1))
  ]
  const manifests = patterns
    .filter(pattern => !pattern.startsWith('!'))
    .flatMap(pattern =>
      globSync(`${pattern.replace(/\/+$/, '')}/package.json`, {
        cwd: root,
        ignore: ignoredPatterns,
        nodir: true,
        posix: true
      })
    )

  return [...new Set(manifests)].sort().map(file => path.join(root, file))
}

export interface WorkspaceApi {
  /** `pnpm-workspace.yaml` 的 packages 模式，含 `!` 排除项 */
  readonly patterns: () => readonly string[]
  /** 每个 workspace `package.json` 的仓库相对路径，按码位排序 */
  readonly manifests: () => readonly string[]
  /** 读取 `manifests()` 给出的 manifest；读不到或不是合法 JSON 时抛出 */
  readonly readManifest: <T = unknown>(file: string) => T
}

export const defineWorkspace = () =>
  definePlugin<WorkspaceApi, KitCtx>(ctx => ({
    patterns: () => readPnpmWorkspacePatterns(ctx.root),
    manifests: () =>
      listPnpmWorkspaceManifests(ctx.root).map(file => path.relative(ctx.root, file).split(path.sep).join('/')),
    readManifest: <T = unknown>(file: string) => readJsonFile<T>(path.join(ctx.root, file))
  }))
