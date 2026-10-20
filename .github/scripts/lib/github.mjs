// Shared GitHub CLI plumbing for the workflow-owned release scripts.
// The npm and Wails release paths differ in tags, flags and verification, but
// they must treat API failures, 404s and annotated tag chains identically.
import { spawnSync } from 'node:child_process'

export function commandError(command, args, result) {
  if (result.error) return new Error(`could not start ${command}: ${result.error.message}`)
  const reason = result.signal ? `signal ${result.signal}` : `exit ${result.status}`
  const output = `${result.stderr ?? ''}\n${result.stdout ?? ''}`.trim()
  return new Error(`${command} ${args.join(' ')} failed (${reason}): ${output || 'no diagnostic output'}`)
}

export function run(command, args, { spawn = spawnSync, cwd = process.cwd(), env = process.env } = {}) {
  const result = spawn(command, args, { encoding: 'utf8', cwd, env })
  if (result.status !== 0) throw commandError(command, args, result)
  return result.stdout ?? ''
}

export function isHttp404(error) {
  return /\bHTTP\s+404\b|\b404\s+Not Found\b/i.test(error.message)
}

export function createGitHubApi({ repository, spawn = spawnSync, cwd = process.cwd(), env = process.env }) {
  const api = endpoint => {
    const args = ['api', `repos/${repository}/${endpoint}`]
    const result = spawn('gh', args, { encoding: 'utf8', cwd, env })
    if (result.status !== 0) {
      const error = commandError('gh', args, result)
      if (isHttp404(error)) return null
      throw error
    }
    try {
      return JSON.parse(result.stdout)
    } catch (error) {
      throw new Error(`gh api returned invalid JSON for ${endpoint}: ${error.message}`)
    }
  }

  const resolveTag = tag => {
    const reference = api(`git/ref/tags/${encodeURIComponent(tag)}`)
    if (!reference) return null
    let object = reference.object
    const annotated = object?.type === 'tag'
    const seen = new Set()
    while (object?.type === 'tag') {
      if (seen.has(object.sha)) throw new Error(`annotated tag ${tag} contains a cycle`)
      seen.add(object.sha)
      const tagObject = api(`git/tags/${object.sha}`)
      if (!tagObject) throw new Error(`annotated tag object ${object.sha} for ${tag} is missing`)
      object = tagObject.object
    }
    if (object?.type !== 'commit' || typeof object.sha !== 'string') {
      throw new Error(`tag ${tag} does not resolve to a commit`)
    }
    return { sha: object.sha, annotated }
  }

  const getRelease = tag => api(`releases/tags/${encodeURIComponent(tag)}`)

  return { api, resolveTag, getRelease }
}
