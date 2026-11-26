import { defineAsyncComponent, type Component } from 'vue'

export type DemoLoader = () => Promise<{ default: Component }>

export const DEMO_REGISTRY: Readonly<Record<string, DemoLoader>> = Object.freeze({
  'js-kit/plugin-system#plugin-compose': () => import('./js-kit/plugin-system/PluginComposeDemo.vue'),
  'js-kit/plugin-system#batch-emitter': () => import('./js-kit/plugin-system/BatchEmitterDemo.vue'),
  'js-kit/plugin-system#ack-queue': () => import('./js-kit/plugin-system/AckQueueDemo.vue'),
  'js-kit/url#url-playground': () => import('./js-kit/url/UrlPlaygroundDemo.vue'),
  'js-kit/number#number-helpers': () => import('./js-kit/number/NumberHelpersDemo.vue'),
  'js-kit/string#file-extension': () => import('./js-kit/string/FileExtensionDemo.vue'),
  'js-kit/timer#timer-playground': () => import('./js-kit/timer/TimerPlaygroundDemo.vue'),
  'js-kit/paradigm#result-flow': () => import('./js-kit/paradigm/ResultFlowDemo.vue'),
  'js-kit/shortcut#safe-call': () => import('./js-kit/shortcut/SafeCallDemo.vue'),
  'browser-kit/storage#storage-ttl': () => import('./browser-kit/storage/StorageDemo.vue'),
  'browser-kit/tracker#tracker-playground': () => import('./browser-kit/tracker/TrackerDemo.vue'),
  'browser-kit/env#env-inspector': () => import('./browser-kit/env/EnvDemo.vue'),
  'browser-kit/dom#dom-metrics': () => import('./browser-kit/dom/DomDemo.vue'),
  'browser-kit/file#file-inspector': () => import('./browser-kit/file/FileDemo.vue'),
  'browser-kit/copy#copy-text': () => import('./browser-kit/copy/CopyDemo.vue'),
  'browser-kit/history-nav#history-nav-sandbox': () => import('./browser-kit/history-nav/HistoryNavDemo.vue'),
  'browser-kit/shortcut#event-shortcut': () => import('./browser-kit/shortcut/EventShortcutDemo.vue')
})

const componentCache = new Map<string, Component>()

export function resolveDemoComponent(key: string): Component | null {
  const cached = componentCache.get(key)
  if (cached) return cached
  const loader = DEMO_REGISTRY[key]
  if (!loader) return null
  const asyncComp = defineAsyncComponent(loader)
  componentCache.set(key, asyncComp)
  return asyncComp
}
