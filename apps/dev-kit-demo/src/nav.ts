import { createRouteExampleDocs, type NavItem, type NavSection, type SearchItem } from '@greypan/doc-demo-kit'

export type DevKitPkg = 'js-kit' | 'browser-kit' | 'deps-reload' | 'unplugin-web-components'

export const DEV_KIT_SHELL_PAGES: readonly SearchItem[] = Object.freeze([
  {
    path: '/home',
    zh: '总览',
    en: 'Overview',
    keywords: 'home js-kit browser-kit deps-reload unplugin-web-components'
  },
  { path: '/js-kit/getting-started', zh: 'js-kit 快速开始', en: 'js-kit Getting Started', keywords: 'js-kit install' },
  { path: '/js-kit/changelog', zh: 'js-kit 更新日志', en: 'js-kit Changelog', keywords: 'js-kit release' },
  {
    path: '/browser-kit/getting-started',
    zh: 'browser-kit 快速开始',
    en: 'browser-kit Getting Started',
    keywords: 'browser-kit install'
  },
  {
    path: '/browser-kit/changelog',
    zh: 'browser-kit 更新日志',
    en: 'browser-kit Changelog',
    keywords: 'browser-kit release'
  },
  {
    path: '/deps-reload/getting-started',
    zh: 'deps-reload 快速开始',
    en: 'deps-reload Getting Started',
    keywords: 'deps-reload plugin vite webpack install api options Dep outputDir extensions'
  },
  {
    path: '/deps-reload/changelog',
    zh: 'deps-reload 更新日志',
    en: 'deps-reload Changelog',
    keywords: 'deps-reload release'
  },
  {
    path: '/unplugin-web-components/getting-started',
    zh: 'unplugin-web-components 快速开始',
    en: 'unplugin-web-components Getting Started',
    keywords:
      'unplugin-web-components plugin vite webpack install api options tagPrefix packageName sideEffects withStyle'
  },
  {
    path: '/unplugin-web-components/changelog',
    zh: 'unplugin-web-components 更新日志',
    en: 'unplugin-web-components Changelog',
    keywords: 'unplugin-web-components release'
  }
])

function makeSection(id: DevKitPkg, items: NavItem[]): NavSection<DevKitPkg> {
  return Object.freeze({
    id,
    items: Object.freeze(items.map(item => Object.freeze({ ...item })))
  })
}

export const JS_KIT_NAV_SECTION: NavSection<'js-kit'> = makeSection('js-kit', [
  { path: '/js-kit/plugin-system', label: 'plugin-system', zhName: '插件系统 批量发射 队列 AckQueue' },
  { path: '/js-kit/url', label: 'url', zhName: 'URL 解析 构建 query hash' },
  { path: '/js-kit/number', label: 'number', zhName: '数字 clamp 文件大小 formatFileSize' },
  { path: '/js-kit/string', label: 'string', zhName: '字符串 扩展名' },
  { path: '/js-kit/timer', label: 'timer', zhName: '定时器 防抖 debounce 轮询' },
  { path: '/js-kit/paradigm', label: 'paradigm', zhName: '范式 Result ok err rust' },
  { path: '/js-kit/shortcut', label: 'shortcut', zhName: '安全调用 safeCall' },
  { path: '/js-kit/utility-types', label: 'utility-types', zhName: '工具类型 TypeScript' }
]) as NavSection<'js-kit'>

export const BROWSER_KIT_NAV_SECTION: NavSection<'browser-kit'> = makeSection('browser-kit', [
  { path: '/browser-kit/storage', label: 'storage', zhName: '存储 localStorage sessionStorage TTL watch' },
  { path: '/browser-kit/tracker', label: 'tracker', zhName: '埋点 上报 离线恢复 批量上报 错误监控' },
  { path: '/browser-kit/env', label: 'env', zhName: '环境检测 浏览器 设备 微信 iOS Android' },
  { path: '/browser-kit/dom', label: 'dom', zhName: 'DOM 视口 滚动位置' },
  { path: '/browser-kit/file', label: 'file', zhName: '文件下载 downloadFile Blob' },
  { path: '/browser-kit/copy', label: 'copy', zhName: '剪贴板 复制 copyToClipboard' },
  { path: '/browser-kit/history-nav', label: 'history-nav', zhName: '历史导航 history canGoBack' },
  { path: '/browser-kit/shortcut', label: 'shortcut', zhName: '事件监听 on off window document' }
]) as NavSection<'browser-kit'>

export const DEPS_RELOAD_NAV_SECTION: NavSection<'deps-reload'> = makeSection('deps-reload', [
  { path: '/deps-reload/vite', label: 'vite', zhName: 'deps-reload Vite 插件 依赖产物 刷新 hotUpdate' },
  { path: '/deps-reload/webpack', label: 'webpack', zhName: 'deps-reload Webpack 插件 contextDependencies liveReload' }
]) as NavSection<'deps-reload'>

export const UNPLUGIN_WEB_COMPONENTS_NAV_SECTION: NavSection<'unplugin-web-components'> = makeSection(
  'unplugin-web-components',
  [
    {
      path: '/unplugin-web-components/module-transforms',
      label: 'module-transforms',
      zhName: 'unplugin-web-components 模块转换 Vue React JSX TSX 自动导入'
    },
    {
      path: '/unplugin-web-components/html-injection',
      label: 'html-injection',
      zhName: 'unplugin-web-components HTML 注入 transformIndexHtml Vite'
    }
  ]
) as NavSection<'unplugin-web-components'>

export const DEV_KIT_NAV_SECTIONS: readonly NavSection<DevKitPkg>[] = Object.freeze([
  JS_KIT_NAV_SECTION,
  BROWSER_KIT_NAV_SECTION,
  DEPS_RELOAD_NAV_SECTION,
  UNPLUGIN_WEB_COMPONENTS_NAV_SECTION
])

export const JS_KIT_MODULES = new Set(JS_KIT_NAV_SECTION.items.map(item => item.path.split('/').at(-1)!))
export const BROWSER_KIT_MODULES = new Set(BROWSER_KIT_NAV_SECTION.items.map(item => item.path.split('/').at(-1)!))
export const DEPS_RELOAD_MODULES = new Set(DEPS_RELOAD_NAV_SECTION.items.map(item => item.path.split('/').at(-1)!))
export const UNPLUGIN_WEB_COMPONENTS_MODULES = new Set(
  UNPLUGIN_WEB_COMPONENTS_NAV_SECTION.items.map(item => item.path.split('/').at(-1)!)
)

const PACKAGE_MODULES: Record<DevKitPkg, ReadonlySet<string>> = {
  'js-kit': JS_KIT_MODULES,
  'browser-kit': BROWSER_KIT_MODULES,
  'deps-reload': DEPS_RELOAD_MODULES,
  'unplugin-web-components': UNPLUGIN_WEB_COMPONENTS_MODULES
}

export function isValidModule(pkg: DevKitPkg, slug: string): boolean {
  return PACKAGE_MODULES[pkg].has(slug)
}

/** 带包命名空间的文档键解析（如 `/js-kit/shortcut` -> `['js-kit/shortcut']`）。 */
export const routeDevKitDocs = createRouteExampleDocs(DEV_KIT_NAV_SECTIONS, item => item.path.replace(/^\//, ''))

/** 非叶子的一级路由（如 `/js-kit`）自动重定向至首个子路由，避免直接访问落入 404。 */
export const DEV_KIT_INDEX_REDIRECTS = Object.freeze([
  Object.freeze({ path: '/', redirect: '/home' }),
  ...DEV_KIT_NAV_SECTIONS.map(section =>
    Object.freeze({
      path: `/${section.id}`,
      redirect: `/${section.id}/getting-started`
    })
  )
])
