import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import { describe, it } from 'vite-plus/test'

/**
 * 链协议里靠约定维持的几样东西——重名键、归因前缀、协议类型只声明一处——不需要跑判定就能判，
 * 扫一遍源码即可。`chain.spec.ts` 钉的是这些形状的运行期行为，这里钉的是它们有没有被新的写法绕开。
 *
 * 扫描器的已知漏扫形态（F1，v5 决策项 4）由文末的守卫组钉住：成员体截断、type 别名盲区、
 * 注解含 `=` 的逃逸、`defineRunner(` 文件门。「嵌套对象类型 + 首类型参逗号」不写守卫——
 * 那是响亮假红类（definePlugin< 的首个类型参带逗号时正则失配、declared.length 断言即红），
 * 不是静默漏扫。
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

function inSrc(...names: string[]): string[] {
  return names.map(name => path.join(srcDir, name))
}

const judgementSources = sources(...inSrc(...dirsExceptExcluded()))
const runnerSources = sources(...inSrc(...dirsExceptExcluded(), 'runner'))

function dirsExceptExcluded(): string[] {
  const dirs = fs
    .readdirSync(srcDir, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
  for (const name of EXCLUDED_DIRS)
    assert.ok(dirs.includes(name), `src/${name} is missing: the scan face and its exclusion list must be re-decided`)
  return dirs.filter(name => !EXCLUDED_DIRS.includes(name))
}

function lineOf(code: string, index: number): string {
  return String(code.slice(0, index).split('\n').length)
}

/** 域名前缀表与 `defineCatch` 的 `throw: ` 一起构成链上全部的归因来源。 */
const DOMAIN_PREFIX = /^(?:go|git|turbo|md|changeset|pack|script|i18n|theme|deps): /

/**
 * 扫描面里 `XApi` 形状的声明体。interface 与 type 别名两种形态都算（别名盲区已闭合）；
 * 体按平衡花括号取整段——成员注释里的 `}` 与嵌套对象类型的收尾不再把后半段成员截掉
 * （那两类截断都是静默漏扫：成员少了、重名键门禁跟着空转）。局限：声明体内出现含
 * `;` 的默认值行会把别名形态误判成别的语句而跳过，真实扫描面没有这种形状。
 */
function apiDeclarations(code: string): Array<{ name: string; body: string }> {
  const results: Array<{ name: string; body: string }> = []
  for (const header of code.matchAll(/export (?:interface|type) (\w+Api)\b/g)) {
    const open = code.indexOf('{', header.index! + header[0].length)
    if (open === -1) continue
    if (code.slice(header.index! + header[0].length, open).includes(';')) continue
    const end = balancedBodyEnd(code, open)
    if (end === -1) continue
    results.push({ name: header[1]!, body: code.slice(open + 1, end) })
  }
  return results
}

/** 从 `{` 起走平衡花括号取声明体收尾；注释与字符串里的花括号不参与计数。 */
function balancedBodyEnd(code: string, open: number): number {
  let depth = 0
  let state: 'code' | 'line' | 'block' | 'single' | 'double' | 'template' = 'code'
  for (let i = open; i < code.length; i += 1) {
    const ch = code[i]!
    const next = code[i + 1]
    if (state === 'line') {
      if (ch === '\n') state = 'code'
    } else if (state === 'block') {
      if (ch === '*' && next === '/') {
        state = 'code'
        i += 1
      }
    } else if (state === 'single' || state === 'double' || state === 'template') {
      if (ch === '\\') i += 1
      else if (
        (state === 'single' && ch === "'") ||
        (state === 'double' && ch === '"') ||
        (state === 'template' && ch === '`')
      )
        state = 'code'
    } else if (ch === '/' && next === '/') {
      state = 'line'
      i += 1
    } else if (ch === '/' && next === '*') {
      state = 'block'
      i += 1
    } else if (ch === "'" || ch === '"' || ch === '`') {
      state = ch === "'" ? 'single' : ch === '"' ? 'double' : 'template'
    } else if (ch === '{') depth += 1
    else if (ch === '}') {
      depth -= 1
      if (depth === 0) return i
    }
  }
  return -1
}

/**
 * 声明体里的成员名（含不带 `readonly` 的可变属性）。撞名是「键占用了 base 的键」这一
 * 结构事实，与成员可变性无关：只数 `readonly` 会让将来出现的可变成员静默漏出互斥守卫。
 * 嵌套类型字面量里的成员也会被计入——那是响亮的误报方向，好过静默漏检。
 */
function readonlyMembers(body: string): string[] {
  return [...body.matchAll(/^[ \t]*(?:readonly )?(\w+)\s*:/gm)].map(hit => hit[1]!)
}

/**
 * `export const defineXxx = (…) =>` 的返回注解。参数表收尾括号从 `=>` 往前找第一个 `)`
 * （参数可跨行、可带解构默认值）；注解里带 `=`（如 `Chain<T = Base>`）不再让整条声明
 * 漏出扫描面。局限：返回注解本身含 `=>`（函数类型返回值）会把内层箭头误当终止符，
 * 真实扫描面没有这种形状。
 */
function producerHeaders(code: string): Array<{ name: string; annotation: string; line: number; bodyStart: string }> {
  const results: Array<{ name: string; annotation: string; line: number; bodyStart: string }> = []
  for (const hit of code.matchAll(/^export const (define\w+) = /gm)) {
    const start = hit.index! + hit[0].length
    const arrow = code.indexOf('=>', start)
    if (arrow === -1) continue
    let paramsEnd = -1
    for (let i = arrow - 1; i >= start; i -= 1) {
      if (code[i] === ')') {
        paramsEnd = i
        break
      }
    }
    if (paramsEnd === -1) continue
    results.push({
      name: hit[1]!,
      annotation: code.slice(paramsEnd + 1, arrow).trim(),
      line: Number(lineOf(code, hit.index!)),
      bodyStart: code
        .slice(arrow + 2)
        .trimStart()
        .slice(0, 12)
    })
  }
  return results
}

it('能力插件的键互不相交，且都不占用链上唯一允许重名的键', () => {
  const owners = new Map<string, string>()
  const interfaces: string[] = []
  for (const { file, code } of judgementSources) {
    for (const { name, body } of apiDeclarations(code)) {
      interfaces.push(`${file}:${name}`)
      for (const member of readonlyMembers(body)) {
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

it('每个生产者都有可分类的返回注解：链生产者标 Chain，插件生产者标 Plugin 或走 definePlugin', () => {
  /*
   * 原「只扫 include('defineRunner(') 的文件」+ `[^=]*` 注解捕获各有一个静默漏扫：不经
   * defineRunner 组装的链生产者、注解里带 `=`（`Chain<T = Base> =>`）的声明，都会整条
   * 漏出检查。现在无门全扫 runnerSources，注解按形状分类：
   * - `: Chain` —— 链生产者；
   * - `: Plugin<…>` 或无注解且体以 definePlugin 开头 —— 插件生产者（无注解时借体识别；
   *   链生产者若想借「无注解」混过来，体以 defineRunner/组合表达式开头，会在这里响）。
   * 其余一律响亮失败：新增生产者形态要先回来重判这张表。
   */
  const annotated: string[] = []
  for (const { file, code } of runnerSources) {
    for (const { name, annotation, line, bodyStart } of producerHeaders(code)) {
      annotated.push(`${file}:${name}`)
      const isChain = annotation === ': Chain'
      const isPlugin = annotation.startsWith(': Plugin')
      const isInlinePlugin = annotation === '' && bodyStart.startsWith('definePlugin')
      assert.ok(
        isChain || isPlugin || isInlinePlugin,
        `${file}:${line}: ${name} must be annotated ': Chain' or ': Plugin<…>' (got '${annotation || '(none)'}')`
      )
    }
  }

  assert.ok(annotated.length > 0, 'no producer was scanned')
})

describe('扫描器的已知漏扫形态（F1 守卫：这些形态漏过就是门禁空转）', () => {
  it('成员注释里的 } 与嵌套对象收尾不再截断成员扫描', () => {
    const code = `
export interface DemoApi {
  /** 注释里带花括号 } 的成员文档 */
  readonly alpha: string
  readonly meta: { deep: string }
  readonly beta: string
}
`
    const [decl] = apiDeclarations(code)
    assert.ok(decl, 'interface 应被扫到')
    assert.deepEqual(readonlyMembers(decl!.body), ['alpha', 'meta', 'beta'])
  })

  it('type 别名形态的 Api 也在扫描面内', () => {
    const code = `export type DemoApi = {\n  readonly alpha: string\n}\n`
    const decl = apiDeclarations(code)[0]
    assert.equal(decl?.name, 'DemoApi')
    assert.deepEqual(readonlyMembers(decl!.body), ['alpha'])
    // 别的语句不误伤：类型别名指向非对象时跳过。
    assert.deepEqual(
      apiDeclarations(`export type OtherApi = string;\nexport interface RealApi { readonly a: string }\n`),
      [{ name: 'RealApi', body: ' readonly a: string ' }]
    )
  })

  it('注解含 = 的链生产者不再整条漏扫（Chain<T = Base> 形态进入扫描面并响）', () => {
    const code = `export const defineDemo = (options: DemoOptions): Chain<T = Base> =>\n  defineRunner()\n`
    const [header] = producerHeaders(code)
    assert.ok(header, '注解含 = 的声明应进入扫描面')
    assert.equal(header!.annotation, ': Chain<T = Base>')
    // 分类规则会拒绝它（不是精确的 ': Chain'）：守的是「漏扫」，不是「放行」。
    assert.notEqual(header!.annotation, ': Chain')
  })

  it('不经 defineRunner 组装的链生产者也在扫描面内（文件门已移除）', () => {
    const code = `import { Chain } from '../runner/runner'\n\nexport const defineDemo = (options: DemoOptions): Chain =>\n  composeChain()\n`
    assert.ok(!code.includes('defineRunner('), '前置：合成源不含 defineRunner(')
    const [header] = producerHeaders(code)
    assert.ok(header, '无 defineRunner( 的文件不再被文件门跳过')
    assert.equal(header!.annotation, ': Chain')
  })

  it('无注解的链生产者（体以 defineRunner 开头）会被分类规则拒绝', () => {
    const code = `export const defineDemo = () =>\n  defineRunner().use(defineExec())\n`
    const [header] = producerHeaders(code)
    assert.equal(header!.annotation, '')
    assert.match(header!.bodyStart, /^defineRunner/)
    // 分类规则的三条通道（: Chain / : Plugin / 无注解 + definePlugin 开头）都放它不过。
    // 分类规则吃的是 string：先拓宽，避免 assert.equal 收窄成 '' 字面量后比较恒不重叠。
    const annotation: string = header!.annotation
    const bodyStart: string = header!.bodyStart
    const isChain = annotation === ': Chain'
    const isPlugin = annotation.startsWith(': Plugin')
    const isInlinePlugin = annotation === '' && bodyStart.startsWith('definePlugin')
    assert.ok(!isChain && !isPlugin && !isInlinePlugin, '借「无注解」混过来的链生产者必须响')
  })
})
