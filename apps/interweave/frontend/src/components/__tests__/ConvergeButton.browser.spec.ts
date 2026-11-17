import '@/assets/global.css'
import '@greypan/web-ui'

import { afterEach, describe, expect, it } from 'vite-plus/test'
import { userEvent } from 'vite-plus/test/browser'
import { createApp, h, nextTick, type VNode } from 'vue'

import ConvergeButton from '../ConvergeButton.vue'

interface MountOptions {
  prefix?: boolean
  suffix?: boolean
  disabled?: boolean
  loading?: boolean
  reduced?: boolean
}

const hosts: HTMLElement[] = []

afterEach(() => {
  for (const host of hosts.splice(0)) host.remove()
})

const marker = () => h('span', { style: 'display: inline-block; width: 16px; height: 16px' })

async function mount(options: MountOptions = {}) {
  const host = document.createElement('div')
  document.body.append(host)
  hosts.push(host)

  const slots: Record<string, () => VNode[]> = { default: () => [h('span', '确认')] }
  if (options.prefix) slots.prefix = () => [marker()]
  if (options.suffix) slots.suffix = () => [marker()]

  const app = createApp({
    render: () => {
      const button = h(
        ConvergeButton,
        { disabled: options.disabled ?? false, loading: options.loading ?? false },
        slots
      )
      return options.reduced ? h('web-ui-theme', { motion: 'reduced' }, [button]) : button
    }
  })
  app.mount(host)
  await nextTick()

  const button = host.querySelector<HTMLElement>('web-ui-button')!
  const label = host.querySelector<HTMLElement>('.converge-label')!
  const prefix = host.querySelector<HTMLElement>('.converge-prefix')
  const suffix = host.querySelector<HTMLElement>('.converge-suffix')
  const positions = () => {
    const origin = button.getBoundingClientRect().left
    return {
      label: label.getBoundingClientRect().left - origin,
      prefix: prefix ? prefix.getBoundingClientRect().left - origin : 0,
      suffix: suffix ? suffix.getBoundingClientRect().left - origin : 0
    }
  }

  return {
    host,
    button,
    label,
    prefix,
    suffix,
    positions,
    unmount: () => {
      app.unmount()
      host.remove()
    }
  }
}

/** 过渡是异步的：等可观察位置满足条件，不赌固定时长。 */
async function waitFor(check: () => boolean, message: string): Promise<void> {
  for (let frame = 0; frame < 300; frame++) {
    if (check()) return
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
  }
  throw new Error(`300 帧内未满足：${message}`)
}

/** 给「不应发生位移」的断言留足过渡被打完的时间。 */
async function rest(): Promise<void> {
  await new Promise<void>(resolve => setTimeout(resolve, 200))
  await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
}

describe('ConvergeButton', () => {
  it('只有 prefix 时，文字左移、图标右移', async () => {
    const view = await mount({ prefix: true })
    try {
      const initial = view.positions()
      await userEvent.hover(view.button)
      await waitFor(() => {
        const current = view.positions()
        return current.label < initial.label - 1 && current.prefix > initial.prefix + 1
      }, '文字与 prefix 应相互靠近')
      const current = view.positions()
      expect(current.label).toBeLessThan(initial.label - 1)
      expect(current.prefix).toBeGreaterThan(initial.prefix + 1)
    } finally {
      view.unmount()
    }
  })

  it('只有 suffix 时，文字右移、图标左移', async () => {
    const view = await mount({ suffix: true })
    try {
      const initial = view.positions()
      await userEvent.hover(view.button)
      await waitFor(() => {
        const current = view.positions()
        return current.label > initial.label + 1 && current.suffix < initial.suffix - 1
      }, '文字与 suffix 应相互靠近')
      const current = view.positions()
      expect(current.label).toBeGreaterThan(initial.label + 1)
      expect(current.suffix).toBeLessThan(initial.suffix - 1)
    } finally {
      view.unmount()
    }
  })

  it('两侧都有时文字不动，两个图标各向中间靠拢', async () => {
    const view = await mount({ prefix: true, suffix: true })
    try {
      const initial = view.positions()
      await userEvent.hover(view.button)
      await waitFor(() => {
        const current = view.positions()
        return current.prefix > initial.prefix + 1 && current.suffix < initial.suffix - 1
      }, '两侧图标应相互靠近')
      const current = view.positions()
      expect(current.prefix).toBeGreaterThan(initial.prefix + 1)
      expect(current.suffix).toBeLessThan(initial.suffix - 1)
      expect(Math.abs(current.label - initial.label)).toBeLessThan(0.5)
    } finally {
      view.unmount()
    }
  })

  it('disabled 与 loading 都不产生位移', async () => {
    for (const state of [{ disabled: true }, { loading: true }]) {
      const view = await mount({ prefix: true, suffix: true, ...state })
      try {
        const initial = view.positions()
        await userEvent.hover(view.button)
        expect(view.button.matches(':hover')).toBe(true)
        await rest()
        const current = view.positions()
        expect(Math.abs(current.label - initial.label)).toBeLessThan(0.5)
        expect(Math.abs(current.prefix - initial.prefix)).toBeLessThan(0.5)
        expect(Math.abs(current.suffix - initial.suffix)).toBeLessThan(0.5)
      } finally {
        view.unmount()
      }
    }
  })

  it('motion="reduced" 时不产生位移', async () => {
    const view = await mount({ prefix: true, suffix: true, reduced: true })
    try {
      expect(view.host.querySelector('web-ui-theme')?.getAttribute('motion')).toBe('reduced')
      expect(getComputedStyle(view.button).getPropertyValue('--converge-distance').trim()).toBe('0px')
      expect(getComputedStyle(view.label).transitionDuration).toBe('0s')
      const initial = view.positions()
      await userEvent.hover(view.button)
      expect(view.button.matches(':hover')).toBe(true)
      await rest()
      const current = view.positions()
      expect(Math.abs(current.label - initial.label)).toBeLessThan(0.5)
      expect(Math.abs(current.prefix - initial.prefix)).toBeLessThan(0.5)
      expect(Math.abs(current.suffix - initial.suffix)).toBeLessThan(0.5)
    } finally {
      view.unmount()
    }
  })
})
