import fs from 'node:fs'
import path from 'node:path'

import { globSync } from 'glob'

function parseWorkspacePattern(value, lineNumber) {
  const trimmed = value.trim()
  const quoted = trimmed.match(/^(?:"(?<double>.*)"|'(?<single>.*)')\s*(?:#.*)?$/)
  const unquoted = trimmed.match(/^(?<value>[^#\s][^#]*?)\s*(?:#.*)?$/)
  const pattern = (quoted?.groups?.double ?? quoted?.groups?.single ?? unquoted?.groups?.value ?? '').trim()

  if (!pattern) throw new Error(`pnpm-workspace.yaml:${lineNumber} contains an invalid packages pattern`)
  return pattern
}

export function readPnpmWorkspacePatterns(root) {
  const workspaceFile = path.join(root, 'pnpm-workspace.yaml')
  if (!fs.existsSync(workspaceFile)) throw new Error('missing pnpm-workspace.yaml')

  const lines = fs.readFileSync(workspaceFile, 'utf8').split(/\r?\n/)
  const start = lines.findIndex(line => /^packages:\s*(?:#.*)?$/.test(line))
  if (start < 0) throw new Error('pnpm-workspace.yaml is missing a top-level packages list')

  const patterns = []
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index]
    if (!line.trim() || /^\s*#/.test(line)) continue
    if (!/^\s/.test(line)) break

    const match = line.match(/^\s+-\s+(?<value>.+)$/)
    if (!match?.groups?.value) throw new Error(`pnpm-workspace.yaml:${index + 1} must be a packages list entry`)
    patterns.push(parseWorkspacePattern(match.groups.value, index + 1))
  }

  if (patterns.length === 0) throw new Error('pnpm-workspace.yaml packages list must not be empty')
  if (!patterns.some(pattern => !pattern.startsWith('!')))
    throw new Error('pnpm-workspace.yaml packages list must include a positive pattern')

  return patterns
}

export function listPnpmWorkspaceManifests(root) {
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
