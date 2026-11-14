import '@/components/autocomplete'
import '@/components/drawer'
import '@/components/option'
import '@/components/select'

import { afterEach, describe, expect, it } from 'vite-plus/test'

import type { WebUiAutocomplete } from '@/components/autocomplete'
import type { WebUiDrawer } from '@/components/drawer'
import type { WebUiSelect } from '@/components/select'
import { pollUntil, waitForAnimationsToFinish, waitForFrame } from '@/shared/test-utils'

import { defineOverlay } from '../overlay'

const cleanups: Array<() => void> = []

afterEach(async () => {
  for (const cleanup of cleanups.splice(0)) cleanup()
  document.body.replaceChildren()
  await waitForAnimationsToFinish([document.documentElement], 8000)
})

async function settle() {
  await waitForFrame()
  await waitForFrame()
  if (!(await waitForAnimationsToFinish([document.documentElement], 8000))) throw new Error('Page shift did not settle')
}

describe('fixed portal overlay with drawer page shift', () => {
  it('aligns with its modal anchor when page shift opens and closes', async () => {
    const marker = document.createElement('div')
    marker.style.cssText = 'position:absolute;left:0;top:0;width:10px;height:10px'
    document.body.append(marker)
    const initialLeft = marker.getBoundingClientRect().left
    const drawer = document.createElement('web-ui-drawer') as WebUiDrawer
    drawer.pageShift = true
    document.body.append(drawer)
    await drawer.updateComplete
    drawer.open = true
    await drawer.updateComplete
    await pollUntil(() => marker.getBoundingClientRect().left < initialLeft - 10, 'Expected page shift to start')
    await settle()

    const dialog = document.createElement('dialog')
    dialog.style.cssText = 'width:320px; padding:20px; border:0'
    dialog.innerHTML =
      '<button style="display:block;width:200px">Anchor</button><div style="position:fixed;width:120px;height:30px">Panel</div>'
    document.body.append(dialog)
    dialog.showModal()
    const anchor = dialog.querySelector('button') as HTMLElement
    const panel = dialog.querySelector('div') as HTMLElement
    const overlay = defineOverlay().make({ anchor, overlay: panel, strategy: 'fixed', flip: false, shift: false })
    cleanups.push(() => overlay.dispose())
    overlay.open()

    const aligned = () => Math.abs(panel.getBoundingClientRect().left - anchor.getBoundingClientRect().left) < 1
    await pollUntil(aligned, 'Expected portal to align while page shift is active')
    expect(aligned()).toBe(true)

    const firstShiftLeft = marker.getBoundingClientRect().left
    const secondDrawer = document.createElement('web-ui-drawer') as WebUiDrawer
    secondDrawer.pageShift = true
    document.body.append(secondDrawer)
    await secondDrawer.updateComplete
    secondDrawer.open = true
    await secondDrawer.updateComplete
    await pollUntil(() => marker.getBoundingClientRect().left < firstShiftLeft - 10, 'Expected the second page shift')
    await settle()
    await pollUntil(aligned, 'Expected portal to remain aligned after a second drawer opens')
    expect(aligned()).toBe(true)

    secondDrawer.open = false
    await secondDrawer.updateComplete
    await settle()
    await pollUntil(aligned, 'Expected portal to remain aligned after the second drawer closes')
    expect(aligned()).toBe(true)

    drawer.pageShift = false
    await drawer.updateComplete
    await settle()
    await pollUntil(aligned, 'Expected portal to remain aligned after page shift ends')
    expect(aligned()).toBe(true)

    drawer.pageShift = true
    await drawer.updateComplete
    await settle()
    await pollUntil(aligned, 'Expected portal to remain aligned after page shift resumes')
    expect(aligned()).toBe(true)
  })

  it.each(['select', 'autocomplete'] as const)('aligns a portal %s inside a sibling modal', async kind => {
    const marker = document.createElement('div')
    marker.style.cssText = 'position:absolute;left:0;top:0;width:10px;height:10px'
    document.body.append(marker)
    const initialLeft = marker.getBoundingClientRect().left
    const drawer = document.createElement('web-ui-drawer') as WebUiDrawer
    drawer.pageShift = true
    document.body.append(drawer)
    await drawer.updateComplete
    drawer.open = true
    await drawer.updateComplete
    await pollUntil(() => marker.getBoundingClientRect().left < initialLeft - 10, 'Expected page shift to start')
    await settle()

    const dialog = document.createElement('dialog')
    dialog.style.cssText = 'width:320px; padding:20px; border:0'
    document.body.append(dialog)
    dialog.showModal()
    const control = document.createElement(`web-ui-${kind}`) as WebUiSelect | WebUiAutocomplete
    control.portal = true
    control.innerHTML = '<web-ui-option value="apple" label="Apple"></web-ui-option>'
    dialog.append(control)
    await control.updateComplete
    const anchor = control.shadowRoot?.querySelector<HTMLElement>('[role="combobox"]')
    if (!anchor) throw new Error('Expected a combobox anchor')
    anchor.click()
    await control.updateComplete
    const panel = await (async () => {
      let found: HTMLElement | null = null
      await pollUntil(() => {
        found =
          Array.from(dialog.children)
            .map(child => child.shadowRoot?.querySelector<HTMLElement>(`.${kind}-overlay`))
            .find((element): element is HTMLElement => !!element?.style.left) ?? null
        return !!found?.style.left
      }, 'Expected portal panel to be positioned inside the modal')
      return found as unknown as HTMLElement
    })()
    await pollUntil(
      () => Math.abs(panel.getBoundingClientRect().left - anchor.getBoundingClientRect().left) < 1,
      `Expected ${kind} panel to align with its anchor`
    )
    expect(Math.abs(panel.getBoundingClientRect().left - anchor.getBoundingClientRect().left)).toBeLessThan(1)
  })
})
