import { definePlugin, rust } from '@greypan/js-kit'

import { defineGit, type GitApi } from '../git/git'
import { type Chain, type KitCtx, type Run, defineRunner } from '../runner/runner'
import { errorMessage } from '../shared/errors'

import { defineChangesets, type ChangesetsApi, type ChangesetsOptions } from './changesets'

const { andThen, err, ok } = rust

// PR changeset requirement: compare committed PR head content with the merge base and read every
// blob from head. Staged or unstaged changes are intentionally invisible to this check.

const FRONTMATTER_ENTRY = /^(?:(['"])([^'"]+)\1|([A-Za-z0-9@._/-]+)):\s*(major|minor|patch)\s*$/
const CJK_CHAR = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/

function requireCommit(resolve: (ref: string) => string, label: string, value: string): rust.Result<string, string> {
  try {
    return ok(resolve(value))
  } catch {
    return err(`changeset: ${label} ${JSON.stringify(value)} is not a commit in this repository`)
  }
}

function stripAllowedNonProse(body: string): string {
  return body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/~~~[\s\S]*?~~~/g, ' ')
    .replace(/`[^`\n]+`/g, ' ')
    .replace(/"[^"\n]{1,40}"/g, ' ')
}

function inspectChangeset(file: string, blob: string, ignoredPackages: readonly string[]): rust.Result<void, string> {
  const lines = blob.split(/\r?\n/)
  let fenceCount = 0
  let preamble = false
  let closingFenceIndex = -1
  const frontmatter: string[] = []

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]
    if (/^---\s*$/.test(line)) {
      fenceCount += 1
      if (fenceCount === 2) {
        closingFenceIndex = i
        break
      }
      continue
    }
    if (fenceCount === 0) {
      if (/\S/.test(line)) preamble = true
      continue
    }
    if (fenceCount === 1) frontmatter.push(line)
  }

  if (fenceCount < 2) return err(`changeset: malformed: ${file} has no paired --- frontmatter block`)
  if (preamble) return err(`changeset: malformed: ${file} has content before its first --- line`)

  const declaredPackages: string[] = []
  const seenPackages = new Set<string>()
  for (const rawLine of frontmatter) {
    const trimmed = rawLine.trim()
    if (trimmed === '' || trimmed.startsWith('#')) continue
    const match = FRONTMATTER_ENTRY.exec(trimmed)
    if (!match) return err(`changeset: malformed: ${file} has invalid frontmatter line ${JSON.stringify(trimmed)}`)
    const packageName = match[2] ?? match[3]
    if (seenPackages.has(packageName))
      return err(`changeset: malformed: ${file} declares duplicate package ${JSON.stringify(packageName)}`)
    seenPackages.add(packageName)
    declaredPackages.push(packageName)
  }

  if (declaredPackages.length > 1)
    return err(
      `changeset: multiple packages: ${file} declares ${declaredPackages.length} packages (${declaredPackages.join(', ')}); split into one changeset file per package`
    )

  const bodyLines = lines.slice(closingFenceIndex + 1)
  const nonFenceBodyLines = bodyLines.filter(line => !/^---\s*$/.test(line))
  const bodyHasText = nonFenceBodyLines.some(line => /\S/.test(line))

  if (declaredPackages.length === 0) {
    if (bodyHasText)
      return err(`changeset: empty shell has body: ${file} declares no packages but contains description text`)
    return ok(undefined)
  }

  if (!bodyHasText)
    return err(
      `changeset: has no summary: ${file} declares a package bump on ${declaredPackages.length} line(s) but writes no description`
    )

  const ignoredSet = new Set(ignoredPackages)
  const [declaredPackage] = declaredPackages
  if (ignoredSet.has(declaredPackage))
    return err(
      `changeset: declares ignored package: ${file} declares ${JSON.stringify(declaredPackage)}, which Changesets skips`
    )

  const prose = stripAllowedNonProse(nonFenceBodyLines.join('\n'))
  if (CJK_CHAR.test(prose))
    return err(
      `changeset: non-english summary: ${file} contains CJK prose; write release notes in English (quoted short UI literals and code blocks are allowed)`
    )

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
