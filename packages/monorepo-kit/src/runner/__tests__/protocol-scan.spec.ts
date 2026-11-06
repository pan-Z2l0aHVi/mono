import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import { it } from 'vite-plus/test'

/**
 * 链协议里靠约定维持的几样东西——重名键、归因前缀、协议类型只声明一处——不需要跑判定就能判，
 * 扫一遍源码即可。`chain.spec.ts` 钉的是这些形状的运行期行为，这里钉的是它们有没有被新的写法绕开。
 */

const srcDir = path.resolve(import.meta.dirname, '../..')

interface Source {
  readonly file: string
  readonly code: string
}

function sources(...directories: string[]): Source[] {
  const found: Source[] = []
  const walk = (dir: string): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (entry.name !== '__tests__') walk(path.join(dir, entry.name))
        continue
      }
      if (!entry.name.endsWith('.ts')) continue
      const absolute = path.join(dir, entry.name)
      found.push({
        file: path.relative(srcDir, absolute).split(path.sep).join('/'),
        code: fs.readFileSync(absolute, 'utf8')
      })
    }
  }
  directories.forEach(walk)
  return found.sort((left, right) => left.file.localeCompare(right.file))
}

// 判定层 = src 下除这三处以外的目录：`shared` 是与链无关的纯工具，`runner` 是基座本身（它不产
// `Err` 文案，只在 runnerSources 里受协议类型的约束），`vite` 是 Vite 插件面（配置求值期抛错，
// 不在这条链上）。名单按目录现取，新增一个能力目录就自动进判据；反过来，被排除的名字对不上任何
// 目录就说明分区变了，先在这里失败，别让扫描面静默缩水。
const EXCLUDED_DIRS = ['runner', 'shared', 'vite']

function capabilityDirs(): string[] {
  const dirs = fs
    .readdirSync(srcDir, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
  for (const name of EXCLUDED_DIRS)
    assert.ok(dirs.includes(name), `src/${name} is missing: the scan face and its exclusion list must be re-decided`)
  return dirs.filter(name => !EXCLUDED_DIRS.includes(name))
}

function inSrc(...names: string[]): string[] {
  return names.map(name => path.join(srcDir, name))
}

const judgementSources = sources(...inSrc(...capabilityDirs()))
const runnerSources = sources(...inSrc(...capabilityDirs(), 'runner'))

function lineOf(code: string, index: number): string {
  return String(code.slice(0, index).split('\n').length)
}

/** 域名前缀表与 `defineCatch` 的 `throw: ` 一起构成链上全部的归因来源。 */
const DOMAIN_PREFIX = /^(?:go|git|turbo|md|changeset|pack|script|i18n|port): /

it('能力插件的键互不相交，且都不占用链上唯一允许重名的键', () => {
  const owners = new Map<string, string>()
  const interfaces: string[] = []
  for (const { file, code } of judgementSources) {
    for (const [, name, body] of code.matchAll(/export interface (\w+Api) \{([^}]*)\}/g)) {
      interfaces.push(`${file}:${name}`)
      for (const [, member] of body.matchAll(/^[ \t]+readonly (\w+):/gm)) {
        assert.ok(
          !['run', 'root', 'env'].includes(member),
          `${name}.${member} collides with a key the base already owns; intersecting them makes it a phantom signature`
        )
        const previous = owners.get(member)
        assert.equal(
          previous,
          undefined,
          `${member} is declared by both ${previous} and ${name}; a plugin made from both sees an overload set`
        )
        owners.set(member, name)
      }
    }
  }

  // 扫不到就是这道门禁空转，而不是「没有失配」。
  assert.ok(interfaces.length > 0, 'no capability interface was scanned')
  assert.ok(owners.size > 0, 'no capability member was scanned')
})

it('插件的能力面只声明 run 或一个具名 Api，不就地拼结构化的键集合', () => {
  const declared: string[] = []
  for (const { file, code } of runnerSources) {
    for (const [, first] of code.matchAll(/definePlugin<\s*([^,]*?)\s*,/g)) {
      declared.push(first)
      assert.match(
        first,
        /^(\{ run: Run \}|\w+Api)$/,
        `${file}: definePlugin<${first}, …> must produce either the chain key or one named Api surface`
      )
    }
  }

  assert.ok(declared.length > 0, 'no definePlugin call was scanned')
})

it('判定层的每个字面量 Err 都以域名前缀起头', () => {
  const messages: string[] = []
  for (const { file, code } of judgementSources) {
    for (const hit of code.matchAll(/\berr\(\s*(['"`])([^\n]*)/g)) {
      messages.push(hit[0])
      // 插值起头的是能力层已经带前缀的文案，由调用处补域名；标识符起头的转发同理，不在这里重判。
      if (hit[2].startsWith('${')) continue
      assert.match(
        hit[2],
        DOMAIN_PREFIX,
        `${file}:${lineOf(code, hit.index ?? 0)}: err(${hit[2].slice(0, 48)}) has no domain prefix`
      )
    }
  }

  assert.ok(messages.length > 0, 'no err call was scanned')
})

it('链协议的两个类型只由基座声明：Run 与 Chain 不另建第二份', () => {
  // `Run` 只有一个零参签名，插件各自建模签名会被 tsc 拒绝；这里钉的是这两个名字没有被另抄一处。
  const declared = runnerSources.flatMap(({ file, code }) =>
    [...code.matchAll(/^(?:export )?(?:interface|type) (Run|Chain)\b/gm)].map(([, name]) => `${file}:${name}`)
  )
  assert.deepEqual(declared, ['runner/runner.ts:Run', 'runner/runner.ts:Chain'])
})

it('判定不转写子进程输出：过程记录只归触发层', () => {
  // 链的成功面是 `Result<void, string>`，没有装过程输出的通道。判定里 write 一句，
  // 「谁在打印什么」就重新变回只能读源码才知道的事。
  assert.ok(judgementSources.length > 0, 'no judgement source was scanned')
  for (const { file, code } of judgementSources) {
    assert.doesNotMatch(
      code,
      /\b(?:process\.(?:stdout|stderr)\.write|console\.[a-z]+\b)/,
      `${file} writes process output from inside the package`
    )
  }
})

it('产 run 的插件把组装完的链标注成 Chain，不把内部能力键漏给触发层', () => {
  // js-kit 的 `use` 会并上被用插件的入参需求；不在此层收窄，`.make()` 就要求触发层供给
  // 链自己该提供的东西，而这种泄漏只在类型面上可见，运行期一声不响。
  const annotated: string[] = []
  for (const { file, code } of runnerSources) {
    if (!code.includes('defineRunner(')) continue
    for (const hit of code.matchAll(/^export const define\w+ = \([^)]*\)([^=]*)=>/gm)) {
      annotated.push(`${file}:${hit[0].slice(0, 40)}`)
      assert.equal(
        hit[1]?.trim(),
        ': Chain',
        `${file}:${lineOf(code, hit.index ?? 0)}: a chain producer must be annotated as Chain`
      )
    }
  }

  assert.ok(annotated.length > 0, 'no chain producer was scanned')
})
