import '@/assets/global.css'

import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vite-plus/test'
import { defineComponent, h, nextTick } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'

import { setViewport } from '@/__tests__/viewport'
import Home from '@/pages/home/index.vue'

/*
 * 网格列数基线。守的是 Tailwind v4 的变体排序陷阱：`@custom-variant` 生成的规则排在主题断点
 * **之后**，而 `:where()` 不抬特异性——同属性同权、后出现者胜，于是一条本意只针对 ≥641 的
 * 自定义变体（例如 `desktop:grid-cols-4`）会在 ≥768 全段压掉 `md:` 与 `lg:`，而这类改动不会
 * 让任何 CSS 断言变红。
 *
 * 采样档位：用户指定的六档（390/640/641/768/1024/1280），另补 1440 / 1536 / 1920——只采到
 * 1280 时，起点大于 1280 的变体陷阱整段采不到，而 `@theme` 里还有 2xl 1536。
 *   1440 常见笔记本逻辑宽度，落在 xl 与 2xl 之间 → 覆盖起点在 1281–1440 的陷阱；
 *   1536 是 `2xl` 断点本身 → 给最后一个具名断点收口；
 *   1920 是全高清桌面宽度 → 覆盖起点在 1537–1920 的陷阱。
 * 起点比 1920 更靠右的仍然采不到，这是采样法的固有边界（报告里记着）。
 *
 * 下面两组数字**由类名链条按主题断点逐档算出**，不是「我觉得应该是几列」，也不是照抄 1280
 * 那一档：
 *   home 页             `grid-cols-1 sm:grid-cols-2 md:grid-cols-3`
 *   本文件的探针 fixture `grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5`
 * 断点取自 `src/assets/global.css` 的 `@theme`：sm 640 / md 768 / lg 1024 / xl 1280 / 2xl 1536。
 * 某档宽度命中 `>= 断点` 的类就取它的列数；取不到更高断点的类时**沿用前一个胜者**（Tailwind
 * 不会在更高断点把列数「重置」）：
 *   home ：390→1；640/641→sm 2；768/1024/1280/1440/1536/1920→md 3（没有 lg/xl/2xl 类）
 *   探针 ：390→2；640/641→sm 3；768→md 4；1024/1280/1440/1536/1920→lg 5（没有 xl/2xl 类）
 * 所以两组数组在高位是平的——那是推导结果，不是抄来的。
 *
 * 第二条不是某个真实页面：svg 示例页只渲染由 `packages/web-ui/docs/svg-draw-lines.md` 生成的
 * 示例，语料里没有任何 `grid-cols` 类（全仓也没有 `lg:grid-cols-*`）。home 的链最高只到
 * `md`，于是 ≥1024 那段没有落点；这里就地声明一条 fixture 链，把采样边界补回 lg 档。
 * **代价要说明白**：fixture 不是应用表面，它守的是生成出来的样式表里的规则次序，不守某个
 * 具体页面的排版。
 * 类名必须是这个文件里的字面量——Tailwind 靠扫描源码生成这些工具类，把它拼成动态字符串会让
 * 规则消失，量出来恒为 1 列，于是这条以红而不是以绿汇报漂移。
 *
 * 这组数字只取决于这两处网格上的 sm/md/lg 类名：**声明**一个新的自定义变体（例如另一条线程
 * 的 `@custom-variant mobile (…)`）不会改变它们——网格上没有该类就生成不出能胜出的规则；
 * 但往这两处网格**追加** `mobile:` 之类的列数类名就会改变渲染结果，那时必须按新的类名链条
 * 重算这两个数组并同步这条注释。本分支不含那条 `mobile:` 变体，所以这组断言的判据在合并
 * 前后相同。
 */
const BREAKPOINTS = [390, 640, 641, 768, 1024, 1280, 1440, 1536, 1920]
const VIEWPORT_HEIGHT = 900

const HOME_QUICK_LINKS_COLUMNS = [1, 2, 2, 3, 3, 3, 3, 3, 3]
const PROBE_GRID_COLUMNS = [2, 3, 3, 4, 5, 5, 5, 5, 5]

const PROBE_TEST_ID = 'variant-order-probe-grid'

/**
 * 变体排序探针：类链只在这里声明一次，渲染出的 track 数就是它按档胜出的列数。
 * 用 `h()` 而不是 `template:`——这一档的构建不带运行时模板编译器，`template` 字符串根本渲染不出来
 * （`PageStub` 之所以能留着，是因为没有断言读它的内容）。
 */
const ProbeGrid = defineComponent({
  setup: () => () =>
    h('div', {
      'data-testid': PROBE_TEST_ID,
      class: 'grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'
    })
})

const PageStub = defineComponent({ template: '<div />' })

/** 渲染出来的 track 数就是列数；`grid-template-columns` 的 computed 值即用后的 track 列表。 */
function columnCount(testId: string) {
  const element = document.querySelector(`[data-testid="${testId}"]`)
  if (!element) throw new Error(`grid ${testId} not found`)
  return getComputedStyle(element).gridTemplateColumns.split(' ').filter(Boolean).length
}

async function columnsAcrossBreakpoints(testId: string) {
  const measured: number[] = []
  for (const width of BREAKPOINTS) {
    await setViewport(width, VIEWPORT_HEIGHT)
    measured.push(columnCount(testId))
  }
  return measured
}

let wrapper: VueWrapper | null = null

async function mountPage(component: object, testId: string) {
  // home 页用 RouterLink，需要 router 在上下文里；其余路径给一条兜底路由，免得每次渲染
  // 都刷「No match found」的告警。
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', redirect: '/home' },
      { path: '/home', component: PageStub },
      { path: '/:pathMatch(.*)*', component: PageStub }
    ]
  })
  wrapper = mount(component, { attachTo: document.body, global: { plugins: [router] } })
  await nextTick()
  await waitForMounted(testId)
}

/*
 * 有界轮询「页面已挂上」。
 *
 * 与 react demo 的 `mountPage` 不同，这里 `mount()` 直接渲染被测组件（路由只是给
 * RouterLink 提供上下文，不经过懒加载路由），挂载是同步的——所以这不是同一个成因，
 * 也不以「消除竞速」自居。单点判空会把一次调度抖动直接当失败，所以用有界重试：判据不变
 * （始终是 data-testid 存在），超预算仍然抛 `page not mounted`，不会因为某一帧的调度延迟
 * 而假红。
 */
async function waitForMounted(testId: string): Promise<void> {
  // 挂载预算是墙钟时间：并发跑全仓测试时单帧间隔会被拉长，1000ms 会假失败。
  // 本包不能 import web-ui 的 test-utils（不在其 exports 里），故沿用本地轮询。
  const deadline = performance.now() + 5000
  while (performance.now() < deadline) {
    if (document.querySelector(`[data-testid="${testId}"]`)) return
    await new Promise(resolve => requestAnimationFrame(() => resolve(null)))
  }
  throw new Error('page not mounted')
}

describe('网格列数基线（浏览器）', () => {
  afterEach(async () => {
    wrapper?.unmount()
    wrapper = null
    await setViewport(BREAKPOINTS[0]!, VIEWPORT_HEIGHT)
  })

  it('home 页快速预览网格在九档视口下保持 1/2/2/3/3/3/3/3/3 列', async () => {
    await mountPage(Home, 'home-quick-links-grid')

    expect(await columnsAcrossBreakpoints('home-quick-links-grid')).toEqual(HOME_QUICK_LINKS_COLUMNS)
  })

  it('变体排序探针在九档视口下保持 2/3/3/4/5/5/5/5/5 列', async () => {
    await mountPage(ProbeGrid, PROBE_TEST_ID)

    expect(await columnsAcrossBreakpoints(PROBE_TEST_ID)).toEqual(PROBE_GRID_COLUMNS)
  })
})
