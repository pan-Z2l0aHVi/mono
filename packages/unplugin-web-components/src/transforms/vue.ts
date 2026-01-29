export function transformVueCode(code: string, imports: string): string {
  const setupReg = /(<script\s+setup[^>]*>)/i
  if (setupReg.test(code)) {
    return code.replace(setupReg, `$1\n${imports}\n`)
  }
  const scriptReg = /(<script[^>]*>)/i
  if (scriptReg.test(code)) {
    return code.replace(scriptReg, `$1\n${imports}\n`)
  }
  return `${imports}\n${code}`
}
