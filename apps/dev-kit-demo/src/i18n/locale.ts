import {
  createBrowserLocaleDependencies,
  createLocaleController as createKitLocaleController,
  type DemoLocale
} from '@greypan/doc-demo-kit'
import { computed, ref, shallowRef } from 'vue'
import { commitLocale, loadLocale } from 'wuchale/load-utils'

import { loadMetaDocs, prepareExamples } from './examples'

export type { DemoLocale }

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
export const currentDocs = computed(() => snapshot.value.docs)
export const localePending = computed(() => snapshot.value.pending)
export const loadDemoLocale = controller.change
export const localeSettled = controller.settled
export const loadShellLocale = controller.loadShellLocale
export const bootstrapLocale = controller.bootstrap
export const bootDegraded = ref(false)
export const registerExampleDoc = controller.register
export const ensureExampleDoc = controller.ensure
export const ensureExampleDocs = controller.ensureAll
