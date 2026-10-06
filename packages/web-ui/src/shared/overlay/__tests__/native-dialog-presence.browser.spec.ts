import { afterEach, describe, expect, it } from 'vite-plus/test'

import '../../../components/drawer'
import type { WebUiDrawer } from '../../../components/drawer'

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
  it('starts the drawer exit transition after the visible state is established', { timeout: 30_000 }, async () => {
    const drawer = createDrawer()
    drawer.open = true
    await drawer.updateComplete

    const dialog = getDialog(drawer)
    await waitFor(() => dialog.getAnimations({ subtree: true }).length > 0, 'drawer enter transition did not start')
    await waitFor(() => dialog.getAnimations({ subtree: true }).length === 0, 'drawer enter transition did not settle')

    drawer.open = false
    await drawer.updateComplete

    expect(dialog.open).toBe(true)
    await waitFor(
      () =>
        dialog
          .getAnimations({ subtree: true })
          .some(animation => animation instanceof CSSTransition && animation.transitionProperty === 'transform'),
      'drawer exit transition did not start'
    )
    expect(
      dialog
        .getAnimations({ subtree: true })
        .some(animation => animation instanceof CSSTransition && animation.transitionProperty === 'transform')
    ).toBe(true)
    await waitFor(() => !dialog.open, 'drawer did not close after the exit transition', 10_000)
  })
})
