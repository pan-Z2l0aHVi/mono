import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

// 这条测试钉的是 apps/interweave/scripts/generate-bindings.mjs 的「产出集合收缩」守卫和参数兼容分支。
// 那些分支在 -clean=false 下不可达（wails3 没有删除阶段），但守卫存在的意义正是「wails3 哪天改了语义」，
// 所以这些平时没人走的分支更要有人钉住：快照/还原、-clean / -ts 剔除、-d/-d= 锚定，都是易回归的自写逻辑。
// 测试用假的 wails3 驱动真实脚本，不碰真实 frontend/bindings，也不要求装 wails3。
//
// 放在根 scripts/ 而不是 apps/interweave/scripts/ 是刻意的：只有根 `pnpm run ci:test-scripts`
// （`for f in scripts/*.test.mjs; do node "$f" || exit 1; done`）会跑 *.test.mjs，app 目录下没有 runner。
const repoRoot = path.resolve(import.meta.dirname, '..')
const guardScript = path.join(repoRoot, 'apps', 'interweave', 'scripts', 'generate-bindings.mjs')
const realBindings = path.join(repoRoot, 'apps', 'interweave', 'frontend', 'bindings')

// 生成树里用的占位路径与文件名：全是 cspell 词典里的常见词，避免给仓库词表添新词。
const victim = 'native/service/index.ts'
const sibling = 'library/index.ts'
const added = 'added-probe.ts'

function hashTree(dir) {
  const files = new Map()
  const walk = current => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const abs = path.join(current, entry.name)
      if (entry.isDirectory()) walk(abs)
      else if (entry.isFile()) files.set(path.relative(dir, abs), fs.readFileSync(abs).toString('base64'))
    }
  }
  if (fs.existsSync(dir)) walk(dir)
  return files
}

function sameTree(a, b) {
  const first = hashTree(a)
  const second = hashTree(b)
  if (first.size !== second.size) return false
  for (const [rel, content] of first) if (second.get(rel) !== content) return false
  return true
}

const realBefore = hashTree(realBindings)

const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'greypan-bindings-guard-'))
const shimDir = path.join(fixture, 'bin')
const argsFile = path.join(fixture, 'args.txt')
const dirFile = path.join(fixture, 'dir.txt')

// 假 wails3：把收到的每个参数逐行落盘（供断言），解析 -d/-d=，再按 FAKE_MODE 模仿一次生成结果。
// 它不实现真正的生成——测的是守卫对「产出集合怎么变」的反应，不是 wails3 本身。
fs.mkdirSync(shimDir, { recursive: true })
fs.writeFileSync(
  path.join(shimDir, 'wails3'),
  `#!/bin/sh
: > "$FAKE_ARGS_FILE"
dir=""
prev=""
for arg in "$@"; do
  printf '%s\\n' "$arg" >> "$FAKE_ARGS_FILE"
  if [ "$prev" = "-d" ] || [ "$prev" = "--d" ]; then dir="$arg"; fi
  if [ "\${arg#-d=}" != "$arg" ]; then dir="\${arg#-d=}"; fi
  prev="$arg"
done
printf '%s\\n' "$dir" > "$FAKE_DIR_FILE"
if [ "$FAKE_MODE" = "shrink" ]; then rm -f "$dir/${victim}"; fi
if [ "$FAKE_MODE" = "growth" ]; then printf 'new\\n' > "$dir/${added}"; fi
if [ "$FAKE_MODE" = "fail" ]; then exit 2; fi
exit 0
`
)
fs.chmodSync(path.join(shimDir, 'wails3'), 0o755)

function seedTree() {
  const dir = path.join(fixture, `bindings-${Math.random().toString(36).slice(2)}`)
  fs.mkdirSync(path.join(dir, path.dirname(victim)), { recursive: true })
  fs.mkdirSync(path.join(dir, path.dirname(sibling)), { recursive: true })
  fs.writeFileSync(path.join(dir, victim), 'export const native = 1\n')
  fs.writeFileSync(path.join(dir, sibling), 'export const library = 1\n')
  return dir
}

function referenceTree(dir) {
  const ref = path.join(fixture, `ref-${Math.random().toString(36).slice(2)}`)
  fs.cpSync(dir, ref, { recursive: true })
  return ref
}

function runGuard(mode, extraArgs, dir) {
  const args = extraArgs ?? []
  const hasDir = args.some(a => a === '-d' || a === '--d' || a.startsWith('-d='))
  try {
    execFileSync(process.execPath, [guardScript, ...args, ...(hasDir ? [] : ['-d', dir])], {
      cwd: repoRoot,
      env: {
        ...process.env,
        PATH: `${shimDir}${path.delimiter}${process.env.PATH}`,
        FAKE_MODE: mode,
        FAKE_ARGS_FILE: argsFile,
        FAKE_DIR_FILE: dirFile
      },
      encoding: 'utf8',
      stdio: 'pipe'
    })
    return { status: 0, stdout: '', stderr: '' }
  } catch (error) {
    return { status: error.status, stdout: error.stdout ?? '', stderr: error.stderr ?? '' }
  }
}

function forwardedArgs() {
  return fs.readFileSync(argsFile, 'utf8').split('\n').filter(Boolean)
}

try {
  // 1. 正常：不删文件 ⇒ exit 0，输出目录逐字不变。
  {
    const dir = seedTree()
    const ref = referenceTree(dir)
    const result = runGuard('normal', null, dir)
    assert.equal(result.status, 0, 'normal generation must exit 0')
    assert.ok(sameTree(dir, ref), 'normal generation must leave the output directory byte-identical')
    console.log('  1 normal: exit 0, output directory byte-identical')
  }

  // 2. 少产出：删一个（exit 0）⇒ 还原 + 非零退出，还原后与原件逐字一致。
  {
    const dir = seedTree()
    const ref = referenceTree(dir)
    const result = runGuard('shrink', null, dir)
    assert.notEqual(result.status, 0, 'a shrunken output set must exit non-zero')
    assert.match(result.stderr, /output set shrank/, 'stderr must name the shrink')
    assert.ok(result.stderr.includes(victim), 'stderr must list the missing file')
    assert.ok(sameTree(dir, ref), 'the guard must restore the directory byte-for-byte')
    console.log(`  2 shrink: exit ${result.status}, restored byte-for-byte`)
  }

  // 3. 只增不减 ⇒ exit 0，新文件保留（新增是正常待审 diff，不是异常）。
  {
    const dir = seedTree()
    const result = runGuard('growth', null, dir)
    assert.equal(result.status, 0, 'a growth-only run must exit 0')
    assert.ok(fs.existsSync(path.join(dir, added)), 'growth-only run must keep the new file')
    console.log('  3 growth-only: exit 0, new file kept')
  }

  // 4. wails3 exit != 0 且不少产出 ⇒ 透传原退出码。
  {
    const dir = seedTree()
    const ref = referenceTree(dir)
    const result = runGuard('fail', null, dir)
    assert.equal(result.status, 2, 'a failing wails3 must propagate its exit code')
    assert.ok(sameTree(dir, ref), 'a failure with no shrink must not touch the directory')
    console.log(`  4 wails3 exit 2: propagated as ${result.status}, directory untouched`)
  }

  // 5. 参数兼容：-clean=true / -clean true / -ts 一律剔除，脚本自己补且只补一次 -clean=false -ts。
  for (const cleanArgs of [['-clean=true'], ['-clean', 'true']]) {
    const dir = seedTree()
    const result = runGuard('normal', [...cleanArgs, '-ts', '-d', dir], dir)
    assert.equal(result.status, 0, `${cleanArgs.join(' ')}: run must exit 0`)
    const forwarded = forwardedArgs()
    const cleanFlags = forwarded.filter(
      a => a === '-clean' || a === '--clean' || a.startsWith('-clean=') || a.startsWith('--clean=')
    )
    assert.deepEqual(
      cleanFlags,
      ['-clean=false'],
      `${cleanArgs.join(' ')}: the caller's -clean must be stripped and exactly one -clean=false added`
    )
    assert.equal(forwarded.includes('true'), false, `${cleanArgs.join(' ')}: the -clean boolean must not leak`)
    assert.equal(forwarded.filter(a => a === '-ts').length, 1, `${cleanArgs.join(' ')}: -ts must appear once`)
  }
  console.log('  5 arg compat: -clean=true and -clean true stripped; one -clean=false and one -ts added')

  // 6. -d=<dir> 与 -d <dir> 都必须锚定到指定目录（不是默认的 frontend/bindings）。
  for (const form of ['equals', 'space']) {
    const dir = seedTree()
    const ref = referenceTree(dir)
    const args = form === 'equals' ? [`-d=${dir}`] : ['-d', dir]
    const result = runGuard('shrink', args, dir)
    assert.notEqual(result.status, 0, `-d ${form}: a shrink must be caught in the -d target`)
    assert.ok(sameTree(dir, ref), `-d ${form}: restore must land in the -d target`)
    assert.equal(fs.readFileSync(dirFile, 'utf8').trim(), dir, `-d ${form}: wails3 must receive the -d target`)
  }
  console.log('  6 -d=<dir> and -d <dir> both anchor the guard to the given directory')

  // 真实 bindings 全程不得被碰：没有别的断言能覆盖它，就靠这条守住「测试自身安全」。
  const realAfter = hashTree(realBindings)
  assert.equal(realAfter.size, realBefore.size, 'the test must not change the real bindings file set')
  for (const [rel, content] of realBefore) {
    assert.equal(realAfter.get(rel), content, `the test must not change real bindings/${rel}`)
  }
} finally {
  fs.rmSync(fixture, { recursive: true, force: true })
}

console.log('scripts/generate-bindings.test.mjs: all assertions passed')
