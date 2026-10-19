import path from 'node:path'

import { git } from '../lib/git.mjs'

// PR changeset policy: compare committed PR head content with the merge base and read every blob
// from head. Staged or unstaged changes are intentionally invisible to this check.
export const name = 'changeset-policy'

function readBlob(root, commit, file) {
  try {
    return git(root, ['show', `${commit}:${file}`])
  } catch (error) {
    throw new Error(`cannot read ${file} from PR head ${commit}: ${error.message}`)
  }
}

function resolveCommit(root, label, value) {
  if (!value) throw new Error(`missing required option --${label} <sha-or-ref>`)
  try {
    return git(root, ['rev-parse', '--verify', '--quiet', '--end-of-options', `${value}^{commit}`]).trim()
  } catch {
    throw new Error(`changeset check cannot run: ${label} ${JSON.stringify(value)} is not a commit in this repository`)
  }
}

function isChangesetPath(file) {
  if (!/^\.changeset\/(?:pre\/)?[^/.][^/]*\.md$/.test(file)) return false
  const filename = path.posix.basename(file)
  if (['AGENTS.md', 'CLAUDE.md', 'GEMINI.md'].includes(filename)) return false
  if (filename.toLowerCase() === 'readme.md') return false
  return true
}

function parseConfig(text, file) {
  let config
  try {
    config = JSON.parse(text)
  } catch {
    throw new Error(`changeset check cannot run: ${file} at PR head is not valid JSON`)
  }
  if (!Array.isArray(config?.ignore) || config.ignore.some(packageName => typeof packageName !== 'string'))
    throw new Error(`changeset check cannot run: ${file} at PR head must contain an ignore array of package names`)
  return config.ignore
}

function inspectChangeset(file, blob, ignoredPackages) {
  const lines = blob.split(/\r?\n/)
  let fenceCount = 0
  let preamble = false
  let bodyHasText = false
  let packageLines = 0
  const frontmatter = []

  for (const line of lines) {
    if (/^---\s*$/.test(line)) {
      fenceCount += 1
      if (fenceCount === 2) break
      continue
    }
    if (fenceCount === 0) {
      if (/\S/.test(line)) preamble = true
      continue
    }
    if (fenceCount === 1) {
      frontmatter.push(line)
      if (/^\s*\S.*:[^A-Za-z0-9]*(?:major|minor|patch)/.test(line)) packageLines += 1
    }
  }

  if (fenceCount < 2) throw new Error(`changeset malformed: ${file} has no paired --- frontmatter block`)
  if (preamble) throw new Error(`changeset malformed: ${file} has content before its first --- line`)

  const afterFrontmatter = lines.slice(lines.findIndex(line => /^---\s*$/.test(line)) + 1)
  let fencesSeen = 0
  for (const line of afterFrontmatter) {
    if (/^---\s*$/.test(line)) {
      fencesSeen += 1
      continue
    }
    if (fencesSeen >= 1 && /\S/.test(line)) bodyHasText = true
  }
  if (packageLines > 0 && !bodyHasText)
    throw new Error(
      `changeset has no summary: ${file} declares a package bump on ${packageLines} line(s) but writes no description`
    )

  const frontmatterText = frontmatter.join('\n')
  for (const packageName of ignoredPackages) {
    if (frontmatterText.includes(packageName))
      throw new Error(
        `changeset declares ignored package: ${file} declares ${JSON.stringify(packageName)}, which Changesets skips`
      )
  }
}

export async function run({ root, base, head }) {
  const baseCommit = resolveCommit(root, 'base', base)
  const headCommit = resolveCommit(root, 'head', head)
  let mergeBase
  try {
    mergeBase = git(root, ['merge-base', baseCommit, headCommit]).trim()
  } catch (error) {
    throw new Error(`changeset check cannot determine merge-base for the supplied commits: ${error.message}`)
  }

  // NUL separators preserve spaces and non-ASCII paths; deleted paths are intentionally excluded.
  const changed = git(root, [
    '-c',
    'core.quotePath=false',
    'diff',
    '--name-only',
    '-z',
    '--diff-filter=AMR',
    mergeBase,
    headCommit,
    '--',
    '.changeset'
  ])
    .split('\0')
    .filter(Boolean)
    .filter(isChangesetPath)

  const configPath = '.changeset/config.json'
  const ignoredPackages = parseConfig(readBlob(root, headCommit, configPath), configPath)
  if (changed.length === 0)
    throw new Error('changeset missing: no added, modified or renamed effective .changeset/*.md in merge-base..head')

  for (const file of changed) inspectChangeset(file, readBlob(root, headCommit, file), ignoredPackages)
  return `${changed.length} changeset(s): ${changed.join(', ')}`
}
