import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

// 这条测试钉的是 apps/interweave/scripts/generate-bindings.mjs 的「产出集合收缩」守卫和参数兼容分支。
// 那些分支在 -clean=false 下不可达（wails3 没有删除阶段），但守卫存在的意义正是「wails3 哪天改了语义」，
// 所以这些平时没人走的分支更要有人钉住：快照/还原、-clean / -ts 剔除、-d/-d= 锚定，都是易回归的自写逻辑。
// 前半用假的 wails3 驱动真实脚本；后半用 pinned wails3 Task runner 与隔离的 node/pnpm/go 驱动 build modes。
// 两部分都只写临时 fixture，不碰真实 frontend/bindings。
//
// 测试与被测脚本同址；执行端是根 `test-scripts` 的全仓 glob（`*.test.mjs`）。
const repoRoot = path.resolve(import.meta.dirname, '../../..')
const guardScript = path.join(import.meta.dirname, 'generate-bindings.mjs')
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

const frontendManifest = JSON.parse(
  fs.readFileSync(path.join(repoRoot, 'apps/interweave/frontend/package.json'), 'utf8')
)
assert.match(
  frontendManifest.scripts.build,
  /^node \.\.\/scripts\/generate-bindings\.mjs && pnpm run build:bundle$/,
  'standalone production build must generate bindings once before the shared bundle command'
)
assert.match(
  frontendManifest.scripts['build:dev'],
  /^node \.\.\/scripts\/generate-bindings\.mjs && pnpm run build:bundle:dev$/,
  'standalone development build must generate bindings once before the shared bundle command'
)
assert.doesNotMatch(frontendManifest.scripts['build:bundle'], /generate-bindings/)
assert.doesNotMatch(frontendManifest.scripts['build:bundle:dev'], /generate-bindings/)
assert.match(frontendManifest.scripts['build:bundle'], /vue-tsc --build && vp build --mode production/)
assert.match(
  frontendManifest.scripts['build:bundle:dev'],
  /vue-tsc --build && vp build --minify false --mode development/
)

const taskfile = fs.readFileSync(path.join(repoRoot, 'apps/interweave/build/Taskfile.yml'), 'utf8')
const frontendTaskStart = taskfile.indexOf('  build:frontend:\n')
const frontendTaskEnd = taskfile.indexOf('\n  generate:bindings:', frontendTaskStart)
const frontendTask =
  frontendTaskStart < 0 || frontendTaskEnd < 0 ? '' : taskfile.slice(frontendTaskStart, frontendTaskEnd)

assert.ok(frontendTask, 'the shared Wails Taskfile must declare build:frontend')
assert.match(frontendTask, /- task: generate:bindings/)
assert.match(frontendTask, /pnpm run \{\{if eq \.DEV "true"\}\}build:bundle:dev\{\{else\}\}build:bundle\{\{end\}\}/)
assert.doesNotMatch(frontendTask, /pnpm run \{\{if eq \.DEV "true"\}\}build:dev\{\{else\}\}build\{\{end\}\}/)
const bindingTaskStart = taskfile.indexOf('  generate:bindings:\n')
const bindingTaskEnd = taskfile.indexOf('\n  generate:icons:', bindingTaskStart)
const bindingTask = bindingTaskStart < 0 || bindingTaskEnd < 0 ? '' : taskfile.slice(bindingTaskStart, bindingTaskEnd)
assert.match(bindingTask, /\n    run: once\n/)
assert.doesNotMatch(bindingTask, /\n    (?:sources|generates):/)

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

  // Wails 的 source checksum 不含 BUILD_FLAGS / OBFUSCATED，因此 bindings generation 必须在每次 native
  // invocation 里运行一次。真实 Task runner + 隔离 stub 驱动模式切换，确认 frontend bundle 不会复用旧绑定。
  {
    const taskRoot = path.join(fixture, 'wails-task-modes')
    const tools = path.join(taskRoot, 'tools')
    const bundleCalls = path.join(taskRoot, 'bundle-calls.txt')
    const generatorCalls = path.join(taskRoot, 'generator-calls.txt')
    fs.mkdirSync(path.join(taskRoot, 'build'), { recursive: true })
    fs.mkdirSync(path.join(taskRoot, 'scripts'), { recursive: true })
    fs.mkdirSync(path.join(taskRoot, 'frontend', 'bindings'), { recursive: true })
    fs.mkdirSync(tools, { recursive: true })
    fs.writeFileSync(
      path.join(taskRoot, 'Taskfile.yml'),
      `version: '3'
includes:
  common: ./build/Taskfile.yml
tasks:
  multi-arch:
    deps:
      - task: common:build:frontend
        vars:
          ARCH: arm64
          BUILD_FLAGS: '-tags production'
          DEV: 'false'
          OBFUSCATED: 'false'
      - task: common:build:frontend
        vars:
          ARCH: amd64
          BUILD_FLAGS: '-tags production'
          DEV: 'false'
          OBFUSCATED: 'false'
`
    )
    fs.copyFileSync(
      path.join(repoRoot, 'apps/interweave/build/Taskfile.yml'),
      path.join(taskRoot, 'build/Taskfile.yml')
    )
    fs.writeFileSync(path.join(taskRoot, 'scripts/generate-bindings.mjs'), '// fixture entrypoint\n')
    fs.writeFileSync(path.join(taskRoot, 'frontend/bindings/service.ts'), 'initial\n')
    fs.writeFileSync(path.join(taskRoot, 'go.mod'), 'module taskfixture\n')
    fs.writeFileSync(path.join(taskRoot, 'go.sum'), '')
    fs.writeFileSync(path.join(taskRoot, 'main.go'), 'package main\n')
    fs.writeFileSync(path.join(tools, 'go'), '#!/bin/sh\nexit 0\n')
    fs.writeFileSync(
      path.join(tools, 'node'),
      `#!/bin/sh
printf '%s\\n' "$*" >> "$GENERATOR_CALLS"
mode=production
for arg in "$@"; do
  if printf '%s\\n' "$arg" | grep -q 'wails_obfuscated'; then mode=obfuscated; fi
  if printf '%s\\n' "$arg" | grep -q 'development'; then mode=development; fi
  if printf '%s\\n' "$arg" | grep -q 'production'; then mode=production; fi
done
if [ "$mode" = obfuscated ] && printf '%s\\n' "$*" | grep -q -- '-obfuscated'; then mode=wails_obfuscated; fi
printf '%s\\n' "$mode" > frontend/bindings/service.ts
`
    )
    fs.writeFileSync(
      path.join(tools, 'pnpm'),
      `#!/bin/sh
command="$2"
mode="$(cat bindings/service.ts)"
mkdir -p dist
printf '%s|%s\\n' "$command" "$mode" > dist/bundle.txt
printf '%s|%s\\n' "$command" "$mode" >> "$BUNDLE_CALLS"
`
    )
    for (const tool of ['go', 'node', 'pnpm']) fs.chmodSync(path.join(tools, tool), 0o755)

    const env = {
      ...process.env,
      PATH: `${tools}${path.delimiter}${process.env.PATH}`,
      XDG_CACHE_HOME: path.join(taskRoot, 'cache'),
      TMPDIR: path.join(taskRoot, 'tmp'),
      GENERATOR_CALLS: generatorCalls,
      BUNDLE_CALLS: bundleCalls
    }
    fs.mkdirSync(env.XDG_CACHE_HOME, { recursive: true })
    fs.mkdirSync(env.TMPDIR, { recursive: true })

    const scenarios = [
      { flags: '-tags production', expectedMode: 'production', bundle: 'build:bundle' },
      { flags: '-tags production', expectedMode: 'production', bundle: 'build:bundle' },
      { flags: '-tags development', dev: true, expectedMode: 'development', bundle: 'build:bundle:dev' },
      { flags: '-tags production', expectedMode: 'production', bundle: 'build:bundle' },
      { flags: '-tags wails_obfuscated', obfuscated: true, expectedMode: 'wails_obfuscated', bundle: 'build:bundle' }
    ]
    try {
      for (const [index, scenario] of scenarios.entries()) {
        const args = [
          'task',
          'common:build:frontend',
          `BUILD_FLAGS=${scenario.flags}`,
          `DEV=${scenario.dev ? 'true' : 'false'}`,
          `OBFUSCATED=${scenario.obfuscated ? 'true' : 'false'}`
        ]
        execFileSync('wails3', args, { cwd: taskRoot, env, encoding: 'utf8', stdio: 'pipe' })
        const bundle = fs.readFileSync(path.join(taskRoot, 'frontend/dist/bundle.txt'), 'utf8').trim()
        assert.equal(
          bundle,
          `${scenario.bundle}|${scenario.expectedMode}`,
          `native invocation ${index + 1} must bundle the current generated mode`
        )
        const generated = fs.readFileSync(generatorCalls, 'utf8').trim().split('\n')
        assert.equal(generated.length, index + 1, `bindings generator must run once for native invocation ${index + 1}`)
        assert.ok(generated.at(-1).includes(scenario.flags), `generator must receive ${scenario.flags}`)
        assert.equal(
          generated.at(-1).includes('-obfuscated'),
          Boolean(scenario.obfuscated),
          `obfuscation flag must match native invocation ${index + 1}`
        )
      }
      assert.equal(fs.readFileSync(bundleCalls, 'utf8').trim().split('\n').length, scenarios.length)

      const generatorCallsBeforeMultiArch = fs.readFileSync(generatorCalls, 'utf8').trim().split('\n').length
      const bundleCallsBeforeMultiArch = fs.readFileSync(bundleCalls, 'utf8').trim().split('\n').length
      execFileSync('wails3', ['task', 'multi-arch'], { cwd: taskRoot, env, encoding: 'utf8', stdio: 'pipe' })
      assert.equal(
        fs.readFileSync(generatorCalls, 'utf8').trim().split('\n').length,
        generatorCallsBeforeMultiArch + 1,
        'two parallel architecture deps in one aggregate invocation must run bindings generation once'
      )
      assert.equal(
        fs.readFileSync(bundleCalls, 'utf8').trim().split('\n').length,
        bundleCallsBeforeMultiArch + 1,
        'two parallel architecture deps in one aggregate invocation must run the frontend bundle once'
      )
      assert.equal(
        fs.readFileSync(path.join(taskRoot, 'frontend/dist/bundle.txt'), 'utf8').trim(),
        'build:bundle|production',
        'multi-architecture dependencies must consume the current production bindings'
      )
    } finally {
      fs.rmSync(taskRoot, { recursive: true, force: true })
    }
  }

  // 真实 bindings 全程不得被碰：没有别的断言能覆盖它，就靠这条守住「测试自身安全」。
  const realAfter = hashTree(realBindings)
  assert.equal(realAfter.size, realBefore.size, 'the test must not change the real bindings file set')
  for (const [rel, content] of realBefore) {
    assert.equal(realAfter.get(rel), content, `the test must not change real bindings/${rel}`)
  }
} finally {
  fs.rmSync(fixture, { recursive: true, force: true })
}

console.log('apps/interweave/scripts/generate-bindings.test.mjs: all assertions passed')
