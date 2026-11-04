#!/usr/bin/env node
// 生成物新鲜度判据的 CI 入口（turbo 任务 `check-generated`，两端 demo app 各挂一条脚本）。
// Build 步里插件的 writeArtifacts 会把失步的 src/generated/** 原地写新（healing），挂在测试档的
// checkArtifacts 到那时永远空转；这一步抢在 healing 之前只判不改。判据与配置口径全部收在
// md-to-meta 的 CLI（`md-to-meta check <app-dir>`）里，这里只按包声明的 bin 入口转发进程，
// 不硬编码 dist 路径；调用方负责先构建产物，与 CI check-generated 的 `^build` 依赖一致。

import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const appDirs = process.argv.slice(2)
if (appDirs.length === 0) {
  console.error('用法：node check-md-to-meta-artifacts.mjs <app-dir>')
  process.exit(2)
}

const pkgDir = path.resolve(import.meta.dirname, '../../packages/md-to-meta')
const pkg = JSON.parse(readFileSync(path.join(pkgDir, 'package.json'), 'utf8'))
const cli = pkg.bin?.['md-to-meta']
if (!cli) throw new Error('@greypan/md-to-meta 没有声明 md-to-meta bin')
const run = spawnSync(process.execPath, [path.join(pkgDir, cli), 'check', ...appDirs], { stdio: 'inherit' })
if (run.error) throw run.error
process.exit(run.status ?? 1)
