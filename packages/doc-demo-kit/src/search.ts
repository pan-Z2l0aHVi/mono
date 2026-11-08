import { NAV_SECTIONS } from './nav'

const chineseNames: Record<string, string> = {
  Button: '按钮',
  Icon: '图标',
  Layout: '布局',
  BackTop: '回到顶部',
  Theme: '主题',
  Input: '输入框',
  Textarea: '多行输入框',
  InputNumber: '数字输入框',
  Select: '选择器',
  Autocomplete: '自动补全',
  Switch: '开关',
  Slider: '滑块',
  Radio: '单选',
  Checkbox: '复选',
  Segmented: '分段控件',
  Collapse: '折叠',
  EditableText: '可编辑文本',
  Empty: '空状态',
  GroupedText: '分组文本',
  MiddleEllipsis: '中间省略',
  SVGDrawLines: '绘制线条',
  Avatar: '头像',
  Badge: '徽标',
  Dialog: '对话框',
  Drawer: '抽屉',
  Tooltip: '文字提示',
  Popover: '弹出层',
  Dropdown: '下拉菜单',
  ContextMenu: '右键菜单',
  Toast: '通知',
  ImagePreview: '图片预览',
  Shake: '抖动',
  Spinner: '加载',
  Progress: '进度'
}

export interface SearchItem {
  path: string
  zh: string
  en: string
  keywords?: string
}

const componentItems: SearchItem[] = NAV_SECTIONS.flatMap(section =>
  section.items.map(item => ({
    path: item.path,
    zh: item.label,
    en: item.label,
    keywords: chineseNames[item.label]
  }))
)

/** 搜索导航项目；空查询不产生结果。 */
export function searchNavigation(query: string, pages: readonly SearchItem[]): SearchItem[] {
  const needle = query.trim().toLocaleLowerCase()
  if (!needle) return []
  return [...pages, ...componentItems].filter(item =>
    [item.zh, item.en, item.keywords].some(value => value?.toLocaleLowerCase().includes(needle))
  )
}
