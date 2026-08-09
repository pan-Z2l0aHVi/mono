// 可注入的 <script setup>：不含 src 属性。带 src 的 script 是外部文件，无法承载内联导入。
// `\ssetup\b` 要求 setup 是独立属性（前面是空白），避免匹配 src 值里的 `./setup.ts` 这类文件路径。
const setupReg = /<script\b[^>]*\ssetup\b(?![^>]*\s\bsrc\s*=)[^>]*>/i
// 不含 src 的普通 <script>（options API）
const scriptReg = /<script\b(?![^>]*\s\bsrc\s*=)[^>]*>/i
// 带 src 的 <script setup> 无法承载内联导入，也不能再新增第二个 setup 块
const externalSetupReg = /<script\b(?=[^>]*\ssetup\b)(?=[^>]*\s\bsrc\s*=)[^>]*>/i

export function transformVueCode(code: string, imports: string): string {
  // 只向不含 src 的内联 script 注入，<script setup> 优先
  const setup = code.match(setupReg)
  if (setup) {
    const end = setup.index! + setup[0].length
    return `${code.slice(0, end)}\n${imports}\n${code.slice(end)}`
  }
  const plain = code.match(scriptReg)
  if (plain) {
    const end = plain.index! + plain[0].length
    return `${code.slice(0, end)}\n${imports}\n${code.slice(end)}`
  }
  // 普通外部 <script> 可以与新增的内联 <script setup> 共存；只有外部 setup 块无处注入。
  if (externalSetupReg.test(code)) return code
  return `<script setup>\n${imports}\n</script>\n${code}`
}
