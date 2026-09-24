/**
 * 根节点 page 色同步 —— 「哪一层最外层」的唯一拥有者。
 *
 * macOS 橡皮筋回弹露白的成因不在 body 而在画布：body 的背景只覆盖滚动范围，回弹时被扯出来的
 * 那一圈用的是 documentElement 的画布背景。而 `--wui-color-page` 定义在 `<web-ui-theme>` 的
 * shadow 作用域里，自定义属性的继承链到 documentElement 就断了，所以消费方写
 * `body { background: var(--wui-color-page) }` 也管不到回弹区。
 *
 * 本模块补上这一环：最外层 active theme 把自己计算出的 `--wui-color-page` 写到 documentElement
 * 的行内自定义属性上，消费方仍然只需要那一行 body 规则。
 *
 * 为什么按 connect 顺序取「第一个 active 实例」，而不是去判「DOM 上最外层的那一个」：
 * 组件无法可靠地回答后者——portal、shadow host 与 slot 都会让「谁包着谁」的物理关系和主题
 * 作用域不一致（`WebUiTheme._findThemeAncestor()` 正是为此单独实现了跨 shadow 边界的祖先链）。
 * root 值只可能有一个来源，按 connect 顺序取第一个是唯一不需要猜树形状的判据，且与用户视角
 * 一致：嵌套主题总是后 connect，先进页面那个主题范围就是盖住整页的那个。
 *
 * 其余取舍：
 *
 * - 同步权在已登记实例之间按同一顺序顺延：最外层断开时下一个已连接实例接管，不查 DOM。
 *   重新挂载的实例按新的一次 connect 排到队尾——队首才是当前 outermost。
 * - 写入值取该实例的**计算值**，因此消费者在 host 上覆盖 `--wui-color-page`（包括在自己的
 *   媒体查询里覆盖）会被原样镜像，主题与消费者的优先级关系不因此改变。
 * - 全部断开时**保留最后值**：清掉属性会让 body 背景在主题卸载/重挂的间隙闪回 UA 白底，
 *   而那正是本能力要消除的观感。代价是最后一个主题卸载后 documentElement 上仍留着一个自定义
 *   属性；消费者自己写 body 背景时它不产生任何影响。
 * - `appearance="system"` 的 token 计算值仍由组件内部 CSS 的 `prefers-color-scheme` 决定；
 *   root 同步与 `resolved-appearance` 输出共用同一个 MediaQueryList 监听，翻转时一次重算。
 * - 登记表强引用实例，但删除路径只有组件自己的 disconnectedCallback：自定义元素反应保证移除
 *   必然触发它，不存在 open-overlay 那种「面板被 portal 搬运」需要惰性兜底回收的形状。
 */

const ROOT_PAGE_TOKEN = '--wui-color-page'

/** 按 connect 顺序排列的已登记 active 实例；队首持有 root 同步权。 */
const registered = new Set<HTMLElement>()

let schemeQuery: MediaQueryList | undefined
const schemeSubscribers = new Set<() => void>()

/*
 * dev 期测试钩子：登记表尺寸。
 *
 * 「组件卸载后忘了撤销登记」是这层唯一的结构性风险，而 `registered` 无法从公开面观察——
 * 调用方只看见 documentElement 上的值，看不到注册表。有了它，泄漏在测试里是一个可直接断言的
 * 数字。`import.meta.env.DEV` 是编译期常量，生产构建里整段消失。
 */
declare global {
  // eslint-disable-next-line no-var
  var __webUiThemeRootSyncCount: () => number
}

if (import.meta.env.DEV) {
  globalThis.__webUiThemeRootSyncCount = () => registered.size
}

function isRootSyncOwner(host: HTMLElement): boolean {
  return registered.values().next().value === host
}

/** 计算值可能为空（jsdom、未激活作用域、已断开），空值不写入也不删除既有值。 */
function readPageColor(host: HTMLElement): string {
  return getComputedStyle(host).getPropertyValue(ROOT_PAGE_TOKEN).trim()
}

function syncRootPageColor(): void {
  const owner = registered.values().next().value as HTMLElement | undefined
  if (!owner) return
  // 已断开的所有者不能再写 root：整棵子树一起卸载时，队首顺延到的实例已经不在文档里
  // （浏览器对 detached 元素取不到计算值，jsdom 却仍按选择器匹配返回旧值），
  // 不设这道坎就会在两种环境里得到不同的 root 末值。
  if (!owner.isConnected) return
  const value = readPageColor(owner)
  if (!value) return
  const style = document.documentElement.style
  // 与当前行内值比较而不是与模块记忆的上次写入比较：消费者中途覆写时，下一次同步仍然夺回
  // 归属权，而值没变时不做无谓的样式写入。
  if (style.getPropertyValue(ROOT_PAGE_TOKEN) === value) return
  style.setProperty(ROOT_PAGE_TOKEN, value)
}

function handleSchemeChange(): void {
  syncRootPageColor()
  for (const subscriber of schemeSubscribers) subscriber()
}

function syncSchemeListener(): void {
  if (registered.size > 0 || schemeSubscribers.size > 0) {
    if (schemeQuery) return
    try {
      schemeQuery = window.matchMedia('(prefers-color-scheme: dark)')
    } catch {
      // jsdom 等没有 matchMedia 的环境：system 档跟随不到系统翻转，登记与输出仍保持当前值。
      return
    }
    schemeQuery.addEventListener('change', handleSchemeChange)
    return
  }
  if (!schemeQuery) return
  schemeQuery.removeEventListener('change', handleSchemeChange)
  schemeQuery = undefined
}

/*
 * 复用 root 同步已经持有的系统 scheme 监听：resolved-appearance 只登记回调，不另建 MediaQueryList。
 * 登记先于订阅或订阅先于登记都可以；syncSchemeListener 以两者任一非空为准。
 */
export function subscribeThemeSystemAppearanceChange(listener: () => void): () => void {
  schemeSubscribers.add(listener)
  syncSchemeListener()
  return () => {
    if (!schemeSubscribers.delete(listener)) return
    syncSchemeListener()
  }
}

/**
 * 登记一个 active theme。幂等，组件的 connectedCallback 与 updated() 可以无条件调用：
 * 已在表中的实例重复登记保留原队序，只有队首实例会刷新 root 值。
 */
export function registerThemeRootSync(host: HTMLElement): void {
  registered.add(host)
  syncSchemeListener()
  // 嵌套实例的变更按契约不影响 root 值；顺延不到新实例时 root 值同样不变。
  if (!isRootSyncOwner(host)) return
  syncRootPageColor()
}

/** 撤销登记。移交同步权时由新的队首实例立即接管 root 值。 */
export function unregisterThemeRootSync(host: HTMLElement): void {
  if (!registered.delete(host)) return
  syncSchemeListener()
  syncRootPageColor()
}
