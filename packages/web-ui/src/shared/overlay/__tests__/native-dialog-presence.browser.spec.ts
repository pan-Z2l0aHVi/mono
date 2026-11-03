import '../../../components/drawer'

import { afterEach, describe, expect, it } from 'vite-plus/test'

import type { WebUiDrawer } from '../../../components/drawer'

// CI runner 核数少，过渡动画的排队更久；本地实测 0.6s，保留 Vitest 默认 5s。
const CI_TIMEOUT = import.meta.env.CI ? 30_000 : undefined
const CI_WAIT = import.meta.env.CI ? 10_000 : undefined

function createDrawer(): WebUiDrawer {
  const drawer = document.createElement('web-ui-drawer') as WebUiDrawer
  document.body.append(drawer)
  return drawer
}

function getDialog(drawer: WebUiDrawer): HTMLDialogElement {
  return drawer.shadowRoot?.querySelector('dialog') as HTMLDialogElement
}

function waitFor(condition: () => boolean, message: string, timeout = 5000): Promise<void> {
  const deadline = performance.now() + timeout
  return new Promise((resolve, reject) => {
    const poll = () => {
      if (condition()) return resolve()
      if (performance.now() >= deadline) return reject(new Error(message))
      setTimeout(poll, 25)
    }
    poll()
  })
}

afterEach(() => document.body.replaceChildren())

describe('native dialog presence close path', () => {
  it('starts the drawer exit transition after the visible state is established', { timeout: CI_TIMEOUT }, async () => {
    const drawer = createDrawer()
    await drawer.updateComplete
    const dialog = getDialog(drawer)
    let enterEnded = false
    let exitStarted = false
    const onTransition = (event: TransitionEvent) => {
      if (event.target !== dialog || event.propertyName !== 'transform') return
      if (event.type === 'transitionend' && drawer.open) enterEnded = true
      if (event.type === 'transitionrun' && !drawer.open) exitStarted = true
    }
    dialog.addEventListener('transitionend', onTransition)
    dialog.addEventListener('transitionrun', onTransition)

    drawer.open = true
    await drawer.updateComplete
    await waitFor(() => enterEnded, 'drawer enter transition did not finish')

    drawer.open = false
    await drawer.updateComplete
    expect(dialog.open).toBe(true)
    await waitFor(() => exitStarted, 'drawer exit transition did not start')
    expect(exitStarted).toBe(true)
    await waitFor(() => !dialog.open, 'drawer did not close after the exit transition', CI_WAIT)
  })
})
