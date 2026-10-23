import { createHighlighter, type Highlighter } from 'shiki'

import { fail } from './errors'

/**
 * flavor 是配置与产物里用的框架名，它在语料与磁盘上写成同一个标识：围栏语言、shiki 语法 id、落盘扩展名
 * 三处都取这一个值，拆成几张表就会各漂各的。
 *
 * react 那一格写 `tsx` 而不是 `react`，是因为围栏原文就是要编译执行的那份源码，而格式化器只认识它自己
 * 那套语言名：写成 `react` 的块在 markdown 里不被格式化，落盘的 `.tsx` 却归它管，于是「产物逐字节等于
 * 围栏」与「产物已格式化」这两条只能靠人手对齐，语料改一处就红一次。
 */
export const FLAVOR_LANG = {
  react: 'tsx',
  vue: 'vue'
} as const satisfies Record<string, string>

export type FenceFlavor = keyof typeof FLAVOR_LANG

const THEMES = { light: 'github-light', dark: 'github-dark' } as const

/** 预加载哪些语法由 `FLAVOR_LANG` 推出：手抄第二份，加 flavor 时它就成了没人提醒的第四处。 */
const LANGS = [...new Set(Object.values(FLAVOR_LANG))]

/**
 * 预热用的样例：每种语法各来一小段带自定义元素 tag 与成员调用的代码。冷启动那份错乱落在的正是这类
 * 记号上（tag 名与成员访问的 scope 划得跟稳定形态不一样）。
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
  const lang = FLAVOR_LANG[flavor]
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
 * 对得上、外框多塞一个换行照样会漂移。能用正则剥 tag 是因为 shiki 把正文里的 `<` 与 `&` 写成
 * `&#x3C;` / `&#x26;`，剩下的尖括号一律是标记本身。
 */
function assertHtmlPreservesSource(code: string, html: string, flavor: FenceFlavor, file: string): void {
  const restored = visibleText(html)
  if (restored !== code)
    fail(`${file}：shiki 改变了 ${flavor} 代码块原文。\n--- 输入 ---\n${code}\n--- 还原后 ---\n${restored}`)
}

const NAMED_ENTITIES: Record<string, string> = { amp: '&', quot: '"' }

/**
 * 高亮 HTML 的可见文本：剥掉标记、解掉实体。
 *
 * 先剥 tag 再解实体：shiki 把正文里的 `<` 与 `&` 写成 `&#x3C;` / `&#x26;`，所以剩下的尖括号
 * 一律是标记本身，剥 tag 不会把代码里的 tag 当成标记。顺序反了就会把 `<web-ui-button>` 吃掉。
 * 实体必须一趟解完（一个 alternation 正则），分几趟解会把源码里字面写着的 `&quot;` 解两遍变成 `"`。
 * 导出给宿主复用：宿主断言「页面显示的代码 == markdown 围栏」时量的是同一份可见文本。
 */
export function visibleText(html: string): string {
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
