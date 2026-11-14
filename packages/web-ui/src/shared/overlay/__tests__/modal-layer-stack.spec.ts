import { describe, expect, it } from 'vite-plus/test'

import { getTopModalLayer, registerModalLayer, subscribeModalLayer, unregisterModalLayer } from '../modal-layer-stack'

describe('managed modal layers', () => {
  it('follows opening order and returns to the previous layer when the top closes', () => {
    const first = document.createElement('dialog')
    const second = document.createElement('dialog')
    const seen: Array<HTMLDialogElement | undefined> = []
    const unsubscribe = subscribeModalLayer(layer => seen.push(layer))

    try {
      registerModalLayer(first)
      registerModalLayer(second)
      registerModalLayer(first)
      expect(getTopModalLayer()).toBe(second)

      unregisterModalLayer(second)
      expect(getTopModalLayer()).toBe(first)
      unregisterModalLayer(first)
      expect(seen).toEqual([first, second, first, undefined])
    } finally {
      unregisterModalLayer(second)
      unregisterModalLayer(first)
      unsubscribe()
    }
  })
})
