import { defineChangesets, type ChangesetsOptions } from '../plugins/changesets'
import { defineGit } from '../plugins/git'
import type { CheckUnit } from '../runner/check-runner'
import { errorMessage } from '../shared/errors'

// PR changeset policy: compare committed PR head content with the merge base and read every blob
// from head. Staged or unstaged changes are intentionally invisible to this check.

function requireCommit(resolve: (ref: string) => string, label: string, value: string | undefined): string {
  if (!value) throw new Error(`missing required option --${label} <sha-or-ref>`)
  try {
    return resolve(value)
  } catch {
    throw new Error(`changeset check cannot run: ${label} ${JSON.stringify(value)} is not a commit in this repository`)
  }
}

function inspectChangeset(file: string, blob: string, ignoredPackages: readonly string[]): void {
  const lines = blob.split(/\r?\n/)
  let fenceCount = 0
  let preamble = false
  let bodyHasText = false
  let packageLines = 0
  const frontmatter: string[] = []

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

export function defineChangesetPolicy(options: ChangesetsOptions = {}): CheckUnit {
  const plugins = defineGit().use(defineChangesets(options))

  return {
    name: 'changeset-policy',
    async run({
      root,
      base,
      head,
      env = process.env
    }: {
      root: string
      base?: string
      head?: string
      env?: NodeJS.ProcessEnv
    }): Promise<string> {
      const { resolveCommit, mergeBase, changed, read, ignoredPackages } = plugins.make({ root, env })
      const baseCommit = requireCommit(resolveCommit, 'base', base)
      const headCommit = requireCommit(resolveCommit, 'head', head)

      let mergeBaseCommit: string
      try {
        mergeBaseCommit = mergeBase(baseCommit, headCommit)
      } catch (error) {
        throw new Error(`changeset check cannot determine merge-base for the supplied commits: ${errorMessage(error)}`)
      }

      const files = changed(mergeBaseCommit, headCommit)
      const ignored = ignoredPackages(headCommit)
      if (files.length === 0)
        throw new Error(
          'changeset missing: no added, modified or renamed effective .changeset/*.md in merge-base..head'
        )

      for (const file of files) inspectChangeset(file, read(headCommit, file), ignored)
      return `${files.length} changeset(s): ${files.join(', ')}`
    }
  }
}
