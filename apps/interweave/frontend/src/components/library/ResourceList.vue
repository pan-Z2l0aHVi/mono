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
import { useWindowVirtualizer } from '@tanstack/vue-virtual'
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
}>()

const contextMenuRef = ref<WebUiContextMenu>()
const contextResource = ref<ResourceView | null>(null)
const rowsRef = ref<HTMLElement | null>(null)
const emptyTitle = computed(() => (props.runtimeAvailable ? '资源库为空' : '桌面服务未连接'))
const checkedSet = computed(() => new Set(props.checkedIds))

/*
 * 行高没有写死。ResourceRow 的标题会 line-clamp-2 换行、标签区会 flex-wrap 换行、进入改名
 * 编辑态还会从文字换成表单控件，三种情况高度都不同。estimateSize 只是「还没量到之前先用
 * 多少」的一阶猜测，真正的值由挂在行上的 measureElement 经 ResizeObserver 覆盖回去。
 */
const ROW_ESTIMATE = 64

/*
 * activeIndex 是 roving tabindex 与方向键导航的唯一真相，它记的是**数据下标**而不是某个
 * DOM 元素。虚拟化之前键盘导航可以直接 querySelectorAll 拿已渲染行、在其上 indexOf；
 * 虚拟化之后那个 DOM 数组只有窗口内的十几行，ArrowDown 走到窗口底就撞墙、End 只会跳到
 * 最后一个已渲染行而不是最后一条资源。按下标算则与渲染窗口无关。
 */
const activeIndex = ref(0)

/*
 * 列表包裹层距文档顶部的距离，作为 scrollMargin 交给 virtualizer。
 *
 * 量的是 getBoundingClientRect().top 加当前 window.scrollY——rect.top 是视口坐标，
 * 文档坐标要加上已经滚过的那一段。这个值随上方 sticky header 高度变化（工具条展开/收起、
 * 筛选面板开合），所以用 ResizeObserver 订阅包裹层本身：包裹层位置一变就重算。
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
 * 容器与撑总高的内层 div 不参与 v-if，始终挂载。虚拟化之后行若落进 v-if 分支，Vue 会先
 * unmount 整棵子树再重建，重建出的新节点在函数式 ref 收到它时尚未 attach，detached 节点
 * 的 offsetHeight 是 0，这个 0 会被当成真实尺寸写进 itemSizeCache。危害有限：pendingMin
 * 把重排限制在该行及其之后，实测总高只短暂少一行（40000→39960）、下一帧由 ResizeObserver
 * 自愈，不是整表崩坏。规避本身仍然必要——固定挂载容器、只切内部内容就不必依赖这个自愈
 * （TanStack/virtual#1292）。
 *
 * 首次挂载本身不受这条影响：Vue 3.5.42 的 patch 在 mountElement 走完 hostInsert 之后才
 * 调 setRef，节点那时已经 attach。真正要避开的是 v-if 切换时的 unmount 路径。
 *
 * 这里刻意**不开** useCachedMeasurements。它看起来正好治「列表被抽屉开合隐藏时
 * ResizeObserver 把所有项报 0」，但 virtual-core@3.17.11 的默认 measureElement 在这个
 * 选项下第一分支就返回 `itemSizeCache.get(key) ?? estimateSize(index)`，永远读不到真实
 * DOM 高度：首次测量返回估值、与估值相同就没有 delta、itemSizeCache 永远为空，于是每次
 * 都回落到估值，真实行高一次也进不去。
 * 实测（20 行、真实高 40、估值 64）：开着时 itemSizeCache 恒为 0、getTotalSize() 恒为
 * 1280；关掉后 19 个可见行全部入缓存、总高收敛到 824。行高不固定正是本列表的既有事实，
 * 让它可测比防一次隐藏期的抖动重要得多。这条推理只取决于该选项自身的实现，与用 window
 * 还是 element 滚动无关，window 模式走的是同一份 measureElement。
 * 版本升级后要重新核这条结论，判据是 measureElement 的首分支与 resizeItem 写入
 * itemSizeCache 的那道 delta 判断，不是这里的行号。
 */
/*
 * 滚动元素是 window 本身，整页滚动（#188 用户裁决：body 滚动，不做内部滚动容器）。
 * 所以下面 6 处都不能再读列表容器的 scrollTop / clientHeight——那些在 window 模式下要么
 * 恒为 0、要么量到整页高度，读出来的数全是错的。
 */
const virtualizer = useWindowVirtualizer<HTMLElement>({
  /*
   * scrollMargin 是「列表包裹层距文档顶部的距离」。它必须存在，缺了键盘导航就会把行滚到
   * 视口外：window 模式下 scrollOffset 从文档顶算，而 item.start 是从包裹层顶算
   * （virtual-core 的 runningStart = paddingStart + scrollMargin），两者差的就是这个值。
   * getOffsetForIndex 的 align:'auto' 判定拿 scrollOffset + size 与 item.end 比，滚完的
   * 落点是文档坐标；行若还按 start 摆放，两者坐标系对不上。
   *
   * 配套改模板：translateY(row.start - scrollMargin)。两处缺一不可。
   * getTotalSize() 已经减掉 scrollMargin，撑高项不要再减一次。
   *
   * 它是运行时量：上方 sticky header 高度随工具条展开/收起而变，所以订阅而不是写死。
   * 用 getter 同理——options 只被 unref 顶层，传 Ref 进去不会被拆开。
   */
  get scrollMargin() {
    return listOffset.value
  } /*
   * key 跟着资源 id 走，行高才不会在排序或过滤后错位到别的行——同一条资源的行高由它自己的
   * 内容决定，跨顺序是不变量。
   *
   * 代价是 itemSizeCache 按 key 持久（virtual-core 的 resizeItem 直接
   * itemSizeCache.set(key, size)），而 setOptions 只在 anchorTo === 'end' 时做 key 变化
   * 检测，本组件用默认的 'start'。所以排序或过滤改变顺序后，缓存里每条资源的高度会跟着
   * id 走到新下标——这正是要的行为；真正会短暂不准的是**没量过**的那些行：它们按估值计入
   * 总高，等滚进窗口、被 ResizeObserver 量过之后总高才会收敛。表现为切排序时滚动条长度
   * 有一次跳变，不是错位。切回 'end' 也不解决问题：那条路径的 key 变化检测会把滚动锚到
   * 首行，反而把用户的位置拽走。
   */,
  getItemKey: index => props.resources[index]?.id ?? index,
  estimateSize: () => ROW_ESTIMATE,
  // 用 getter 而不是 computed：useVirtualizerBase 只 unref 顶层 options，传进去的 Ref 不会被
  // 拆开，count 会变成 Ref 对象，getMeasurements 里的 new Array(count) 拿到 undefined 直接
  // RangeError。getter 每次读取都拿到当时的 props，与库自己的 options 语义一致。
  get count() {
    return props.resources.length
  },
  overscan: 4
})

const virtualRows = computed(() => virtualizer.value.getVirtualItems())

/*
 * Chrome 把元素高度截在 33,554,428px（2^25），超出的部分静默丢失：CSS 声明值不变，
 * 但布局值已经是上限，documentElement.scrollHeight 跟着截断。virtualizer 不管这件事——
 * 它读到什么就算什么，于是 scrollToIndex(超大下标) 会被 getMaxScrollOffset 静默 clamp
 * 到浏览器能到的最大位置，跳到列表尾部会停在一个不是尾部的位置且不报错。
 *
 * 行高 64px 估值时这个上限约合 52 万条资源，远超 Interweave 的实际规模，所以这里只做
 * 夹取不做分段渲染：夹了至少不会错到不可恢复，命中上限时在控制台留一条可查的痕迹。
 *
 * 有意未覆盖单测：触发条件是 1000 行以上、总高超过 3355 万 px，在 jsdom 里造这个规模
 * 要么改 stub 的行高、要么让 count 变成 52 万条，都会把「虚拟窗口算得对不对」这条主线
 * 淹没。判据是常量本身与 clamp 的比较运算，夹取分支一旦被改坏（比如写成 <），
 * 现有的总高断言不会变红——这一条留给浏览器验证与 code review。
 */
const MAX_RENDERED_HEIGHT = 33_554_400

const totalSize = computed(() => {
  const size = virtualizer.value.getTotalSize()
  if (size <= MAX_RENDERED_HEIGHT) return size
  if (import.meta.env.DEV) {
    console.warn(
      `[ResourceList] 列表总高 ${size}px 超过浏览器元素高度上限 ${MAX_RENDERED_HEIGHT}px，已夹取。` +
        '滚动到底部的定位会不准确，需要分段渲染才能彻底解决。'
    )
  }
  return MAX_RENDERED_HEIGHT
})

/*
 * 编辑中的行 pin 在虚拟窗口里（见下方 clampEditingRowIntoView）。
 */
const editingIndex = computed(() =>
  props.editingNameKey ? props.resources.findIndex(resource => resource.id === props.editingNameKey) : -1
)

/*
 * 虚拟窗口里的行与它对应的资源配成对再进模板：行数据只带下标，模板里 resources[i]!
 * 要重复六次，虚拟化下标与资源数组短暂不同步时还会各自读到不同的一份。在这一层配对，
 * 模板里就只有 row 与 resource 两个名字，越界的那一次非空断言也省掉了。
 *
 * 编辑中的行无条件并进来，即便它已经滚出窗口：它是唯一还在接收用户输入的行，卸载即
 * 丢草稿（clampEditingRowIntoView）。窗口不因此变高——它本来就在总高里，重复计入会让总高虚增。
 */
const renderedRows = computed(() => {
  const rows = virtualRows.value.flatMap(row => {
    const resource = props.resources[row.index]
    return resource ? [{ row, resource }] : []
  })
  const index = editingIndex.value
  if (index < 0 || rows.some(entry => entry.row.index === index)) return rows
  const resource = props.resources[index]
  if (!resource) return rows
  // measurementsCache 是公开成员，但只有 getMeasurements() 跑过之后才填得满，而它是私有的。
  // totalSize 会强制那一次计算，缓存没就绪时读到的下标拿不到行——那就不画编辑行，
  // 交给 clampEditingRowIntoView 把它滚回窗口，而不是编一个 start 出来盖在别的行上。
  void totalSize.value
  const row = virtualizer.value.measurementsCache[index]
  if (!row) return rows
  return [...rows, { row, resource }].sort((a, b) => a.row.index - b.row.index)
})

/*
 * 把每个渲染窗口里的行交给 ResizeObserver 量真实高度。行高不固定（标题换行、标签换行、
 * 改名编辑态），只给 estimateSize 的话后续行会重叠或留缝。
 *
 * 传给模板的是 v-for 里的稳定函数，不是在 onMounted 里手动遍历：v-for 每次重渲染都会重新
 * 调一遍函数式 ref，虚拟窗口滑动时新挂载的行因此能自动接上测量。
 *
 * 类型收成 unknown 再收窄，是为了不把模板 ref 的入参类型写死在一个断言上。这里绑的是
 * 原生 div，Vue 的 setRef 对原生元素走 vnode.el 分支（runtime-core.cjs.js:1770），实际
 * 只会收到 HTMLElement；instanceof 那道检查是防御，不是这个绑定在防的场景。
 */
function measureRow(node: unknown) {
  if (node instanceof HTMLElement) virtualizer.value.measureElement(node)
}

/*
 * 过滤或删除让 resources 变短时，activeIndex 可能落到列表之外，方向键就会从越界下标开始
 * 算。夹回范围内即可，不必重置到 0——用户刚删掉的是列表尾部之外的条目，焦点留在原处
 * 比跳回顶部更符合预期。
 */
watch(
  () => props.resources.length,
  length => {
    if (!length) {
      activeIndex.value = 0
      return
    }
    activeIndex.value = Math.min(activeIndex.value, length - 1)
  }
)

/*
 * 焦点成为 contextResource 的第二个来源。键盘呼出右键菜单（ContextMenu 键 / Shift+F10）
 * 由 web-ui-context-menu 自己监听宿主元素，它不看 contextResource、只按 document.activeElement
 * 的 rect 摆面板；而菜单项全部 gate 在 contextResource 上，它原本只有行上的 contextmenu
 * 事件这一个赋值点。纯键盘呼出时 contextResource 仍是 null，弹出来的是一张紧贴该行、
 * 内容却只有「删除」和两条分隔线的菜单：位置在说「这一行」，内容在说别的资源。
 *
 * 用 focusin 而不是给 ResourceRow 加一个 focus emit：focusin 会冒泡，容器上一个监听就够，
 * 行内的勾选框与改名编辑器获焦时也会顺带把所属行同步上，不必为一个纯内部的状态同步再扩
 * 一条对外 emit 契约。落焦到容器自己身上时置空，免得拿上一条资源的菜单项去填一张锚在
 * 列表上的菜单。
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
 * 开了 long-press 之后菜单有两个开法：鼠标走原生 contextmenu（行上的事件），触屏走组件
 * 自己在宿主上计时打开。后者不发事件、也不认行——它只知道「在哪儿按的」，菜单项却全部
 * gate 在 contextResource 上。若只补属性不补这个赋值，长按弹出来的是一张位置在某一行的
 * 空菜单：只剩两条分隔线和一个删除「null」的空项。
 *
 * 为什么在 pointerdown 就落定、而不是等菜单要开了再补：长按的判定归组件的计时器，我们
 * 没有「即将开菜单」这个时刻可挂。此时菜单还没开，v-if 渲染的是最终形态，组件搬运项的
 * 那一整套（capture → 移入 portal → 关闭时搬回）拿到的也是完整项集。等开之后再改
 * contextResource 就是在面板里增删节点，正是本组件上方那段 wrapper 注释里记的那个
 * 会把锚点搞丢、且无法自愈的坑。
 *
 * 同一时刻要记住「这一手是触屏」。长按抬手后浏览器补发的 click 会照常落到 onRowSelect，
 * 于是菜单和预览 drawer 同时弹出来——组件侧那个 _isLongPressFollowUp() 只吸收它自己
 * 菜单上的补发事件，管不到宿主的行激活，所以这个抑制必须在宿主这边做。
 */

/*
 * 这一手长按**确实开出了菜单**。
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
 * 菜单和预览 drawer 就会一起弹出来——用户看到的正是这个。
 *
 * 置位时机是**抬手**，不是长按到期。这一点是踩过坑才定下来的：
 *
 * 长按本来就是「按住不放」的手势，菜单弹出之后用户继续按住任意久都完全自然。而补发的
 * click 是在抬手那一刻才到达的，它与「长按到期」的间隔等于「菜单弹出后继续按住的时长」，
 * 由用户决定、上界无限。曾经在这里挂过一个有限窗口（镜像组件的
 * LONG_PRESS_FOLLOW_UP_WINDOW_MS），看起来有组件侧依据，实际上组件那个窗口吸收的是
 * contextmenu——那个事件在长按到期时就派发了，到派发时距锚点已经是 0ms，所以 1000ms
 * 对它成立，对补发的 click 却是给用户可控的时长发通行证：按住超过窗口长度，抽屉照弹。
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
 * 只在 open-change 那一刻用来把「触屏长按开菜单」与「鼠标右键开菜单」分开：两者派发的
 * 事件序列几乎一样，但只有触屏那条的补发 click 需要被吞。它由 handleSweepStart 在**每一次**
 * pointerdown 上重新判定，不粘滞——若只由 touch 置位，触屏轻点没走到 onRowSelect 时（例如
 * 点在行外）它会一直是 true，之后一次鼠标右键开菜单就被误认成长按，右键之后点行会点不动。
 */
let lastPointerWasTouch = false

/**
 * 抬手：把「长按开出了菜单」翻译成「马上会来一个补发的 click」。
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
  // 菜单关闭不消费标志：补发的 click 恰恰常发生在菜单已关之后，提前作废它就退回老缺陷。
  // 鼠标右键开菜单时同样派发 open-change，但鼠标点行是合法的，不能吞。
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
 * context-menu/index.ts 的 _onKeydown），焦点在容器上时它照样会开菜单，并把面板锚到容器
 * 自己身上。容器不对应任何一条资源，那种情况下弹出来的只会是一张位置在列表、内容与列表
 * 无关的菜单——和这次要修的键盘缺陷是同一个毛病，只是从「行」换成了「列表」。所以这里
 * 先把焦点交给行：事件继续冒泡到宿主，宿主再读 document.activeElement 时读到的已经是
 * 那一行，菜单于是既锚在行上、也讲这一行的事。
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
 * 焦点本身不自动开预览，这是被实现逼出来的：预览抽屉的 web-ui-drawer 内部是原生
 * <dialog> 的 showModal()，打开时浏览器把焦点拉进 dialog、让其后的文档 inert。焦点一落到
 * 行上、抽屉一开，下一行就永远拿不到焦点，Tab 在行间切换这条主路径当场断掉（浏览器实测：
 * 抽屉打开后 row.focus() 无响应）。把抽屉改成非模态要动 web-ui 组件，不在本 task 范围内。
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
  void focusIndex(next)
}

/*
 * 把焦点交给某一行。
 *
 * 落焦必须等目标行真的挂载，而「等一个 tick」不够。scrollToIndex 改的是滚动位置，
 * 库的滚动回调与随之而来的虚拟窗口重算是异步的：End 从第 0 行跳到第 999 行要滚 63000px，
 * 新窗口的行要在两三轮渲染之后才出现（实测只等一个 nextTick 时焦点仍停在 BODY）。
 * 所以这里轮询到目标行出现为止，并给一个上限，避免目标行始终不存在时把调用方挂死。
 *
 * align: 'auto' 只在目标不在视口内时才滚动，方向键连续按住时不会每按一次就重置视口。
 */
const FOCUS_WAIT_TIMEOUT_MS = 1000
const FOCUS_POLL_INTERVAL_MS = 16

function focusIndex(index: number) {
  activeIndex.value = index
  virtualizer.value.scrollToIndex(index, { align: 'auto' })
  return focusRowWhenMounted(index)
}

/*
 * 每一轮 focusIndex 领一个递增的号，轮询每醒来一次先核对号是不是自己的。不是自己的就
 * 直接收工——方向键连按时，先发的那一轮可能在后一轮落焦之后才等到目标行，不作废就会把
 * 焦点从用户已经移开的那行拽回去，表现为焦点闪回上一目标行。
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
 * 虚拟化之前全部行常驻，改名编辑态不可能丢失；虚拟化之后行随窗口卸载，而 editable-text
 * 在 disconnectedCallback 里只释放按键与 autosize，不提交也不取消（index.ts:157-161）。
 * 提交只有 _onBlur 与 Enter/Escape 两条路，都要求焦点还在那个 textarea 上，DOM 被摘掉的
 * 时候两条都不走，于是用户输入的草稿无声消失，editingNameKey 还留在一个没有行的下标上，
 * 滚回来只会渲染出一个空编辑器。
 *
 * 两道防线，缺一不可：
 *   1. renderedRows 无条件把编辑行并进渲染结果——它永远不被卸载，草稿永远不丢；
 *   2. 这里把视口夹回它身上——行不会被滚出视野，用户不会对着一个看不见的编辑器继续打字。
 * 只有第 1 条时行仍在 DOM 里但可能在屏幕外；只有第 2 条时滚动与夹取会互相拉扯。
 *
 * window 模式下的坐标：item.start 是文档坐标（含 scrollMargin），window.scrollY 与
 * window.innerHeight 同为文档/视口坐标，两者可直接求交——不需要像 element 模式那样再换算
 * 容器偏移。可滚上限取文档高度减视口，与库自己的 getMaxScrollOffset 一致。
 *
 * 夹取而不是 scrollToIndex：scrollToIndex 会把滚动位置重置到行首，把人从当前看的位置
 * 拽走。夹取只在越界时把边界收到刚好装得下这一行，视口内的滚动完全不受影响。
 */
function clampEditingRowIntoView() {
  const index = editingIndex.value
  if (index < 0) return
  // measurementsCache 是公开成员，但只有私有的 getMeasurements 跑过之后才填得满；
  // totalSize 会强制那一次计算。缓存没就绪就等下一帧，夹取只在数据齐了之后才动手。
  void totalSize.value
  const row = virtualizer.value.measurementsCache[index]
  if (!row) return
  const viewport = window.innerHeight
  if (!viewport) return
  const maxScrollY = Math.max(document.documentElement.scrollHeight - viewport, 0)
  if (window.scrollY > row.start) {
    window.scrollTo({ top: row.start })
  } else if (window.scrollY + viewport < row.end) {
    window.scrollTo({ top: Math.min(row.end - viewport, maxScrollY) })
  }
}

/*
 * 三处调用同一个夹取，触发源各不相同，缺一不可：
 *
 *   - editingIndex 变化：进入/退出改名编辑态。immediate 覆盖「挂载时已在编辑态」——
 *     那种情况下 editingIndex 不会再变，没有 immediate 这次就一次都不会跑。
 *   - rowsRef 挂上：immediate 那一轮跑在 rowsRef 赋值之前，量不到视口与行位置。
 *   - window 的 scroll：编辑期间用户可能只是随手把页面滚走，不改编辑态。行虽然还在
 *     DOM 里（草稿没丢，第一道防线），但滚出视野之后用户就对着一个看不见的编辑器
 *     继续打字了。window 模式下滚动事件在 window 上，不在列表容器上。
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
  // 三件事都必须排在下面那些 early return 之前：非选择模式下这里会立刻返回，而长按菜单
  // 恰恰只在非选择模式下可用。
  //
  // 作废的理由：抬手时若没等到补发的 click（被系统吃掉、落点不可点等），标志会悬着，
  // 而它一旦悬着，用户之后点任何一行都会「点不动」。任何新的按下都清掉它；而补发的 click
  // 一定早于下一次 pointerdown（任何点击都先有 pointerdown），所以这道闸收拾得了残留，
  // 又不会把该拦的那个提前放跑。
  lastPointerWasTouch = event.pointerType === 'touch'
  followUpClickPending = false
  longPressOpened = false
  // 长按菜单要用的 contextResource 在这里落定：这是 pointerdown 冒泡到容器上的第一个监听器，
  // 早于 web-ui-context-menu 自己那个（它在宿主上，我们在容器的后代里）。放在早的那一侧，
  // 长按计时器到期时 contextResource 已经是对的，菜单开出来就有完整项。
  syncTouchContext(event)
  // 右键（button 2）也走 pointerdown，让给右键菜单；只认主键
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
  // 一次左键进选择模式才恢复。表现为：扫选过一次之后，右键菜单整个失灵。
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
   * 长按抬手后浏览器补发的 click 会走到这里。若刚才那手确实开出了菜单，这次 click 就是
   * 长按的回声而不是一次有意的选择——吃掉，否则菜单与预览 drawer 会同时弹出来。
   *
   * 判据是 followUpClickPending：抬手时置位（前提是那手确实开出了菜单），补发的 click
   * 消费掉即清。触屏与鼠标的区分在 handleContextMenuOpenChange 记标志时就做完了。
   *
   * 这里刻意不去读「菜单此刻开着没有」：补发的 click 到达之前菜单往往已经因 blur /
   * 外点关掉，此刻去读到 false，这条抑制就失效了，抽屉照弹——那正是本判据要修的缺陷。
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
  // 长按扫选手势会顺带触发系统级 contextmenu，那不是「用户想看菜单」，挡掉
  if (suppressContextMenu) {
    event.preventDefault()
    return
  }
  event.preventDefault()
  event.stopPropagation()
  // 坐标先取出来再跨 tick。openAt 是异步的（nextTick 之后才调用），而事件的
  // clientX/clientY 属于「这一次右键」——菜单该出现在手指/鼠标当时的位置，不是等到下一帧
  // 那一刻的位置。中间还夹着 contextResource 的写入与随之而来的重渲染。
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
    一张 contextResource 为 null 的菜单——只剩一条分隔线加一个空「删除」项。禁用后
    事件在组件内被 return 掉，浏览器原生菜单正常出现。
  -->
  <!--
    long-press 让触屏能长按出行菜单（web-ui-context-menu 的 opt-in 属性，只对 pointerType
    为 touch 的指针生效，鼠标仍走原生 contextmenu）。

    选择模式里同一个「按住不动」已经被扫选占了
    （armTouchSweep，320ms），而组件的长按阈值是 500ms——两个计时器都会跑，菜单会在扫选
    已经开始勾选之后弹出来抢画面。语义上也该如此：选择模式的长按是「扫选」，不是「看菜单」。
    关掉之后组件在 _onPointerDown 里直接 return，连计时器都不起。

    **这里必须让 false 表现为「没有这个属性」，不能写成 `:long-press="!selectionMode"`。**
    Vue 对自定义元素走属性路径（`'long-press' in el` 为 false，属性名是 longPress），false
    会被写成字符串 `"false"`；而 Lit 的 Boolean converter 只看属性在不在（`value !== null`），
    于是 `"false"` 读出来是 true——布尔整个反了。选择模式里长按照样弹菜单。
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
      容器不参与 v-if，始终挂载，状态只在它内部切换。这是虚拟化的硬前提：TanStack 的
      measureElement 靠 Vue 的函数式 ref 调用，若行挂在 v-if 分支里，重建出的新节点在
      ref 收到它时尚未 attach，offsetHeight 读到 0 并被当成真实尺寸缓存。危害有限——
      pendingMin 把重排限制在该行及其之后，实测总高短暂少一行、下一帧自愈——但固定挂载
      容器就不必依赖这个自愈（TanStack/virtual#1292）。空态与载入态切到同一容器内即可绕开。

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

        撑总高的内层 div 承载全部列表语义，不能标 aria-hidden：行就在它内部，遮住这层等于
        把 role="listitem" 与 aria-setsize / aria-posinset 一起对读屏隐去，外层的 role="list"
        会变成一个「0 项的列表」。它自己只是撑高度与定位的盒子，没有 role 也没有可读文本，
        留在无障碍树里不会多念任何东西。

        被量的元素是这一层定位包裹，不是 ResourceRow 的根元素：TanStack 的 measureElement
        靠 indexAttribute（默认 data-index）从元素上反查下标，data-resource-index 是本组件
        自己的命名，库读不到。包裹层与行根元素盒高一致，量哪一个都一样。

        撑高的是这一层：window 模式下它不被任何 overflow 容器裁剪，自由长高，整页随之
        滚动。高度直接用 getTotalSize()，它已经减掉 scrollMargin，不要再减一次。

        行的落点是 row.start - scrollMargin：row.start 是文档坐标（virtual-core 的
        runningStart = paddingStart + scrollMargin），而这层包裹层自身在文档里有 top 偏移，
        两者减掉才落在正确位置。少了这个减法，键盘导航会把行滚到视口外。
      -->
      <div ref="listSizerRef" v-else class="relative w-full" :style="{ height: `${totalSize}px` }">
        <div
          v-for="{ row, resource } in renderedRows"
          :key="String(row.key)"
          :ref="measureRow"
          class="absolute top-0 left-0 w-full"
          :data-index="row.index"
          :style="{ transform: `translateY(${row.start - listOffset}px)` }"
        >
          <ResourceRow
            :resource="resource"
            :media-url="resource.preferred ? mediaUrlFor(resource.preferred.id) : null"
            :index="row.index"
            :total="resources.length"
            :active="!selectionMode && activeResourceId === resource.id"
            :checked="checkedIds.includes(resource.id)"
            :checked-above="checkedAbove(row.index)"
            :checked-below="checkedBelow(row.index)"
            :selection-mode="selectionMode"
            :editing-name-key="editingNameKey"
            :editor-ref="editorRefFor(resource.id)"
            :tabbable="row.index === activeIndex"
            @select="onRowSelect"
            @contextmenu="openContextMenu"
            @toggle="emit('toggle', $event)"
            @rename-change="handleRenameChange"
            @cancel-rename="emit('cancelRename')"
          />
        </div>
      </div>
    </div>

    <!--
      所有菜单项都收在这个 wrapper 里，`contents` 让它不产生盒子（对列表布局零影响）。

      这层 wrapper 是修一个真实 bug，不是结构偏好：菜单打开时 context-menu 会把项搬进
      自己的 portal 面板，关闭时再搬回来，而搬回要等退场动画（`_closeMenuAfterPresence`
      是 async）。这段窗口里 `_isOpen` 已经是 false 但项还留在面板上。此刻右键另一行，
      上面的 v-if 就会在面板里增删节点，和组件自己的锚点搬运（capture / order / restore
      + return-to-slot）撞在一起，Vue 的 v-if 注释锚点会被丢在错位的地方——实测后果是
      菜单只剩「详情 / 重命名 / 删除」、可用项整块消失，且锚点丢失后**无法自愈**，菜单
      从此再也打不开。

      收进 wrapper 后组件搬的是「wrapper + 全部项 + 全部 v-if 锚点」这一整块，锚点不可能
      与项走散；`getMovableMenuSubtrees` 把 wrapper 当单个可移动子树，`orderManagedMenuItems`
      随之退化成空操作，排序完全交回 Vue。`getMenuChildren` 本来就递归进 wrapper，
      `wui-menu-content` 也没有直接子选择器，渲染与命中判定都不受影响。

      wrapper 上的 slot="context-menu-hidden" 不能省。组件关闭时是靠给项加这个属性来隐藏的
      （模板里只有默认 slot，名字对不上的节点不渲染），而 slot 分配只对**宿主的直接子节点**
      生效——项一旦被包进 wrapper，它们就成了默认 slot 分配节点的内部后代，不再是 slottable，
      隐藏会失效，菜单项会以明文形式漏在列表下面。挂到 wrapper 自己身上即可：wrapper 是直接
      子节点，关闭时被正确隐藏；打开时组件把整块搬进 portal 面板，而面板是普通 div、没有
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
        无入口可达，也会让不可用资源彻底失去详情抽屉（备注、元数据、来源都在里面）。
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
