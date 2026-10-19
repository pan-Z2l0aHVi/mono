import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import { readJsonFile } from '../lib/config.mjs'
import { listPnpmWorkspaceManifests } from '../lib/workspace-manifests.mjs'

export const name = 'check-pack'

const packageManagerRoot = path.resolve(import.meta.dirname, '../..')
const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'

function walk(directory) {
  if (!fs.existsSync(directory)) return []
  const files = []
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name)
    if (entry.isDirectory()) files.push(...walk(file))
    else files.push(file)
  }
  return files
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function patternMatches(files, target) {
  const expression = new RegExp(`^${escapeRegExp(target).replaceAll('\\*', '.*')}$`)
  return files.filter(file => expression.test(file))
}

function filesInPackageRoot(packageRoot) {
  return walk(packageRoot).map(file => `./${path.relative(packageRoot, file).split(path.sep).join('/')}`)
}

function collectTargets(value) {
  if (typeof value === 'string') return [value]
  if (!value || typeof value !== 'object') return []
  return Object.values(value).flatMap(collectTargets)
}

function getPackedFiles(packageRoot, packageName, errors) {
  try {
    const output = execFileSync(pnpm, ['--dir', packageRoot, 'pack', '--dry-run', '--json'], {
      cwd: packageManagerRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    })
    const result = JSON.parse(output)
    if (!Array.isArray(result.files)) {
      errors.push(`${packageName}: pnpm pack --dry-run did not return a files array`)
      return []
    }
    return result.files.map(file => `./${file.path}`)
  } catch (error) {
    const stderr = error && typeof error === 'object' && 'stderr' in error ? String(error.stderr).trim() : ''
    errors.push(`${packageName}: pnpm pack --dry-run failed${stderr ? `: ${stderr}` : ''}`)
    return []
  }
}

export async function run({ root }) {
  const errors = []

  for (const manifestFile of listPnpmWorkspaceManifests(root)) {
    const packageRoot = path.dirname(manifestFile)
    const manifest = readJsonFile(manifestFile)
    const packageName = manifest.name ?? path.relative(root, packageRoot).split(path.sep).join('/')

    if (manifest.private === true) continue
    if (!fs.existsSync(path.join(packageRoot, 'README.md'))) errors.push(`${packageName}: missing consumer README.md`)
    if (!Array.isArray(manifest.files) || manifest.files.length === 0)
      errors.push(`${packageName}: published package requires a non-empty files allowlist`)

    const packageFiles = filesInPackageRoot(packageRoot)
    const packedFiles = getPackedFiles(packageRoot, packageName, errors)

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

    for (const target of [...new Set(collectTargets(manifest.exports))]) {
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

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const args = process.argv.slice(2)
  const rootOptionIndex = args.indexOf('--root')
  const quiet = args.includes('--quiet')
  if (rootOptionIndex >= 0 && !args[rootOptionIndex + 1]) {
    console.error('Usage: node scripts/checks/check-pack.mjs [--quiet] [--root <repository-root>]')
    process.exit(1)
  }
  const root =
    rootOptionIndex >= 0 ? path.resolve(args[rootOptionIndex + 1] ?? '') : path.resolve(import.meta.dirname, '../..')
  try {
    const detail = await run({ root })
    if (!quiet) console.log(`check-pack passed (${detail})`)
  } catch (error) {
    if (!quiet)
      console.error(`check-pack failed with error(s):\n${error instanceof Error ? error.message : String(error)}`)
    process.exitCode = 1
  }
}
