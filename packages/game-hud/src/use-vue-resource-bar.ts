import { omit, pick } from 'remeda'
import { onUnmounted, type Reactive, reactive, type ToRefs, toRefs, watch, watchEffect } from 'vue'

import { ResourceBar, type ResourceBarOptions } from '@/resource-bar'

import { unRefs } from './utils'

export type UseResourceBarOptions = ToRefs<Omit<ResourceBarOptions, 'onFull' | 'onEmpty'>> & {
  onFull?: ResourceBarOptions['onFull']
  onEmpty?: ResourceBarOptions['onEmpty']
}

export function useResourceBar(options: UseResourceBarOptions = {}): Reactive<ResourceBar> {
  const optionsReactive = reactive(omit(options, ['onEmpty', 'onFull']))
  const optionsRefs = toRefs(optionsReactive)
  const inst = reactive(new ResourceBar())

  watchEffect(() => {
    inst.setOptions({
      ...unRefs(optionsRefs),
      ...pick(options, ['onEmpty', 'onFull'])
    })
  })
  watch(
    [() => optionsReactive.autoRegenRate, () => optionsReactive.autoRegenCD],
    val => {
      const [autoRegenRate] = val
      inst.stopAutoRegen()
      if (autoRegenRate) {
        inst.startAutoRegen()
      }
    },
    {
      immediate: true
    }
  )

  onUnmounted(() => {
    inst.clean()
  })

  return inst
}
