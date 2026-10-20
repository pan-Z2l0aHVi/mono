<script setup lang="ts">
import type { WebUiContextMenu, WebUiEditableText, WebUiEvent } from '@greypan/web-ui'
import {
  lucideClapperboard,
  lucideCode,
  lucideEye,
  lucideExternalLink,
  lucideFile,
  lucideFileText,
  lucideFilm,
  lucideGlobe,
  lucideHeadphones,
  lucideImage,
  lucideInfo,
  lucideMusic,
  lucidePenLine,
  lucidePlay,
  lucideRefreshCw,
  lucideTags,
  lucideTrash2
} from '@greypan/web-ui/icons'
import { WindowVirtualizer } from 'virtua/vue'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import type { ResourceKind, ResourceSourceView, ResourceView } from '@/stores/library'

import type { NameEditorRef } from './rename'
import ResourceRow from './ResourceRow.vue'

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
  mediaUrlFor: (sourceId: string) => string | null
}>()

const emit = defineEmits<{
  select: [resource: ResourceView]
  preview: [resource: ResourceView]
  detail: [resource: ResourceView]
  startRename: [resource: ResourceView]
  editTags: [resource: ResourceView]
  delete: [resource: ResourceView]
  recover: [source: ResourceSourceView]
  toggle: [resourceId: string]
  setChecked: [resourceId: string, checked: boolean]
  renameChange: [resource: ResourceView, event: WebUiEvent<WebUiEditableText, 'change'>]
  cancelRename: []
  /** 键盘导航/context menu 请求激活某一行：由父级把 activeResourceId 置为该行资源的 id。 */
  activate: [resource: ResourceView]
}>()

const contextMenuRef = ref<WebUiContextMenu>()
const contextResource = ref<ResourceView | null>(null)
const rowsRef = ref<HTMLElement | null>(null)
const emptyTitle = computed(() => (props.runtimeAvailable ? '资源库为空' : '桌面服务未连接'))
const checkedSet = computed(() => new Set(props.checkedIds))

/*
 * 行高没有写死。ResourceRow 的标题会 line-clamp-2 换行、tag 区会 flex-wrap 换行、进入改名
 * 编辑态还会从文字换成表单控件，三种情况高度都不同。这个 item-size 只是「还没量到之前先用
 * 多少」的一阶猜测，真正的值由 virtua 挂在每个条目上的 ResizeObserver 量出来覆盖回去。
 */
const ROW_ESTIMATE = 64

/*
 * 渲染窗在视口前后各留的像素。与旧实现的 overscan 4 等价（4 × 64px 估值）：留够滚动时
 * 下一个条目已经量好，又能让窗口外的行尽快卸载。
 */
const VIRTUAL_BUFFER = 256

/*
 * activeIndex 是 roving tabindex 与方向键导航的派生下标：由 activeResourceId 在 props.resources
 * 里查出。若 activeResourceId 为 null 或不在列表中，回退到下标 0——这与 enterList 的
 *「没有活动行则给首行」分支一致，也让 fixture（activeResourceId: null）的 tabindex 期望
 *['0','-1','-1'] 成立。不再维护独立 ref，也就不需要那条夹范围的 watch(length) 了。
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
 * 行高不固定（标题换行、tag 换行、改名编辑态），由 virtua 挂在每个条目上的 ResizeObserver
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
 *   - 键盘导航原来用 TanStack 的 align:'auto'（滚到能看见为止）。virtua 的等价物是
 *     align:'nearest'，但它的可见性判定拿「列表内偏移」去比「原始滚动偏移」，不含 baseOffset；
 *     本列表上方有 sticky header（baseOffset > 0），那套判定会把「其实已经可见、只是靠近顶部」
 *     的行误判成「在上方」，转成 align:'start' 把页面从当前位置拽到行首。所以自己算。
 *   - 编辑行夹取原本就自己算（避免 scrollToIndex 把位置重置到行首），同一份逻辑两处共用。
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
 * 的 rect 摆 panel；而 menu item 全部 gate 在 contextResource 上，它原本只有行上的 contextmenu
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
 * 同一时刻要记住「这一手是触屏」。长按抬手后浏览器补发的 click 会照常落到 onRowSelect，
 * 于是 menu 和预览 drawer 同时弹出来——组件侧那个 _isLongPressFollowUp() 只吸收它自己
 * menu 上的补发事件，管不到宿主的行激活，所以这个抑制必须在宿主这边做。
 */

/*
 * 这一手长按**确实开出了 menu**。
 *
 * 由组件的 open-change 置位：组件的长按计时器到期后自己调 _openAt，成功才派发这个事件
 * （context-menu/index.ts 的 _userOpenChange.mark()），所以触屏轻点不会误置它；命令式
 * openAt 按组件的约定**不**派发这件事，宿主自己的右键路径因此也不会误置。
 *
 * 它只活到抬手或下一次按下，是个手势内作用域的中间量，不是判据本身。
 */
let longPressOpened = false

/*
 * 抬手后浏览器会为**同一次触摸**补发一个 click，它同样落到 onRowSelect。不吃掉它，
 * menu 和预览 drawer 就会一起弹出来——用户看到的正是这个。
 *
 * 置位时机是**抬手**，不是长按到期。这一点是踩过坑才定下来的：
 *
 * 长按本来就是「按住不放」的手势，menu 弹出之后用户继续按住任意久都完全自然。而补发的
 * click 是在抬手那一刻才到达的，它与「长按到期」的间隔等于「menu 弹出后继续按住的时长」，
 * 由用户决定、上界无限。曾经在这里挂过一个有限窗口（镜像组件的
 * LONG_PRESS_FOLLOW_UP_WINDOW_MS），看起来有组件侧依据，实际上组件那个窗口吸收的是
 * contextmenu——那个事件在长按到期时就派发了，到派发时距锚点已经是 0ms，所以 1000ms
 * 对它成立，对补发的 click 却是给用户可控的时长发通行证：按住超过窗口长度，drawer 照弹。
 *
 * 所以这里不用任何时间窗口。抬手置位、下一次 click 消费、下一次 pointerdown 作废，
 * 整条链上唯一的时钟是浏览器自己派发这两个事件的间隔，不需要我们猜一个值。
 *
 * 为什么不在 pointerdown 就置位：那一刻还分不出「这一手会长按」和「这一手是轻点」。每一种
 * 触屏按下都置位会把轻点一起吞掉——onRowSelect 见到标志就 return，而轻点的 click 正是靠
 * 到达那里才激活行。
 */
let followUpClickPending = false

/*
 * 这一手是不是触屏。
 *
 * 只在 open-change 那一刻用来把「触屏长按开 menu」与「鼠标右键开 menu」分开：两者派发的
 * 事件序列几乎一样，但只有触屏那条的补发 click 需要被吞。它由 handleSweepStart 在**每一次**
 * pointerdown 上重新判定，不粘滞——若只由 touch 置位，触屏轻点没走到 onRowSelect 时（例如
 * 点在行外）它会一直是 true，之后一次鼠标右键开 menu 就被误认成长按，右键之后点行会点不动。
 */
let lastPointerWasTouch = false

/**
 * 抬手：把「长按开出了 menu」翻译成「马上会来一个补发的 click」。
 *
 * 真实触控管线的顺序是 touchend → pointerup → 浏览器补发 click，所以补发的 click 到达时
 * pointerup 已经过去，标志来得及立住；反过来，下一次 pointerdown 一定晚于这个补发 click
 * （任何点击都要先有 pointerdown），所以 pointerdown 上的作废闸不会把它提前清掉。
 */
function handleRowsPointerUp(event: PointerEvent) {
  // 这道 pointerType 门是冗余的：longPressOpened 只可能由触屏 open-change 置起，而那条路
  // 已经要求 lastPointerWasTouch（同样是触屏 pointerdown 才为真），所以鼠标抬手本来也进不来。
  // 保留它是**局部可读性**：不读上面两个变量的人，靠这一行就能判断这里只管触屏。
  //
  // 相应地，变异验证里「去掉 pointerType 门」不会有任何用例转红——那是冗余，不是覆盖缺口，
  // 两者不要混为一谈。这行不是承重墙，但它也不该被顺手删掉。
  if (event.pointerType !== 'touch') return
  if (longPressOpened) followUpClickPending = true
  longPressOpened = false
}

/** 手势被系统接管（滚动等）时收尾：补发的 click 不会来，标志不必留。 */
function handleRowsPointerCancel() {
  longPressOpened = false
}

function handleContextMenuOpenChange(event: WebUiEvent<WebUiContextMenu, 'open-change'>) {
  if (!event.detail.open) return
  // menu 关闭不消费标志：补发的 click 恰恰常发生在 menu 已关之后，提前作废它就退回老缺陷。
  // 鼠标右键开 menu 时同样派发 open-change，但鼠标点行是合法的，不能吞。
  if (!lastPointerWasTouch) return
  longPressOpened = true
}

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
 * 无关的 menu——和这次要修的键盘缺陷是同一个毛病，只是从「行」换成了「列表」。所以这里
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
 * drawer 打开后 row.focus() 无响应）。把 drawer 改成非模态要动 web-ui 组件，不在本 task 范围内。
 * 所以焦点在这里的作用是「界定按键的作用域」：空格只作用于焦点所在的那一行，不再需要
 * 「鼠标恰好悬在某一行」这个隐藏判据——#187 的 hover 触发判据就此下线，预览能力留着。
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
  void focusIndex(active >= 0 ? active : 0)
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
    if (index >= 0) void navigateToIndex(index)
    emit('select', resource)
    return
  }
  if (!ROW_NAVIGATION_KEYS.has(event.key)) return
  moveRowFocus(event, row)
}

/*
 * 方向键在行间移动焦点，Home / End 到首尾。
 *
 * 全程按数据下标算，边界是 resources 的长度而不是「已渲染了几行」——虚拟化之后这两者
 * 差着一整屏，End 停在最后一个已渲染行正是旧实现按 DOM 数组取末位造成的。
 * 到达首尾时 return 且不 preventDefault，列表不是环，按键交回浏览器。
 */
function moveRowFocus(event: KeyboardEvent, row: HTMLElement) {
  const index = indexOfRow(row)
  if (index < 0) return
  const last = props.resources.length - 1
  const next =
    event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? last
        : event.key === 'ArrowDown'
          ? Math.min(index + 1, last)
          : Math.max(index - 1, 0)
  if (next === index) return
  event.preventDefault()
  void navigateToIndex(next)
}

/*
 * 键盘导航到某一行：发出 activate 事件请求父级更新 activeResourceId，再滚动并落焦。
 *
 * 与旧 focusIndex 的区别：不直接写 activeIndex（现为派生值），改为 emit activate 让父级把
 * activeResourceId 置为目标资源 id。派生后的 activeIndex 会自动变为目标下标，roving tabindex
 * 与 data-active-index 随之更新。随后 scrollIndexIntoView 滚动到位、focusRowWhenMounted 等行挂载后落焦。
 *
 * 右键改名那条路上焦点在名字编辑器里，不走这里——父级已把 activeResourceId 置好，不再二次 emit。
 */
const FOCUS_WAIT_TIMEOUT_MS = 1000
const FOCUS_POLL_INTERVAL_MS = 16

async function navigateToIndex(index: number) {
  const resource = props.resources[index]
  if (!resource) return
  emit('activate', resource)
  await nextTick() // 等待 roving tabindex 更新（activeResourceId -> activeIndex -> 模板 tabindex）
  scrollIndexIntoView(index)
  await focusRowWhenMounted(index)
}

/*
 * 仅落焦不 emit activate：用于 enterList 等「已有 activeResourceId、只需把焦点交给对应行」的场景。
 * 此时 activeIndex 已由派生得到正确值，只需滚动并落焦。
 */
async function focusIndex(index: number) {
  scrollIndexIntoView(index)
  await focusRowWhenMounted(index)
}

/*
 * 每一轮 focusIndex/navigateToIndex 领一个递增的号，轮询每醒来一次先核对号是不是自己的。不是自己的就
 * 直接收工——方向键连按时，先发的那一轮可能在后一轮落焦之后才等到目标行，不作废就会把
 * 焦点从用户已经移开的那行拽回去，表现为焦点闪回上一目标行。
 *
 * navigateToIndex 在 emit activate 后已 await nextTick() 等待 roving tabindex 更新，
 * 所以此处只需等行挂载即可；jsdom 与真实浏览器均适用。
 */
let focusRequestId = 0

async function focusRowWhenMounted(index: number) {
  const requestId = ++focusRequestId
  for (let waited = 0; waited <= FOCUS_WAIT_TIMEOUT_MS; waited += FOCUS_POLL_INTERVAL_MS) {
    if (requestId !== focusRequestId) return
    const row = rowElementAt(index)
    if (row) {
      row.focus()
      return
    }
    await new Promise(resolve => setTimeout(resolve, FOCUS_POLL_INTERVAL_MS))
  }
  // 组件可能已经卸载：rowsRef 是 null，rowElementAt 恒为 null，这个循环会空转到上限。
  // 拿到新请求或卸载都作废它，别让定时器在没人等的行上继续转。
  if (requestId !== focusRequestId) return
}

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
 * 按住拖动批量勾选。
 *
 * 方向由按下那一行的当前状态定死，整个手势不再变：首个是勾选的，划过的全部取消；首个
 * 是未勾选的，划过的全部勾上。这里改状态而不是翻状态——翻的话同一行被划过两次就会自己
 * 弹回去。落点用 elementFromPoint 现查，指针跨过行与行的间隙也不打断手势。
 *
 * 首个行在 pointerdown 就落定，所以「点一下」和「按住划过一串」走的是同一条路径，
 * 没有只在拖动时才生效的分支。
 */
const SWEEP_TOUCH_HOLD_MS = 320
const SWEEP_TOUCH_SLOP = 10

let sweepAnchor: string | null = null
let sweepActive = false
let sweepChecked = false
let sweepLastId: string | null = null
let holdTimer: ReturnType<typeof setTimeout> | undefined
let touchOrigin: { x: number; y: number } | null = null
// 手势收尾时浏览器还会补一个 click。扫选已经改过状态，那个 click 必须吃掉，否则会在
// 落点那一行上再翻一次。下一个 pointerdown 清掉它——新手势不该继承上一手的抑制。
let suppressRowClick = false
// 长按在移动之前就武装，此刻浏览器还没开始滚动，preventDefault 拦得住；武装之后靠
// touchmove 阻止滚动（pointermove 的 preventDefault 管不了这件事），但边缘带内放行，
// 详见 blockSweepScroll。
let suppressContextMenu = false

function rowIdAt(clientX: number, clientY: number) {
  const element = document.elementFromPoint(clientX, clientY)
  if (!(element instanceof Element)) return null
  // 整页滚动之后「命中列表之外」不能再靠 container.contains 判断：容器此刻不是滚动容器，
  // 命中行元素本身就说明它属于这个列表——行只由本组件渲染，页面上别处不会有同标记的元素。
  const row = element.closest<HTMLElement>('[data-resource-row]')
  return row?.dataset.resourceId ?? null
}

/*
 * 指针停在列表上下边缘时把容器滚一点，让窗口外的行进窗口、elementFromPoint 才够得着。
 *
 * 虚拟化之前整个列表都是 DOM，按住拖到底能一路勾到最后一条；虚拟化之后 elementFromPoint
 * 只认窗口内那十几行，不主动滚就永远勾不过窗口边界——这不是手感问题，是能力被拿掉了。
 * 滚到位之后新行进入窗口，下一次 pointermove 的现查自然就命中了。
 *
 * 速度按指针离边缘的距离给：贴着边缘慢、越往里越快，滚到窗口跟着跑，手感接近原生拖拽。
 * 用 rAF 而不是 setInterval：滚完一帧就该停，pointerup 之后不留下还在跑的滚动。
 */
const SWEEP_EDGE_ZONE = 32
const SWEEP_MAX_SPEED = 24

let sweepScrollFrame: number | null = null
let sweepScrollSpeed = 0
let sweepPointerX = 0
let sweepPointerY = 0

function sweepEdgeSpeed(clientY: number) {
  // window 模式：边缘带按视口顶底算，不再按列表容器的 rect——容器此刻不是滚动容器，
  // 它在视口里的位置只反映当前滚动位置，拿它当边界会让手势提前或延后触发。
  //
  // 边缘带取「视口内靠边 N px」而不是「视口外 N px」。触摸的 clientY 按 Pointer Events
  // 恒落在 [0, innerHeight]——手指的接触点不可能在视口之外，所以按「越界」判定的两个分支
  // 在触摸端是死代码，speed 恒 0，扫选到窗口边缘就停住。带子必须落在手指够得着的范围里。
  //
  // 两支都要把 distance 钳在 ZONE 内再算系数。鼠标可以把 clientY 拖到任意负数或远超视口
  // 底的值，(1 - d/ZONE) 会随之线性无界增长：不钳的话 clientY=-1000 得到 774px/帧、
  // 是 SWEEP_MAX_SPEED 的 32 倍，列表直接「飞」过去、大量行被跳过，用户想停在某行上勾它
  // 根本停不住——那正好破坏扫选的核心价值。stepSweepScroll 只钳了滚动上限、没钳速度。
  // 顶部那支的 distance 是「离顶边多远」= clientY 本身，不是 ZONE - clientY。写成后者会
  // 把梯度反过来：贴着屏幕顶（clientY=0）速度 0、离顶边 32px 处反而满速，触摸在列表顶部
  // 会「越靠边越慢」。上轮改判据时把这个方向写反了，本轮一并纠正。
  const bottom = window.innerHeight
  if (clientY <= SWEEP_EDGE_ZONE) {
    return -edgeRatio(clientY) * SWEEP_MAX_SPEED
  }
  if (clientY >= bottom - SWEEP_EDGE_ZONE) {
    return edgeRatio(bottom - clientY) * SWEEP_MAX_SPEED
  }
  return 0
}

// 离边缘越近速度越快，贴到边上正好是 SWEEP_MAX_SPEED，越过边缘不再增长。
function edgeRatio(distance: number) {
  return 1 - Math.min(Math.max(distance, 0), SWEEP_EDGE_ZONE) / SWEEP_EDGE_ZONE
}

function stepSweepScroll() {
  sweepScrollFrame = null
  if (!sweepActive) return
  // 可滚上限取文档高度减视口，与库自己的 getMaxScrollOffset 同一套算法
  const maxScrollY = Math.max(document.documentElement.scrollHeight - window.innerHeight, 0)
  const next = Math.min(Math.max(window.scrollY + sweepScrollSpeed, 0), maxScrollY)
  if (next === window.scrollY) return
  window.scrollTo({ top: next })
  // 滚完之后指针没动也要继续勾：现查命中的是指针下方那一行，不是新滚进来的行。
  applySweepAtPointer()
  scheduleSweepScroll()
}

function scheduleSweepScroll() {
  if (sweepScrollFrame !== null || !sweepActive) return
  if (!sweepScrollSpeed) return
  sweepScrollFrame = requestAnimationFrame(stepSweepScroll)
}

function applySweepAtPointer() {
  const id = rowIdAt(sweepPointerX, sweepPointerY)
  if (!id || id === sweepLastId) return
  applySweep(id)
}

function updateSweepScroll(clientX: number, clientY: number) {
  sweepPointerX = clientX
  sweepPointerY = clientY
  sweepScrollSpeed = sweepEdgeSpeed(clientY)
  if (sweepScrollSpeed) scheduleSweepScroll()
  else if (sweepScrollFrame !== null) {
    cancelAnimationFrame(sweepScrollFrame)
    sweepScrollFrame = null
  }
}

function applySweep(resourceId: string) {
  sweepLastId = resourceId
  emit('setChecked', resourceId, sweepChecked)
}

/*
 * 扫选期间要不要拦下浏览器的触摸滚动。
 *
 * 拦的理由是扫选手势靠「按住不动」确认，一旦浏览器开始滚动，这个手势就散了：列表在动、
 * pointermove 命中的行不断变化，用户想勾的那一串就断了。所以扫选激活后要 preventDefault。
 *
 * 但不能一律拦。手指在视口边缘带内时，用户要的正是「滑到这里继续勾下面那些」——那就是
 * 滚动本身。此处再拦住，等于既不给自动滚、也不给手指滚，扫选在触摸端彻底卡在窗口边界
 * （虚拟化之前列表是全量 DOM，不需要滚就能勾到最后一条，这正是本该消除的退化）。
 *
 * 两条共存靠边缘带划界：
 *   - 带内（离视口上下沿 SWEEP_EDGE_ZONE 以内）：放行。手指驱动原生滚动，
 *     sweepEdgeSpeed 同时按指针位置给边缘自动滚，两者同向，不会互相拉扯。
 *   - 带外：拦住。长按确认与「手指滑动 = 放弃扫选」的判定都依赖这一条——带外放行的话，
 *     用户在列表中段随手一滑就会滚动页面，而此时扫选还开着，勾选会随页面漂移。
 *
 * 判据取 touch 的 clientY（与 sweepEdgeSpeed 同一套几何），所以「带内带外」在自动滚与
 * 手指滚之间是同一条线，不会出现「自动滚已启动但滚动仍被拦」这种自相矛盾的状态。
 */
function blockSweepScroll(event: TouchEvent) {
  if (!sweepActive) return
  const touch = event.touches[0]
  // 没有触点信息（罕见的合成事件）时按旧语义拦住，保守优先。
  if (!touch) {
    event.preventDefault()
    return
  }
  if (sweepEdgeSpeed(touch.clientY) !== 0) return
  event.preventDefault()
}

function armTouchSweep() {
  holdTimer = undefined
  const anchor = sweepAnchor
  if (anchor === null) return
  sweepActive = true
  document.addEventListener('touchmove', blockSweepScroll, { passive: false })
  suppressContextMenu = true
  applySweep(anchor)
}

function handleSweepStart(event: PointerEvent) {
  // 每一手都重新判定触屏/鼠标，并作废上一次手势留下的待消费标志。
  //
  // 三件事都必须排在下面那些 early return 之前：非选择模式下这里会立刻返回，而长按 menu
  // 恰恰只在非选择模式下可用。
  //
  // 作废的理由：抬手时若没等到补发的 click（被系统吃掉、落点不可点等），标志会悬着，
  // 而它一旦悬着，用户之后点任何一行都会「点不动」。任何新的按下都清掉它；而补发的 click
  // 一定早于下一次 pointerdown（任何点击都先有 pointerdown），所以这道闸收拾得了残留，
  // 又不会把该拦的那个提前放跑。
  lastPointerWasTouch = event.pointerType === 'touch'
  followUpClickPending = false
  longPressOpened = false
  // 长按 menu 要用的 contextResource 在这里落定：这是 pointerdown 冒泡到容器上的第一个监听器，
  // 早于 web-ui-context-menu 自己那个（它在宿主上，我们在容器的后代里）。放在早的那一侧，
  // 长按计时器到期时 contextResource 已经是对的，menu 开出来就有完整项。
  syncTouchContext(event)
  // 右键（button 2）也走 pointerdown，让给 context menu；只认主键
  if (!props.selectionMode || event.button !== 0 || !event.isPrimary) return
  const target = event.target
  if (!(target instanceof Element)) return
  // 勾选框和行内改名各自有交互，不参与扫选
  if (target.closest('web-ui-checkbox, web-ui-editable-text')) return
  const id = target.closest<HTMLElement>('[data-resource-row]')?.dataset.resourceId
  if (!id) return

  suppressRowClick = false
  suppressContextMenu = false
  sweepAnchor = id
  sweepChecked = !props.checkedIds.includes(id)
  sweepLastId = null
  sweepActive = false
  if (event.pointerType === 'touch') {
    // 触摸没有 hover，落指就武装会把「本来想滚动」误判成扫选。先按住不动等长按确认。
    touchOrigin = { x: event.clientX, y: event.clientY }
    holdTimer = setTimeout(armTouchSweep, SWEEP_TOUCH_HOLD_MS)
  } else {
    sweepActive = true
    applySweep(id)
  }
  window.addEventListener('pointermove', handleSweepMove)
  window.addEventListener('pointerup', endSweep)
  window.addEventListener('pointercancel', endSweep)
}

function handleSweepMove(event: PointerEvent) {
  if (event.pointerType === 'touch' && !sweepActive) {
    // 长按还没确认就先移动 → 这是一次滚动，放弃扫选
    const origin = touchOrigin
    if (origin && Math.hypot(event.clientX - origin.x, event.clientY - origin.y) > SWEEP_TOUCH_SLOP) {
      endSweep()
    }
    return
  }
  if (!sweepActive) return
  updateSweepScroll(event.clientX, event.clientY)
  const id = rowIdAt(event.clientX, event.clientY)
  if (!id || id === sweepLastId) return
  applySweep(id)
}

function endSweep() {
  if (holdTimer !== undefined) {
    clearTimeout(holdTimer)
    holdTimer = undefined
  }
  sweepScrollSpeed = 0
  if (sweepScrollFrame !== null) {
    cancelAnimationFrame(sweepScrollFrame)
    sweepScrollFrame = null
  }
  document.removeEventListener('touchmove', blockSweepScroll)
  if (sweepActive) suppressRowClick = true
  // suppressContextMenu 必须在这里清，不能只等下一次 pointerdown 的 handleSweepStart。
  //
  // 它由 armTouchSweep 置位，而 armTouchSweep 只在选择模式下发生——非选择模式根本不注册
  // endSweep。于是「进过一次选择模式并长按扫选」之后，这个标志会一直留着，把之后每一次
  // 右键都吞掉（openContextMenu 见到它就 preventDefault 直接 return），直到用户碰巧再按
  // 一次左键进选择模式才恢复。表现为：扫选过一次之后，context menu 整个失灵。
  //
  // 时序上是安全的：同一次手势的 pointerup 一定早于后续右键的 pointerdown，而右键的
  // contextmenu 又在 pointerdown 之后，所以这里清完标志，右键那一次读到的已经是 false。
  suppressContextMenu = false
  sweepAnchor = null
  sweepActive = false
  sweepLastId = null
  touchOrigin = null
  window.removeEventListener('pointermove', handleSweepMove)
  window.removeEventListener('pointerup', endSweep)
  window.removeEventListener('pointercancel', endSweep)
}

function onRowSelect(resource: ResourceView) {
  if (suppressRowClick) {
    suppressRowClick = false
    return
  }
  /*
   * 长按抬手后浏览器补发的 click 会走到这里。若刚才那手确实开出了 menu，这次 click 就是
   * 长按的回声而不是一次有意的选择——吃掉，否则 menu 与预览 drawer 会同时弹出来。
   *
   * 判据是 followUpClickPending：抬手时置位（前提是那手确实开出了 menu），补发的 click
   * 消费掉即清。触屏与鼠标的区分在 handleContextMenuOpenChange 记标志时就做完了。
   *
   * 这里刻意不去读「menu 此刻开着没有」：补发的 click 到达之前 menu 往往已经因 blur /
   * 外点关掉，此刻去读到 false，这条抑制就失效了，drawer 照弹——那正是本判据要修的缺陷。
   */
  if (followUpClickPending) {
    followUpClickPending = false
    return
  }
  lastPointerWasTouch = false
  emit('select', resource)
}

function onBeforeUnmountHooks() {
  endSweep()
  // 作废还没跑完的落焦轮询，否则它会在 rowsRef 变 null 之后一路空转到超时上限。
  focusRequestId++
}

onBeforeUnmount(onBeforeUnmountHooks)

const openWithApps: Partial<Record<ResourceKind, Array<{ label: string; icon: typeof lucideEye }>>> = {
  image: [
    { label: '预览', icon: lucideEye },
    { label: '看图', icon: lucideImage }
  ],
  video: [
    { label: '视频播放器', icon: lucidePlay },
    { label: 'iMovie', icon: lucideClapperboard }
  ],
  audio: [
    { label: '音乐播放器', icon: lucideMusic },
    { label: 'GarageBand', icon: lucideHeadphones }
  ],
  document: [
    { label: '文本编辑', icon: lucideFileText },
    { label: 'Notion', icon: lucidePenLine }
  ],
  json: [{ label: 'VS Code', icon: lucideCode }],
  web: [
    { label: 'Safari', icon: lucideGlobe },
    { label: 'Chrome', icon: lucideGlobe }
  ],
  file: [{ label: '系统文件', icon: lucideFile }]
}

async function openContextMenu(resource: ResourceView, event: MouseEvent) {
  // 长按扫选手势会顺带触发系统级 contextmenu，那不是「用户想看 menu」，挡掉
  if (suppressContextMenu) {
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
  contextResource.value = resource
  await nextTick()
  contextMenuRef.value?.openAt(clientX, clientY)
}

function closeContextMenu() {
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

function handlePreview(resource: ResourceView | null) {
  if (resource) emit('preview', resource)
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

function handleRenameChange(resource: ResourceView, event: WebUiEvent<WebUiEditableText, 'change'>) {
  emit('renameChange', resource, event)
}
</script>

<template>
  <!--
    disabled 绑在「没有条目」上，而不是绑在右键来源上：context-menu 自己监听宿主的
    contextmenu，列表为空时那块空态区域仍在这个宿主里，右键照样命中。不禁用的话会弹出
    一张 contextResource 为 null 的 menu——只剩一条 divider 加一个空「删除」项。禁用后
    事件在组件内被 return 掉，浏览器原生 menu 正常出现。
  -->
  <!--
    long-press 让触屏能长按出行 menu（web-ui-context-menu 的 opt-in 属性，只对 pointerType
    为 touch 的指针生效，鼠标仍走原生 contextmenu）。

    选择模式里同一个「按住不动」已经被扫选占了
    （armTouchSweep，320ms），而组件的长按阈值是 500ms——两个计时器都会跑，menu 会在扫选
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
    @open-change="handleContextMenuOpenChange"
    class="block w-full h-full min-h-0"
  >
    <!--
      容器不参与 v-if，始终挂载，状态只在它内部切换。这是虚拟化的硬前提：载入态与空态若
      各占一个 v-if 分支、与列表互斥，切换到列表时虚拟器组件是新建的，它要等挂载与首帧
      布局之后才量得出视口与条目尺寸，那一帧会先渲染成空的（或按估值错位的）窗口再自愈。
      固定在容器内切状态，虚拟器实例始终在场，尺寸表也就连续。空态与载入态切到同一容器内
      即可绕开。

      这里**不再**是滚动容器：滚动元素是 window，整页滚动（用户裁决）。所以去掉
      overflow-y-auto / h-full / min-h-0 / overscroll-contain，保留 tabindex、role 与
      事件绑定。overscroll-contain 尤其要去掉——它原本用于阻断嵌套滚动的链式传递，
      window 模式下没有嵌套滚动，留着只会影响移动端的原生回弹手感。
    -->
    <div
      ref="rowsRef"
      class="w-full select-none [-webkit-touch-callout:none]"
      tabindex="0"
      role="list"
      :aria-busy="loading"
      :data-active-index="activeIndex"
      @keydown="handleRowsKeydown"
      @focusin="handleRowsFocusin"
      @pointerdown="handleSweepStart"
      @pointerup="handleRowsPointerUp"
      @pointercancel="handleRowsPointerCancel"
    >
      <div v-if="loading" class="grid min-h-64 place-items-center" aria-live="polite">
        <div class="grid justify-items-center gap-3 text-sm text-(--wui-color-text-secondary)">
          <web-ui-spinner :size="28" />
          <span>正在载入资源库</span>
        </div>
      </div>

      <div v-else-if="resources.length === 0" class="flex flex-col items-center justify-center py-24">
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
                :media-url="resource.preferred ? mediaUrlFor(resource.preferred.id) : null"
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
      <web-ui-dropdown-item v-if="contextResource?.available" @click="handlePreview(contextResource)">
        <web-ui-icon slot="prefix" :icon="lucideEye" :size="14" />
        预览
      </web-ui-dropdown-item>
      <web-ui-dropdown-item v-if="contextResource?.available" submenu>
        <web-ui-icon slot="prefix" :icon="lucideExternalLink" :size="14" />
        打开方式
        <web-ui-dropdown-item>
          <web-ui-icon slot="prefix" :icon="lucideExternalLink" :size="14" />
          系统默认应用
        </web-ui-dropdown-item>
        <web-ui-dropdown-item
          v-for="app in contextResource ? (openWithApps[contextResource.kind] ?? []) : []"
          :key="app.label"
        >
          <web-ui-icon slot="prefix" :icon="app.icon" :size="14" />
          {{ app.label }}
        </web-ui-dropdown-item>
      </web-ui-dropdown-item>
      <!--
        详情不跟预览一起 gate 在「资源可用」上。打开详情会对失效的网页入口发一次探测
        （见 probeURLSourceOnOpen），那条路只对不可用的资源有意义；跟着 gate 住会让探测
        无入口可达，也会让不可用资源彻底失去详情 drawer（备注、元数据、来源都在里面）。
        资源可用时它排在预览与打开方式之后。
      -->
      <web-ui-dropdown-item v-if="contextResource" @click="handleDetail(contextResource)">
        <web-ui-icon slot="prefix" :icon="lucideInfo" :size="14" />
        详情
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
        tag
      </web-ui-dropdown-item>
      <web-ui-dropdown-divider />
      <web-ui-dropdown-item style="color: var(--wui-color-danger, #ef4444)" @click="handleDelete(contextResource)">
        <web-ui-icon slot="prefix" :icon="lucideTrash2" :size="14" class="text-(--wui-color-danger,#ef4444)" />
        删除
      </web-ui-dropdown-item>
    </div>
  </web-ui-context-menu>
</template>
