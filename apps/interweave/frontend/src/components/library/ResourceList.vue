<script setup lang="ts">
import type { WebUiContextMenu, WebUiEditableText, WebUiEvent } from '@greypan/web-ui'
import {
  lucideExternalLink,
  lucideInfo,
  lucidePenLine,
  lucideRefreshCw,
  lucideTags,
  lucideTrash2
} from '@greypan/web-ui/icons'
import { WindowVirtualizer } from 'virtua/vue'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import type { ResourceSourceView, ResourceView } from '@/stores/library'

import { FocusNavigator, rowFocusTarget } from './focusNavigator'
import { arrowUpRight } from './icons'
import type { NameEditorRef } from './rename'
import ResourceRow from './ResourceRow.vue'
import { SweepScrollController } from './sweepScroll'

const props = defineProps<{
  resources: ResourceView[]
  activeResourceId: string | null
  checkedIds: string[]
  selectionMode: boolean
  editingNameKey: string | null
  editorRef: (id: string) => NameEditorRef
  loading: boolean
  runtimeAvailable: boolean
  emptyDescription: string
  /** 缩略图回填；未提供时行内捕获后不回填。地址取自 Source 上的 thumbnailUrl。 */
  saveThumbnailFor?: (thumbnailUrl: string, dataUrl: string) => void
  resolveDefaultOpenWith: (resource: ResourceView) => Promise<string>
}>()

const emit = defineEmits<{
  select: [resource: ResourceView]
  detail: [resource: ResourceView]
  startRename: [resource: ResourceView]
  editTags: [resource: ResourceView]
  delete: [resource: ResourceView]
  recover: [source: ResourceSourceView]
  toggle: [resourceId: string]
  setChecked: [resourceId: string, checked: boolean]
  renameChange: [resource: ResourceView, event: WebUiEvent<WebUiEditableText, 'change'>]
  cancelRename: []
  /** 用系统默认应用打开该资源；由父级经由 runtime 交给操作系统。 */
  openDefault: [resource: ResourceView]
  /** 键盘导航/context menu 请求激活某一行：由父级把 activeResourceId 置为该行资源的 id。 */
  activate: [resource: ResourceView]
}>()

// 菜单打开时透明遮罩位于主题 overlay 中，不再属于列表的 DOM 子树。
function preventScrimContextMenu(event: MouseEvent) {
  if (event.composedPath().some(node => node instanceof Element && node.matches('[data-wui-menu-scrim]'))) {
    event.preventDefault()
  }
}
onMounted(() => window.addEventListener('contextmenu', preventScrimContextMenu, true))
onBeforeUnmount(() => window.removeEventListener('contextmenu', preventScrimContextMenu, true))

const contextMenuRef = ref<WebUiContextMenu>()
const contextResource = ref<ResourceView | null>(null)
const rowsRef = ref<HTMLElement | null>(null)
const emptyTitle = computed(() => (props.runtimeAvailable ? '资源库为空' : '桌面服务未连接'))
const checkedSet = computed(() => new Set(props.checkedIds))

/*
 * 行高没有写死。ResourceRow 的标题会 line-clamp-2 换行、标签区会 flex-wrap 换行、进入改名
 * 编辑态还会从文字换成表单控件，三种情况高度都不同。这个 item-size 只是「还没量到之前先用
 * 多少」的一阶猜测，真正的值由 virtua 挂在每个条目上的 ResizeObserver 量出来覆盖回去。
 */
const ROW_ESTIMATE = 64

/*
 * 渲染窗在视口前后各留的像素。留 4 个估值行高（4 × 64px）：留够滚动时
 * 下一个条目已经量好，又能让窗口外的行尽快卸载。
 */
const VIRTUAL_BUFFER = 256

/*
 * activeIndex 是 roving tabindex 与方向键导航的派生下标：由 activeResourceId 在 props.resources
 * 里查出。若 activeResourceId 为 null 或不在列表中，回退到下标 0——这与 enterList 的
 *「没有活动行则给首行」分支一致，也让 fixture（activeResourceId: null）的 tabindex 期望
 *['0','-1','-1'] 成立。
 */
const activeIndex = computed(() => {
  if (!props.activeResourceId) return 0
  const found = props.resources.findIndex(resource => resource.id === props.activeResourceId)
  return found >= 0 ? found : 0
})

/*
 * 列表包裹层距文档顶部的距离。virtua 的 WindowVirtualizer 自己沿 offsetParent 链量出它到
 * 文档顶的 baseOffset，内部换算不需要外喂；这一份是给本组件自己的 scrollIndexIntoView
 * 把「列表内偏移」换算成文档坐标用的。
 *
 * 量的是 getBoundingClientRect().top 加当前 window.scrollY——rect.top 是视口坐标，
 * 文档坐标要加上已经滚过的那一段。这个值随上方 sticky header 高度变化（工具条展开/收起、
 * 筛选 panel 开合），所以用 ResizeObserver 订阅包裹层本身：包裹层位置一变就重算。
 *
 * 只订阅包裹层不够——header 变高时包裹层的位置跟着变，但包裹层自身的尺寸没变，
 * ResizeObserver 不会因此触发。真正可靠的是同时听 window 的 resize 与 scroll：
 * scroll 时 rect.top 变、scrollY 也变，两者相加才是对的。列表很长时 scroll 触发很频繁，
 * 但这里只做一次减法与一次写回，且只在编辑态之外才用得到（见 clampEditingRowIntoView）。
 */
const listOffset = ref(0)
const listSizerRef = ref<HTMLElement | null>(null)
// 懒建：模块顶层 new ResizeObserver 会早于测试的 stubLayout 执行，那一刻 jsdom 还没有
// 这个全局。真正需要它的时候（容器挂上）环境一定已经就绪。
let listOffsetObserver: ResizeObserver | null = null

function measureListOffset() {
  const sizer = listSizerRef.value
  if (!sizer) {
    listOffset.value = 0
    return
  }
  listOffset.value = Math.max(sizer.getBoundingClientRect().top + window.scrollY, 0)
}

let listOffsetFrame = 0
function scheduleListOffsetMeasure() {
  if (listOffsetFrame) return
  listOffsetFrame = requestAnimationFrame(() => {
    listOffsetFrame = 0
    measureListOffset()
  })
}

watch(listSizerRef, (sizer, previous) => {
  if (previous && listOffsetObserver) listOffsetObserver.unobserve(previous)
  if (!sizer) return
  // 包裹层尺寸变化（行高测量改变总高）不改变它自己的 top，但 header 变化会。
  // 两边都订阅：resize 覆盖 header 改高，scroll 覆盖已滚动时的位置换算。
  listOffsetObserver ??= new ResizeObserver(scheduleListOffsetMeasure)
  listOffsetObserver.observe(sizer)
  window.addEventListener('scroll', scheduleListOffsetMeasure, { passive: true })
  window.addEventListener('resize', scheduleListOffsetMeasure)
  measureListOffset()
})

onBeforeUnmount(() => {
  listOffsetObserver?.disconnect()
  listOffsetObserver = null
  window.removeEventListener('scroll', scheduleListOffsetMeasure)
  window.removeEventListener('resize', scheduleListOffsetMeasure)
  if (listOffsetFrame) cancelAnimationFrame(listOffsetFrame)
})

/*
 * 滚动元素是 window 本身，整页滚动（#188 用户裁决：body 滚动，不做内部滚动容器）。
 *
 * virtua 的 WindowVirtualizer 自己处理「列表不在文档顶」这件事：它沿 offsetParent 链量出
 * 容器到文档顶的距离（baseOffset），scrollToIndex / findItemIndex 都在文档坐标里换算，
 * 不需要像 TanStack 那样外喂一个 scrollMargin。
 *
 * 但 baseOffset 只在库内部用；本组件把「键盘导航到某一行」与「让编辑中的行留在视口」都收在
 * 自己的 scrollIndexIntoView 里（见下），那条路径要把 virtua 的列表内偏移用 listOffset
 * 换算成文档坐标。
 *
 * 行高不固定（标题换行、标签换行、改名编辑态），由 virtua 挂在每个条目上的 ResizeObserver
 * 自动测量，不需要函数式 ref 与自定义 measureElement：
 *   - virtua 只认「元素 -> 下标」的对应（mount 时注册，条目下标变化时重新注册），高度按
 *     下标写进它自己的尺寸表；
 *   - 重排之后每个条目的下标变了，ListItem 的 watch 会用新下标重新 observe 同一元素，
 *     ResizeObserver.observe() 规范上会立刻投递一次初始回调，真实高度因此落到新下标上——
 *     「改名撑成多行 + 排到列表最前」这条重排路径由库自己兜住，不需要外部触发重算。
 *   - 条目高度只在内容变化时才会变，DOM 摘除/重建（挂载时尚未 attach 的函数式 ref 那条
 *     时序）不构成问题：virtua 是在挂载后由 ResizeObserver 量，不是挂载瞬间同步读 offsetHeight。
 */
const virtualizerRef = ref<InstanceType<typeof WindowVirtualizer> | null>(null)

/*
 * 编辑中的行要被钉在视口里（见下方 clampEditingRowIntoView）。
 */
const editingIndex = computed(() =>
  props.editingNameKey ? props.resources.findIndex(resource => resource.id === props.editingNameKey) : -1
)

/*
 * 把一个下标滚动到视口里，只在越界时把边界收到刚好装得下这一行；已在视口内则一个字节都不动。
 *
 * 这条替代了库的 scrollToIndex：
 *   - 键盘导航要滚到能看见为止。virtua 的等价物是
 *     align:'nearest'，但它的可见性判定拿「列表内偏移」去比「原始滚动偏移」，不含 baseOffset；
 *     本列表上方有 sticky header（baseOffset > 0），那套判定会把「其实已经可见、只是靠近顶部」
 *     的行误判成「在上方」，转成 align:'start' 把页面从当前位置拽到行首。所以自己算。
 *   - 编辑行夹取也自己算（避免 scrollToIndex 把位置重置到行首），同一份逻辑两处共用。
 *
 * 坐标：virtua 的 getItemOffset(index) 是相对列表起点的偏移，加上 listOffset（列表起点在
 * 文档里的位置）才是文档坐标；window.scrollY 与 window.innerHeight 同为文档/视口坐标，
 * 可直接求交。可滚上限取文档高度减视口，与浏览器可达的最大滚动位置一致。
 */
function scrollIndexIntoView(index: number) {
  const virtualizer = virtualizerRef.value
  if (!virtualizer || index < 0) return
  const viewport = window.innerHeight
  if (!viewport) return
  const top = listOffset.value + virtualizer.getItemOffset(index)
  const bottom = top + virtualizer.getItemSize(index)
  const maxScrollY = Math.max(document.documentElement.scrollHeight - viewport, 0)
  if (window.scrollY > top) {
    window.scrollTo({ top: Math.min(top, maxScrollY) })
  } else if (window.scrollY + viewport < bottom) {
    window.scrollTo({ top: Math.min(bottom - viewport, maxScrollY) })
  }
}

/*
 * activeIndex 现为派生值，随 activeResourceId 与 resources 自动同步，无需手动夹取。
 * 当前资源被筛选/搜索筛掉时，activeResourceId 由父级置 null（见决策 8），派生会自动回退到 0。
 * 列表内容变化时当前行按 id 跟随（决策 7）——派生天然满足：activeResourceId 不变则下标随顺序变化而变化。
 */

/*
 * 焦点成为 contextResource 的第二个来源。键盘呼出 context menu（ContextMenu 键 / Shift+F10）
 * 由 web-ui-context-menu 自己监听宿主元素，它不看 contextResource、只按 document.activeElement
 * 的 rect 摆 panel；而 menu item 全部 gate 在 contextResource 上，它只有行上的 contextmenu
 * 事件这一个赋值点。纯键盘呼出时 contextResource 仍是 null，弹出来的是一张紧贴该行、
 * 内容却只有「删除」和两条 divider 的 menu：位置在说「这一行」，内容在说别的资源。
 *
 * 用 focusin 而不是给 ResourceRow 加一个 focus emit：focusin 会冒泡，容器上一个监听就够，
 * 行内的勾选框与改名编辑器获焦时也会顺带把所属行同步上，不必为一个纯内部的状态同步再扩
 * 一条对外 emit 契约。落焦到容器自己身上时置空，免得拿上一条资源的 menu item 去填一张锚在
 * 列表上的 menu。
 */
function handleRowsFocusin(event: FocusEvent) {
  const target = event.target
  if (!(target instanceof HTMLElement)) return
  const row = target.closest<HTMLElement>('[data-resource-row]')
  contextResource.value = row ? resourceForRow(row) : null
}

/*
 * 触屏长按是 contextResource 的第三个来源。
 *
 * 开了 long-press 之后 menu 有两个开法：鼠标走原生 contextmenu（行上的事件），触屏走组件
 * 自己在宿主上计时打开。后者不发事件、也不认行——它只知道「在哪儿按的」，menu item 却全部
 * gate 在 contextResource 上。若只补属性不补这个赋值，长按弹出来的是一张位置在某一行的
 * 空 menu：只剩两条 divider 和一个删除「null」的空项。
 *
 * 为什么在 pointerdown 就落定、而不是等 menu 要开了再补：长按的判定归组件的计时器，我们
 * 没有「即将开 menu」这个时刻可挂。此时 menu 还没开，v-if 渲染的是最终形态，组件搬运项的
 * 那一整套（capture → 移入 portal → 关闭时搬回）拿到的也是完整项集。等开之后再改
 * contextResource 就是在 panel 里增删节点，正是本组件上方那段 wrapper 注释里记的那个
 * 会把锚点搞丢、且无法自愈的坑。
 *
 * 长按抬手后浏览器补发的 click 不用宿主管：web-ui-context-menu 自己在宿主子树 capture
 * 阶段吸收它（组件知道「这次长按开出了 menu」「手势何时结束」，宿主推导的每个事实都是
 * 冗余推导），行激活不会被补发的 click 误触。
 */

function syncTouchContext(event: PointerEvent) {
  if (event.pointerType !== 'touch') return
  const target = event.target
  if (!(target instanceof HTMLElement)) return
  const row = target.closest<HTMLElement>('[data-resource-row]')
  contextResource.value = row ? resourceForRow(row) : null
}

const ROW_NAVIGATION_KEYS = new Set(['ArrowDown', 'ArrowUp', 'Home', 'End'])

/*
 * 容器自己也是 tab stop，所以键盘用户能停在「整个列表」这一层。进列表的键位里带
 * Shift+F10：web-ui-context-menu 认的 context-menu 键（见 packages/web-ui/src/components/
 * context-menu/index.ts 的 _onKeydown），焦点在容器上时它照样会开 menu，并把 panel 锚到容器
 * 自己身上。容器不对应任何一条资源，那种情况下弹出来的只会是一张位置在列表、内容与列表
 * 无关的 menu——和行上的键盘缺陷是同一个毛病，只是从「行」换成了「列表」。所以这里
 * 先把焦点交给行：事件继续冒泡到宿主，宿主再读 document.activeElement 时读到的已经是
 * 那一行，menu 于是既锚在行上、也讲这一行的事。
 */
const ENTER_LIST_KEYS = new Set(['Enter', ' ', 'ArrowDown', 'F10'])

/*
 * 行是 div，键盘不像 button 那样补出 click，Enter / Space 在这里翻译成行语义。
 *
 * 接管范围收在「行自身拿到焦点」这一个条件上：勾选框和行内改名编辑器各有交互，它们的
 * keydown 冒到容器时 target 是行内的 shadow host（行内没有监听器，retarget 后的 host
 * 仍能 closest 到行），不该顺带激活整行。修饰键组合留给浏览器与系统，Shift+Space 仍是
 * 「向上滚一屏」——焦点不在列表里时，空格也照常滚页面，监听器只在列表容器上。
 *
 * 焦点本身不自动开预览，这是被实现逼出来的：预览 drawer 的 web-ui-drawer 内部是原生
 * <dialog> 的 showModal()，打开时浏览器把焦点拉进 dialog、让其后的文档 inert。焦点一落到
 * 行上、drawer 一开，下一行就永远拿不到焦点，Tab 在行间切换这条主路径当场断掉（浏览器实测：
 * drawer 打开后 row.focus() 无响应）。预览 drawer 是模态的，要改成非模态得动 web-ui 组件。
 * 所以焦点在这里的作用是「界定按键的作用域」：空格只作用于焦点所在的那一行，预览不由
 * 「鼠标恰好悬在某一行」这个隐藏判据触发——预览能力留着，触发判据不是悬停。
 */
function handleRowsKeydown(event: KeyboardEvent) {
  if (event.ctrlKey || event.metaKey || event.altKey) return
  const target = event.target
  if (!(target instanceof HTMLElement)) return
  if (target === rowsRef.value) {
    enterList(event)
    return
  }
  if (target.closest('[data-resource-row]') !== target) return
  handleRowKeydown(event, target)
}

/*
 * 容器这一跳是「进列表」：Tab 落到它时整列表有一圈 focus ring（页面级 focus ring 覆盖
 * [tabindex] 元素，见 assets/global.css），Enter / Space / ArrowDown 才把焦点交给行——
 * 落在当前活动行，没有就从首行开始。完全不给反应的话它只是个停住不动的地方。
 */
function enterList(event: KeyboardEvent) {
  if (!ENTER_LIST_KEYS.has(event.key)) return
  if (event.key === ' ' && event.shiftKey) return
  // F10 只有带 Shift 才是 context-menu 键，裸 F10 留给浏览器的查找快捷键
  if (event.key === 'F10' && !event.shiftKey) return
  if (!props.resources.length) return
  const active = props.resources.findIndex(resource => resource.id === props.activeResourceId)
  event.preventDefault()
  void navigator.focusIndex(active >= 0 ? active : 0)
}

function handleRowKeydown(event: KeyboardEvent, row: HTMLElement) {
  if (event.key === 'Enter') {
    if (event.repeat) return
    const resource = resourceForRow(row)
    if (!resource) return
    event.preventDefault()
    emit('detail', resource)
    return
  }
  if (event.key === ' ') {
    if (event.shiftKey || event.repeat) return
    const resource = resourceForRow(row)
    if (!resource) return
    event.preventDefault()
    // 空格：把焦点所在这一行写成当前行（activeResourceId），保留 select 语义
    const index = indexOfRow(row)
    if (index >= 0) void navigator.navigateToIndex(index)
    emit('select', resource)
    return
  }
  if (!ROW_NAVIGATION_KEYS.has(event.key)) return
  moveRowFocus(event, row)
}

/*
 * 方向键在行间移动焦点，Home / End 到首尾；下一个下标的算法在 focusNavigator 的
 * rowFocusTarget（按数据下标算，边界是 resources 的长度而不是已渲染行数）。
 * 到达首尾时 return 且不 preventDefault，列表不是环，按键交回浏览器。
 */
function moveRowFocus(event: KeyboardEvent, row: HTMLElement) {
  const index = indexOfRow(row)
  if (index < 0) return
  const next = rowFocusTarget(event.key, index, props.resources.length - 1)
  if (next === index) return
  event.preventDefault()
  void navigator.navigateToIndex(next)
}

/*
 * 键盘导航的落焦状态机收在 FocusNavigator（见 focusNavigator.ts）：activate 请求、落焦轮询
 * 与请求号作废都在那里，这里只注入资源解析、渲染等待、滚动与行查询。
 */
const navigator = new FocusNavigator({
  resourceAt: index => props.resources[index] ?? null,
  activate: resource => emit('activate', resource),
  afterRender: () => nextTick(),
  scrollIndexIntoView,
  rowElementAt
})

function rowElementAt(index: number) {
  const container = rowsRef.value
  return container?.querySelector<HTMLElement>(`[data-resource-index="${index}"]`) ?? null
}

/*
 * 让编辑中的行始终留在视口内。
 *
 * 草稿不丢这件事分两层：行被卸载时草稿由 ResourceRow 开启的 editable-text `commit-on-unmount`
 * 兜底（卸载复用 _commitEditing，与 Enter／blur 同源，见 ResourceRow.vue）；但用户仍不该对着
 * 一个看不见的编辑器继续打字。所以还要把视口夹回编辑行身上——这正是本条职责。
 *
 * virtua 的 WindowVirtualizer 没有 keepMounted / itemProps，无法强制挂载渲染窗外的下标，
 * 于是「编辑行不被卸载」这条只能靠这里把视口夹回去：行只要在视口里就必然在渲染窗内（窗口带
 * bufferSize 余量），也就不会被卸载。夹取用 scrollIndexIntoView（见上），只在越界时把边界
 * 收到刚好装得下这一行，视口内的滚动一个字节都不动。
 */
function clampEditingRowIntoView() {
  scrollIndexIntoView(editingIndex.value)
}

/*
 * 三处调用同一个夹取，触发源各不相同，缺一不可：
 *
 *   - editingIndex 变化：进入/退出改名编辑态。immediate 覆盖「挂载时已在编辑态」——
 *     那种情况下 editingIndex 不会再变，没有 immediate 这次就一次都不会跑。
 *   - rowsRef 挂上：immediate 那一轮跑在 rowsRef 赋值之前，量不到视口与行位置。
 *   - window 的 scroll：编辑期间用户可能只是随手把页面滚走，不改编辑态。行会被卷出渲染窗
 *     而卸载（草稿由 commit-on-unmount 兜底提交，但用户仍会对着一个看不见的编辑器继续打字）。
 *     两者都靠这一手夹回来。window 模式下滚动事件在 window 上，不在列表容器上。
 */
watch(editingIndex, clampEditingRowIntoView, { immediate: true })
watch(rowsRef, () => clampEditingRowIntoView(), { immediate: true })
onMounted(() => window.addEventListener('scroll', clampEditingRowIntoView, { passive: true }))
onBeforeUnmount(() => window.removeEventListener('scroll', clampEditingRowIntoView))

function indexOfRow(row: HTMLElement) {
  const raw = row.dataset.resourceIndex
  if (raw === undefined) return -1
  const index = Number(raw)
  return Number.isInteger(index) ? index : -1
}

/*
 * 行的 id 从当前可见项里解析。行元素此刻就在 DOM 里，命中的一定是当前渲染的那一条；
 * 旧的 hover 态要防「行重渲染时指针没动、mouseleave 不补发」的悬空 id，focus 没有这个问题。
 */
function resourceForRow(row: HTMLElement) {
  const id = row.dataset.resourceId
  return id ? (props.resources.find(resource => resource.id === id) ?? null) : null
}

// 列表行紧挨着排布，没有行间距。选中态要连成一片，就得由相邻两行各自交出一个直角：
// 这里只报告「上下邻居是否也选中」，是否真的改成直角由 ResourceRow 结合自身 checked 决定。
function checkedAbove(index: number) {
  const previous = props.resources[index - 1]
  return !!previous && checkedSet.value.has(previous.id)
}

function checkedBelow(index: number) {
  const next = props.resources[index + 1]
  return !!next && checkedSet.value.has(next.id)
}

/*
 * 按住拖动批量勾选（扫选）的状态机与边缘自动滚物理收在 SweepScrollController（见
 * sweepScroll.ts）：方向锁定、触摸长按确认、rAF 边缘滚动与 touchmove 拦截都在那里。
 * 组件只注入行命中、勾选状态与动作、滚动面、时间源与两个事件目标；手势边界上组件侧只做
 * 两件事——每一手开始前同步长按 menu 需要的 contextResource（见 handleSweepStart），
 * 以及扫选后吃掉补发 click 与系统 contextmenu（见 onRowSelect 与 openContextMenu）。
 */
const sweep = new SweepScrollController({
  isEnabled: () => props.selectionMode,
  hitTest: rowIdAt,
  isRowChecked: id => props.checkedIds.includes(id),
  setChecked: (resourceId, checked) => emit('setChecked', resourceId, checked),
  viewport: {
    innerHeight: () => window.innerHeight,
    scrollY: () => window.scrollY,
    maxScrollY: () => Math.max(document.documentElement.scrollHeight - window.innerHeight, 0),
    scrollTo: top => window.scrollTo({ top })
  },
  scheduler: {
    requestFrame: callback => requestAnimationFrame(callback),
    cancelFrame: handle => cancelAnimationFrame(handle),
    setTimeout: (callback, delay) => window.setTimeout(callback, delay),
    clearTimeout: handle => window.clearTimeout(handle as number)
  },
  gestureTarget: window,
  blockerTarget: document
})

function rowIdAt(clientX: number, clientY: number) {
  const element = document.elementFromPoint(clientX, clientY)
  if (!(element instanceof Element)) return null
  // 整页滚动之后「命中列表之外」不能再靠 container.contains 判断：容器此刻不是滚动容器，
  // 命中行元素本身就说明它属于这个列表——行只由本组件渲染，页面上别处不会有同标记的元素。
  const row = element.closest<HTMLElement>('[data-resource-row]')
  return row?.dataset.resourceId ?? null
}

function handleSweepStart(event: PointerEvent) {
  if (
    event.pointerType === 'touch' &&
    event.target instanceof Element &&
    !event.target.closest('[data-resource-row]')
  ) {
    event.stopPropagation()
  }
  // 长按 menu 要用的 contextResource 在这里落定：这是 pointerdown 冒泡到容器上的第一个监听器，
  // 早于 web-ui-context-menu 自己那个（它在宿主上，我们在容器的后代里）。放在早的那一侧，
  // 长按计时器到期时 contextResource 已经是对的，menu 开出来就有完整项。
  syncTouchContext(event)
  sweep.handlePointerDown(event)
}

function handleBlankContextMenu(event: MouseEvent) {
  if (!event.composedPath().some(node => node instanceof Element && node.matches('[data-resource-row]'))) {
    event.preventDefault()
    event.stopPropagation()
  }
}

function onRowSelect(resource: ResourceView) {
  if (sweep.consumeRowClick()) return
  emit('select', resource)
}

function onBeforeUnmountHooks() {
  // 两个 controller 各自收尾：摘掉手势监听与 touchmove 拦截、作废还没跑完的落焦轮询
  // （否则它会在 rowsRef 变 null 之后一路空转到超时上限）。
  sweep.dispose()
  navigator.cancel()
}

onBeforeUnmount(onBeforeUnmountHooks)

/*
 * 「打开方式」显示系统默认应用的真实名字。名字是异步查出来的，而右键可以连续落到不同行上，
 * 因此用请求序号作废旧结果——否则慢的那次查询会把后一行的名字盖回去。
 * 名字只影响文案：查不到时回落「系统默认应用」，点击仍交给系统按默认关联打开。
 */
const defaultOpenWithName = ref('')
let defaultOpenWithRequest = 0

async function loadDefaultOpenWith(resource: ResourceView | null) {
  const request = ++defaultOpenWithRequest
  defaultOpenWithName.value = ''
  if (!resource) return
  const name = await props.resolveDefaultOpenWith(resource)
  if (request !== defaultOpenWithRequest) return
  defaultOpenWithName.value = name
}

watch(contextResource, resource => {
  void loadDefaultOpenWith(resource)
})

function handleOpenDefault(resource: ResourceView | null) {
  if (resource) emit('openDefault', resource)
  closeContextMenu()
}

let contextMenuOpenVersion = 0

async function openContextMenu(resource: ResourceView, event: MouseEvent) {
  // 长按扫选手势会顺带触发系统级 contextmenu，那不是「用户想看 menu」，挡掉
  if (sweep.isContextMenuSuppressed()) {
    event.preventDefault()
    return
  }
  event.preventDefault()
  event.stopPropagation()
  // 右键呼出 menu 本身也写当前行（决策 4 后半句）：emit activate 让父级把 activeResourceId
  // 置为该行资源 id。不调用 focusIndex()——它会 scrollIndexIntoView + row.focus()，会抢走焦点
  //（右键改名时焦点在名字编辑器里）。
  emit('activate', resource)
  const { clientX, clientY } = event
  const version = ++contextMenuOpenVersion
  contextResource.value = resource
  await nextTick()
  // WebKit 需先结束原生右键事件，再打开模态菜单，避免系统菜单与定位冲突。
  requestAnimationFrame(() => {
    if (version === contextMenuOpenVersion) contextMenuRef.value?.openAt(clientX, clientY)
  })
}

function closeContextMenu() {
  contextMenuOpenVersion++
  contextMenuRef.value?.close()
}

function contextUnavailableSource(resource: ResourceView | null) {
  return resource?.sources.find(source => !source.available) ?? null
}

function handleStartRename(resource: ResourceView | null) {
  if (resource) emit('startRename', resource)
  closeContextMenu()
}

function handleTags(resource: ResourceView | null) {
  if (resource) emit('editTags', resource)
  closeContextMenu()
}

function handleDelete(resource: ResourceView | null) {
  if (resource) emit('delete', resource)
  closeContextMenu()
}

function handleDetail(resource: ResourceView | null) {
  if (resource) emit('detail', resource)
  closeContextMenu()
}

function handleRecover(source: ResourceSourceView | null) {
  if (source) emit('recover', source)
  closeContextMenu()
}

function editorRefFor(id: string) {
  return props.editorRef(id)
}

/** 行级回填回调：把捕获的 dataURL 绑定到该行首选 Source 的缩略图地址上。 */
function thumbnailSaver(resource: ResourceView) {
  const save = props.saveThumbnailFor
  const thumbnailUrl = resource.preferred?.thumbnailUrl
  if (!save || !thumbnailUrl) return null
  return (dataUrl: string) => save(thumbnailUrl, dataUrl)
}

function handleRenameChange(resource: ResourceView, event: WebUiEvent<WebUiEditableText, 'change'>) {
  emit('renameChange', resource, event)
}
</script>

<template>
  <!--
    disabled 绑在「没有条目」上，而不是绑在右键来源上：context-menu 自己监听宿主的
    contextmenu，列表为空时那块空态区域仍在这个宿主里，右键照样命中。不禁用的话会弹出
    一张 contextResource 为 null 的 menu——只剩一条 divider 加一个空「删除」项。禁用后
    列表区域的右键由宿主拦截，避免系统菜单与资源菜单冲突。
  -->
  <!--
    long-press 让触屏能长按出行 menu（web-ui-context-menu 的 opt-in 属性，只对 pointerType
    为 touch 的指针生效，鼠标仍走原生 contextmenu）。

    选择模式里同一个「按住不动」已经被扫选占了
    （SweepScrollController 的触摸长按确认，320ms），而组件的长按阈值是 500ms——两个计时器都会跑，menu 会在扫选
    已经开始勾选之后弹出来抢画面。语义上也该如此：选择模式的长按是「扫选」，不是「看 menu」。
    关掉之后组件在 _onPointerDown 里直接 return，连计时器都不起。

    **这里必须让 false 表现为「没有这个属性」，不能写成 `:long-press="!selectionMode"`。**
    Vue 对自定义元素走属性路径（`'long-press' in el` 为 false，属性名是 longPress），false
    会被写成字符串 `"false"`；而 Lit 的 Boolean converter 只看属性在不在（`value !== null`），
    于是 `"false"` 读出来是 true——布尔整个反了。选择模式里长按照样弹 menu。
    实测过：`agent-browser` 里进选择模式后 `getAttribute('long-press') === "false"` 而
    `longPress === true`。所以 false 分支传 undefined，让 Vue 走 removeAttribute。
    （同一元素上的 `:disabled` 没这个问题：disabled 是 Vue 认识的 spec boolean attribute，
    false 时它会 removeAttribute。）
  -->
  <web-ui-context-menu
    ref="contextMenuRef"
    :disabled="resources.length === 0"
    :long-press="selectionMode ? undefined : true"
    class="block w-full flex-1 min-h-0"
  >
    <!--
      容器不参与 v-if，始终挂载，状态只在它内部切换。这是虚拟化的硬前提：载入态与空态若
      各占一个 v-if 分支、与列表互斥，切换到列表时虚拟器组件是新建的，它要等挂载与首帧
      布局之后才量得出视口与条目尺寸，那一帧会先渲染成空的（或按估值错位的）窗口再自愈。
      固定在容器内切状态，虚拟器实例始终在场，尺寸表也就连续。空态与载入态切到同一容器内
      即可绕开。

      这里**不是**滚动容器：滚动元素是 window，整页滚动（用户裁决）。所以容器上只保留
      tabindex、role 与事件绑定；高度用于空态居中，不创建内部滚动容器。
      overscroll-contain 尤其要去掉——它原本用于阻断嵌套滚动的链式传递，
      window 模式下没有嵌套滚动，留着只会影响移动端的原生回弹手感。
    -->
    <div
      ref="rowsRef"
      class="w-full h-full select-none [-webkit-touch-callout:none]"
      tabindex="0"
      role="list"
      :aria-busy="loading"
      :data-active-index="activeIndex"
      @keydown="handleRowsKeydown"
      @focusin="handleRowsFocusin"
      @pointerdown="handleSweepStart"
      @contextmenu="handleBlankContextMenu"
    >
      <div v-if="loading" class="grid min-h-64 place-items-center" aria-live="polite">
        <div class="grid justify-items-center gap-3 text-sm text-(--wui-color-text-secondary)">
          <web-ui-spinner :size="28" />
          <span>正在载入资源库</span>
        </div>
      </div>

      <div v-else-if="resources.length === 0" class="flex min-h-full flex-col items-center justify-center">
        <web-ui-empty :size="72" :title="emptyTitle" :description="emptyDescription" />
      </div>

      <!--
        扫选手势挂在列表容器上而不是逐行挂：pointerdown 只用来记方向和落点，划过哪一行
        由 elementFromPoint 现查。行自己只管 click，拖动结束补上来的那个 click 会被
        onRowSelect 吃掉。

        焦点与按键同样收在容器上：行是 div，键盘不会补出 click，Enter / Space / 方向键要
        翻译成行语义。容器自己是**唯一**的 tab stop，Tab 进列表先落在它上面，Enter /
        ArrowDown 再进当前活动行（没有就从首行开始）——虚拟化之后不能让每行各自成为一个
        tab stop，那样 Tab 会在窗口边界直接跳出列表，而视觉上还剩几百行没滚过。

        data-active-index 把当前活动下标暴露在容器上。它是「焦点走到哪一行」在数据层的
        唯一可观测出口：目标行可能还在虚拟窗口之外、DOM 里根本没有元素，roving tabindex
        也就无从体现，只有这个属性能说清。

        撑总高与条目定位都交给 virtua 的 WindowVirtualizer。它渲染两层：外层容器是列表的
        语义与高度载体（height = 总高、position: relative），每个条目是它自建的绝对定位
        包裹（width: 100%、top = 条目偏移、contain: layout style）。本组件只负责往默认插槽
        里吐 ResourceRow，不再自己算总高、也不再自己写 translateY。

        这一层不能标 aria-hidden：行就在它内部，遮住这层等于把 role="listitem" 与
        aria-setsize / aria-posinset 一起对读屏隐去，外层的 role="list" 会变成一个「0 项的
        列表」。它自己只是撑高度与定位的盒子，没有 role 也没有可读文本，留在无障碍树里
        不会多念任何东西。

        插槽根元素必须带稳定的 :key（资源 id）：virtua 用插槽根 vnode 的 key 做行身份，
        重排（改名把行顶到最前）时据此复用同一个 DOM 节点而不是重建——节点被复用，挂在它
        上面的 ResizeObserver 就是同一个观察对象，尺寸写入才落得准。key 缺失会退回
        `_<index>`，重排时节点整个换掉，测量随之中断。

        包裹层额外挂 pointer-events-auto：virtua 在滚动进行中把外层容器设成
        pointer-events: none（避免滚动时误触行内控件）。本列表的扫选手势要在拖动中用
        elementFromPoint 现查划过哪一行，命中一旦被容器吃掉，自动滚到视口边缘时扫选就断。
        后代显式声明 auto 能覆盖继承来的 none，所以在这一层开回来。

        listSizerRef 挂在虚拟器外面这一层，只为量「列表起点在文档里的位置」（listOffset），
        供键盘导航与编辑行夹取换算文档坐标；它自己不带高度，高度由 virtua 的容器撑。
      -->
      <div ref="listSizerRef" v-else class="w-full">
        <WindowVirtualizer
          ref="virtualizerRef"
          :data="resources"
          :item-size="ROW_ESTIMATE"
          :buffer-size="VIRTUAL_BUFFER"
        >
          <template #default="{ item: resource, index }">
            <div :key="resource.id" class="pointer-events-auto">
              <ResourceRow
                :resource="resource"
                :media-url="resource.preferred?.mediaUrl ?? null"
                :thumbnail-url="resource.preferred?.thumbnailUrl ?? null"
                :save-thumbnail="thumbnailSaver(resource)"
                :index="index"
                :total="resources.length"
                :active="!selectionMode && activeResourceId === resource.id"
                :checked="checkedIds.includes(resource.id)"
                :checked-above="checkedAbove(index)"
                :checked-below="checkedBelow(index)"
                :selection-mode="selectionMode"
                :editing-name-key="editingNameKey"
                :editor-ref="editorRefFor(resource.id)"
                :tabbable="index === activeIndex"
                @select="onRowSelect"
                @contextmenu="openContextMenu"
                @toggle="emit('toggle', $event)"
                @rename-change="handleRenameChange"
                @cancel-rename="emit('cancelRename')"
              />
            </div>
          </template>
        </WindowVirtualizer>
      </div>
    </div>

    <!--
      所有 menu item 都收在这个 wrapper 里，`contents` 让它不产生盒子（对列表布局零影响）。

      这层 wrapper 是修一个真实 bug，不是结构偏好：menu 打开时 context-menu 会把项搬进
      自己的 portal panel，关闭时再搬回来，而搬回要等退场动画（`_closeMenuAfterPresence`
      是 async）。这段窗口里 `_isOpen` 已经是 false 但项还留在 panel 上。此刻右键另一行，
      上面的 v-if 就会在 panel 里增删节点，和组件自己的锚点搬运（capture / order / restore
      + return-to-slot）撞在一起，Vue 的 v-if 注释锚点会被丢在错位的地方——实测后果是
      menu 只剩「详情 / 重命名 / 删除」、可用项整块消失，且锚点丢失后**无法自愈**，menu
      从此再也打不开。

      收进 wrapper 后组件搬的是「wrapper + 全部项 + 全部 v-if 锚点」这一整块，锚点不可能
      与项走散；`getMovableMenuSubtrees` 把 wrapper 当单个可移动子树，`orderManagedMenuItems`
      随之退化成空操作，排序完全交回 Vue。`getMenuChildren` 本来就递归进 wrapper，
      `wui-menu-content` 也没有直接子选择器，渲染与命中判定都不受影响。

      wrapper 上的 slot="context-menu-hidden" 不能省。组件关闭时是靠给项加这个属性来隐藏的
      （模板里只有默认 slot，名字对不上的节点不渲染），而 slot 分配只对**宿主的直接子节点**
      生效——项一旦被包进 wrapper，它们就成了默认 slot 分配节点的内部后代，不再是 slottable，
      隐藏会失效，menu item 会以明文形式漏在列表下面。挂到 wrapper 自己身上即可：wrapper 是直接
      子节点，关闭时被正确隐藏；打开时组件把整块搬进 portal panel，而 panel 是普通 div、没有
      shadow root，这个属性在那边是惰性的，项照常显示。
    -->
    <div class="contents" slot="context-menu-hidden">
      <web-ui-dropdown-item v-if="contextResource" @click="handleDetail(contextResource)">
        <web-ui-icon slot="prefix" :icon="lucideInfo" :size="14" />
        详情
      </web-ui-dropdown-item>
      <web-ui-dropdown-item v-if="contextResource?.available" submenu>
        <web-ui-icon slot="prefix" :icon="arrowUpRight" :size="14" />
        打开方式
        <web-ui-dropdown-item @click="handleOpenDefault(contextResource)">
          <web-ui-icon slot="prefix" :icon="lucideExternalLink" :size="14" />
          {{ defaultOpenWithName || '系统默认应用' }}
        </web-ui-dropdown-item>
      </web-ui-dropdown-item>
      <web-ui-dropdown-divider />
      <web-ui-dropdown-item v-if="contextResource" @click="handleStartRename(contextResource)">
        <web-ui-icon slot="prefix" :icon="lucidePenLine" :size="14" />
        重命名
      </web-ui-dropdown-item>
      <web-ui-dropdown-item
        v-if="contextResource && !contextResource.available && contextUnavailableSource(contextResource)"
        @click="handleRecover(contextUnavailableSource(contextResource))"
      >
        <web-ui-icon slot="prefix" :icon="lucideRefreshCw" :size="14" />
        找回资源
      </web-ui-dropdown-item>
      <web-ui-dropdown-item v-if="contextResource?.available" @click="handleTags(contextResource)">
        <web-ui-icon slot="prefix" :icon="lucideTags" :size="14" />
        标签
      </web-ui-dropdown-item>
      <web-ui-dropdown-divider />
      <web-ui-dropdown-item style="color: var(--wui-color-danger, #ef4444)" @click="handleDelete(contextResource)">
        <web-ui-icon slot="prefix" :icon="lucideTrash2" :size="14" class="text-(--wui-color-danger,#ef4444)" />
        删除
      </web-ui-dropdown-item>
    </div>
  </web-ui-context-menu>
</template>
