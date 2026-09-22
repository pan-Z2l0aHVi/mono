import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

// 这条测试钉的是「版本写入不再需要桌面工具链」。来自 2026-09-22 的线上事实：版本 job 只装 node+pnpm，
// 而旧写路径无条件 spawn `wails3 update build-assets`，在缺桌面系统库的 runner 上以 exit 127
// 断掉整条发版链（run 47/48）。所以判据不是「结果对不对」，而是「在没有 wails3 的环境里能否写完」。
const repoRoot = path.resolve(import.meta.dirname, '..')
const appRoot = path.join(repoRoot, 'apps', 'interweave')
const syncScript = path.join(appRoot, 'scripts', 'sync-version.mjs')

// 与 sync-version.mjs 的位置判据同源：捕获组即版本 token，`g` 只为数命中次数。这张表在测试里独立写
// 一遍是刻意的——脚本若改掉 token 形状而这里没跟着改，下面的全等断言会立刻炸，而不是静默少检一个文件。
const tokenSites = {
  'build/darwin/Info.plist': [
    /CFBundleVersion<\/key>\s*<string>([^<]+)<\/string>/dg,
    /CFBundleShortVersionString<\/key>\s*<string>([^<]+)<\/string>/dg
  ],
  'build/darwin/Info.dev.plist': [
    /CFBundleVersion<\/key>\s*<string>([^<]+)<\/string>/dg,
    /CFBundleShortVersionString<\/key>\s*<string>([^<]+)<\/string>/dg
  ],
  'build/windows/wails.exe.manifest': [
    /assemblyIdentity type="win32" name="com\.greypan\.interweave" version="([^"]+)"/dg
  ],
  'build/windows/info.json': [/"file_version":\s*"([^"]+)"/dg, /"ProductVersion":\s*"([^"]+)"/dg]
}

const fixtureFiles = ['build/config.yml', ...Object.keys(tokenSites)]
const trackedVersion = JSON.parse(fs.readFileSync(path.join(appRoot, 'package.json'), 'utf8')).version

const source = fs.readFileSync(syncScript, 'utf8')

// 静态层：写路径不得持有任何外部进程能力。注释里出现 wails3 是允许的（它说明何时仍需装机重新脚手架），
// 但 `node:child_process` 或 spawnSync 一旦回来，窄工具链的版本 job 就再次只在发版当天才暴露问题。
assert.equal(source.includes('node:child_process'), false, 'sync-version must not import child_process')
assert.equal(source.includes('spawnSync('), false, 'sync-version must not spawn an external toolchain')

const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'greypan-version-sync-'))
const shimDir = path.join(fixture, 'shim')
const shimMarker = path.join(fixture, 'wails3-was-invoked')

function makeFixtureApp(version) {
  fs.mkdirSync(path.join(fixture, 'scripts'), { recursive: true })

  for (const file of fixtureFiles) {
    const target = path.join(fixture, file)
    fs.mkdirSync(path.dirname(target), { recursive: true })
    fs.copyFileSync(path.join(appRoot, file), target)
  }

  // 脚本按自身位置解析 `../package.json` 与 `../build/**`，所以整棵 fixture 就是它的 appRoot。
  fs.copyFileSync(syncScript, path.join(fixture, 'scripts', 'sync-version.mjs'))
  const packageJson = JSON.parse(fs.readFileSync(path.join(appRoot, 'package.json'), 'utf8'))
  packageJson.version = version
  fs.writeFileSync(path.join(fixture, 'package.json'), `${JSON.stringify(packageJson, null, 2)}\n`)
}

function runScript(...args) {
  // PATH 里只有那个会留 marker 的 shim；node 走绝对路径。这就是版本 job 的窄工具链形状。
  return execFileSync(process.execPath, [path.join(fixture, 'scripts', 'sync-version.mjs'), ...args], {
    cwd: fixture,
    env: { PATH: shimDir },
    encoding: 'utf8',
    stdio: 'pipe'
  })
}

function failMessage(...args) {
  let failure
  try {
    runScript(...args)
  } catch (error) {
    failure = error
  }
  assert.ok(failure, `expected a failure: sync-version ${args.join(' ')}`)
  assert.notEqual(failure.status, 0, 'a rejected sync must exit non-zero')
  return `${failure.stdout ?? ''}${failure.stderr ?? ''}`
}

// 把写完的内容按同一张表把 token 换回原值，必须与写之前的字节全等 ⇒ 除版本 token 外没有任何内容动过。
// 它不证明与 wails3 的模板渲染输出等值（那需要装机跑一次上游模板，留痕写在 task packet 里）。
// 整文件匹配而不是逐行：plist 的 key 与 `<string>` 分处两行，`\s*` 会跨换行。
function assertVersionTokensAreTheOnlyChange(file, before, after, nextVersion) {
  let restored = after

  for (const pattern of tokenSites[file]) {
    const matches = Array.from(restored.matchAll(pattern))
    assert.equal(matches.length, 1, `${file}: expected exactly one version token, found ${matches.length}`)
    const match = matches[0]
    assert.equal(match[1], nextVersion, `${file}: expected the token to hold ${nextVersion}, got ${match[1]}`)
    const [start, end] = match.indices[1]
    restored = `${restored.slice(0, start)}${trackedVersion}${restored.slice(end)}`
  }

  assert.equal(restored, before, `${file}: only version tokens may change`)
  assert.equal(after.split('\n').length, before.split('\n').length, `${file}: line count must not drift`)
}

fs.mkdirSync(shimDir, { recursive: true })
// shim 不是只 exit：留下 marker 才能把「没被调用」变成可断言的事实而不是推论。
fs.writeFileSync(
  path.join(shimDir, 'wails3'),
  `#!/bin/sh\ntouch '${shimMarker}'\necho 'the version sync path must not invoke wails3' >&2\nexit 9\n`
)
fs.chmodSync(path.join(shimDir, 'wails3'), 0o755)

try {
  // 0.0.0 → 0.1.0：同长度 bump，版本 PR 的实际形状。
  makeFixtureApp('0.1.0')
  assert.equal(runScript(), '', 'the write path must succeed with no toolchain on PATH')
  assert.equal(fs.existsSync(shimMarker), false, 'the write path must not invoke wails3')
  assert.match(
    fs.readFileSync(path.join(fixture, 'build/config.yml'), 'utf8'),
    /^ {2}version: '0\.1\.0'/m,
    'build/config.yml must carry the new version'
  )

  for (const file of Object.keys(tokenSites)) {
    assertVersionTokensAreTheOnlyChange(
      file,
      fs.readFileSync(path.join(appRoot, file), 'utf8'),
      fs.readFileSync(path.join(fixture, file), 'utf8'),
      '0.1.0'
    )
  }

  // 幂等：config 已与 package.json 相等时只校验，不得报错也不得改字节。
  const plistBefore = fs.readFileSync(path.join(fixture, 'build/darwin/Info.plist'), 'utf8')
  assert.equal(runScript(), '', 'a second run must stay silent')
  assert.equal(fs.readFileSync(path.join(fixture, 'build/darwin/Info.plist'), 'utf8'), plistBefore)
  assert.equal(runScript('--check'), '', '--check must pass right after a write')

  // 长度不同的 bump（0.0.0 → 10.0.0）：token 下标若跨 site 复用，这里会写漏或写坏。
  makeFixtureApp('10.0.0')
  assert.equal(runScript(), '')
  assertVersionTokensAreTheOnlyChange(
    'build/windows/info.json',
    fs.readFileSync(path.join(appRoot, 'build/windows/info.json'), 'utf8'),
    fs.readFileSync(path.join(fixture, 'build/windows/info.json'), 'utf8'),
    '10.0.0'
  )

  // --check 必须仍抓得到漂移，并给出可观察原因：哪个文件、读到什么、期望什么。
  const manifest = fs.readFileSync(path.join(fixture, 'build/windows/wails.exe.manifest'), 'utf8')
  fs.writeFileSync(path.join(fixture, 'build/windows/wails.exe.manifest'), manifest.replace('10.0.0', '9.9.9'))
  const drifted = failMessage('--check')
  assert.match(drifted, /wails\.exe\.manifest/, '--check must name the drifted file')
  assert.match(drifted, /has version 9\.9\.9, expected 10\.0\.0/, '--check must report read and expected values')

  // token 形状被改掉（这里掏空版本属性）必须是失败，而不是静默少检一个文件。
  fs.writeFileSync(
    path.join(fixture, 'build/windows/wails.exe.manifest'),
    manifest.replace(/(com\.greypan\.interweave" version=")[^"]+/, '$1')
  )
  assert.match(failMessage('--check'), /no version token matched/)

  // 同一个 site 出现第二个同名 token 时，读和写两端都必须拒绝。窄写法只改第一处的话，第二处会永久
  // 携带过期版本，而「只检第一个匹配」的校验和上面那条还原断言都看不见它。
  makeFixtureApp('11.0.0')
  runScript()
  const infoPath = path.join(fixture, 'build/windows/info.json')
  fs.writeFileSync(
    infoPath,
    fs
      .readFileSync(infoPath, 'utf8')
      .replace('"file_version": "11.0.0"', '"file_version": "11.0.0", "file_version": "11.0.0"')
  )
  assert.match(
    failMessage('--check'),
    /info\.json matched 2 version tokens, expected exactly one/,
    '--check must reject a duplicated token site'
  )

  // 写路径本身也要拒绝：把 package.json 推到 config.yml 之前，writer 才会走到产物 site。
  const fixturePackagePath = path.join(fixture, 'package.json')
  const fixturePackage = JSON.parse(fs.readFileSync(fixturePackagePath, 'utf8'))
  fixturePackage.version = '12.0.0'
  fs.writeFileSync(fixturePackagePath, `${JSON.stringify(fixturePackage, null, 2)}\n`)
  assert.match(failMessage(), /matched 2 version tokens/, 'the write path must reject a duplicated token site')
} finally {
  fs.rmSync(fixture, { recursive: true, force: true })
}

console.log('scripts/version-sync.test.mjs: all assertions passed')
