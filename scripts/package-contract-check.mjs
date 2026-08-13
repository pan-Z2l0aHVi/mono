import fs from 'node:fs'
import path from 'node:path'

const args = process.argv.slice(2)
const rootOptionIndex = args.indexOf('--root')
const quiet = args.includes('--quiet')
const root =
  rootOptionIndex >= 0 ? path.resolve(args[rootOptionIndex + 1] ?? '') : path.resolve(import.meta.dirname, '..')
const errors = []

if (rootOptionIndex >= 0 && !args[rootOptionIndex + 1]) {
  console.error('Usage: node scripts/package-contract-check.mjs [--quiet] [--root <repository-root>]')
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

function targetPatternMatches(packageRoot, target) {
  const expression = new RegExp(`^${escapeRegExp(target).replaceAll('\\*', '.*')}$`)
  return walk(packageRoot)
    .map(file => `./${path.relative(packageRoot, file).split(path.sep).join('/')}`)
    .filter(file => expression.test(file))
}

function collectTargets(value) {
  if (typeof value === 'string') return [value]
  if (!value || typeof value !== 'object') return []
  return Object.values(value).flatMap(collectTargets)
}

function checkFilePattern(packageRoot, packageName, filePattern) {
  const absolute = path.join(packageRoot, filePattern)
  if (!fs.existsSync(absolute)) addError(`${packageName}: files entry is missing from package root: ${filePattern}`)
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

  for (const filePattern of manifest.files ?? []) checkFilePattern(packageRoot, packageName, filePattern)

  const sideEffects = Array.isArray(manifest.sideEffects) ? manifest.sideEffects : []
  for (const pattern of sideEffects) {
    if (typeof pattern !== 'string' || !pattern.startsWith('./')) {
      addError(`${packageName}: sideEffects entry must be a package-relative path: ${String(pattern)}`)
    } else if (targetPatternMatches(packageRoot, pattern).length === 0) {
      addError(`${packageName}: sideEffects pattern has no matching source or built file: ${pattern}`)
    }
  }

  for (const target of [...new Set(collectTargets(manifest.exports))]) {
    if (!target.startsWith('./')) {
      addError(`${packageName}: export target must be package-relative: ${target}`)
      continue
    }

    if (target.includes('*')) {
      if (targetPatternMatches(packageRoot, target).length === 0) {
        addError(`${packageName}: export pattern has no matching built artifact: ${target}`)
      }
    } else if (!fs.existsSync(path.join(packageRoot, target))) {
      addError(`${packageName}: export target is missing: ${target}`)
    }
  }
}

if (errors.length > 0) {
  if (!quiet) {
    console.error(`package-contract-check failed with ${errors.length} error(s):`)
    console.error(errors.map(error => `- ${error}`).join('\n'))
  }
  process.exit(1)
}

if (!quiet) console.log('package-contract-check passed (published package files and export targets are present)')
