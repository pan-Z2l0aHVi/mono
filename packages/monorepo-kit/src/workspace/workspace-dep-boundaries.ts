import fs from 'node:fs'
import path from 'node:path'

import { definePlugin, rust } from '@greypan/js-kit'

import { type Chain, type KitCtx, type Run, defineRunner } from '../runner/runner'
import { readJsonFile } from '../shared/config'
import { byCodeUnit } from '../shared/order'

const { andThen, err, ok } = rust

const ALL_DEPENDENCY_FIELDS = ['dependencies', 'optionalDependencies', 'peerDependencies', 'devDependencies'] as const

const PUBLIC_FORBIDDEN_PRIVATE_FIELDS = ['dependencies', 'optionalDependencies', 'peerDependencies'] as const

type DependencyField = (typeof ALL_DEPENDENCY_FIELDS)[number]

const IGNORED_DIRECTORIES = new Set(['node_modules', 'dist', 'build', 'coverage', '__tests__'])

export interface WorkspaceDepBoundariesOptions {
  /** workspace 容器目录（仓库相对路径前缀，如 `['apps', 'packages']`） */
  readonly workspaces: readonly string[]
  /** 应用 workspace 所在的容器目录（仓库相对路径前缀，如 `['apps']`） */
  readonly applicationDirs: readonly string[]
}

interface WorkspaceManifest {
  readonly name?: string
  readonly private?: boolean
  readonly dependencies?: Record<string, string>
  readonly optionalDependencies?: Record<string, string>
  readonly peerDependencies?: Record<string, string>
  readonly devDependencies?: Record<string, string>
}

interface WorkspaceNode {
  readonly name: string
  readonly directory: string
  readonly isPrivate: boolean
  readonly isApplication: boolean
  readonly dependenciesByField: Readonly<Record<DependencyField, readonly string[]>>
}

function normalizeDirectory(directory: string): string {
  return directory
    .replaceAll('\\', '/')
    .replace(/^(?:\.\/)+/, '')
    .replace(/\/+$/, '')
}

function isUnderDirectory(candidate: string, prefix: string): boolean {
  return candidate === prefix || candidate.startsWith(`${prefix}/`)
}

function collectManifestFiles(root: string, workspaces: readonly string[]): string[] {
  const found = new Set<string>()

  // inPackage：当前目录已处于某个 workspace 包内部。IGNORED_DIRECTORIES 只在包内部生效——
  // 容器一级（以及包之间）的名字就是包名本身，名为 build / coverage / dist 的真实包不能整包跳过。
  // node_modules 无论在哪一层都不是 workspace，始终跳过。
  const visit = (relativeDir: string, inPackage: boolean): void => {
    const absoluteDir = path.join(root, relativeDir)
    if (!fs.existsSync(absoluteDir)) return
    const skipArtifacts = inPackage || fs.existsSync(path.join(absoluteDir, 'package.json'))
    for (const entry of fs.readdirSync(absoluteDir, { withFileTypes: true })) {
      if (entry.isFile() && entry.name === 'package.json') {
        found.add(relativeDir === '.' || relativeDir === '' ? 'package.json' : `${relativeDir}/package.json`)
      } else if (entry.isDirectory()) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules') continue
        if (skipArtifacts && IGNORED_DIRECTORIES.has(entry.name)) continue
        const childDir = relativeDir === '.' || relativeDir === '' ? entry.name : `${relativeDir}/${entry.name}`
        visit(childDir, skipArtifacts)
      }
    }
  }

  for (const workspace of workspaces) {
    const normalized = normalizeDirectory(workspace)
    if (!normalized) continue
    visit(normalized, false)
  }

  return [...found].sort(byCodeUnit)
}

function readDependencyNames(record: unknown): string[] {
  if (!record || typeof record !== 'object' || Array.isArray(record)) return []
  return Object.keys(record).sort(byCodeUnit)
}

function findCycles(packageNames: readonly string[], adjacency: ReadonlyMap<string, readonly string[]>): string[] {
  const reverseAdjacency = new Map<string, string[]>()
  for (const name of packageNames) reverseAdjacency.set(name, [])
  for (const [source, targets] of adjacency) {
    for (const target of targets) {
      reverseAdjacency.get(target)?.push(source)
    }
  }

  const cycles: string[] = []
  for (const start of packageNames) {
    // 在诱导子图 { v | v >= start } 上先反向标记能回到 start 的节点，既消除同一环的旋转重复，又剪除无环死胡同分支。
    const canReachStart = new Set<string>([start])
    const queue = [start]
    while (queue.length > 0) {
      const current = queue.pop()!
      for (const prev of reverseAdjacency.get(current) ?? []) {
        if (byCodeUnit(prev, start) < 0 || canReachStart.has(prev)) continue
        canReachStart.add(prev)
        queue.push(prev)
      }
    }

    const pathStack = [start]
    const onStack = new Set<string>([start])

    const dfs = (current: string): void => {
      for (const next of adjacency.get(current) ?? []) {
        if (byCodeUnit(next, start) < 0 || !canReachStart.has(next)) continue
        if (next === start) {
          cycles.push(`${pathStack.join(' -> ')} -> ${start}`)
        } else if (!onStack.has(next)) {
          pathStack.push(next)
          onStack.add(next)
          dfs(next)
          pathStack.pop()
          onStack.delete(next)
        }
      }
    }

    dfs(start)
  }

  return cycles
}

/**
 * 纯 Manifest 拓扑包依赖边界判定，链上以 `deps: ` 起头归因：
 * 1. 全图（含 devDependencies）零循环依赖；
 * 2. 公开包（`private !== true`）在 dependencies / optionalDependencies / peerDependencies 禁引私有 workspace 包；
 * 3. 非应用 workspace 禁止在任何依赖字段（含 devDependencies）中引用 `applicationDirs` 下的应用 workspace。
 */
export const defineWorkspaceDepBoundaries = (options: WorkspaceDepBoundariesOptions): Chain => {
  const appDirs = options.applicationDirs.map(normalizeDirectory).filter(Boolean)

  return defineRunner().use(
    definePlugin<{ run: Run }, KitCtx & { run: Run }>(ctx => ({
      run: () =>
        andThen(ctx.run(), async () => {
          const manifestFiles = collectManifestFiles(ctx.root, options.workspaces)
          const nodes = new Map<string, WorkspaceNode>()

          for (const manifestFile of manifestFiles) {
            const manifest = readJsonFile<WorkspaceManifest>(path.join(ctx.root, manifestFile))
            if (typeof manifest.name !== 'string' || !manifest.name.trim()) continue
            const directory = path.posix.dirname(manifestFile)
            // 同名 manifest 按包名覆盖会静默丢掉先出现那份的依赖边：重名直接报错，
            // 让重复声明（或产物 manifest 混进扫描面）暴露出来，而不是走一半的图。
            const previous = nodes.get(manifest.name)
            if (previous) {
              return err(
                `deps: duplicate workspace package name ${manifest.name} (${previous.directory} and ${directory})`
              )
            }
            const isApplication = appDirs.some(appDir => isUnderDirectory(directory, appDir))
            nodes.set(manifest.name, {
              name: manifest.name,
              directory,
              isPrivate: manifest.private === true,
              isApplication,
              dependenciesByField: {
                dependencies: readDependencyNames(manifest.dependencies),
                optionalDependencies: readDependencyNames(manifest.optionalDependencies),
                peerDependencies: readDependencyNames(manifest.peerDependencies),
                devDependencies: readDependencyNames(manifest.devDependencies)
              }
            })
          }

          if (nodes.size === 0) return err('deps: cannot run: workspace scan found 0 package.json manifests')

          const packageNames = [...nodes.keys()].sort(byCodeUnit)
          const adjacency = new Map<string, readonly string[]>()

          for (const name of packageNames) {
            const node = nodes.get(name)!
            const targets = new Set<string>()
            for (const field of ALL_DEPENDENCY_FIELDS) {
              for (const depName of node.dependenciesByField[field]) {
                if (nodes.has(depName)) targets.add(depName)
              }
            }
            adjacency.set(name, [...targets].sort(byCodeUnit))
          }

          const violations: string[] = []

          for (const cycle of findCycles(packageNames, adjacency)) {
            violations.push(`circular workspace dependency: ${cycle}`)
          }

          for (const name of packageNames) {
            const node = nodes.get(name)!

            if (!node.isPrivate) {
              for (const field of PUBLIC_FORBIDDEN_PRIVATE_FIELDS) {
                for (const depName of node.dependenciesByField[field]) {
                  const target = nodes.get(depName)
                  if (!target || !target.isPrivate) continue
                  violations.push(
                    `public package ${node.name} cannot depend on private workspace package ${target.name} in ${field}`
                  )
                }
              }
            }

            if (!node.isApplication) {
              for (const field of ALL_DEPENDENCY_FIELDS) {
                for (const depName of node.dependenciesByField[field]) {
                  const target = nodes.get(depName)
                  if (!target || !target.isApplication) continue
                  violations.push(
                    `non-application workspace ${node.name} (${node.directory}) cannot depend on application workspace ${target.name} (${target.directory}) in ${field}`
                  )
                }
              }
            }
          }

          violations.sort(byCodeUnit)
          if (violations.length > 0) return err(`deps: ${violations.join('\ndeps: ')}`)
          return ok(undefined)
        })
    }))
  )
}
