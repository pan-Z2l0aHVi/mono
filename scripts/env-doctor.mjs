#!/usr/bin/env node
// 环境医生（参照 flutter doctor 的形态）：对本地开发环境做体检，
// 各检查项返回 ok/warn/fail 与可观察 detail。默认只读；--fix 与 --kill-watchers
// 是显式 opt-in 的写操作。覆盖本会话实测踩过的环境坑：
// dist 截断（vp build --watch 清空 d.ts）、watch 进程污染、turbo 缓存未生效、
// node_modules 链接失效、git worktree 残留。
//
// 用法：pnpm run env:doctor [--json] [--fix] [--kill-watchers]
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

// ===== turbo 缓存解析 =====
// TURBO_CACHE_DIR 由 .mise.toml [env] 注入（worktree 族共享缓存）；声明存在但
// 环境未注入说明当前 shell 未激活 mise，turbo 会退回 per-worktree 冷缓存。
function turboCacheCheck() {
  const miseConfig = fs.readFileSync(path.join(root, '.mise.toml'), 'utf8')
  const declared = /^\s*TURBO_CACHE_DIR\s*=\s*"([^"]+)"/m.exec(miseConfig)
  if (!declared) {
    record('turbo-cache', 'warn', '.mise.toml does not declare TURBO_CACHE_DIR; each worktree keeps a cold cache')
    return
  }
  const resolved = declared[1].replace('{{ config_root }}', root)
  const injected = process.env.TURBO_CACHE_DIR
  if (!injected) {
    record(
      'turbo-cache',
      'warn',
      `TURBO_CACHE_DIR declared in .mise.toml but not injected; activate mise (expected ${resolved})`
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
