import { definePlugin, rust } from '@greypan/js-kit'

import { defineGit, type GitApi } from '../git/git'
import { type Chain, type KitCtx, type Run, defineRunner } from '../runner/runner'
import { errorMessage } from '../shared/errors'

import { defineChangesets, type ChangesetsApi, type ChangesetsOptions } from './changesets'

const { andThen, err, ok } = rust

// PR changeset requirement: compare committed PR head content with the merge base and read every
// blob from head. Staged or unstaged changes are intentionally invisible to this check.

function requireCommit(resolve: (ref: string) => string, label: string, value: string): rust.Result<string, string> {
  try {
    return ok(resolve(value))
  } catch {
    return err(`changeset: ${label} ${JSON.stringify(value)} is not a commit in this repository`)
  }
}

function inspectChangeset(file: string, blob: string, ignoredPackages: readonly string[]): rust.Result<void, string> {
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

  if (fenceCount < 2) return err(`changeset: malformed: ${file} has no paired --- frontmatter block`)
  if (preamble) return err(`changeset: malformed: ${file} has content before its first --- line`)

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
    return err(
      `changeset: has no summary: ${file} declares a package bump on ${packageLines} line(s) but writes no description`
    )

  const frontmatterText = frontmatter.join('\n')
  for (const packageName of ignoredPackages) {
    if (frontmatterText.includes(packageName))
      return err(
        `changeset: declares ignored package: ${file} declares ${JSON.stringify(packageName)}, which Changesets skips`
      )
  }
  return ok(undefined)
}

export interface ChangesetRequiredOptions extends ChangesetsOptions {
  /** 区间下界，SHA 或 ref */
  readonly base: string
  /** 区间上界，SHA 或 ref */
  readonly head: string
}

/** PR 区间必须带有效 changeset 的判定，链上以 `changeset: ` 起头归因。区间两端是装配期就定下来的参数。 */
export const defineChangesetRequired = ({ base, head, ...changesets }: ChangesetRequiredOptions): Chain =>
  defineRunner()
    .use(defineGit())
    .use(defineChangesets(changesets))
    .use(
      definePlugin<{ run: Run }, KitCtx & { run: Run } & GitApi & ChangesetsApi>(ctx => ({
        run: () =>
          andThen(ctx.run(), async () => {
            const baseCommit = requireCommit(ctx.resolveCommit, 'base', base)
            if (!baseCommit.ok) return err(baseCommit.error)
            const headCommit = requireCommit(ctx.resolveCommit, 'head', head)
            if (!headCommit.ok) return err(headCommit.error)

            let mergeBaseCommit: string
            try {
              mergeBaseCommit = ctx.mergeBase(baseCommit.value, headCommit.value)
            } catch (error) {
              return err(`changeset: cannot determine merge-base for the supplied commits: ${errorMessage(error)}`)
            }

            const files = ctx.changed(mergeBaseCommit, headCommit.value)
            const ignored = ctx.ignoredPackages(headCommit.value)
            if (files.length === 0)
              return err('changeset: no added, modified or renamed effective .changeset/*.md in merge-base..head')

            for (const file of files) {
              const inspected = inspectChangeset(file, ctx.read(headCommit.value, file), ignored)
              if (!inspected.ok) return err(inspected.error)
            }
            return ok(undefined)
          })
      }))
    )
