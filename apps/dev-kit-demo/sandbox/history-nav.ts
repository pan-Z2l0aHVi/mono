import { defineHistoryNav } from '@greypan/browser-kit'

const nav = defineHistoryNav({ namespace: 'dev-kit-demo-sandbox' })
const statusEl = document.getElementById('status')
const logEl = document.getElementById('log')
const pushBtn = document.getElementById('btn-push')
const replaceBtn = document.getElementById('btn-replace')
const backBtn = document.getElementById('btn-back')
const forwardBtn = document.getElementById('btn-forward')

let step = 0
const logs: string[] = []

function render(eventLabel?: string) {
  if (eventLabel) {
    logs.unshift(`[${new Date().toLocaleTimeString()}] ${eventLabel} -> ${window.location.search || '(root)'}`)
    if (logs.length > 20) logs.pop()
  }
  if (statusEl) {
    const idx = nav.currentEntry?.index ?? -1
    statusEl.textContent = `canGoBack=${String(nav.canGoBack)} | canGoForward=${String(nav.canGoForward)} | index=${idx} | entries=${nav.entries().length} | query=${window.location.search || '(none)'}`
  }
  if (logEl) logEl.textContent = logs.join('\n')
  if (backBtn instanceof HTMLButtonElement) backBtn.disabled = !nav.canGoBack
  if (forwardBtn instanceof HTMLButtonElement) forwardBtn.disabled = !nav.canGoForward
}

nav.onCurrentEntryChange(event => {
  render(`onCurrentEntryChange(${event.navigationType})`)
})

pushBtn?.addEventListener('click', () => {
  step += 1
  window.history.pushState({ step }, '', `?step=${step}`)
  render(`pushState(?step=${step})`)
})

replaceBtn?.addEventListener('click', () => {
  step += 1
  window.history.replaceState({ step, replaced: true }, '', `?step=${step}&replaced=1`)
  render(`replaceState(?step=${step}&replaced=1)`)
})

backBtn?.addEventListener('click', () => {
  window.history.back()
})

forwardBtn?.addEventListener('click', () => {
  window.history.forward()
})

window.addEventListener('beforeunload', () => {
  nav.dispose()
})

render('init')
