import { locales } from '${DATA}'
import { shallowRef } from 'vue'
import toRuntime from 'wuchale/runtime'

const locale = shallowRef(locales[0])
/** @type {WeakMap<object, Map<string, import('wuchale/runtime').Runtime>>} */
const cache = new WeakMap()

/** @param {import('${DATA}').Locale} value */
export function setLocale(value) {
  locale.value = value
}

/** @param {Record<string, import('wuchale/runtime').CatalogModule>} catalogs */
export function getRuntime(catalogs) {
  let byLocale = cache.get(catalogs)
  if (!byLocale) {
    byLocale = new Map()
    cache.set(catalogs, byLocale)
  }
  let runtime = byLocale.get(locale.value)
  if (!runtime) {
    runtime = toRuntime(catalogs[locale.value], locale.value)
    byLocale.set(locale.value, runtime)
  }
  return runtime
}

export const getRuntimeRx = getRuntime
