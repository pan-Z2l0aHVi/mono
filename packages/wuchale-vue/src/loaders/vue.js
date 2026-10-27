import { loadCatalog, loadCount } from '${PROXY}'
import { shallowRef } from 'vue'
import { registerLoaders } from 'wuchale/load-utils'

/** @type {import('vue').ShallowRef<import('wuchale/runtime').Runtime>[]} */
const store = []

export const getRuntime = (loadID = 0) => store[loadID].value
export const getRuntimeRx = getRuntime

registerLoaders('${KEY}', loadCatalog, loadCount, {
  get: getRuntime,
  set(loadID, runtime) {
    if (store[loadID]) store[loadID].value = runtime
    else store[loadID] = shallowRef(runtime)
  }
})
