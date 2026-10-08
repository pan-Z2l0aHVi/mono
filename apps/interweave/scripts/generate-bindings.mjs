#!/usr/bin/env node
// Interweave `frontend/bindings/**` 生成的唯一入口。
//
// 背景：`wails3 generate bindings` 的 `-clean` 默认是 `true`，而它不是「先删目录再重建」：
// 它先生成到输出目录的兄弟临时目录 `.bindings-tmp-*`，再逐文件同步回输出目录；同步的**删除阶段**
// 会把「这一次没有产出的文件」从输出目录删掉（wails v3 `internal/commands/bindings_sync.go` 的
// delete phase）。而包加载 / 类型检查的问题只记成 Warning、命令仍然 exit 0。于是危险形状是
// **exit 0 的静默少产出**：受版本控制的 `apps/interweave/frontend/bindings/**` 会被无声删掉，
// 「失败就恢复」这类按退出码判定的守卫根本挡不住。
//
// 本脚本用两道互补的机制堵住它，两者都不能省：
//   1. `-clean=false` 生成：打开这个开关时写输出目录**完全没有删除阶段**（同步与删除只在 clean
//      模式跑），所以生成过程本身不会删掉任何既有文件。
//   2. 生成前后对 `bindings/**` 做「产出集合收缩」守卫：生成前快照（相对路径 + 内容），生成后
//      只要快照里的文件少了任何一个，就把目录**精确还原到快照**并以非零退出。即使将来 wails3
//      改了 clean 语义、或有人把 `-clean` 又拨回 `true`，也不会静默丢文件。
//
// 代价（同步写进 docs/agents/build.md 与 changeset）：
//   - 不再清理陈旧生成物：`-clean=false` 不删任何文件，重命名 / 删掉一个 Service 后旧文件会留在
//     `bindings/` 里，需要人工 `git rm`。这是刻意取舍——留下旧文件可恢复，静默删除不可恢复。
//   - 直接写 `bindings/`（而不是临时目录 + 同步）在 dev server 开着时会有 HMR 事件；但因为没有
//     delete + recreate 环，chokidar 不会因此进入重命名循环（那套临时目录机制正是为避开该循环）。
//   - 守卫挡的是「工具删文件」这一形状：它比对生成前后的产出集合，只有少了文件才还原 + 报错。
//     在本配置（`-clean=false`）下 wails3 不再有删除阶段，所以这条分支基本不会被触发——它更像是
//     一个「wails3 若改了语义就报警」的哨兵，而不是一个会误报的闸门。陈旧生成物不由守卫处理：
//     改名 / 删 Service 后留下的旧文件需要人工 `git rm`（守卫只因「少了文件」报警，不因「多了陈旧文件」报警）。
//
// 用法：node scripts/generate-bindings.mjs [-f <build flags>] [-obfuscated] [-d <output dir>]
// 其余参数原样转发给 `wails3 generate bindings`。`-clean` 与 `-ts` 由本脚本固定提供，调用方
// 不要再传（即使误传也会被剔除，不变量不受调用方影响）。
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// 脚本位于 apps/interweave/scripts/，据此把 wails3 的工作目录与默认输出目录锚到应用根，
// 与调用方当时在哪个目录无关。
const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const defaultBindingsDir = path.join(appRoot, 'frontend', 'bindings')

// 解析转发参数：取出 `-d/--d` 指定的输出目录（相对 appRoot 解析），并剔除脚本自己固定的
// `-clean` / `-ts`——调用方哪怕误传 `-clean=true` 也翻不动这条不变量。
export function parseArgs(argv) {
  const forwarded = []
  let outputDir
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '-ts' || arg === '--ts') continue
    if (/^--?ts=/.test(arg)) continue
    if (arg === '-clean' || arg === '--clean') {
      // Drop the explicit boolean that may follow (-clean true) so it does not become a positional arg.
      if (argv[index + 1] === 'true' || argv[index + 1] === 'false') index += 1
      continue
    }
    if (/^--?clean=/.test(arg)) continue
    const equalsDir = /^--?d=(.*)$/.exec(arg)
    if (arg === '-d' || arg === '--d') {
      outputDir = argv[index + 1]
      forwarded.push(arg, argv[index + 1])
      index += 1
      continue
    }
    if (equalsDir) {
      outputDir = equalsDir[1]
      forwarded.push(arg)
      continue
    }
    forwarded.push(arg)
  }
  return { forwarded, outputDir }
}

// 快照目录下所有普通文件：相对路径 -> 内容字节。目录不存在时返回空 Map（首次生成）。
export function snapshotDir(dir) {
  const snapshot = new Map()
  if (!fs.existsSync(dir)) return snapshot
  const stack = [dir]
  while (stack.length > 0) {
    const current = stack.pop()
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const abs = path.join(current, entry.name)
      if (entry.isDirectory()) stack.push(abs)
      else if (entry.isFile()) snapshot.set(path.relative(dir, abs), fs.readFileSync(abs))
    }
  }
  return snapshot
}

// 快照里有、但当前目录下缺失的相对路径（即「这一次产出变少」的那些文件）。
export function missingFrom(dir, snapshot) {
  const present = new Set(snapshotDir(dir).keys())
  return [...snapshot.keys()].filter(rel => !present.has(rel))
}

// 把目录精确还原到快照：按快照逐个写回内容、删掉快照之外的文件、清掉空目录。不用 `rm -rf`
// 整目录，避免连带删掉未被快照覆盖的东西。
export function restoreSnapshot(dir, snapshot) {
  for (const [rel, content] of snapshot) {
    const abs = path.join(dir, rel)
    fs.mkdirSync(path.dirname(abs), { recursive: true })
    fs.writeFileSync(abs, content)
  }
  for (const rel of snapshotDir(dir).keys()) {
    if (!snapshot.has(rel)) fs.rmSync(path.join(dir, rel))
  }
  pruneEmptyDirs(dir)
}

function pruneEmptyDirs(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const abs = path.join(dir, entry.name)
    pruneEmptyDirs(abs)
    if (fs.readdirSync(abs).length === 0) fs.rmdirSync(abs)
  }
}

function run(argv = process.argv.slice(2)) {
  const { forwarded, outputDir } = parseArgs(argv)
  const bindingsDir = outputDir ? path.resolve(appRoot, outputDir) : defaultBindingsDir
  const before = snapshotDir(bindingsDir)

  const result = spawnSync('wails3', ['generate', 'bindings', ...forwarded, '-clean=false', '-ts'], {
    cwd: appRoot,
    stdio: 'inherit'
  })

  if (result.error) {
    console.error(`generate-bindings: failed to run wails3: ${result.error.message}`)
    process.exit(1)
  }

  const missing = missingFrom(bindingsDir, before)
  if (missing.length > 0) {
    restoreSnapshot(bindingsDir, before)
    const listed = missing.map(rel => `  - ${rel}`).join('\n')
    console.error(
      `generate-bindings: FAILED — the output set shrank; restored ${bindingsDir} to the pre-generation snapshot.\n` +
        `Missing files (expected, but not produced this run):\n${listed}\n` +
        `This is the silent-shrink shape that once deleted tracked bindings (wails3 generate bindings -clean). ` +
        `The generator is not expected to delete files here: -clean=false has no delete phase, so this is either a wails3 semantics change or a corrupted output directory. Fix the cause and re-run; remove stale files from a deleted Service by hand with \`git rm\`.`
    )
    process.exit(1)
  }

  process.exit(result.status ?? 1)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  run()
}
