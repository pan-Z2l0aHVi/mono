import { codeToHtml } from 'shiki'

import { fail } from './errors'

/** markdown 里的语言标记是「给消费方看的框架名」，shiki 要的是语法 id。 */
const SHIKI_LANGS = { react: 'tsx', vue: 'vue' } as const

export type SampleFlavor = keyof typeof SHIKI_LANGS

/**
 * 双主题输出：`defaultColor: false` 让 shiki 把颜色写成 `--shiki-light` / `--shiki-dark` 变量，
 * 由生成的 CSS 按 `web-ui-theme[resolved-appearance]` 选用，深浅色切换不需要重新生成。
 */
export async function highlight(code: string, flavor: SampleFlavor, file: string): Promise<string> {
  const lang = SHIKI_LANGS[flavor]
  const html = await codeToHtml(code, {
    lang,
    themes: { light: 'github-light', dark: 'github-dark' },
    defaultColor: false
  })
  // 外框（圆角、底色、滚动）归仓级 Tailwind 工具类管，这里只把类名并到 shiki 的 <pre> 上。
  const framed = html.replace(/^<pre class="([^"]*)"/, '<pre class="$1 wui-example-code"')
  if (framed === html) fail(`${file}：shiki 输出的 <pre> 形状变了，类名并不上：${html.slice(0, 80)}`)
  assertHtmlPreservesSource(code, framed, flavor, file)
  return framed
}

/**
 * 自证：发出去的 HTML 剥掉标记、解掉实体之后必须逐字等于输入。着色器吞掉一个空白或字符，页面上
 * 显示的就不是 markdown 里那一份，而示例代码块同时是「被执行的那份源码」，这条不能松。
 * 查最终 HTML 而不是 `codeToTokens` 的 token 流：拼 HTML 那一步本身也在被审的范围里，token 层
 * 对得上、外框多塞一个换行照样会漂移。能用正则剥标签是因为 shiki 把正文里的 `<` 与 `&` 写成
 * `&#x3C;` / `&#x26;`，剩下的尖括号一律是标记本身。
 */
function assertHtmlPreservesSource(code: string, html: string, flavor: SampleFlavor, file: string): void {
  const restored = visibleText(html)
  if (restored !== code)
    fail(`${file}：shiki 改变了 ${flavor} 代码块原文。\n--- 输入 ---\n${code}\n--- 还原后 ---\n${restored}`)
}

const NAMED_ENTITIES: Record<string, string> = { amp: '&', quot: '"' }

/**
 * 实体必须一趟解完：分几趟解会把正文里字面写着的 `&quot;`（shiki 编码成 `&#x26;quot;`）解两遍变成
 * `"`，于是合法源码被误判成「着色器改了原文」。
 */
function visibleText(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(
      /&#x([\da-f]+);|&#(\d+);|&([a-z]+);/gi,
      (whole, hex: string | undefined, dec: string | undefined, name: string | undefined) => {
        if (hex) return String.fromCodePoint(Number.parseInt(hex, 16))
        if (dec) return String.fromCodePoint(Number.parseInt(dec, 10))
        return (name && NAMED_ENTITIES[name.toLowerCase()]) || whole
      }
    )
}
