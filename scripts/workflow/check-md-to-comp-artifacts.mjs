#!/usr/bin/env node
// 生成物新鲜度判据的 CI 入口（turbo 任务 `check-generated`，两端 demo app 各挂一条脚本）。
// Build 步里插件的 writeArtifacts 会把失步的 src/generated/** 原地写新（healing），挂在测试档的
// checkArtifacts 到那时永远空转；这一步抢在 healing 之前只判不改。判据复用 emit.ts 的
// checkArtifacts，配置 import 宿主 vite.config.ts 的具名导出 mdToCompOptions——不抄第二份；
// 整文件求值会把各插件工厂无谓地跑一遍，一次性进程里可接受。

import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const [appDir, flavor] = process.argv.slice(2)
if (!appDir || (flavor !== 'react' && flavor !== 'vue')) {
  console.error('用法：node check-md-to-comp-artifacts.mjs <app-dir> <react|vue>')
  process.exit(2)
}

const root = path.resolve(appDir)
const require = createRequire(path.join(root, 'package.json'))

const { mdToCompOptions } = await import(pathToFileURL(path.join(root, 'vite.config.ts')))
if (!mdToCompOptions) throw new Error(`${root}/vite.config.ts 没有导出 mdToCompOptions`)

// md-to-comp 的 exports 只放行 import 条件，CJS require 解析不到 "."；"package.json" 有独立
// 子导出，用它定到包目录，再按包自己声明的 ESM 入口动态 import——不硬编码 dist 路径。
const pkgJsonPath = require.resolve('@greypan/md-to-comp/package.json')
const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf8'))
const entry = pkg.exports['.'].import ?? pkg.exports['.'].default
if (!entry) throw new Error(`@greypan/md-to-comp 的 exports["."] 没有 ESM 入口`)
const mdToComp = await import(pathToFileURL(path.join(path.dirname(pkgJsonPath), entry)))

// 与 vite.ts 的 resolveOptions 同一解析口径：input/output 相对 Vite root（这里就是 app 目录）。
const { input, output, ...options } = mdToCompOptions
const config = {
  ...options,
  input: path.resolve(root, input),
  outputs: [{ output: path.resolve(root, output ?? 'src/generated'), flavor }]
}

try {
  const { files, demosDirs } = await mdToComp.generate(config)
  mdToComp.checkArtifacts(files, demosDirs)
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}
