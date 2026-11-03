#!/usr/bin/env node
// 版本 PR 的生成物追平入口：`changeset version` 会改写 `packages/web-ui/CHANGELOG.md`（demo meta 的输入），
// 而版本 PR 不跑宿主 build，插件的 writeArtifacts healing 不会发生。这里对指定宿主目录直接跑同一份
// md-to-meta 配置写盘，判据与 check-md-to-meta-artifacts.mjs 共用 resolveGenerateOptions。

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const appDirs = process.argv.slice(2)
if (appDirs.length === 0) {
  console.error('用法：node regenerate-md-to-meta-artifacts.mjs <app-dir>...')
  process.exit(2)
}

const repoRoot = path.resolve(import.meta.dirname, '../..')

// md-to-meta 的 exports 只放行 import 条件，CJS require 解析不到 "."；按包自己声明的 ESM 入口动态
// import，不硬编码 dist 路径。调用方负责先构建产物，与 CI check-generated 的 `^build` 依赖一致。
const pkgDir = path.join(repoRoot, 'packages/md-to-meta')
const pkg = JSON.parse(readFileSync(path.join(pkgDir, 'package.json'), 'utf8'))
const entry = pkg.exports['.'].import ?? pkg.exports['.'].default
if (!entry) throw new Error(`@greypan/md-to-meta 的 exports["."] 没有 ESM 入口`)
const mdToMeta = await import(pathToFileURL(path.join(pkgDir, entry)))

for (const appDir of appDirs) {
  const root = path.resolve(appDir)
  const { mdToMetaOptions } = await import(pathToFileURL(path.join(root, 'vite.config.ts')))
  if (!mdToMetaOptions) throw new Error(`${root}/vite.config.ts 没有导出 mdToMetaOptions`)
  const config = mdToMeta.resolveGenerateOptions(root, mdToMetaOptions)
  const result = await mdToMeta.generate(config)
  mdToMeta.writeArtifacts(result.files, result.output)
}
