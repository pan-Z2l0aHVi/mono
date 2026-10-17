import { createHighlighter, type Highlighter } from 'shiki'

import { fail } from './errors'

/**
 * 围栏语言是「给消费方看的框架名」，它同时决定两件事：shiki 要用哪个语法 id、落盘的组件文件用什么扩展名。
 * 两张表钉在一处，配置里再写一遍就是可被写歪的第二次机会。
 */
const FLAVORS = {
  react: { shikiLang: 'tsx', extension: 'tsx' },
  vue: { shikiLang: 'vue', extension: 'vue' }
} as const

export type FenceFlavor = keyof typeof FLAVORS

export function flavorExtension(flavor: FenceFlavor): string {
  return FLAVORS[flavor].extension
}

const THEMES = { light: 'github-light', dark: 'github-dark' } as const

/** 预加载哪些语法由 `FLAVORS` 推出：手抄第二份，加 flavor 时它就成了没人提醒的第四处。 */
const LANGS = [...new Set(Object.values(FLAVORS).map(flavor => flavor.shikiLang))]

/**
 * 预热用的样例：每种语法各来一小段带自定义元素标签与成员调用的代码。冷启动那份错乱落在的正是这类
 * 记号上（标签名与成员访问的 scope 划得跟稳定形态不一样）。
 */
const WARMUP: Record<(typeof LANGS)[number], string> = {
  tsx: '<x-demo onChange={event => console.log(event.currentTarget.value)}></x-demo>',
  vue: '<template><x-demo @change="onChange"></x-demo></template>'
}

let ready: Promise<Highlighter> | undefined

/**
 * 自建高亮器并等到它就绪，而不是用 shiki 的 `codeToHtml` 快捷方式：快捷方式背后是懒加载单例，模块冷启动
 * 后的**第一次**调用会返回一份着色错乱的 HTML——同一份围栏在同一进程、同一份输入下能给出两种字节。
 * 产物校验比的是字节，于是「生成物与 markdown 不一致」会随机报在一份没被改过的产物上。
 *
 * 判据来自实测：给每次调用记录输入/输出哈希后，出过别样字节的**只有每代的第 1 次**（第 2 次起逐字节
 * 一致），产物里坏掉的也永远只有第 0 个代码块。修复前的七轮全量运行里五轮报过这条不一致（第 2–5 与第
 * 7 轮），修复后的三轮为零。所以这里把这一次消耗在一个丢弃的预热结果上，之后的每次调用都落在稳定形态上。
 */
function highlighter(): Promise<Highlighter> {
  return (ready ??= createHighlighter({ themes: Object.values(THEMES), langs: LANGS }).then(hl => {
    for (const lang of LANGS) hl.codeToHtml(WARMUP[lang], { lang, themes: THEMES, defaultColor: false })
    return hl
  }))
}

/**
 * 双主题输出：`defaultColor: false` 让 shiki 把颜色写成 `--shiki-light` / `--shiki-dark` 变量，
 * 由生成的 CSS 按宿主的外观源选用，深浅色切换不需要重新生成。
 */
export async function highlight(code: string, flavor: FenceFlavor, file: string): Promise<string> {
  const lang = FLAVORS[flavor].shikiLang
  const hl = await highlighter()
  const html = hl.codeToHtml(code, { lang, themes: THEMES, defaultColor: false })
  // 外框（圆角、底色、滚动）归宿主自己的样式管，这里只把类名并到 shiki 的 <pre> 上。
  const framed = html.replace(/^<pre class="([^"]*)"/, '<pre class="$1 mdc-code"')
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
function assertHtmlPreservesSource(code: string, html: string, flavor: FenceFlavor, file: string): void {
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
