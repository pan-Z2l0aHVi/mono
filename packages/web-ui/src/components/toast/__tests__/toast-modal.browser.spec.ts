import '@/components/context-menu'
import '@/components/dialog'
import '@/components/drawer'
import '@/components/theme'

import type { LitElement } from 'lit'
import { afterEach, expect, it } from 'vite-plus/test'
import { page } from 'vite-plus/test/browser'

import { imagePreview } from '@/components/image-preview'
import { pollUntil, waitForFrame } from '@/shared/test-utils'

import { toast } from '..'

function noticeIn(dialog: HTMLDialogElement) {
  return dialog.querySelector<HTMLElement>('[data-wui-toast-overlay]')?.shadowRoot?.querySelector('web-ui-toast')
}

afterEach(() => {
  toast._reset()
  document.body.replaceChildren()
})

it('keeps the same toast at the viewport edge as managed modal layers open and close', async () => {
  const id = toast.info('Modal notice', { duration: 0 })
  await pollUntil(
    () => !!document.querySelector('[data-wui-overlay-root]')?.shadowRoot?.querySelector('web-ui-toast'),
    'toast missing'
  )
  const original = document.querySelector('[data-wui-overlay-root]')!.shadowRoot!.querySelector('web-ui-toast')!

  const dialogComponent = document.createElement('web-ui-dialog')
  document.body.append(dialogComponent)
  dialogComponent.open = true
  await dialogComponent.updateComplete
  const dialog = dialogComponent.shadowRoot!.querySelector('dialog')!
  await pollUntil(() => noticeIn(dialog) === original, 'toast did not enter dialog')

  const drawer = document.createElement('web-ui-drawer')
  drawer.placement = 'left'
  document.body.append(drawer)
  drawer.open = true
  await drawer.updateComplete
  const drawerDialog = drawer.shadowRoot!.querySelector('dialog')!
  await pollUntil(() => noticeIn(drawerDialog) === original, 'toast did not enter drawer')
  await waitForFrame()
  await pollUntil(
    () => Math.abs(original.getBoundingClientRect().right - (innerWidth - 16)) < 2,
    () =>
      `toast right=${original.getBoundingClientRect().right}, viewport=${innerWidth}, dialog=${JSON.stringify(drawerDialog.getBoundingClientRect())}, style=${['transform', 'translate', 'scale', 'filter', 'contain', 'willChange'].map(p => `${p}:${getComputedStyle(drawerDialog)[p as 'transform']}`).join(',')}`
  )

  drawer.open = false
  await drawer.updateComplete
  expect(noticeIn(drawerDialog)).toBe(original)
  await pollUntil(() => noticeIn(dialog) === original, 'toast did not return to dialog')
  dialogComponent.open = false
  await dialogComponent.updateComplete
  await pollUntil(
    () => original.getRootNode() === document.querySelector('[data-wui-overlay-root]')?.shadowRoot,
    'toast did not return to page'
  )
  toast.close(id)
})

it('does not migrate an explicitly supplied container', async () => {
  const container = document.createElement('div')
  document.body.append(container)
  toast.info('Explicit', { duration: 0, container })
  await pollUntil(() => !!container.querySelector('web-ui-toast'), 'toast missing')
  const original = container.querySelector('web-ui-toast')!
  const dialog = document.createElement('web-ui-dialog')
  document.body.append(dialog)
  dialog.open = true
  await dialog.updateComplete
  expect(container.querySelector('web-ui-toast')).toBe(original)
})

it.each(['right', 'left', 'top', 'bottom'] as const)(
  'keeps toast interactive while a %s drawer exits',
  async placement => {
    const drawer = document.createElement('web-ui-drawer')
    drawer.placement = placement
    drawer.style.setProperty('--wui-duration-drawer-exit', '2000ms')
    document.body.append(drawer)
    drawer.open = true
    await drawer.updateComplete
    const dialog = drawer.shadowRoot!.querySelector('dialog')!
    toast.info('Closable', { duration: 0 })
    await pollUntil(() => !!noticeIn(dialog)?.visible, 'toast missing from drawer')
    const notice = noticeIn(dialog)!
    await notice.updateComplete
    await pollUntil(
      () => Math.abs(notice.getBoundingClientRect().right - (innerWidth - 16)) < 2,
      'toast is not at viewport edge'
    )
    await page.elementLocator(notice).hover()
    drawer.open = false
    await drawer.updateComplete
    const close = notice.shadowRoot!.querySelector<HTMLElement>('.toast-close-btn')!
    await page.elementLocator(close).click()
    expect(dialog.open).toBe(true)
    await pollUntil(() => !notice.isConnected, 'toast close button did not dismiss it')
  }
)

it('preserves an automatically closing toast when its modal host is removed', async () => {
  const park = document.createElement('div')
  park.style.cssText = 'position:fixed;left:45%;top:45%;width:20px;height:20px'
  document.body.append(park)
  await page.elementLocator(park).hover()
  const drawer = document.createElement('web-ui-drawer')
  document.body.append(drawer)
  drawer.open = true
  await drawer.updateComplete
  const dialog = drawer.shadowRoot!.querySelector('dialog')!
  toast.info('Temporary', { duration: 1200 })
  await pollUntil(() => !!noticeIn(dialog)?.visible, 'toast missing from drawer')
  const notice = noticeIn(dialog)!
  drawer.remove()
  await pollUntil(() => notice.isConnected, 'toast did not survive its host')
  await pollUntil(() => !notice.isConnected, 'toast did not auto-close after migration', 5000)
  expect(notice.isConnected).toBe(false)
})

it('retains the target theme and follows its appearance changes inside another modal scope', async () => {
  const theme = document.createElement('web-ui-theme')
  theme.appearance = 'light'
  const target = document.createElement('button')
  theme.append(target)
  document.body.append(theme)
  await theme.updateComplete
  const source = theme.getOverlayRoot()!
  const drawer = document.createElement('web-ui-drawer')
  document.body.append(drawer)
  drawer.open = true
  await drawer.updateComplete
  const dialog = drawer.shadowRoot!.querySelector('dialog')!
  toast.info('Scoped', { target, duration: 0 })
  await pollUntil(() => !!noticeIn(dialog), 'themed toast missing')
  const notice = noticeIn(dialog)!
  const color = () => getComputedStyle(notice).getPropertyValue('--wui-color-text').trim()
  const expected = () => getComputedStyle(source).getPropertyValue('--wui-color-text').trim()
  expect(color()).toBe(expected())
  const light = expected()
  theme.appearance = 'dark'
  await theme.updateComplete
  await pollUntil(() => expected() !== light && color() === expected(), 'toast did not follow the target theme')
})

it('follows image preview and context menu modal layers', async () => {
  const id = toast.info('Layered', { duration: 0 })
  const root = document.querySelector<HTMLElement>('[data-wui-overlay-root]')!.shadowRoot!
  await pollUntil(() => !!root.querySelector('web-ui-toast'), 'toast missing from page')
  const notice = root.querySelector('web-ui-toast')!
  const preview = imagePreview({
    images: [{ src: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg"/%3E', alt: 'image' }]
  })
  const host = root.querySelector<LitElement>('web-ui-image-preview')!
  await host.updateComplete
  const dialog = host.shadowRoot!.querySelector('dialog')!
  await pollUntil(() => noticeIn(dialog) === notice, 'toast missing from image preview')

  const menu = document.createElement('web-ui-context-menu')
  document.body.append(menu)
  await menu.updateComplete
  menu.openAt(80, 80)
  await menu.updateComplete
  const scrim = document.querySelector<HTMLDialogElement>('dialog.wui-context-menu-scrim')!
  expect(scrim.matches(':modal')).toBe(true)
  expect(noticeIn(scrim)).toBe(notice)
  menu.close()
  await pollUntil(() => noticeIn(dialog) === notice, 'toast did not return to image preview')
  preview.close()
  await preview.closed
  expect(root.querySelector('web-ui-toast')).toBe(notice)
  toast.close(id)
})

it('keeps headless drawer content clickable alongside the viewport toast', async () => {
  const drawer = document.createElement('web-ui-drawer')
  drawer.headless = true
  drawer.ariaDialogLabel = 'Headless drawer'
  const button = document.createElement('button')
  button.textContent = 'Headless action'
  button.style.cssText = 'width:200px;height:80px;margin-top:120px'
  let clicks = 0
  button.addEventListener('click', () => clicks++)
  drawer.append(button)
  document.body.append(drawer)
  drawer.open = true
  await drawer.updateComplete
  const dialog = drawer.shadowRoot!.querySelector('dialog')!
  toast.info('Headless', { duration: 0 })
  await pollUntil(() => !!noticeIn(dialog)?.visible, 'toast missing from headless drawer')
  await page.elementLocator(button).click()
  expect(clicks).toBe(1)
  expect(button.getBoundingClientRect().width).toBe(200)
  expect(noticeIn(dialog)!.getBoundingClientRect().right).toBeCloseTo(innerWidth - 16, 0)
})
