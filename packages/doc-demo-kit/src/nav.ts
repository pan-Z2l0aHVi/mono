export interface NavItem {
  readonly path: string
  /** 组件名（Button / Input …），两版都不译。 */
  readonly label: string
  /** 中文关键词（按钮 / 输入框 …）：搜索用，不是渲染文案（wuchale 只扫宿主 src，见下）。 */
  readonly zhName: string
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
    { path: '/components/button', label: 'Button', zhName: '按钮' },
    { path: '/components/icon', label: 'Icon', zhName: '图标' }
  ]),
  section('layout', [
    { path: '/components/layout', label: 'Layout', zhName: '布局' },
    { path: '/components/back-top', label: 'BackTop', zhName: '回到顶部' },
    { path: '/components/theme', label: 'Theme', zhName: '主题' }
  ]),
  section('form', [
    { path: '/components/input', label: 'Input', zhName: '输入框' },
    { path: '/components/textarea', label: 'Textarea', zhName: '多行输入框' },
    { path: '/components/input-number', label: 'InputNumber', zhName: '数字输入框' },
    { path: '/components/select', label: 'Select', zhName: '选择器' },
    { path: '/components/autocomplete', label: 'Autocomplete', zhName: '自动补全' },
    { path: '/components/switch', label: 'Switch', zhName: '开关' },
    { path: '/components/slider', label: 'Slider', zhName: '滑块' },
    { path: '/components/radio', label: 'Radio', zhName: '单选' },
    { path: '/components/checkbox', label: 'Checkbox', zhName: '复选' },
    { path: '/components/segmented', label: 'Segmented', zhName: '分段控件' }
  ]),
  section('display', [
    { path: '/components/collapse', label: 'Collapse', zhName: '折叠' },
    { path: '/components/editable-text', label: 'EditableText', zhName: '可编辑文本' },
    { path: '/components/empty', label: 'Empty', zhName: '空状态' },
    { path: '/components/grouped-text', label: 'GroupedText', zhName: '分组文本' },
    { path: '/components/middle-ellipsis', label: 'MiddleEllipsis', zhName: '中间省略' },
    { path: '/components/svg-draw-lines', label: 'SVGDrawLines', zhName: '绘制线条' },
    { path: '/components/avatar', label: 'Avatar', zhName: '头像' },
    { path: '/components/badge', label: 'Badge', zhName: '徽标' }
  ]),
  section('feedback', [
    { path: '/components/dialog', label: 'Dialog', zhName: '对话框' },
    { path: '/components/drawer', label: 'Drawer', zhName: '抽屉' },
    { path: '/components/tooltip', label: 'Tooltip', zhName: '文字提示' },
    { path: '/components/popover', label: 'Popover', zhName: '弹出层' },
    { path: '/components/dropdown', label: 'Dropdown', zhName: '下拉菜单' },
    { path: '/components/context-menu', label: 'ContextMenu', zhName: '右键菜单' },
    { path: '/components/toast', label: 'Toast', zhName: '通知' },
    { path: '/components/image-preview', label: 'ImagePreview', zhName: '图片预览' },
    { path: '/components/shake', label: 'Shake', zhName: '抖动' },
    { path: '/components/spinner', label: 'Spinner', zhName: '加载' },
    { path: '/components/progress', label: 'Progress', zhName: '进度' }
  ])
])

/** 章节标题的排版类；折叠时宿主自行追加 `sr-only`，只保留给读屏的标题。 */
export const NAV_SECTION_TITLE_CLASS =
  'px-2.5 pt-3 pb-1 text-[12px] font-medium tracking-wide text-(--wui-color-text-secondary)'

// active 底色浅色取设计给定的 #d5d7d7；深色不跟——sidebar 在深色是 #2c2c2e，亮灰会读成一条高亮带，仍走 control 档。
export const NAV_ITEM_CLASS =
  'flex items-center gap-2 min-w-9 min-h-9 px-2.5 border-0 rounded-full cursor-pointer text-left transition-all duration-(--wui-duration-trigger) text-(--wui-color-text) active:bg-[rgb(27_27_48/0.12)] dark:active:bg-white/15 data-[active=true]:bg-[color-mix(in_srgb,var(--wui-color-surface-control,#e5e5eb)_92%,#1b1b30)] data-[active=true]:hover:bg-[color-mix(in_srgb,var(--wui-color-surface-control,#e5e5eb)_86%,#1b1b30)] data-[active=true]:active:bg-[color-mix(in_srgb,var(--wui-color-surface-control,#e5e5eb)_75%,#1b1b30)] dark:data-[active=true]:bg-[color-mix(in_srgb,var(--wui-color-surface-control,#dfdfdf)_90%,var(--wui-color-text,#1b1b1b))] dark:data-[active=true]:hover:bg-[color-mix(in_srgb,var(--wui-color-surface-control,#dfdfdf)_90%,var(--wui-color-text,#1b1b1b))] dark:data-[active=true]:active:bg-[color-mix(in_srgb,var(--wui-color-surface-control,#dfdfdf)_70%,var(--wui-color-text,#1b1b1b))]'

/** 精确匹配当前路径，或匹配它的尾斜杠写法。 */
export function isNavActive(pathname: string, path: string): boolean {
  return pathname === path || pathname === `${path}/`
}
