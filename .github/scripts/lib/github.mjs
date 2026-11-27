// Shared GitHub CLI plumbing for the workflow-owned scripts.
// The release, queue and Codex review paths differ in endpoints and flags,
// but they must treat API failures, HTTP status codes, pagination and annotated tag chains identically.
import { spawnSync } from 'node:child_process'

// git diff / gh api / job logs 的输出随 PR 规模增长，spawnSync 默认的 1 MiB 缓冲会在大 PR 上抛 ENOBUFS。
// 同步子进程统一放宽到 64 MiB，避免「脚本根本没跑起来」被下游误判成配置缺失。
export const SPAWN_MAX_BUFFER = 64 * 1024 * 1024

export function commandError(command, args, result, maxBuffer = SPAWN_MAX_BUFFER) {
  if (result.error) {
    const limit = maxBuffer % (1024 * 1024) === 0 ? `${maxBuffer / (1024 * 1024)} MiB` : `${maxBuffer} bytes`
    const hint = result.error.code === 'ENOBUFS' ? ` (stdout exceeded the configured ${limit} buffer)` : ''
    const error = new Error(`could not start ${command}: ${result.error.message}${hint}`)
    error.diagnostic = `${result.error.message ?? ''}${hint}`
    return error
  }
  const reason = result.signal ? `signal ${result.signal}` : `exit ${result.status}`
  const output = `${result.stderr ?? ''}\n${result.stdout ?? ''}`.trim()
  const error = new Error(`${command} ${args.join(' ')} failed (${reason}): ${output || 'no diagnostic output'}`)
  error.diagnostic = output
  error.stderr = result.stderr ?? ''
  return error
}

export function run(
  command,
  args,
  { spawn = spawnSync, cwd = process.cwd(), env = process.env, maxBuffer = SPAWN_MAX_BUFFER } = {}
) {
  const result = spawn(command, args, { encoding: 'utf8', cwd, env, maxBuffer })
  if (result.status !== 0) throw commandError(command, args, result, maxBuffer)
  return result.stdout ?? ''
}

/**
 * 解析 PR 编号：显式正整数始终优先，非法非空值直接抛错不回退；仅在缺失且允许回退时读取 PR ref。
 *
 * @param {object} [input]
 * @param {unknown} [input.explicit] 显式传入的 PR 编号
 * @param {unknown} [input.ref] GitHub ref（如 `refs/pull/54/merge`）
 * @param {boolean} [input.allowRefFallback=true] 显式值缺失时是否允许回退到 `ref`
 * @returns {string} 解析得到的正整数 PR 编号，或空字符串
 */
export function resolvePullNumber({ explicit, ref, allowRefFallback = true } = {}) {
  if (explicit !== undefined && explicit !== '') {
    if (typeof explicit !== 'string' || !/^[1-9]\d*$/u.test(explicit)) {
      const shown = typeof explicit === 'string' ? explicit : JSON.stringify(explicit)
      throw new Error(`pull number must be a positive integer: ${shown}`)
    }
    return explicit
  }

  if (!allowRefFallback) return ''
  if (typeof ref !== 'string') return ''
  return ref.match(/^refs\/pull\/([1-9]\d*)\/merge$/u)?.[1] ?? ''
}

function diagnosticText(error) {
  return typeof error?.diagnostic === 'string' ? error.diagnostic : (error?.message ?? '')
}

export function isHttp404(error) {
  return /\bHTTP\s+404\b|\b404\s+Not Found\b/i.test(diagnosticText(error))
}

export function isHttp422(error) {
  return /\bHTTP\s+422\b|\b422\s+Unprocessable\b/iu.test(diagnosticText(error))
}

// 只检查命令诊断输出（stderr/stdout），不扫描包含 `-f body=...` 请求参数的 error.message，
// 避免评论正文里出现 "403 Forbidden" / "Resource not accessible by integration" 时把普通失败误判成权限故障。
export function isHttp403(error) {
  return /Resource not accessible by integration|\bHTTP\s*403\b|\b403\s+Forbidden\b/iu.test(diagnosticText(error))
}

export function createGhClient({ repository, spawn = spawnSync, cwd = process.cwd(), env = process.env }) {
  const execRaw = args => {
    const result = spawn('gh', args, { encoding: 'utf8', cwd, env, maxBuffer: SPAWN_MAX_BUFFER })
    if (result.status !== 0) throw commandError('gh', args, result)
    return result.stdout ?? ''
  }

  const resolveEndpoint = endpoint => (endpoint.startsWith('repos/') ? endpoint : `repos/${repository}/${endpoint}`)

  const apiJson = (endpoint, { method, fields, allow404 = false, allowEmpty = false } = {}) => {
    const args = ['api']
    if (method) args.push('-X', method)
    if (fields) {
      for (const [key, value] of Object.entries(fields)) {
        args.push('-f', `${key}=${value}`)
      }
    }
    args.push(resolveEndpoint(endpoint))

    let stdout
    try {
      stdout = execRaw(args)
    } catch (error) {
      if (allow404 && isHttp404(error)) return null
      throw error
    }

    if (allowEmpty && stdout.trim() === '') return {}
    try {
      return JSON.parse(stdout)
    } catch (error) {
      throw new Error(`gh api returned invalid JSON for ${endpoint}: ${error.message}`)
    }
  }

  const paginateJson = (endpoint, { perPage = 100, maxPages = 10, nonArrayMessage } = {}) => {
    const items = []
    const separator = endpoint.includes('?') ? '&' : '?'
    for (let page = 1; page <= maxPages; page += 1) {
      const chunk = apiJson(`${endpoint}${separator}per_page=${perPage}&page=${page}`)
      if (!Array.isArray(chunk)) {
        throw new Error(nonArrayMessage ?? `gh api returned a non-array page for ${endpoint}`)
      }
      items.push(...chunk)
      if (chunk.length < perPage) break
    }
    return items
  }

  const getPull = number => apiJson(`pulls/${number}`)
  const listRunJobs = runId => apiJson(`actions/runs/${runId}/jobs?per_page=100`)?.jobs ?? []
  // job 日志含 ANSI 转义序列，不加 --allow-escape-sequences 会被 gh 拒绝。
  const getJobLog = jobId =>
    execRaw(['api', '--allow-escape-sequences', `repos/${repository}/actions/jobs/${jobId}/logs`])

  return { execRaw, apiJson, paginateJson, getPull, listRunJobs, getJobLog }
}

/**
 * 发布脚本专用 GitHub API 包装（`create-npm-github-releases.mjs` / `publish-wails-release.mjs`）。
 * 保持既有 404 容错契约：`api`、`resolveTag`、`getRelease` 统一经由 `allow404: true` 在 HTTP 404 时返回 `null`。
 */
export function createGitHubApi({ repository, spawn = spawnSync, cwd = process.cwd(), env = process.env }) {
  const client = createGhClient({ repository, spawn, cwd, env })
  const api = endpoint => client.apiJson(endpoint, { allow404: true })

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
