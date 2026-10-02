import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import path from 'node:path'

// herdr-cos 自带的单元套件（skills/herdr-cos/tests/cos.test.mjs，node --test 形态）的执行端。
// 放置沿用 ADR-0014 的 Go 风格对称约定——测试放 scripts/ 下由 `ci:test-scripts` 的 glob 零注册
// 收录；被测脚本不在 scripts/ 的先例是 patrol.test.mjs（测 skill 目录里的脚本，已随该 skill 退役）
// 与 ci-topology.test.mjs（测 ../.github/scripts/ 下的脚本）。
const repoRoot = path.resolve(import.meta.dirname, '..')
const suite = path.join(repoRoot, 'skills/herdr-cos/tests/cos.test.mjs')

const run = spawnSync(process.execPath, ['--test', suite], { encoding: 'utf8' })
assert.equal(run.status, 0, `herdr-cos unit suite failed:\n${run.stdout}\n${run.stderr}`)
// node --test 的 spec reporter 把汇总写在 stderr（`ℹ pass 78`），TAP 形态才是 `# pass 78`；
// 两种都认。用例数掉了（比如空跑）也要红。
const summary = (run.stdout + run.stderr).match(/(?:ℹ|#) pass (\d+)/)
assert.ok(summary, `no test summary found in output:\n${run.stdout}\n${run.stderr}`)
const passCount = Number(summary[1])
assert.ok(passCount >= 78, `expected at least 78 passing cases, got ${passCount}`)

console.log(`scripts/cos.test.mjs: herdr-cos unit suite passed (${passCount} cases)`)
