import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

import * as barrel from './index.mjs'
import { byCodeUnit } from './shared/order.mjs'

// 入口有两个文件：index.mjs 是运行时，index.d.mts 是给 TS 消费方的声明。
// 名字清单写死在这里，任一侧单独变动都会失败——这是「加了导出却忘了写声明」的唯一拦截点。
// 增删导出要同时改三处：模块本身、index.mjs、index.d.mts，然后改这张表。
const EXPECTED = Object.freeze([
  'BAND_WIDTH',
  'OFFSET_STRIDE',
  'TEST_API_PORT_NAMES',
  'byCodeUnit',
  'changesetPolicy',
  'changesetStatus',
  'commandConventions',
  'commandOutput',
  'contextCorpus',
  'contextInvariants',
  'exec',
  'findRepoRoot',
  'formatClean',
  'git',
  'goCheck',
  'inspectGitHooks',
  'interweaveTurboInputs',
  'listPnpmWorkspaceManifests',
  'noMutualLinks',
  'packageContract',
  'pnpm',
  'readJsonFile',
  'readPnpmWorkspacePatterns',
  'requiredGitHooks',
  'resolveTurboCacheDir',
  'runChecks',
  'runEntrypoint',
  'scriptTests',
  'shellI18nCatalog',
  'testApiPort',
  'turboCacheInvariant',
  'webUiDocsInputs'
])

// 行注释先剥掉：声明文件里用注释举例子时，不能被当成真的导出。
const declaration = (await readFile(path.join(import.meta.dirname, 'index.d.mts'), 'utf8'))
  .split('\n')
  .map(line => (line.trimStart().startsWith('//') ? '' : line))
  .join('\n')

// 只收「值」导出：`export type` 与 `interface` 在运行时不存在，不参与比对。
function declaredValueNames(source) {
  const names = new Set()
  for (const line of source.split('\n')) {
    const namespaced = /^export \* as (?<alias>\w+) from/u.exec(line)
    if (namespaced?.groups?.alias) {
      names.add(namespaced.groups.alias)
      continue
    }
    const listed = /^export \{(?<members>[^}]*)\} from/u.exec(line)
    if (listed?.groups?.members) {
      for (const member of listed.groups.members.split(',')) {
        const trimmed = member.trim()
        if (trimmed) names.add(/as\s+(?<alias>\w+)$/u.exec(trimmed)?.groups?.alias ?? trimmed)
      }
      continue
    }
    const declared = /^export (?:const|function) (?<name>\w+)/u.exec(line)
    if (declared?.groups?.name) names.add(declared.groups.name)
  }
  return [...names]
}

const runtime = Object.keys(barrel).sort(byCodeUnit)
assert.deepEqual(runtime, [...EXPECTED].sort(byCodeUnit), '运行时的出口与约定清单不一致')
assert.deepEqual(
  EXPECTED.filter(name => !declaredValueNames(declaration).includes(name)),
  [],
  '声明文件漏了运行时存在的导出'
)
assert.deepEqual(
  declaredValueNames(declaration).filter(name => !EXPECTED.includes(name)),
  [],
  '声明文件多出运行时不存在的值导出'
)

// 检查单元能进 `runEntrypoint` 的前提是 `name` 与 `run` 同时在位；只数命名空间不够。
const units = [...EXPECTED].filter(name => typeof barrel[name] === 'object' && typeof barrel[name]?.run === 'function')
assert.equal(units.length, 12, `检查单元应为 12 个，实际 ${units.length}`)
for (const name of units) assert.equal(typeof barrel[name].name, 'string', `${name} 缺 name`)

console.log('src/index.test.mjs: all assertions passed')
