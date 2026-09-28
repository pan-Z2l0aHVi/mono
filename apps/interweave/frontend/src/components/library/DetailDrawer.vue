<script setup lang="ts">
import type { WebUiDrawer, WebUiEditableText, WebUiEvent, WebUiTextarea } from '@greypan/web-ui'
import {
  lucideChevronRight,
  lucideEye,
  lucideExternalLink,
  lucidePenLine,
  lucideRefreshCw,
  lucideTags
} from '@greypan/web-ui/icons'
import { computed, ref, watch } from 'vue'

import type { ResourceSourceView, ResourceView } from '@/stores/library'

import {
  formatSize,
  formatTimestamp,
  resourceKindLabel,
  metadataRowClass,
  sourceTypeDisplayLabel,
  sourceTypeIcon,
  tagChipClass,
  tagClass
} from './presentation'
import { DRAWER_TITLE_EDITOR_KEY, type NameEditorRef } from './rename'

const props = defineProps<{
  open: boolean
  resource: ResourceView | null
  mobile: boolean
  editingNameKey: string | null
  editorRef: NameEditorRef
  replacingSourceIds: string[]
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  startRename: [resource: ResourceView]
  renameChange: [resource: ResourceView, event: WebUiEvent<WebUiEditableText, 'change'>]
  cancelRename: []
  noteChange: [resource: ResourceView, note: string, editor: WebUiTextarea | null]
  editTags: [resource: ResourceView]
  delete: [resource: ResourceView]
  preview: [resource: ResourceView]
  recover: [source: ResourceSourceView]
}>()

const DRAWER_TITLE_NAME_CLASS = 'min-w-0 flex-[1_1_auto] text-[14px] leading-6 wrap-break-word text-(--wui-color-text)'

/*
 * iOS 设置风格的分组列表：一组一个白色圆角卡片，组内行用内缩发丝线分隔，破坏性操作独立成组。
 * 圆角取 18px（对齐 iOS inset grouped 的观感），比 rounded-3xl 的 24px 更收敛。
 *
 * 版式的第二条规矩：字号统一 14px、字重默认，层级只靠颜色深浅表达——主文本走
 * --wui-color-text，辅助信息走 --wui-color-text-secondary，行尾 chevron 走 tertiary。
 * iOS 设置页不靠放大标题、加粗副标题堆层级，一旦掺进字号与字重，卡片就会退回成
 * 常见后台管理界面那种「每行都在喊」的样子。
 *
 * 用 overflow-clip + clip-margin 而非 hidden：组内整行按钮的 focus ring 会向外伸
 * 3px 描边 + 2px offset，hidden 会把它沿四边切掉（与 AddDialog 的 drop zone 同理）。
 */
const GROUP_CLASS =
  'overflow-clip [overflow-clip-margin:6px] rounded-[18px] bg-white shadow-[0_0_0_0.5px_rgb(0_0_0/0.08),0_1px_3px_rgb(0_0_0/0.06)] dark:bg-(--wui-color-surface-raised) dark:shadow-[0_0_0_0.5px_rgb(255_255_255/0.12)]'

/*
 * 整行动作按钮。web-ui-button 的内层 button 固定 justify-content: center，所以靠一个
 * flex-1 撑杆把 chevron 推到行尾，标签因此贴左。撑杆必须放在 suffix slot 里：内层 button
 * 把默认 slot 包在一个 flex: 0 1 auto 的 span.label 里，放在默认 slot 撑不开；prefix 与
 * suffix 两个 slot 是 display: contents，它们的子元素才是 button 的直接 flex item。
 * --wui-radius-control 归零让 hover 底色是直角，外角交给分组裁。
 *
 * 不设 --wui-button-color：ghost 变体默认就是 --wui-color-text。iOS 设置的导航行是
 * 黑色文字配灰色 chevron，蓝色留给真正需要「这是个链接」语义的地方（来源 URL）。
 */
const ROW_BUTTON_CLASS =
  '[--wui-button-px:16px] [--wui-control-size:44px] [--wui-radius-control:0px] [--wui-button-gap:10px]'

/* 行间发丝线：内缩 16px 与行首文字对齐，是 iOS 分组列表的标志性处理。 */
const ROW_SEPARATOR_CLASS =
  "after:pointer-events-none after:absolute after:inset-x-4 after:bottom-0 after:h-px after:bg-black/6 after:content-[''] dark:after:bg-white/8"

/* chevron 在 iOS 里恒为 tertiary 灰：它是「这里可以进去」的信号，不该跟着行文字换色。 */
const CHEVRON_ICON_CLASS = '[--wui-icon-color:var(--wui-color-text-tertiary,#8a8a94)]'

/*
 * 破坏性操作：透明底 + 危险色文字，独立成组。
 *
 * 行高压到与动作行一致的 44px，并借 suffix 撑杆把文字从居中改成靠左（iOS 设置的
 * 破坏性行走列表左缩进，与上方信息类分组同一条 16px 文字基线）。
 */
const DESTRUCTIVE_BUTTON_CLASS =
  '[--wui-button-px:16px] [--wui-control-size:44px] [--wui-radius-control:0px] [--wui-button-color:var(--wui-color-danger,#ef4444)]'

/*
 * 抽屉内的 label / value 字号。
 *
 * presentation.ts 的 metadataLabelClass / metadataValueClass 是 12px 版本，被
 * AddDialog 队列与 RestoreDialog 共用；这里另起 14px 常量而不去改共享定义，
 * 否则字号会外溢到另外两个 dialog。metadataRowClass 只管行内 padding 与发丝线、
 * 不含字号，因此仍复用共享的那一份。
 */
const DRAWER_LABEL_CLASS = 'shrink-0 text-[14px] leading-5 text-(--wui-color-text-secondary)'
const DRAWER_VALUE_CLASS = 'min-w-0 truncate text-right text-[14px] leading-5 text-(--wui-color-text)'

const placement = computed(() => (props.mobile ? 'bottom' : 'right'))
const unavailableSource = computed(() => props.resource?.sources.find(source => !source.available) ?? null)
const editingTitle = computed(() => props.editingNameKey === DRAWER_TITLE_EDITOR_KEY)

function handleOpenChange(event: WebUiEvent<WebUiDrawer, 'open-change'>) {
  if (event.target !== event.currentTarget) return
  emit('update:open', event.detail.open)
}

function handleTitleChange(event: WebUiEvent<WebUiEditableText, 'change'>) {
  if (props.resource) emit('renameChange', props.resource, event)
}

/*
 * 待存备注：null 表示没有未提交的输入。
 *
 * 关闭抽屉时页面同步把 activeResourceId 清空，下一个 patch 就会移除仍在聚焦的
 * textarea；从文档里摘掉一个聚焦元素不会派发 blur，`@change` 永远不会来。所以这里
 * 在 input 时就把值留下来，卸载前用 watcher 补一次提交——不能用模板 ref，Vue 会在
 * pre-flush watcher 之前就把它清空（实测 hasEditor 已是 false）。鼠标路径（点遮罩、
 * 点关闭、点工具栏）都先 blur，所以只有键盘会丢。
 */
const pendingNote = ref<string | null>(null)

function handleNoteInput(event: WebUiEvent<WebUiTextarea, 'input'>) {
  pendingNote.value = event.currentTarget.value
}

function handleNoteChange(event: WebUiEvent<WebUiTextarea, 'change'>) {
  if (!props.resource) return
  pendingNote.value = null
  emit('noteChange', props.resource, event.currentTarget.value, event.currentTarget)
}

watch(
  () => props.resource,
  (next, previous) => {
    if (!previous || pendingNote.value === null) return
    // 同一条资源被 store 回写（保存成功、打标签等）也会走到这里，那不是切换也不是关闭。
    if (next && next.id === previous.id) return
    const note = pendingNote.value
    pendingNote.value = null
    if (note === previous.note) return
    // 字段已随 patch 卸载，没有可写回的编辑器；失败由 runtimeError 呈现。
    emit('noteChange', previous, note, null)
  },
  { flush: 'pre' }
)

function restoreResource() {
  if (unavailableSource.value) emit('recover', unavailableSource.value)
}
</script>

<template>
  <web-ui-drawer
    :open="open"
    :placement="placement"
    dialog-label="资源详情"
    draggable
    controlled
    class="max-[640px]:[--wui-drawer-height:80vh] max-[640px]:[--wui-drawer-inset:0px] max-[640px]:[--wui-drawer-radius:28px_28px_0_0] max-[640px]:[--wui-drawer-content-padding:0px] [--wui-drawer-width:360px]"
    @open-change="handleOpenChange"
  >
    <div
      v-if="resource"
      class="grid gap-4 max-[640px]:h-(--wui-drawer-height) max-[640px]:overflow-y-auto max-[640px]:p-5"
    >
      <!--
        标题与标签收进第一张白卡：iOS 设置详情页顶部是「名字 + 若干属性」的分组，
        不是浮在分组之上的裸标题。标签行与标题行之间用发丝线分隔，与组内行分隔同源。
      -->
      <div :class="GROUP_CLASS">
        <h2 class="group/title flex items-center gap-2 m-0 px-4 py-3">
          <web-ui-editable-text
            v-if="editingTitle"
            :ref="editorRef"
            :value="resource.title"
            :class="DRAWER_TITLE_NAME_CLASS"
            class="caret-(--wui-color-accent,#08f)"
            :aria-label="`修改 ${resource.title} 的标题`"
            @click.stop
            @change="handleTitleChange"
            @cancel="emit('cancelRename')"
          />
          <span v-else :class="DRAWER_TITLE_NAME_CLASS">
            {{ resource.title }}
          </span>
          <web-ui-button
            v-if="!editingTitle"
            class="shrink-0"
            icon
            variant="ghost"
            size="22"
            aria-label="重命名"
            @click="emit('startRename', resource)"
          >
            <web-ui-icon :icon="lucidePenLine" :size="13" />
          </web-ui-button>
        </h2>

        <div class="flex flex-wrap items-center gap-1.5 border-t border-black/6 px-4 py-3 dark:border-white/8">
          <span v-for="tag in resource.tags" :key="tag.id" :class="[tagChipClass, tagClass(tag.color)]">
            {{ tag.name }}
          </span>
          <web-ui-tooltip content="编辑标签" placement="top">
            <web-ui-button
              class="[--wui-button-color:var(--wui-color-accent,#08f)]"
              icon
              variant="ghost"
              size="22"
              aria-label="编辑标签"
              @click="emit('editTags', resource)"
            >
              <web-ui-icon :icon="lucideTags" :size="13" />
            </web-ui-button>
          </web-ui-tooltip>
        </div>
      </div>

      <div :class="GROUP_CLASS">
        <template v-if="resource.available">
          <web-ui-button
            full
            variant="ghost"
            :class="[ROW_BUTTON_CLASS, ROW_SEPARATOR_CLASS]"
            @click="emit('preview', resource)"
          >
            <web-ui-icon slot="prefix" :icon="lucideEye" :size="18" />
            预览
            <span slot="suffix" class="flex-1" aria-hidden="true" />
            <web-ui-icon slot="suffix" :icon="lucideChevronRight" :size="14" :class="CHEVRON_ICON_CLASS" />
          </web-ui-button>
          <web-ui-dropdown class="relative block w-full" placement="bottom-start">
            <web-ui-button slot="trigger" full variant="ghost" :class="ROW_BUTTON_CLASS">
              <web-ui-icon slot="prefix" :icon="lucideExternalLink" :size="18" />
              打开方式
              <span slot="suffix" class="flex-1" aria-hidden="true" />
              <web-ui-icon slot="suffix" :icon="lucideChevronRight" :size="14" :class="CHEVRON_ICON_CLASS" />
            </web-ui-button>
            <web-ui-dropdown-item>
              <web-ui-icon slot="prefix" :icon="lucideExternalLink" :size="14" />
              系统默认应用
            </web-ui-dropdown-item>
            <web-ui-dropdown-item>
              <web-ui-icon slot="prefix" :icon="lucideEye" :size="14" />
              预览
            </web-ui-dropdown-item>
          </web-ui-dropdown>
        </template>
        <web-ui-button
          v-else
          full
          variant="ghost"
          :class="ROW_BUTTON_CLASS"
          :disabled="!unavailableSource"
          :loading="replacingSourceIds.includes(unavailableSource?.id ?? '')"
          @click="restoreResource"
        >
          <web-ui-icon slot="prefix" :icon="lucideRefreshCw" :size="18" />
          找回资源
          <span slot="suffix" class="flex-1" aria-hidden="true" />
          <web-ui-icon slot="suffix" :icon="lucideChevronRight" :size="14" :class="CHEVRON_ICON_CLASS" />
        </web-ui-button>
      </div>

      <div :class="GROUP_CLASS">
        <div v-for="itemSource in resource.sources" :key="itemSource.id" :class="metadataRowClass" class="items-start">
          <span class="flex min-w-0 flex-[1_1_auto] items-start gap-2.5">
            <web-ui-icon
              :icon="sourceTypeIcon(itemSource)"
              :size="15"
              class="mt-0.5 shrink-0 text-[#8a8a94] dark:text-(--wui-color-text-secondary)"
            />
            <span class="grid min-w-0 flex-[1_1_auto] gap-0.5">
              <span class="text-[14px] leading-5 text-(--wui-color-text)">
                {{ sourceTypeDisplayLabel(itemSource) }}
              </span>
              <span
                v-if="itemSource.location"
                class="block min-w-0 truncate text-[14px] leading-5"
                :class="
                  itemSource.type === 'url' ? 'text-(--wui-color-accent,#08f)' : 'text-(--wui-color-text-secondary)'
                "
                :title="itemSource.location"
              >
                {{ itemSource.location }}
              </span>
            </span>
          </span>
          <span class="flex shrink-0 items-center gap-1.5">
            <span
              class="shrink-0 rounded-full px-2 py-0.5 text-xs leading-none"
              :class="
                itemSource.available
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-200'
                  : 'bg-red-100 text-red-700 dark:bg-red-400/15 dark:text-red-200'
              "
            >
              {{ itemSource.available ? '正常' : '已失效' }}
            </span>
          </span>
        </div>

        <div :class="metadataRowClass">
          <span :class="DRAWER_LABEL_CLASS">类型</span>
          <span :class="DRAWER_VALUE_CLASS">{{ resourceKindLabel(resource.kind) }}</span>
        </div>
        <div v-if="resource.sizeBytes !== null" :class="metadataRowClass">
          <span :class="DRAWER_LABEL_CLASS">大小</span>
          <span :class="[DRAWER_VALUE_CLASS, 'tabular-nums']">{{ formatSize(resource.sizeBytes) }}</span>
        </div>
        <div :class="metadataRowClass">
          <span :class="DRAWER_LABEL_CLASS">创建于</span>
          <time :class="[DRAWER_VALUE_CLASS, 'tabular-nums']">{{ formatTimestamp(resource.createdAt) }}</time>
        </div>
        <div :class="metadataRowClass">
          <span :class="DRAWER_LABEL_CLASS">最后修改于</span>
          <time :class="[DRAWER_VALUE_CLASS, 'tabular-nums']">{{ formatTimestamp(resource.updatedAt) }}</time>
        </div>
      </div>

      <!--
        空备注同样渲染输入框：原先的 v-if="resource.note" 只在已有备注时挂载，字段一旦
        可编辑就必须常驻，否则没有备注的资源永远没有入口去写。换行、滚动与 autosize
        高度仍由组件统一管，Drawer 不自己算 line-height。borderless 让输入区直接坐在
        分组底色上，不在组内再叠一层自己的边框与圆角。rows=1 是 iOS 备注的常态：空备注
        只占一行，autosize 在用户真正输入后才把行数顶上去。
      -->
      <div :class="GROUP_CLASS">
        <span class="block px-4 pt-3 pb-1 text-[14px] leading-5 text-(--wui-color-text-secondary)">备注</span>
        <div class="px-1 pb-2">
          <web-ui-textarea
            :value="resource.note"
            :rows="1"
            autosize
            full
            borderless
            placeholder="添加备注"
            aria-label="备注"
            @input="handleNoteInput($event)"
            @change="handleNoteChange($event)"
          />
        </div>
      </div>

      <div :class="GROUP_CLASS">
        <web-ui-button full variant="ghost" :class="DESTRUCTIVE_BUTTON_CLASS" @click="emit('delete', resource)">
          删除资源
          <span slot="suffix" class="flex-1" aria-hidden="true" />
        </web-ui-button>
      </div>
    </div>
  </web-ui-drawer>
</template>
