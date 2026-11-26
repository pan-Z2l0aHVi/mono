import { defineHistoryNav } from '@greypan/browser-kit'

const nav = defineHistoryNav({ namespace: 'my-app-nav' })

const unsubscribe = nav.onCurrentEntryChange(event => {
  console.log(event.navigationType, {
    from: event.from?.url,
    current: nav.currentEntry?.url,
    canGoBack: nav.canGoBack,
    canGoForward: nav.canGoForward
  })
})

history.pushState({ step: 1 }, '', '?step=1')
history.replaceState({ step: 2 }, '', '?step=2')

console.log(nav.entries().length)

unsubscribe()
nav.dispose()
