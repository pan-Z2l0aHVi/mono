import {
  createBrowserLocaleDependencies,
  createLocaleController as createKitLocaleController,
  type DemoLocale
} from '@greypan/doc-demo-kit'
import { computed, ref, shallowRef } from 'vue'
import { commitLocale, loadLocale } from 'wuchale/load-utils'

import { loadMetaDocs, prepareExamples } from './examples'

export type { DemoLocale }

/*
 * 引擎在 `@greypan/doc-demo-kit`：队列串行、降级策略与快照语义都在那边，这里只剩 Vue 侧接线。
 * snapshot 只在引擎 `publish` 时整体换引用，shallowRef 按引用比较恰好匹配这个约定，
 * 三个只读视图再从快照派生，无关字段变化不会惊动对应的订阅渲染。
 * 偏好读写、navigator 语言与 document.lang 是两端共同的浏览器默认值，来自 kit。
 */
const controller = createKitLocaleController({
  ...createBrowserLocaleDependencies({ storageKey: 'locale' }),
  loadCatalog: locale => loadLocale(locale, false),
  commitCatalog: commitLocale,
  loadDocs: loadMetaDocs,
  prepareExamples
})

const snapshot = shallowRef(controller.getSnapshot())
controller.subscribe(() => {
  snapshot.value = controller.getSnapshot()
})

export const currentLocale = computed(() => snapshot.value.locale)
/** 渲染只读：节点本身仍由生成物与控制器封装保证，这里只暴露 ref 层面的只读。 */
export const currentDocs = computed(() => snapshot.value.docs)
export const localePending = computed(() => snapshot.value.pending)
export const loadDemoLocale = controller.change
export const localeSettled = controller.settled
export const loadShellLocale = controller.loadShellLocale
export const bootstrapLocale = controller.bootstrap
export const bootDegraded = ref(false)
export const registerExampleDoc = controller.register
export const ensureExampleDoc = controller.ensure
