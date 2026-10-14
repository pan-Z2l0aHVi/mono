#!/usr/bin/env node
// 环境医生（参照 flutter doctor 的形态）：对本地开发环境做体检，
// 各检查项返回 ok/warn/fail 与可观察 detail。默认只读；--fix 与 --kill-watchers
// 是显式 opt-in 的写操作。覆盖本会话实测踩过的环境坑：
// dist 截断（vp build --watch 清空 d.ts）、watch 进程污染、turbo 缓存未生效、
// mise env 未激活（TURBO_CACHE_DIR 未注入、node 版本不符）、
// node_modules 链接失效、git worktree 残留。
//
// 用法：pnpm run agent:env-doctor [--json] [--fix] [--kill-watchers]
//   --json           机器可读输出（人类可读走 stdout 文本）
//   --fix            可修项自动修复：git worktree prune；dist 审计失败时 turbo --force 重建
//   --kill-watchers  终止检测到的 watch 进程（默认只 warn，不自动杀）
//
// 退出码：存在 fail 项 → 1；仅 warn 或全部 ok → 0。

import { execFileSync, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const scriptRoot = path.resolve(import.meta.dirname, '..')
// env-doctor 体检的是「当前环境」：优先以调用方 cwd（worktree）为根，
// 仅当 cwd 不是本仓库 workspace 时才退回脚本所在仓库。
const root = fs.existsSync(path.join(process.cwd(), 'pnpm-workspace.yaml')) ? process.cwd() : scriptRoot
const args = process.argv.slice(2)
const asJson = args.includes('--json')
const fix = args.includes('--fix')
const killWatchers = args.includes('--kill-watchers')

function sh(command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, { cwd: root, encoding: 'utf8', ...options })
  return { status: result.status, stdout: result.stdout?.trim() ?? '', stderr: result.stderr?.trim() ?? '' }
}

function shQuiet(command, commandArgs) {
  try {
    return execFileSync(command, commandArgs, { cwd: root, encoding: 'utf8', stdio: 'ignore' })
  } catch {
    return null
  }
}

const results = []
function record(id, level, detail) {
  results.push({ id, level, detail })
}

// ===== dist 声明审计 =====
// package.json exports 指向的 dist 产物缺失或为零字节即 fail——零字节是
// vp build --watch 中断留下截断产物的特征（曾导致 apps 构建 TS7016）。
function resolveExportTarget(packageDir, target) {
  if (typeof target === 'string') return target
  if (target && typeof target === 'object') return target.types ?? target.import ?? target.require ?? target.default
  return undefined
}

function collectPackageDirs() {
  const workspaceGlobs = ['apps', 'packages']
  const dirs = []
  const visit = directory => {
    if (path.basename(directory) === 'node_modules') return
    if (fs.existsSync(path.join(directory, 'package.json'))) dirs.push(directory)
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }))
      if (entry.isDirectory()) visit(path.join(directory, entry.name))
  }
  for (const glob of workspaceGlobs) {
    const base = path.join(root, glob)
    if (fs.existsSync(base)) visit(base)
  }
  return dirs
}

function distAudit() {
  const broken = []
  for (const packageDir of collectPackageDirs()) {
    const manifest = JSON.parse(fs.readFileSync(path.join(packageDir, 'package.json'), 'utf8'))
    const targets = new Set()
    for (const value of Object.values(manifest.exports ?? {})) {
      const target = resolveExportTarget(packageDir, value)
      if (target) targets.add(target)
    }
    if (manifest.types) targets.add(manifest.types)
    if (manifest.main) targets.add(manifest.main)
    for (const target of targets) {
      // 通配符 subpath（如 "./*"）无法按字面 stat；v1 只审计字面入口产物。
      if (!target.includes('dist/') || target.includes('*')) continue
      const absolute = path.join(packageDir, target)
      let stat
      try {
        stat = fs.statSync(absolute)
      } catch {
        broken.push(`${path.relative(root, packageDir)}: missing ${target}`)
        continue
      }
      if (stat.size === 0) broken.push(`${path.relative(root, packageDir)}: zero-byte ${target} (truncation signature)`)
    }
  }
  if (broken.length === 0) {
    record('dist-audit', 'ok', 'all declared dist artifacts exist and are non-empty')
    return true
  }
  record('dist-audit', 'fail', `broken/empty artifacts:\n  ${broken.join('\n  ')}`)
  return false
}

// ===== watch 进程检测 =====
// 持久 watch 进程会在 agent 工作时重建 dist，制造「检查时是新产物、构建时被清空」
// 的时序污染；检测到只 warn，终止需显式 --kill-watchers。
const WATCH_PATTERN = /(vp|tsdown|vite)[^ ]* .*(--watch| watch)/

function watcherDetection() {
  const ps = sh('ps', ['-axo', 'pid=,command='])
  if (ps.status !== 0) {
    record('watchers', 'warn', `cannot list processes: ${ps.stderr}`)
    return
  }
  const watchers = ps.stdout
    .split('\n')
    .map(line => line.trim())
    .filter(line => WATCH_PATTERN.test(line) && !line.includes('env-doctor'))
  if (watchers.length === 0) {
    record('watchers', 'ok', 'no watch processes detected')
    return
  }
  if (killWatchers) {
    for (const line of watchers) {
      const pid = Number.parseInt(line, 10)
      if (Number.isInteger(pid)) process.kill(pid, 'SIGTERM')
    }
    record('watchers', 'ok', `terminated ${watchers.length} watch process(es) via --kill-watchers`)
    return
  }
  record(
    'watchers',
    'warn',
    `watch processes may pollute dist while you work (use --kill-watchers to terminate):\n  ${watchers.join('\n  ')}`
  )
}

// ===== mise env：turbo 缓存位置 =====
// TURBO_CACHE_DIR 由 .mise.toml [env] 注入，值锚定 git common dir（主仓与全部 worktree 共享缓存）。
// 期望值不靠复刻 Tera 模板得到，而是按同一推导自己算一遍：判据刻意写死「git common dir + /turbo-cache」
// 这一条，.mise.toml 若换推导方式，这里必须同步改，否则断言会静默失守。
// 不相等就是当前 shell 没激活 mise（agent 工具宿主、git hook、bash -c、外部脚本都不激活），
// turbo 会落到默认缓存位置：既命中不了共享缓存，也可能在同一 hash 下写入工具链不符的产物。
function turboCacheCheck() {
  const miseConfig = fs.readFileSync(path.join(root, '.mise.toml'), 'utf8')
  if (!/^\s*TURBO_CACHE_DIR\s*=\s*".*"\s*$/m.test(miseConfig)) {
    record('turbo-cache', 'warn', '.mise.toml does not declare TURBO_CACHE_DIR; each worktree keeps a cold cache')
    return
  }
  const commonDir = sh('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'])
  if (commonDir.status !== 0) {
    record('turbo-cache', 'fail', `cannot resolve the git common dir: ${commonDir.stderr}`)
    return
  }
  const expected = path.join(commonDir.stdout, 'turbo-cache')
  const injected = process.env.TURBO_CACHE_DIR
  if (!injected) {
    record(
      'turbo-cache',
      'fail',
      `TURBO_CACHE_DIR is not injected (expected ${expected}): this shell did not activate mise, so turbo cannot reach the shared cache; prefix turbo-bound commands with \`mise exec --\``
    )
    return
  }
  if (path.resolve(injected) !== path.resolve(expected)) {
    record(
      'turbo-cache',
      'fail',
      `TURBO_CACHE_DIR=${injected} is not the shared cache (${expected}): turbo would miss it and write a divergent entry`
    )
    return
  }
  if (!fs.existsSync(injected)) {
    record('turbo-cache', 'ok', `TURBO_CACHE_DIR=${injected} (will be created on first turbo run)`)
    return
  }
  const entries = fs.readdirSync(injected).length
  record('turbo-cache', 'ok', `TURBO_CACHE_DIR=${injected} (${entries} cache entries)`)
}

// ===== mise env：node 版本 =====
// .mise.toml [tools] 把 node 钉在精确版本。turbo 的 hash 只记录 package.json 里 engines 的版本范围、
// 不记录真实工具链，所以宿主 PATH 上另一版 node 跑出的构建与钉住版本落进同一个 hash——这正是必须用
// `mise exec --` 硬约束的理由，这里把「当前 node 就是被钉住的那一版」变成可检测断言。
function nodeVersionCheck() {
  const miseConfig = fs.readFileSync(path.join(root, '.mise.toml'), 'utf8')
  const pinned = /^\s*node\s*=\s*"([^"]+)"\s*$/m.exec(miseConfig)?.[1]
  if (!pinned) {
    record('node-version', 'warn', '.mise.toml does not pin a node version under [tools]')
    return
  }
  const running = process.version.replace(/^v/, '')
  if (running === pinned) record('node-version', 'ok', `node ${process.version} matches .mise.toml (${pinned})`)
  else
    record(
      'node-version',
      'fail',
      `running node ${process.version} but .mise.toml pins ${pinned}: turbo hashes do not encode the toolchain, so the build would poison the shared cache under the same key; prefix toolchain-bound commands with \`mise exec --\``
    )
}

// ===== node_modules 链接有效性 =====
// pnpm 的 workspace 链接是符号链接；指向目标缺失即安装态损坏，提示重装。
function nodeModulesCheck() {
  const broken = []
  for (const packageDir of collectPackageDirs()) {
    const linksDir = path.join(packageDir, 'node_modules')
    if (!fs.existsSync(linksDir)) continue
    for (const scope of fs.readdirSync(linksDir, { withFileTypes: true })) {
      const scopePath = path.join(linksDir, scope.name)
      if (!scope.isSymbolicLink() && !scope.isDirectory()) continue
      if (scope.isDirectory() && !scope.name.startsWith('@')) continue
      if (scope.isSymbolicLink()) {
        if (!fs.existsSync(scopePath)) broken.push(`${path.relative(root, scopePath)} -> ${fs.readlinkSync(scopePath)}`)
        continue
      }
      for (const entry of fs.readdirSync(scopePath, { withFileTypes: true })) {
        const link = path.join(scopePath, entry.name)
        if (entry.isSymbolicLink() && !fs.existsSync(link))
          broken.push(`${path.relative(root, link)} -> ${fs.readlinkSync(link)}`)
      }
    }
  }
  if (broken.length === 0) {
    record('node-modules', 'ok', 'workspace links resolve')
    return
  }
  record('node-modules', 'fail', `broken workspace links (run pnpm install):\n  ${broken.join('\n  ')}`)
}

// ===== git worktree 残留 =====
function worktreeResidueCheck() {
  const prune = sh('git', ['worktree', 'prune', '--dry-run', '--verbose'])
  if (prune.status !== 0) {
    record('worktree-residue', 'warn', `git worktree prune --dry-run failed: ${prune.stderr}`)
    return
  }
  if (prune.stdout === '') {
    record('worktree-residue', 'ok', 'no stale worktree admin entries')
    return
  }
  if (fix) {
    shQuiet('git', ['worktree', 'prune', '--verbose'])
    record('worktree-residue', 'ok', 'pruned stale worktree admin entries via --fix')
    return
  }
  record('worktree-residue', 'warn', `stale worktree admin entries (use --fix to prune):\n${prune.stdout}`)
}

distAudit()
watcherDetection()
turboCacheCheck()
nodeVersionCheck()
nodeModulesCheck()
worktreeResidueCheck()

if (fix && results.some(result => result.id === 'dist-audit' && result.level === 'fail')) {
  const build = sh('pnpm', ['exec', 'turbo', 'run', 'build', '--force'])
  record(
    'fix-dist',
    build.status === 0 ? 'ok' : 'fail',
    build.status === 0 ? 'rebuilt dist via turbo --force' : `turbo --force failed: ${build.stderr}`
  )
}

const hasFail = results.some(result => result.level === 'fail')
if (asJson) console.log(JSON.stringify(results, null, 2))
else {
  for (const result of results) {
    const marker = result.level === 'ok' ? '✓' : result.level === 'warn' ? '!' : '✗'
    console.log(`${marker} [${result.level}] ${result.id}: ${result.detail}`)
  }
  console.log(
    `\nenv-doctor: ${hasFail ? 'FAIL' : 'PASS'} (${results.filter(r => r.level === 'fail').length} fail / ${results.filter(r => r.level === 'warn').length} warn / ${results.filter(r => r.level === 'ok').length} ok)`
  )
}
process.exitCode = hasFail ? 1 : 0
