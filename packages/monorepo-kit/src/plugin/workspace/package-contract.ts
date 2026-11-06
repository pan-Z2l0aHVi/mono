import fs from 'node:fs'
import path from 'node:path'

import { definePlugin, rust } from '@greypan/js-kit'

import { type Chain, type KitCtx, type Run, defineRunner } from '../../runner/runner'
import { defineExec, type ExecApi } from '../exec/exec'

import { defineWorkspace, type WorkspaceApi } from './workspace'

const { andThen, err, ok } = rust

/**
 * 本检查读到的 package.json 字段；其余字段不参与检查，保持 unknown。
 */
interface PackageManifest {
  name?: string
  private?: boolean
  files?: string[]
  sideEffects?: unknown
  exports?: unknown
}

function walk(directory: string): string[] {
  if (!fs.existsSync(directory)) return []
  const files: string[] = []
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name)
    if (entry.isDirectory()) files.push(...walk(file))
    else files.push(file)
  }
  return files
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function patternMatches(files: readonly string[], target: string): string[] {
  const expression = new RegExp(`^${escapeRegExp(target).replaceAll('\\*', '.*')}$`)
  return files.filter(file => expression.test(file))
}

function filesInPackageRoot(packageRoot: string): string[] {
  return walk(packageRoot).map(file => `./${path.relative(packageRoot, file).split(path.sep).join('/')}`)
}

function collectTargets(value: unknown): string[] {
  if (typeof value === 'string') return [value]
  if (!value || typeof value !== 'object') return []
  return Object.values(value).flatMap(collectTargets)
}

/**
 * 发布包的对外契约：`files` 白名单、`sideEffects` 模式、`exports` 目标都能在打包产物里落地。
 * 链上以 `pack: ` 起头归因，逐条列出违约，不因第一个失败而跳过其余包。
 */
export const definePackageContract = (): Chain =>
  defineRunner()
    .use(defineExec())
    .use(defineWorkspace())
    .use(
      definePlugin<{ run: Run }, KitCtx & { run: Run } & ExecApi & WorkspaceApi>(ctx => ({
        run: () =>
          andThen(ctx.run(), async () => {
            const errors: string[] = []

            function getPackedFiles(packageRoot: string, packageName: string): string[] {
              const result = ctx.exec(ctx.pnpm, ['--dir', packageRoot, 'pack', '--dry-run', '--json'], {
                stdio: ['ignore', 'pipe', 'pipe']
              })
              const stderr = result.stderr?.trim() ?? ''
              if (!result.ok) {
                errors.push(`${packageName}: pnpm pack --dry-run failed${stderr ? `: ${stderr}` : ''}`)
                return []
              }
              let parsed: { files?: Array<{ path: string }> }
              try {
                parsed = JSON.parse(result.stdout) as { files?: Array<{ path: string }> }
              } catch {
                errors.push(`${packageName}: pnpm pack --dry-run failed${stderr ? `: ${stderr}` : ''}`)
                return []
              }
              if (!Array.isArray(parsed.files)) {
                errors.push(`${packageName}: pnpm pack --dry-run did not return a files array`)
                return []
              }
              return parsed.files.map(file => `./${file.path}`)
            }

            for (const manifestFile of ctx.manifests()) {
              const packageRoot = path.dirname(path.join(ctx.root, manifestFile))
              const manifest = ctx.readManifest<PackageManifest>(manifestFile)
              const packageName = manifest.name ?? path.relative(ctx.root, packageRoot).split(path.sep).join('/')

              if (manifest.private === true) continue
              if (!fs.existsSync(path.join(packageRoot, 'README.md')))
                errors.push(`${packageName}: missing consumer README.md`)
              if (!Array.isArray(manifest.files) || manifest.files.length === 0)
                errors.push(`${packageName}: published package requires a non-empty files allowlist`)

              const packageFiles = filesInPackageRoot(packageRoot)
              const packedFiles = getPackedFiles(packageRoot, packageName)

              for (const filePattern of manifest.files ?? []) {
                if (
                  patternMatches(packageFiles, `./${filePattern}/**`).length === 0 &&
                  !packageFiles.includes(`./${filePattern}`)
                ) {
                  errors.push(`${packageName}: files entry is missing from package root: ${filePattern}`)
                }
              }

              const sideEffects = Array.isArray(manifest.sideEffects) ? manifest.sideEffects : []
              for (const pattern of sideEffects) {
                if (typeof pattern !== 'string' || !pattern.startsWith('./')) {
                  errors.push(`${packageName}: sideEffects entry must be a package-relative path: ${String(pattern)}`)
                } else if (patternMatches(packageFiles, pattern).length === 0) {
                  errors.push(`${packageName}: sideEffects pattern has no matching source or built file: ${pattern}`)
                }
              }

              for (const target of new Set(collectTargets(manifest.exports))) {
                if (!target.startsWith('./')) {
                  errors.push(`${packageName}: export target must be package-relative: ${target}`)
                  continue
                }
                if (patternMatches(packageFiles, target).length === 0)
                  errors.push(`${packageName}: export target is missing from package root: ${target}`)
                if (patternMatches(packedFiles, target).length === 0)
                  errors.push(`${packageName}: export target is missing from the packed artifact: ${target}`)
              }
            }

            if (errors.length > 0)
              return err(
                `pack: ${errors.length} published package contract violation(s):\n${errors.map(e => `- ${e}`).join('\n')}`
              )
            return ok(undefined)
          })
      }))
    )
