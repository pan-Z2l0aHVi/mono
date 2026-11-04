/** 示例页的工具条在 React 与 Vue 两份源码之间切换：`tsx` 围栏属于 React，`vue` 围栏属于 Vue。 */
export const FLAVORS = ['react', 'vue'] as const

export type Flavor = (typeof FLAVORS)[number]

export const FLAVOR_LABELS: Record<Flavor, string> = { react: 'React', vue: 'Vue' }

/** 围栏语言名对应的运行时；`bash`、`html`、`css` 这类纯源码围栏没有 flavor，只显示语言标签。 */
export function flavorOf(lang: string | undefined): Flavor | null {
  if (lang === 'tsx') return 'react'
  if (lang === 'vue') return 'vue'
  return null
}

/*
 * 框架切换器的品牌标记。Vue 是官方双色标，保留 `#41b883` / `#35495e` 两个字面量；React 标本来就是
 * 单色的，画成 `currentColor` 由宿主按外观给色。
 *
 * 浅色下官方 `#61dafb` 压在 chip（#dfdfdf）与 track 上分别只有 1.22:1 / 1.62:1，读不出形状，所以
 * 改用 `#087eae`（3.42 / 4.56）；深色反过来——`#087eae` 压在 indicator（#3a3a3c）只剩 2.49，官方蓝
 * 有 6.99，所以两档分开设。深色下 Vue 的深靛半身只有 1.22–1.50:1，官方标没有深色版，换成白色就不
 * 是官方标了，因此保留官方配色，靠绿色半身（5.58 / 4.54）保住形状。
 *
 * 形状按 `web-ui-icon` 认识的 Iconify 形状内联（`{ body, width, height }`，负坐标交给 `left` / `top`
 * 拼 viewBox 用）：两枚装饰图标不值得新增一条依赖，也不进 `icons.used.json`。
 */
export const FLAVOR_ICONS = {
  vue: {
    body: '<path d="M161.096.001l-30.225 52.351L100.647.001H-.005l130.877 226.688L261.749.001z" fill="#41b883"/><path d="M161.096.001l-30.225 52.351L100.647.001H50.423l80.449 139.55L211.322.001z" fill="#35495e"/>',
    width: 261.76,
    height: 226.69
  },
  react: {
    body: '<circle cx="0" cy="0" r="2.05" fill="currentColor"/><g stroke="currentColor" stroke-width="1" fill="none"><ellipse cx="0" cy="0" rx="11" ry="4.2"/><ellipse cx="0" cy="0" rx="11" ry="4.2" transform="rotate(60)"/><ellipse cx="0" cy="0" rx="11" ry="4.2" transform="rotate(120)"/></g>',
    left: -11.5,
    top: -10.23174,
    width: 23,
    height: 20.46348
  }
} as const

/** 只有 React 标需要宿主取色；Vue 的双色写在 body 字面量里。类名写在源里，Tailwind 才扫得到。 */
export const FLAVOR_ICON_CLASS: Record<Flavor, string> = { react: 'text-[#087eae] dark:text-[#61dafb]', vue: '' }
