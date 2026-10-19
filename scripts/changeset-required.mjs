#!/usr/bin/env node
// PR changeset policy. Compare committed PR head content with the merge base and read every blob from head.
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

function fail(message) {
  throw new Error(message)
}

function git(root, args, encoding = 'utf8') {
  try {
    return execFileSync('git', args, { cwd: root, encoding })
  } catch (error) {
    const detail = error?.stderr?.toString().trim()
    fail('git ' + args.join(' ') + ' failed' + (detail ? ': ' + detail : ''))
  }
}

function parseOptions(argv) {
  const options = {}
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index]
    if (key !== '--base' && key !== '--head') fail('unexpected argument: ' + key)
    const value = argv[index + 1]
    if (!value || value.startsWith('--')) fail('missing value for ' + key)
    options[key.slice(2)] = value
    index += 1
  }
  if (!options.base) fail('missing required option --base <sha-or-ref>')
  if (!options.head) fail('missing required option --head <sha-or-ref>')
  return options
}

function resolveCommit(root, label, value) {
  try {
    return execFileSync('git', ['rev-parse', '--verify', '--quiet', '--end-of-options', value + '^{commit}'], {
      cwd: root,
      encoding: 'utf8'
    }).trim()
  } catch {
    fail('changeset check cannot run: ' + label + ' ' + JSON.stringify(value) + ' is not a commit in this repository')
  }
}

function readBlob(root, commit, file) {
  try {
    return execFileSync('git', ['show', commit + ':' + file], {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 16 * 1024 * 1024
    })
  } catch (error) {
    const detail = error?.stderr?.toString().trim()
    fail('cannot read ' + file + ' from PR head ' + commit + (detail ? ': ' + detail : ''))
  }
}

function isChangesetPath(file) {
  if (!/^\.changeset\/(?:pre\/)?[^/.][^/]*\.md$/.test(file)) return false
  const name = path.posix.basename(file)
  if (['AGENTS.md', 'CLAUDE.md', 'GEMINI.md'].includes(name)) return false
  if (name.toLowerCase() === 'readme.md') return false
  return true
}

function parseConfig(text, file) {
  let config
  try {
    config = JSON.parse(text)
  } catch {
    fail('changeset check cannot run: ' + file + ' at PR head is not valid JSON')
  }
  if (!Array.isArray(config?.ignore) || config.ignore.some(name => typeof name !== 'string')) {
    fail('changeset check cannot run: ' + file + ' at PR head must contain an ignore array of package names')
  }
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

  if (fenceCount < 2) fail('changeset malformed: ' + file + ' has no paired --- frontmatter block')
  if (preamble) fail('changeset malformed: ' + file + ' has content before its first --- line')

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
    fail(
      'changeset has no summary: ' +
        file +
        ' declares a package bump on ' +
        packageLines +
        ' line(s) but writes no description'
    )

  const frontmatterText = frontmatter.join('\n')
  for (const packageName of ignoredPackages) {
    if (frontmatterText.includes(packageName))
      fail(
        'changeset declares ignored package: ' +
          file +
          ' declares ' +
          JSON.stringify(packageName) +
          ', which Changesets skips'
      )
  }
}

function main() {
  const options = parseOptions(process.argv.slice(2))
  const root = git(process.cwd(), ['rev-parse', '--show-toplevel']).trim()
  const base = resolveCommit(root, 'base', options.base)
  const head = resolveCommit(root, 'head', options.head)
  let mergeBase
  try {
    mergeBase = execFileSync('git', ['merge-base', base, head], { cwd: root, encoding: 'utf8' }).trim()
  } catch (error) {
    const detail = error?.stderr?.toString().trim()
    fail('changeset check cannot determine merge-base for the supplied commits' + (detail ? ': ' + detail : ''))
  }

  // NUL separators preserve spaces and non-ASCII paths; deleted paths are intentionally excluded.
  const changed = git(
    root,
    [
      '-c',
      'core.quotePath=false',
      'diff',
      '--name-only',
      '-z',
      '--diff-filter=AMR',
      mergeBase,
      head,
      '--',
      '.changeset'
    ],
    'buffer'
  )
    .toString('utf8')
    .split('\0')
    .filter(Boolean)
    .filter(isChangesetPath)

  const configPath = '.changeset/config.json'
  const ignoredPackages = parseConfig(readBlob(root, head, configPath), configPath)
  if (changed.length === 0)
    fail('changeset missing: no added, modified or renamed effective .changeset/*.md in merge-base..head')

  for (const file of changed) inspectChangeset(file, readBlob(root, head, file), ignoredPackages)
  process.stdout.write(JSON.stringify({ ok: true, base, head, mergeBase, changesets: changed }) + '\n')
}

try {
  main()
} catch (error) {
  process.stderr.write('changeset check failed: ' + (error instanceof Error ? error.message : String(error)) + '\n')
  process.exitCode = 1
}
