export interface NavItem {
  readonly path: string
  /** 组件名（Button / Input …），两版都不译。 */
  readonly label: string
}

export type NavSectionId = 'general' | 'layout' | 'form' | 'display' | 'feedback'

export interface NavSection {
  readonly id: NavSectionId
  readonly items: readonly NavItem[]
}

/**
 * 章节标题的中文文案（通用 / 布局 / 表单 / 展示 / 反馈）留在宿主：wuchale 只扫宿主 src，
 * 文案进了共享包就既提取不到、也翻译不了。这里只给结构与顺序。
 */
function section(id: NavSectionId, items: NavItem[]): NavSection {
  return Object.freeze({ id, items: Object.freeze(items.map(item => Object.freeze(item))) })
}

/** 两端渲染的是同一份导航数据，冻结后一端误改会立即暴露，而不是静默改掉另一端的导航。 */
export const NAV_SECTIONS: readonly NavSection[] = Object.freeze([
  section('general', [
    { path: '/components/button', label: 'Button' },
    { path: '/components/icon', label: 'Icon' }
  ]),
  section('layout', [
    { path: '/components/layout', label: 'Layout' },
    { path: '/components/back-top', label: 'BackTop' },
    { path: '/components/theme', label: 'Theme' }
  ]),
  section('form', [
    { path: '/components/input', label: 'Input' },
    { path: '/components/textarea', label: 'Textarea' },
    { path: '/components/input-number', label: 'InputNumber' },
    { path: '/components/select', label: 'Select' },
    { path: '/components/autocomplete', label: 'Autocomplete' },
    { path: '/components/switch', label: 'Switch' },
    { path: '/components/slider', label: 'Slider' },
    { path: '/components/radio', label: 'Radio' },
    { path: '/components/checkbox', label: 'Checkbox' },
    { path: '/components/segmented', label: 'Segmented' }
  ]),
  section('display', [
    { path: '/components/collapse', label: 'Collapse' },
    { path: '/components/editable-text', label: 'EditableText' },
    { path: '/components/empty', label: 'Empty' },
    { path: '/components/grouped-text', label: 'GroupedText' },
    { path: '/components/middle-ellipsis', label: 'MiddleEllipsis' },
    { path: '/components/svg-draw-lines', label: 'SVGDrawLines' },
    { path: '/components/avatar', label: 'Avatar' },
    { path: '/components/badge', label: 'Badge' }
  ]),
  section('feedback', [
    { path: '/components/dialog', label: 'Dialog' },
    { path: '/components/drawer', label: 'Drawer' },
    { path: '/components/tooltip', label: 'Tooltip' },
    { path: '/components/popover', label: 'Popover' },
    { path: '/components/dropdown', label: 'Dropdown' },
    { path: '/components/context-menu', label: 'ContextMenu' },
    { path: '/components/toast', label: 'Toast' },
    { path: '/components/image-preview', label: 'ImagePreview' },
    { path: '/components/shake', label: 'Shake' },
    { path: '/components/spinner', label: 'Spinner' },
    { path: '/components/progress', label: 'Progress' }
  ])
])

/** 章节标题的排版类；折叠时宿主自行追加 `sr-only`，只保留给读屏的标题。 */
export const NAV_SECTION_TITLE_CLASS =
  'px-2.5 pt-3 pb-1 text-[12px] font-medium tracking-wide text-(--wui-color-text-secondary)'

// active 底色浅色取设计给定的 #d5d7d7；深色不跟——sidebar 在深色是 #2c2c2e，亮灰会读成一条高亮带，仍走 control 档。
export const NAV_ITEM_CLASS =
  'flex items-center gap-2 min-w-9 min-h-9 px-2.5 border-0 rounded-full cursor-pointer text-left transition-all duration-150 text-(--wui-color-text) active:bg-[rgb(34_33_42/0.12)] dark:active:bg-white/15 data-[active=true]:bg-[#d5d7d7] data-[active=true]:hover:bg-[#d5d7d7] data-[active=true]:active:bg-[color-mix(in_srgb,#d5d7d7_70%,var(--wui-color-text,#1b1b1b))] dark:data-[active=true]:bg-[color-mix(in_srgb,var(--wui-color-surface-control,#dfdfdf)_90%,var(--wui-color-text,#1b1b1b))] dark:data-[active=true]:hover:bg-[color-mix(in_srgb,var(--wui-color-surface-control,#dfdfdf)_90%,var(--wui-color-text,#1b1b1b))] dark:data-[active=true]:active:bg-[color-mix(in_srgb,var(--wui-color-surface-control,#dfdfdf)_70%,var(--wui-color-text,#1b1b1b))]'

/** 精确匹配当前路径，或匹配它的尾斜杠写法。 */
export function isNavActive(pathname: string, path: string): boolean {
  return pathname === path || pathname === `${path}/`
}
