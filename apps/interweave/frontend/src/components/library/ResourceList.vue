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
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'

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
  const rows = rowElements()
  if (!rows.length) return
  const active = rows.find(row => row.dataset.resourceId === props.activeResourceId)
  event.preventDefault()
  ;(active ?? rows[0]).focus()
}

/*
 * 焦点成为 contextResource 的第二个来源。键盘呼出右键菜单（ContextMenu 键 / Shift+F10）
 * 由 web-ui-context-menu 自己监听宿主元素，它不看 contextResource、只按 document.activeElement
 * 的 rect 摆面板；而菜单项全部 gate 在 contextResource 上，它原本只有行上的 contextmenu
 * 事件这一个赋值点。纯键盘呼出时 contextResource 仍是 null，弹出来的是一张紧贴该行、
 * 内容却只有「删除」和两条分隔线的菜单：位置在说「这一行」，内容在说别的资源。行成了
 * tab stop 之后这条路径才可达（此前焦点到不了行上），是这次改动引进的，所以在这里补齐。
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
 * 方向键在行间移动焦点，Home / End 到首尾。焦点移动自带滚动（浏览器把新焦点滚进可视区），
 * 这里不手动 scrollIntoView——那会和浏览器自己的滚动打架。上下键在首尾停住：列表不是环。
 */
function moveRowFocus(event: KeyboardEvent, row: HTMLElement) {
  const rows = rowElements()
  const index = rows.indexOf(row)
  if (index < 0) return
  const next =
    event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? rows.length - 1
        : event.key === 'ArrowDown'
          ? Math.min(index + 1, rows.length - 1)
          : Math.max(index - 1, 0)
  if (next === index) return
  event.preventDefault()
  rows[next].focus()
}

function rowElements() {
  const container = rowsRef.value
  return container ? [...container.querySelectorAll<HTMLElement>('[data-resource-row]')] : []
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
// 长按在移动之前就武装，此刻浏览器还没开始滚动，preventDefault 拦得住；之后靠
// touchmove 阻止滚动，pointermove 的 preventDefault 管不了这件事。
let suppressContextMenu = false

function rowIdAt(clientX: number, clientY: number) {
  const container = rowsRef.value
  if (!container) return null
  const element = document.elementFromPoint(clientX, clientY)
  if (!(element instanceof Element)) return null
  const row = element.closest<HTMLElement>('[data-resource-row]')
  // 命中列表之外（浮层、抽屉）就当没划到，不去动行外的 id
  if (!row || !container.contains(row)) return null
  return row.dataset.resourceId ?? null
}

function applySweep(resourceId: string) {
  sweepLastId = resourceId
  emit('setChecked', resourceId, sweepChecked)
}

function blockSweepScroll(event: TouchEvent) {
  if (sweepActive) event.preventDefault()
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
  const id = rowIdAt(event.clientX, event.clientY)
  if (!id || id === sweepLastId) return
  applySweep(id)
}

function endSweep() {
  if (holdTimer !== undefined) {
    clearTimeout(holdTimer)
    holdTimer = undefined
  }
  document.removeEventListener('touchmove', blockSweepScroll)
  if (sweepActive) suppressRowClick = true
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
  emit('select', resource)
}

onBeforeUnmount(endSweep)

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
  contextResource.value = resource
  await nextTick()
  contextMenuRef.value?.openAt(event.clientX, event.clientY)
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
  <web-ui-context-menu ref="contextMenuRef" :disabled="resources.length === 0" class="block w-full">
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
      翻译成行语义。容器自己是 tab stop，Tab 进列表先落在它上面，Enter / ArrowDown 再进
      当前活动行（没有就从首行开始）。
    -->
    <div
      v-else
      ref="rowsRef"
      class="w-full h-full select-none [-webkit-touch-callout:none]"
      tabindex="0"
      @keydown="handleRowsKeydown"
      @focusin="handleRowsFocusin"
      @pointerdown="handleSweepStart"
    >
      <ResourceRow
        v-for="(resource, index) in resources"
        :key="resource.id"
        :resource="resource"
        :media-url="resource.preferred ? mediaUrlFor(resource.preferred.id) : null"
        :active="!selectionMode && activeResourceId === resource.id"
        :checked="checkedIds.includes(resource.id)"
        :checked-above="checkedAbove(index)"
        :checked-below="checkedBelow(index)"
        :selection-mode="selectionMode"
        :editing-name-key="editingNameKey"
        :editor-ref="editorRefFor(resource.id)"
        @select="onRowSelect"
        @contextmenu="openContextMenu"
        @toggle="emit('toggle', $event)"
        @rename-change="handleRenameChange"
        @cancel-rename="emit('cancelRename')"
      />
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
