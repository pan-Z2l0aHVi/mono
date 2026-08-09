// 字符串表达式延续符：若紧跟字符串后出现，则该字符串不是独立的 directive 语句
const EXPRESSION_CONTINUATION = /[+\-,.([`&|?:=!*/%<>]/
const IDENTIFIER_START = /[A-Za-z_$]/

function isExpressionContinuation(code: string, pos: number): boolean {
  const ch = code[pos]
  if (!ch) return false
  if (EXPRESSION_CONTINUATION.test(ch)) return true
  if (!IDENTIFIER_START.test(ch)) return false

  let end = pos + 1
  while (end < code.length && /[A-Za-z0-9_$]/.test(code[end])) end++
  const word = code.slice(pos, end)
  return word === 'in' || word === 'instanceof' || word === 'as' || word === 'satisfies'
}

// 计算模块顶部 directive prologue 的结束位置：从文件开头起连续的字面量字符串语句
// （'use client'、'use server'、'use strict' 等任意字符串指令），允许前导及指令间的
// 空白与注释。只把独立成语句的字符串计入 prologue；字符串后紧跟表达式延续符时不算指令。
// 返回 0 表示没有 prologue（导入应加在文件最前）。
function directivePrologueEnd(code: string): number {
  const n = code.length
  let pos = 0

  const nextSignificant = (from: number): { pos: number; ch: string } => {
    let p = from
    for (;;) {
      while (p < n && /\s/.test(code[p])) p++
      if (code[p] === '/' && code[p + 1] === '/') {
        p += 2
        while (p < n && code[p] !== '\n') p++
        continue
      }
      if (code[p] === '/' && code[p + 1] === '*') {
        p += 2
        while (p < n && !(code[p] === '*' && code[p + 1] === '/')) p++
        p = Math.min(p + 2, n)
        continue
      }
      break
    }
    return { pos: p, ch: code[p] }
  }

  let prologueEnd = -1
  for (;;) {
    const { pos: p, ch: quote } = nextSignificant(pos)
    if (quote !== '"' && quote !== "'") break

    // 扫描字符串内容（反斜杠转义），定位闭合引号
    let j = p + 1
    let closed = false
    while (j < n) {
      const c = code[j]
      if (c === '\\') {
        j += 2
        continue
      }
      j++
      if (c === quote) {
        closed = true
        break
      }
    }
    if (!closed) break

    // 可选的尾随分号
    if (code[j] === ';') j++

    // 字符串（及分号）之后的第一个有效 token：若它会延续表达式，则该字符串不是独立指令。
    // 除单字符运算符外，还要处理 `in`、`instanceof` 及 TSX 的 `as`/`satisfies`。
    const after = nextSignificant(j)
    if (after.pos < n && isExpressionContinuation(code, after.pos)) break
    prologueEnd = after.pos
    pos = after.pos
  }
  return prologueEnd === -1 ? 0 : prologueEnd
}

export function transformReactCode(code: string, imports: string): string {
  // Next.js：只在模块顶部的 directive prologue 之后注入导入，保留 use client/use server 等
  // 顶层指令语义；不用带 /m 的宽松正则，避免把 import 写进函数体产生非法 JavaScript
  const end = directivePrologueEnd(code)
  if (end > 0) {
    return `${code.slice(0, end)}\n${imports}\n${code.slice(end)}`
  }
  return `${imports}\n${code}`
}
