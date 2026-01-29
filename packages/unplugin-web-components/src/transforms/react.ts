export function transformReactCode(code: string, imports: string): string {
  // Next.js 特殊处理，在组件顶部的 use client 后面插入 imports
  const useClientReg = /^\s*["']use client["'];?/m
  if (useClientReg.test(code)) {
    return code.replace(useClientReg, match => `${match}\n${imports}`)
  }
  return `${imports}\n${code}`
}
