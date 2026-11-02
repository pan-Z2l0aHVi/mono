#!/usr/bin/env node
// 生成物新鲜度判据的 CI 入口（turbo 任务 `check-generated`，两端 demo app 各挂一条脚本）。
// Build 步里插件的 writeArtifacts 会把失步的 src/generated/** 原地写新（healing），挂在测试档的
// checkArtifacts 到那时永远空转；这一步抢在 healing 之前只判不改。判据复用 emit.ts 的
// checkArtifacts，配置 import 宿主 vite.config.ts 的具名导出 mdToMetaOptions——不抄第二份；
// 整文件求值会把各插件工厂无谓地跑一遍，一次性进程里可接受。

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const [appDir] = process.argv.slice(2)
if (!appDir) {
  console.error('用法：node check-md-to-meta-artifacts.mjs <app-dir>')
  process.exit(2)
}

const root = path.resolve(appDir)
const repoRoot = path.resolve(import.meta.dirname, '../..')

const { mdToMetaOptions } = await import(pathToFileURL(path.join(root, 'vite.config.ts')))
if (!mdToMetaOptions) throw new Error(`${root}/vite.config.ts 没有导出 mdToMetaOptions`)

// md-to-meta 的 exports 只放行 import 条件，CJS require 解析不到 "."；直接读仓库内的 manifest，
// 按包自己声明的 ESM 入口动态 import——不硬编码 dist 路径，也不要求包为读元数据放开子导出。
const pkgDir = path.join(repoRoot, 'packages/md-to-meta')
const pkg = JSON.parse(readFileSync(path.join(pkgDir, 'package.json'), 'utf8'))
const entry = pkg.exports['.'].import ?? pkg.exports['.'].default
if (!entry) throw new Error(`@greypan/md-to-meta 的 exports["."] 没有 ESM 入口`)
const mdToMeta = await import(pathToFileURL(path.join(pkgDir, entry)))

// 与插件共用同一份解析口径（相对 Vite root 的路径），配置只写一次，解析只写一次。
const config = mdToMeta.resolveGenerateOptions(root, mdToMetaOptions)

try {
  const result = await mdToMeta.generate(config)
  mdToMeta.checkArtifacts(result.files, result.output)
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}
