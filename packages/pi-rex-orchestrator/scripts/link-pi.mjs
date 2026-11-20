#!/usr/bin/env node
/**
 * `link:pi`：把本包软链到 Pi 的全局扩展目录，并自动解析主仓库常驻路径。
 *
 * 开发联调期直接指向当前 worktree；合并回 main 并删除开发 worktree 之前，必须先在
 * 主仓库 main 路径上重跑一次本脚本，防止软链悬空。脚本从 `git worktree list
 * --porcelain` 解析主仓库路径（主 checkout 即不含 `worktree` 属性的那个条目）。
 * 只用 Node 内置模块。
 */

import { execFileSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function mainWorktree() {
  const out = execFileSync('git', ['worktree', 'list', '--porcelain'], { cwd: packageDir, encoding: 'utf8' })
  const entries = []
  for (const chunk of out.split('\n\n')) {
    const entry = {}
    for (const line of chunk.split('\n')) {
      if (line.startsWith('worktree ')) entry.path = line.slice(9)
      if (line.startsWith('branch ')) entry.branch = line.slice(7)
    }
    if (entry.path) entries.push(entry)
  }
  // 主 checkout：分支名是 refs/heads/main（worktree 条目是 refs/heads/<worktree 分支>）。
  const main = entries.find(entry => (entry.branch ?? '').endsWith('/main')) ?? entries[0]
  if (!main) throw new Error('git worktree list 没有可用条目')
  return main.path
}

const target = process.argv.includes('--main') ? mainWorktree() : packageDir
const extensionsDir = path.join(homedir(), '.pi', 'agent', 'extensions')
mkdirSync(extensionsDir, { recursive: true })
const linkPath = path.join(extensionsDir, 'rex-orchestrator')
execFileSync('ln', ['-sfn', target, linkPath])
process.stdout.write(`linked ~/.pi/agent/extensions/rex-orchestrator -> ${target}\n`)
