import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const script = path.join(import.meta.dirname, 'check-macos-sdk.sh')
const fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), 'macos-sdk-gate-'))
process.on('exit', () => fs.rmSync(fixtureDir, { recursive: true, force: true }))

// 用一份假的 `vtool` 取代真实工具：门禁的判定面是「从 vtool 输出里读出 sdk major」，
// 不需要真的 Mach-O。PATH 前面插一个只响应 -show-build 的 shim。
function runGate(sdk, { toolExit = 0, noSdkLine = false } = {}) {
  const binDir = path.join(fixtureDir, `bin-${sdk.replace(/\W/g, '-')}-${toolExit}`)
  fs.mkdirSync(binDir, { recursive: true })
  const shim = path.join(binDir, 'vtool')
  fs.writeFileSync(
    shim,
    `#!/bin/sh
cat <<'REPORT'
Load command 11
${
  noSdkLine
    ? '      cmd LC_VERSION_MIN_MACOSX\n  cmdsize 16\n  version 10.13'
    : `      cmd LC_BUILD_VERSION
  cmdsize 32
 platform MACOS
    minos 12.0
      sdk ${sdk}
   ntools 1
     tool LD
  version 27037.1`
}
REPORT
exit ${toolExit}
`
  )
  fs.chmodSync(shim, 0o755)

  const binary = path.join(fixtureDir, 'interweave')
  fs.writeFileSync(binary, '')

  const result = spawnSync('bash', [script, binary], {
    encoding: 'utf8',
    env: { ...process.env, PATH: `${binDir}:${process.env.PATH}` }
  })
  return { status: result.status, output: `${result.stdout}${result.stderr}` }
}

// 通用二进制：vtool 按架构各打一段，多个 slice 里只要有一个 slice 低于 16 就必须失败。
function runGateMulti(sdks) {
  const binDir = path.join(fixtureDir, `bin-multi-${sdks.join('-').replace(/\W/g, '-')}`)
  fs.mkdirSync(binDir, { recursive: true })
  const shim = path.join(binDir, 'vtool')
  const sections = sdks
    .map(sdk => ` (architecture arm64):\n      cmd LC_BUILD_VERSION\n platform MACOS\n    minos 12.0\n      sdk ${sdk}`)
    .join('\n')
  fs.writeFileSync(shim, `#!/bin/sh\ncat <<'REPORT'\n${sections}\nREPORT\n`)
  fs.chmodSync(shim, 0o755)
  const binary = path.join(fixtureDir, 'interweave-universal')
  fs.writeFileSync(binary, '')
  const result = spawnSync('bash', [script, binary], {
    encoding: 'utf8',
    env: { ...process.env, PATH: `${binDir}:${process.env.PATH}` }
  })
  return { status: result.status, output: `${result.stdout}${result.stderr}` }
}

// 环境探测（sw_vers / xcode-select / xcrun）在 shim 只覆盖 vtool 的情况下仍可能失败；
// 门禁不因探测失败改变判定，故只断言最终的 sdk 判据与退出码。

for (const sdk of ['9.0', '10.13', '15.0', '15.2', '15.5', '15.9']) {
  const { status, output } = runGate(sdk)
  assert.equal(status, 1, `sdk ${sdk} must fail the gate`)
  assert.match(output, new RegExp(`LC_BUILD_VERSION.sdk=${sdk.replaceAll('.', '\\.')} < 16`))
}

for (const sdk of ['08.0', '09.0']) {
  const { status, output } = runGate(sdk)
  assert.equal(status, 1, `sdk ${sdk} must fail the gate`)
  assert.match(output, new RegExp(`LC_BUILD_VERSION.sdk=${sdk.replaceAll('.', '\\.')} < 16`))
  assert.doesNotMatch(output, /value too great for base/)
}

for (const sdk of ['16.0', '16.4', '17.0', '25.0', '26.0', '26.5', '27.0']) {
  const { status, output } = runGate(sdk)
  assert.equal(status, 0, `sdk ${sdk} must pass the gate`)
  assert.match(output, new RegExp(`LC_BUILD_VERSION.sdk=${sdk.replaceAll('.', '\\.')}`))
}

// 多个 slice 全部达标才通过；混合时按失败处理，不能只检查第一个。
assert.equal(runGateMulti(['26.5', '26.5']).status, 0, 'all slices at or above 16 must pass')
{
  const mixed = runGateMulti(['26.5', '15.2'])
  assert.equal(mixed.status, 1, 'one stale slice must fail the gate')
  assert.match(mixed.output, /sdk=15\.2 < 16/)
}

// 读不到 sdk 时必须失败，不能把「没读到」当成通过。
{
  const { status, output } = runGate('unknown')
  assert.equal(status, 1, 'an unparsable sdk must fail the gate')
  assert.match(output, /LC_BUILD_VERSION.sdk=unknown < 16/)
}

{
  const { status, output } = runGate('none', { noSdkLine: true })
  assert.equal(status, 1, 'a report without an sdk line must fail the gate')
  assert.match(output, /no LC_BUILD_VERSION sdk found/)
}

// 二进制不存在时给可定位的错误，而不是让 awk 拿到空串后误判。
{
  const result = spawnSync('bash', [script, path.join(fixtureDir, 'missing')], { encoding: 'utf8' })
  assert.equal(result.status, 1)
  assert.match(`${result.stdout}${result.stderr}`, /Mach-O not found/)
}

// vtool 读不了文件（非 Mach-O、权限、损坏）时必须失败，不能让空输出走到「未读到 sdk」以外的分支。
{
  const binDir = path.join(fixtureDir, 'bin-vtool-error')
  fs.mkdirSync(binDir, { recursive: true })
  const shim = path.join(binDir, 'vtool')
  fs.writeFileSync(shim, "#!/bin/sh\necho 'vtool error: not mach-o' >&2\nexit 1\n")
  fs.chmodSync(shim, 0o755)
  const binary = path.join(fixtureDir, 'not-macho')
  fs.writeFileSync(binary, '')
  const result = spawnSync('bash', [script, binary], {
    encoding: 'utf8',
    env: { ...process.env, PATH: `${binDir}:${process.env.PATH}` }
  })
  assert.equal(result.status, 1, 'a vtool failure must fail the gate')
  assert.match(`${result.stdout}${result.stderr}`, /vtool cannot read/)
  assert.match(`${result.stdout}${result.stderr}`, /not mach-o/, 'the tool error must stay in the log')
}

console.log('.github/scripts/check-macos-sdk.test.mjs: all assertions passed')
