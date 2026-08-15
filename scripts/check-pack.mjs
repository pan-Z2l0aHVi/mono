import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const args = process.argv.slice(2)
const rootOptionIndex = args.indexOf('--root')
const quiet = args.includes('--quiet')
const root =
  rootOptionIndex >= 0 ? path.resolve(args[rootOptionIndex + 1] ?? '') : path.resolve(import.meta.dirname, '..')
const errors = []
const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
const packageManagerRoot = path.resolve(import.meta.dirname, '..')

if (rootOptionIndex >= 0 && !args[rootOptionIndex + 1]) {
  console.error('Usage: node scripts/check-pack.mjs [--quiet] [--root <repository-root>]')
  process.exit(1)
}

function addError(message) {
  errors.push(message)
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'))
}

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

function getPackedFiles(packageRoot, packageName) {
  try {
    const output = execFileSync(pnpm, ['--dir', packageRoot, 'pack', '--dry-run', '--json'], {
      cwd: packageManagerRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    })
    const result = JSON.parse(output)
    if (!Array.isArray(result.files)) {
      addError(`${packageName}: pnpm pack --dry-run did not return a files array`)
      return []
    }
    return result.files.map(file => `./${file.path}`)
  } catch (error) {
    const stderr = error && typeof error === 'object' && 'stderr' in error ? String(error.stderr).trim() : ''
    addError(`${packageName}: pnpm pack --dry-run failed${stderr ? `: ${stderr}` : ''}`)
    return []
  }
}

for (const entry of fs.readdirSync(path.join(root, 'packages'), { withFileTypes: true })) {
  if (!entry.isDirectory()) continue

  const packageRoot = path.join(root, 'packages', entry.name)
  const manifestFile = path.join(packageRoot, 'package.json')
  if (!fs.existsSync(manifestFile)) continue

  const manifest = readJson(manifestFile)
  const packageName = manifest.name ?? `packages/${entry.name}`

  if (manifest.private === true) continue
  if (!fs.existsSync(path.join(packageRoot, 'README.md'))) addError(`${packageName}: missing consumer README.md`)
  if (!Array.isArray(manifest.files) || manifest.files.length === 0) {
    addError(`${packageName}: published package requires a non-empty files allowlist`)
  }

  const packageFiles = filesInPackageRoot(packageRoot)
  const packedFiles = getPackedFiles(packageRoot, packageName)

  for (const filePattern of manifest.files ?? []) {
    if (
      patternMatches(packageFiles, `./${filePattern}/**`).length === 0 &&
      !packageFiles.includes(`./${filePattern}`)
    ) {
      addError(`${packageName}: files entry is missing from package root: ${filePattern}`)
    }
  }

  const sideEffects = Array.isArray(manifest.sideEffects) ? manifest.sideEffects : []
  for (const pattern of sideEffects) {
    if (typeof pattern !== 'string' || !pattern.startsWith('./')) {
      addError(`${packageName}: sideEffects entry must be a package-relative path: ${String(pattern)}`)
    } else if (patternMatches(packageFiles, pattern).length === 0) {
      addError(`${packageName}: sideEffects pattern has no matching source or built file: ${pattern}`)
    }
  }

  for (const target of [...new Set(collectTargets(manifest.exports))]) {
    if (!target.startsWith('./')) {
      addError(`${packageName}: export target must be package-relative: ${target}`)
      continue
    }

    if (patternMatches(packageFiles, target).length === 0) {
      addError(`${packageName}: export target is missing from package root: ${target}`)
    }
    if (patternMatches(packedFiles, target).length === 0) {
      addError(`${packageName}: export target is missing from the packed artifact: ${target}`)
    }
  }
}

if (errors.length > 0) {
  if (!quiet) {
    console.error(`check-pack failed with ${errors.length} error(s):`)
    console.error(errors.map(error => `- ${error}`).join('\n'))
  }
  process.exit(1)
}

if (!quiet) console.log('check-pack passed (published package exports resolve from packed artifacts)')
