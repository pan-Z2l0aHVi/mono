/**
 * 菜单命令里落在资源库页上的那些动作。
 *
 * 菜单是应用级的、页面会被切走，所以壳层负责切路由，页面负责执行领域动作。
 * 两者之间用 document 上的自定义事件通信：壳层只知道「有个动作要交给资源库页」，
 * 不必知道页面内部怎么开对话框、怎么读剪贴板。
 *
 * 常量集中在这里，避免两处硬编码字符串漂移。
 */
export const MENU_ADD_RESOURCE_EVENT = 'interweave:menu-add-resource'
export const MENU_IMPORT_FROM_CLIPBOARD_EVENT = 'interweave:menu-import-from-clipboard'
export const MENU_IMPORT_FROM_LINK_EVENT = 'interweave:menu-import-from-link'
export const MENU_TOGGLE_FILTER_BAR_EVENT = 'interweave:menu-toggle-filter-bar'
export const MENU_FOCUS_SEARCH_EVENT = 'interweave:menu-focus-search'

/** 监听一个菜单动作，返回解绑函数。 */
export function onMenuAction(eventName: string, handler: () => void): () => void {
  document.addEventListener(eventName, handler)
  return () => document.removeEventListener(eventName, handler)
}
