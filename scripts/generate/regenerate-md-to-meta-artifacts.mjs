#!/usr/bin/env node
// 版本 PR 的生成物追平入口：`changeset version` 会改写 `packages/web-ui/CHANGELOG.md`（demo meta 的输入），
// 而版本 PR 不跑宿主 build，插件的 writeArtifacts healing 不会发生。判据与配置口径全部收在
// md-to-meta 的 CLI（`md-to-meta write <app-dir>...`）里，这里只按包声明的 bin 入口转发进程，
// 不硬编码 dist 路径；调用方负责先构建产物，与 changeset-version.sh 的 `^build` 依赖一致。

import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const appDirs = process.argv.slice(2)
if (appDirs.length === 0) {
  console.error('用法：node regenerate-md-to-meta-artifacts.mjs <app-dir>...')
  process.exit(2)
}

const pkgDir = path.resolve(import.meta.dirname, '../../packages/md-to-meta')
const pkg = JSON.parse(readFileSync(path.join(pkgDir, 'package.json'), 'utf8'))
const cli = pkg.bin?.['md-to-meta']
if (!cli) throw new Error('@greypan/md-to-meta 没有声明 md-to-meta bin')
const run = spawnSync(process.execPath, [path.join(pkgDir, cli), 'write', ...appDirs], { stdio: 'inherit' })
if (run.error) throw run.error
process.exit(run.status ?? 1)
