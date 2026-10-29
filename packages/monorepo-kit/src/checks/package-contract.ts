import fs from 'node:fs'
import path from 'node:path'

import { defineExec } from '../plugins/exec'
import { defineWorkspace } from '../plugins/workspace'
import type { CheckUnit } from '../runner/check-runner'

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

export function definePackageContract(): CheckUnit {
  const plugins = defineExec().use(defineWorkspace())

  return {
    name: 'check-pack',
    async run({ root, env }: { root: string; env?: NodeJS.ProcessEnv }): Promise<string> {
      const { exec, pnpm, manifests, readManifest } = plugins.make({ root })
      const errors: string[] = []

      function getPackedFiles(packageRoot: string, packageName: string): string[] {
        const result = exec(pnpm, ['--dir', packageRoot, 'pack', '--dry-run', '--json'], {
          cwd: root,
          env,
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

      for (const manifestFile of manifests()) {
        const packageRoot = path.dirname(path.join(root, manifestFile))
        const manifest = readManifest<PackageManifest>(manifestFile)
        const packageName = manifest.name ?? path.relative(root, packageRoot).split(path.sep).join('/')

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

      if (errors.length > 0) throw new Error(errors.map(error => `- ${error}`).join('\n'))
      return 'published package exports resolve from packed artifacts'
    }
  }
}
